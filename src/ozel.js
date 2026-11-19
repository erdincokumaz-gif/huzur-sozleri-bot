// Özel gün görseli (Cuma, kandil, bayram...): günlük paylaşımdan bağımsız.
// Kullanım: node src/ozel.js <dosya-adi> "<BAŞLIK>" "<mesaj>"
// Çıktı: ozel/<dosya-adi>.jpg  (GitHub'a push'lanınca Make "Özel paylaşım" senaryosu bunu paylaşır)
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
GlobalFonts.registerFromPath(path.join(ROOT, 'fonts', 'Lora.ttf'), 'Lora');
GlobalFonts.registerFromPath(path.join(ROOT, 'fonts', 'Lora-Italic.ttf'), 'Lora Italic');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));

const W = 1080;
const H = 1350;
const ALTIN = '#d8b866';
const altin = (a) => `rgba(216, 184, 102, ${a})`;

function elmas(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fill();
}

function aralikli(ctx, text, cx, y, spacing) {
  const chars = [...text];
  const ws = chars.map((c) => ctx.measureText(c).width);
  let x = cx - (ws.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1)) / 2;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += ws[i] + spacing;
  });
}

function ayrac(ctx, y, yari) {
  ctx.strokeStyle = altin(0.75);
  ctx.fillStyle = ALTIN;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - yari, y);
  ctx.lineTo(W / 2 - 18, y);
  ctx.moveTo(W / 2 + 18, y);
  ctx.lineTo(W / 2 + yari, y);
  ctx.stroke();
  elmas(ctx, W / 2, y, 8);
}

function hilal(ctx, cx, cy, r) {
  const k = createCanvas(r * 2 + 4, r * 2 + 4);
  const c = k.getContext('2d');
  c.fillStyle = ALTIN;
  c.beginPath();
  c.arc(r + 2, r + 2, r, 0, Math.PI * 2);
  c.fill();
  c.globalCompositeOperation = 'destination-out';
  c.beginPath();
  c.arc(r + 2 + r * 0.38, r + 2 - r * 0.12, r * 0.84, 0, Math.PI * 2);
  c.fill();
  ctx.drawImage(k, cx - r - 2, cy - r - 2);
}

function yildiz(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function satirlar(ctx, metin, maxW) {
  const out = [];
  for (const p of metin.split('\n')) {
    let s = '';
    for (const k of p.split(/\s+/).filter(Boolean)) {
      const d = s ? `${s} ${k}` : k;
      if (ctx.measureText(d).width > maxW && s) {
        out.push(s);
        s = k;
      } else s = d;
    }
    if (s) out.push(s);
  }
  return out;
}

const [ad, baslik, mesaj] = process.argv.slice(2);
if (!ad || !baslik || !mesaj) {
  console.log('Kullanım: node src/ozel.js <dosya-adi> "<BAŞLIK>" "<mesaj>"');
  process.exit(1);
}

const cv = createCanvas(W, H);
const ctx = cv.getContext('2d');

// Zemin: günlük postlardan biraz daha koyu ve ışıltılı
const g = ctx.createLinearGradient(0, 0, 0, H);
g.addColorStop(0, '#08242a');
g.addColorStop(1, '#0d3a34');
ctx.fillStyle = g;
ctx.fillRect(0, 0, W, H);
const isik = ctx.createRadialGradient(W / 2, 330, 0, W / 2, 330, 650);
isik.addColorStop(0, altin(0.24));
isik.addColorStop(1, altin(0));
ctx.fillStyle = isik;
ctx.fillRect(0, 0, W, H);

// Serpiştirilmiş küçük yıldızlar (sabit tohumla, her seferinde aynı)
let tohum = 7;
const rnd = () => ((tohum = (tohum * 16807) % 2147483647) / 2147483647);
for (let i = 0; i < 38; i++) {
  const x = 90 + rnd() * (W - 180);
  const y = 90 + rnd() * 250;
  if (Math.abs(x - W / 2) < 140 && y > 150) continue; // hilalin üstüne binmesin
  ctx.fillStyle = altin(0.25 + rnd() * 0.45);
  yildiz(ctx, x, y, 2 + rnd() * 4);
}

// Çerçeve
ctx.strokeStyle = altin(0.65);
ctx.lineWidth = 2;
ctx.strokeRect(44, 44, W - 88, H - 88);
ctx.strokeStyle = altin(0.25);
ctx.lineWidth = 1;
ctx.strokeRect(58, 58, W - 116, H - 116);
ctx.fillStyle = ALTIN;
for (const [x, y] of [[44, 44], [W - 44, 44], [44, H - 44], [W - 44, H - 44]]) elmas(ctx, x, y, 9);

// Hilal + yıldız
hilal(ctx, W / 2 - 10, 250, 70);
ctx.fillStyle = ALTIN;
yildiz(ctx, W / 2 + 62, 228, 16);

// Başlık
ctx.textBaseline = 'middle';
ctx.fillStyle = '#f6f0e1';
ctx.textAlign = 'center';
ctx.font = '96px Lora';
ctx.fillText(baslik, W / 2, 440);
ayrac(ctx, 530, 140);

// Mesaj (italik, ortalı, sığana kadar küçülür)
ctx.fillStyle = '#f6f0e1';
let boyut = 54;
let sat;
for (; boyut >= 34; boyut -= 2) {
  ctx.font = `italic ${boyut}px "Lora Italic"`;
  sat = satirlar(ctx, mesaj, 800);
  if (sat.length * boyut * 1.5 <= 520) break;
}
const lh = boyut * 1.5;
let y = 600 + (520 - sat.length * lh) / 2;
ctx.textAlign = 'center';
for (const s of sat) {
  ctx.fillText(s, W / 2, y + lh / 2);
  y += lh;
}

// Alt: hesap adı
ayrac(ctx, H - 180, 70);
ctx.fillStyle = altin(0.8);
ctx.font = '28px Lora';
aralikli(ctx, config.hesapAdi, W / 2, H - 120, 3);

const klasor = path.join(ROOT, 'ozel');
fs.mkdirSync(klasor, { recursive: true });
fs.writeFileSync(path.join(klasor, `${ad}.jpg`), await cv.encode('jpeg', 92));
console.log(`Hazır: ozel/${ad}.jpg`);
