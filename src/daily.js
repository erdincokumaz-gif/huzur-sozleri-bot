// Kullanım:
//   node src/daily.js onizleme [adet]          -> onizleme/ klasörüne örnek görseller
//   node src/daily.js hazirla                  -> bugünün görselini posts/ içine üretir (GitHub Actions)
//   node src/daily.js paylas                   -> bugünün görselini Instagram'a paylaşır (GitHub Actions)
//   node src/daily.js token APP_ID APP_SECRET KISA_TOKEN
//                                              -> süresiz token ve IG_USER_ID bulur (kurulumda bir kez)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gorselUret } from './image.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const sozler = JSON.parse(fs.readFileSync(path.join(ROOT, 'quotes.json'), 'utf8'));
const POSTS = path.join(ROOT, 'posts');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pad = (n) => String(n).padStart(2, '0');

// Türkiye saati (UTC+3, yaz/kış saati uygulaması yok)
function trSimdi() {
  const t = new Date(Date.now() + 3 * 3600e3);
  return {
    tarih: `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`,
    dakika: t.getUTCHours() * 60 + t.getUTCMinutes(),
    saniye: t.getUTCSeconds(),
  };
}

function gununSozu(tarih) {
  // baslangicSirasi: elle paylaşılan ilk postlar tekrar etmesin diye bot listeye bu sıradan başlar
  const gun = Math.round((Date.parse(tarih) - Date.parse(config.baslangicTarihi)) / 864e5) + (config.baslangicSirasi || 0);
  const n = sozler.length;
  return sozler[((gun % n) + n) % n];
}

function cumaMi(tarih) {
  return new Date(`${tarih}T12:00:00Z`).getUTCDay() === 5;
}

function aciklama(soz, cuma, kapanis) {
  return [
    soz.metin,
    '',
    `— ${soz.kaynak}`,
    '',
    kapanis || (cuma ? 'Hayırlı cumalar 🤍' : 'Hayırlı akşamlar 🤍'),
    '',
    config.hashtagler,
  ].join('\n');
}

