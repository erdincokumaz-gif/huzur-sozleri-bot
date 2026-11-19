// Instagram için 1080x1350 (4:5) söz görseli üretir.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
GlobalFonts.registerFromPath(path.join(ROOT, 'fonts', 'Lora.ttf'), 'Lora');
GlobalFonts.registerFromPath(path.join(ROOT, 'fonts', 'Lora-Italic.ttf'), 'Lora Italic');

const W = 1080;
const H = 1350;
const RENK = {
  ust: '#0a2a2f',
  alt: '#0f3d38',
  altin: '#d8b866',
  yazi: '#f6f0e1',
};
const ETIKET = { ayet: 'GÜNÜN AYETİ', hadis: 'GÜNÜN HADİSİ', soz: 'GÜNÜN SÖZÜ' };

function altin(alpha) {
  return `rgba(216, 184, 102, ${alpha})`;
}

// Harf aralıklı, ortalanmış yazı
function aralikliYazi(ctx, text, cx, y, spacing) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - total / 2;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + spacing;
  });
}

function elmas(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fill();
}

// —— ◆ —— şeklinde ayraç
function ayrac(ctx, y, yariGenislik) {
  ctx.strokeStyle = altin(0.7);
  ctx.fillStyle = RENK.altin;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - yariGenislik, y);
  ctx.lineTo(W / 2 - 16, y);
  ctx.moveTo(W / 2 + 16, y);
  ctx.lineTo(W / 2 + yariGenislik, y);
  ctx.stroke();
  elmas(ctx, W / 2, y, 7);
}

function satirlaraBol(ctx, metin, maxW) {
  const satirlar = [];
  for (const paragraf of metin.split('\n')) {
    let satir = '';
    for (const kelime of paragraf.split(/\s+/).filter(Boolean)) {
      const deneme = satir ? `${satir} ${kelime}` : kelime;
      if (ctx.measureText(deneme).width > maxW && satir) {
        satirlar.push(satir);
        satir = kelime;
      } else {
        satir = deneme;
      }
    }
    if (satir) satirlar.push(satir);
  }
  return satirlar;
}

/**
 * @param {{tur: string, metin: string, kaynak: string}} soz
 * @param {{hesapAdi: string, cuma: boolean}} secenek
 * @returns {Promise<Buffer>} JPEG
 */
export async function gorselUret(soz, { hesapAdi, cuma }) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Arka plan
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, RENK.ust);
  g.addColorStop(1, RENK.alt);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const isik = ctx.createRadialGradient(W / 2, 420, 0, W / 2, 420, 720);
  isik.addColorStop(0, altin(0.14));
  isik.addColorStop(1, altin(0));
  ctx.fillStyle = isik;
  ctx.fillRect(0, 0, W, H);

  // Çerçeve
  ctx.strokeStyle = altin(0.6);
  ctx.lineWidth = 2;
  ctx.strokeRect(44, 44, W - 88, H - 88);
  ctx.strokeStyle = altin(0.25);
  ctx.lineWidth = 1;
  ctx.strokeRect(58, 58, W - 116, H - 116);
  ctx.fillStyle = RENK.altin;
  for (const [x, y] of [[44, 44], [W - 44, 44], [44, H - 44], [W - 44, H - 44]]) elmas(ctx, x, y, 9);

  // Üst etiket
  ctx.textBaseline = 'middle';
  ctx.fillStyle = RENK.altin;
  ctx.font = '30px Lora';
  aralikliYazi(ctx, cuma ? 'HAYIRLI CUMALAR' : ETIKET[soz.tur] || ETIKET.soz, W / 2, 180, 7);
  ayrac(ctx, 228, 110);

  // Söz: sığana kadar puntoyu küçült
  const alanUst = 290;
  const alanAlt = 1130;
  const kaynakPayi = 140;
  const maxW = 780;
  let boyut = 74;
  let satirlar;
  let satirYuk;
  // Şiirde (birden çok dize) her dize tek satıra sığacak puntoyu tercih et
  const dizeSayisi = soz.metin.split('\n').length;
  if (dizeSayisi > 1) {
    for (let b = 74; b >= 44; b -= 2) {
      ctx.font = `${b}px Lora`;
      if (satirlaraBol(ctx, soz.metin, maxW + 60).length === dizeSayisi) {
        boyut = b;
        break;
      }
    }
  }
  for (; boyut >= 34; boyut -= 2) {
    ctx.font = `${boyut}px Lora`;
    satirlar = satirlaraBol(ctx, soz.metin, dizeSayisi > 1 ? maxW + 60 : maxW);
    satirYuk = boyut * 1.38;
    if (satirlar.length * satirYuk <= alanAlt - alanUst - kaynakPayi) break;
  }
  const blok = satirlar.length * satirYuk;
  let y = alanUst + (alanAlt - alanUst - blok - kaynakPayi) / 2;

  ctx.fillStyle = RENK.yazi;
  ctx.textAlign = 'center';
  for (const s of satirlar) {
    ctx.fillText(s, W / 2, y + satirYuk / 2);
    y += satirYuk;
  }

  // Kaynak
  ayrac(ctx, y + 50, 70);
  ctx.fillStyle = RENK.altin;
  ctx.textAlign = 'center';
  ctx.font = 'italic 34px "Lora Italic"';
  ctx.fillText(soz.kaynak, W / 2, y + 110);

  // Hesap adı
  ctx.fillStyle = altin(0.75);
  ctx.font = '26px Lora';
  aralikliYazi(ctx, hesapAdi, W / 2, H - 110, 3);

  return canvas.encode('jpeg', 92);
}
