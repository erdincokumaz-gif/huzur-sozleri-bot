// Profil fotoğrafı (1080x1080) ve Facebook kapak görseli (1640x624) üretir -> marka/ klasörü
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
GlobalFonts.registerFromPath(path.join(ROOT, 'fonts', 'Lora.ttf'), 'Lora');
GlobalFonts.registerFromPath(path.join(ROOT, 'fonts', 'Lora-Italic.ttf'), 'Lora Italic');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));

const ALTIN = '#d8b866';
const altin = (a) => `rgba(216, 184, 102, ${a})`;

function zemin(ctx, w, h, isikX, isikY, isikR) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0a2a2f');
  g.addColorStop(1, '#0f3d38');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const r = ctx.createRadialGradient(isikX, isikY, 0, isikX, isikY, isikR);
  r.addColorStop(0, altin(0.2));
  r.addColorStop(1, altin(0));
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, w, h);
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

function ayrac(ctx, cx, y, yari) {
  ctx.strokeStyle = altin(0.75);
  ctx.fillStyle = ALTIN;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - yari, y);
  ctx.lineTo(cx - 22, y);
  ctx.moveTo(cx + 22, y);
  ctx.lineTo(cx + yari, y);
  ctx.stroke();
  elmas(ctx, cx, y, 10);
}

// Hilal: büyük daireden kaydırılmış daire çıkarılır
function hilal(ctx, cx, cy, r) {
  // Ayrı şeffaf katmanda çizilir, sonra zemine yapıştırılır
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

async function profil() {
  const S = 1080;
  const cv = createCanvas(S, S);
  const ctx = cv.getContext('2d');
  zemin(ctx, S, S, S / 2, S * 0.42, S * 0.6);

  // Instagram profili daire kırpar: süslemeler dairenin içinde kalmalı
  ctx.strokeStyle = altin(0.7);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, 440, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = altin(0.3);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, 418, 0, Math.PI * 2);
  ctx.stroke();

  hilal(ctx, S / 2, 330, 78);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f6f0e1';
  ctx.textAlign = 'center';
  ctx.font = '210px Lora';
  ctx.fillText('Huzur', S / 2, 545);

  ayrac(ctx, S / 2, 680, 150);

  ctx.fillStyle = ALTIN;
  ctx.font = '62px Lora';
  aralikli(ctx, 'SÖZLERİ', S / 2, 770, 18);

  return cv.encode('jpeg', 95);
}

async function kapak() {
  const W = 1640;
  const H = 624;
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  zemin(ctx, W, H, W / 2, H * 0.45, 700);

  ctx.strokeStyle = altin(0.55);
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.fillStyle = ALTIN;
  for (const [x, y] of [[36, 36], [W - 36, 36], [36, H - 36], [W - 36, H - 36]]) elmas(ctx, x, y, 8);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f6f0e1';
  ctx.textAlign = 'center';
  ctx.font = 'italic 64px "Lora Italic"';
  ctx.fillText('Bilesiniz ki kalpler ancak', W / 2, 215);
  ctx.fillText("Allah'ı anmakla huzur bulur.", W / 2, 300);

  ctx.fillStyle = ALTIN;
  ctx.font = 'italic 30px "Lora Italic"';
  ctx.fillText("Ra'd Sûresi, 28", W / 2, 370);

  ayrac(ctx, W / 2, 420, 110);

  ctx.font = '30px Lora';
  aralikli(ctx, `HER AKŞAM ${config.paylasimSaati}  ·  ${config.hesapAdi}`, W / 2, 480, 4);

  return cv.encode('jpeg', 95);
}

const klasor = path.join(ROOT, 'marka');
fs.mkdirSync(klasor, { recursive: true });
fs.writeFileSync(path.join(klasor, 'profil-fotografi.jpg'), await profil());
fs.writeFileSync(path.join(klasor, 'facebook-kapak.jpg'), await kapak());
console.log(`Hazır: ${klasor}`);