function cikti(anahtar, deger) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${anahtar}=${deger}\n`);
}

async function onizleme(adet = 5) {
  const klasor = path.join(ROOT, 'onizleme');
  fs.mkdirSync(klasor, { recursive: true });
  for (let i = 0; i < Math.min(adet, sozler.length); i++) {
    const jpg = await gorselUret(sozler[i], { hesapAdi: config.hesapAdi, cuma: false });
    fs.writeFileSync(path.join(klasor, `${pad(i + 1)}.jpg`), jpg);
  }
  const uzun = sozler.reduce((a, b) => (b.metin.length > a.metin.length ? b : a));
  fs.writeFileSync(path.join(klasor, 'cuma.jpg'), await gorselUret(uzun, { hesapAdi: config.hesapAdi, cuma: true }));
  console.log(`Önizlemeler hazır: ${klasor}`);
}

// Profili doldurmak için elle paylaşılacak ilk postlar (görsel + açıklama)
async function ilkPostlar(adet = 9) {
  const klasor = path.join(ROOT, 'ilk-postlar');
  fs.mkdirSync(klasor, { recursive: true });
  // Bugünden başlayarak her gün bir post, paylaşım saatinde
  const bas = new Date(`${trSimdi().tarih}T12:00:00Z`);
  const fmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: 'UTC' });
  const hepsi = [];
  for (let i = 0; i < adet; i++) {
    const soz = sozler[i];
    const no = pad(i + 1);
    const gun = new Date(bas.getTime() + i * 864e5);
    const cuma = gun.getUTCDay() === 5;
    const metin = aciklama(soz, cuma);
    fs.writeFileSync(path.join(klasor, `${no}.jpg`), await gorselUret(soz, { hesapAdi: config.hesapAdi, cuma }));
    hepsi.push(`===== POST ${no} (${no}.jpg) → ${fmt.format(gun)} ${config.paylasimSaati} =====\n${metin}\n`);
  }
  fs.writeFileSync(path.join(klasor, 'ACIKLAMALAR.txt'), hepsi.join('\n'));
  const botBaslangic = new Date(bas.getTime() + adet * 864e5).toISOString().slice(0, 10);
  console.log(`${adet} post hazır: ${klasor}\nBot için config.json -> "baslangicTarihi": "${botBaslangic}", "baslangicSirasi": ${adet}`);
}

async function hazirla() {
  const simdi = trSimdi();
  const tarih = simdi.tarih;
  cikti('date', tarih);

  if (fs.existsSync(path.join(POSTS, `${tarih}.done`))) {
    console.log(`${tarih} zaten paylaşılmış, atlanıyor.`);
    cikti('skip', 'true');
    return;
  }

  if (process.env.HEMEN !== 'true') {
    const [hh, mm] = config.paylasimSaati.split(':').map(Number);
    const kalan = hh * 60 + mm - simdi.dakika;
    if (kalan > 150) {
      console.log('Paylaşım saatine çok var, bu çalıştırma atlanıyor.');
      cikti('skip', 'true');
      return;
    }
    if (kalan > 0) {
      console.log(`Paylaşım saatine ${kalan} dakika var, bekleniyor...`);
      await sleep(kalan * 60e3 - simdi.saniye * 1000);
    }
  }

  const soz = gununSozu(tarih);
  const cuma = cumaMi(tarih);
  fs.mkdirSync(POSTS, { recursive: true });
  fs.writeFileSync(path.join(POSTS, `${tarih}.jpg`), await gorselUret(soz, { hesapAdi: config.hesapAdi, cuma }));
  fs.writeFileSync(path.join(POSTS, `${tarih}.txt`), aciklama(soz, cuma));
  console.log(`Görsel hazır: posts/${tarih}.jpg\n${soz.metin} — ${soz.kaynak}`);
  cikti('skip', 'false');
}

async function api(method, url, params = {}) {
  const res =
    method === 'POST'
      ? await fetch(url, { method, body: new URLSearchParams(params) })
      : await fetch(`${url}${url.includes('?') ? '&' : '?'}${new URLSearchParams(params)}`);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`Instagram API hatası: ${JSON.stringify(json.error || json)}`);
  return json;
}

async function paylas() {
  const tarih = process.env.POST_DATE || trSimdi().tarih;
  const { IG_USER_ID, IG_ACCESS_TOKEN, GITHUB_REPOSITORY } = process.env;
  if (!IG_USER_ID || !IG_ACCESS_TOKEN) throw new Error('IG_USER_ID ve IG_ACCESS_TOKEN secret olarak eklenmemiş.');
  const dal = process.env.GITHUB_REF_NAME || 'main';
  const gorselUrl = `https://raw.githubusercontent.com/${GITHUB_REPOSITORY}/${dal}/posts/${tarih}.jpg`;
  const caption = fs.readFileSync(path.join(POSTS, `${tarih}.txt`), 'utf8');

  // Görsel GitHub'a yüklenip erişilebilir olana kadar bekle
  for (let i = 0; ; i++) {
    const r = await fetch(gorselUrl, { method: 'HEAD' });
    if (r.ok) break;
    if (i >= 36) throw new Error(`Görsele erişilemiyor: ${gorselUrl} (repo public mi?)`);
    await sleep(5000);
  }

  const base = `https://${config.apiHost}/${config.apiVersion}`;
  const token = { access_token: IG_ACCESS_TOKEN };
  const kap = await api('POST', `${base}/${IG_USER_ID}/media`, { image_url: gorselUrl, caption, ...token });

  for (let i = 0; ; i++) {
    const { status_code } = await api('GET', `${base}/${kap.id}`, { fields: 'status_code', ...token });
    if (status_code === 'FINISHED') break;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`Medya işlenemedi: ${status_code}`);
    if (i >= 60) throw new Error('Medya işleme zaman aşımı');
    await sleep(5000);
  }

  const sonuc = await api('POST', `${base}/${IG_USER_ID}/media_publish`, { creation_id: kap.id, ...token });
  fs.writeFileSync(path.join(POSTS, `${tarih}.done`), JSON.stringify({ mediaId: sonuc.id, zaman: new Date().toISOString() }));
  console.log(`✅ Paylaşıldı! Medya ID: ${sonuc.id}`);
}

async function tokenAl(appId, appSecret, kisaToken) {
  if (!appId || !appSecret || !kisaToken) {
    console.log('Kullanım: node src/daily.js token APP_ID APP_SECRET KISA_TOKEN');
    process.exit(1);
  }
  const base = `https://graph.facebook.com/${config.apiVersion}`;
  const uzun = await api('GET', `${base}/oauth/access_token`, {
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: kisaToken,
  });
  const sayfalar = await api('GET', `${base}/me/accounts`, {
    fields: 'name,access_token,instagram_business_account{username}',
    access_token: uzun.access_token,
  });
  const bagli = sayfalar.data.filter((s) => s.instagram_business_account);
  if (!bagli.length) {
    console.log('Instagram hesabı bağlı bir Facebook sayfası bulunamadı. KURULUM.md adım 1\'e bak.');
    return;
  }
  for (const s of bagli) {
    console.log(`\nSayfa: ${s.name}  →  Instagram: @${s.instagram_business_account.username}`);
    console.log(`IG_USER_ID      = ${s.instagram_business_account.id}`);
    console.log(`IG_ACCESS_TOKEN = ${s.access_token}`);
  }
  console.log('\nBu iki değeri GitHub reposunda Settings → Secrets and variables → Actions kısmına ekle.');
}

const [komut, ...arg] = process.argv.slice(2);
const komutlar = {
  onizleme: () => onizleme(Number(arg[0]) || 5),
  ilkpostlar: () => ilkPostlar(Number(arg[0]) || 9),
  hazirla,
  paylas,
  token: () => tokenAl(...arg),
};
if (!komutlar[komut]) {
  console.log('Komutlar: onizleme | hazirla | paylas | token');
  process.exit(1);
}
komutlar[komut]().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
