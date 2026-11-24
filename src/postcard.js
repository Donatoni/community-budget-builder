// Shared drawing commands for the browser export and server social preview.
import { costCenterPlan } from './cost-centers.js';
import { SERVICES, PROPOSED_TOTAL, fmtM } from './budget.js';

const COLORS = ['#c45e45', '#396bc5', '#b08028', '#408466', '#8b64ad', '#3d8a97'];
export const THEMES = {
  daylight: { paper: '#edf5fc', ink: '#15285b', muted: '#637089', line: '#dbe4ef', accent: '#2864ed', panel: '#ffffff' },
  bluehour: { paper: '#172e48', ink: '#f3efdf', muted: '#b7c9cf', line: '#38536b', accent: '#b4dbde', panel: '#213e56' },
  citrus: { paper: '#ffe5a3', ink: '#563e28', muted: '#8a6744', line: '#dcc080', accent: '#e88854', panel: '#fff1cb' },
};
export const HEADLINES = [['My kind of', 'DeLand.'], ['Small city.', 'Big choices.'], ['Our city.', 'My take.']];
function box(ctx, x, y, w, h, r, fill) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
}
function text(ctx, value, x, y, size, color, weight = 500, align = 'left') {
  ctx.font = `${weight} ${size}px Inter, sans-serif`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(value, x, y);
}
function line(ctx, x, y, x2, y2, color) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
}

export function paintPostcard(ctx, values, { theme = 'daylight', headline = 0, side = 'front', revenues = [], millageRate } = {}, { seal, illustration } = {}) {
  const t = THEMES[theme] || THEMES.daylight;
  const total = values.reduce((sum, value) => sum + value, 0);
  const cut = PROPOSED_TOTAL - total;
  const revenue = costCenterPlan([], revenues, millageRate).revenue / 1e6;
  ctx.clearRect(0, 0, 1080, 1350);
  ctx.fillStyle = t.paper; ctx.fillRect(0, 0, 1080, 1350);
  // A restrained paper grid keeps the graphic tactile without raster assets.
  ctx.save(); ctx.globalAlpha = 0.35;
  for (let x = 30; x < 1080; x += 30) for (let y = 25; y < 1350; y += 30) {
    ctx.fillStyle = t.line; ctx.fillRect(x, y, 1.5, 1.5);
  }
  ctx.restore();
  if (seal) ctx.drawImage(seal, 58, 54, 64, 64);
  text(ctx, 'DELAND / FLORIDA', 140, 80, 22, t.ink, 700);
  text(ctx, 'A FUTURE BUILT BY ALL OF US', 140, 109, 15, t.muted, 500);
  text(ctx, side === 'front' ? 'MY CITY, MY CHOICES' : 'THE OTHER SIDE OF THE STORY', 1018, 92, 16, t.muted, 600, 'right');
  line(ctx, 60, 145, 1020, 145, t.line);

  if (side === 'front') {
    const title = HEADLINES[headline] || HEADLINES[0];
    text(ctx, title[0], 60, 265, 90, t.ink, 800);
    text(ctx, title[1], 55, 377, 108, t.ink, 800);
    // Postmark, deliberately presented as a personal proposal, not approval.
    ctx.save(); ctx.translate(920, 288); ctx.rotate(0.13);
    ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.arc(0, 0, 77, 0, Math.PI * 2); ctx.strokeStyle = t.muted; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    text(ctx, 'ONE CITY', 0, -23, 17, t.ink, 700, 'center');
    text(ctx, 'MANY', 0, 8, 26, t.ink, 800, 'center');
    text(ctx, 'POSSIBILITIES', 0, 35, 12, t.muted, 600, 'center'); ctx.restore();
    // Painted landmark puzzle; funding is represented by the real figures below
    // and on the reverse, rather than by changing the depicted city buildings.
    ctx.save();
    ctx.beginPath(); ctx.roundRect(60, 422, 960, 576, 18); ctx.clip();
    const scale = Math.max(960 / illustration.width, 576 / illustration.height);
    const width = illustration.width * scale;
    const height = illustration.height * scale;
    ctx.drawImage(illustration, 60 + (960 - width) / 2, 422 + (576 - height) / 2, width, height);
    ctx.restore();
    text(ctx, 'OUR CITY. BUILT PIECE BY PIECE.', 540, 1035, 18, t.muted, 600, 'center');
    box(ctx, 60, 1070, 960, 150, 18, t.panel);
    const stats = [['MY CITY BUDGET', fmtM(total)], ['GAP CLOSED', fmtM(cut + revenue)], ['POTENTIAL REVENUE', fmtM(revenue)]];
    stats.forEach(([label, value], index) => {
      const x = 88 + index * 320;
      if (index) line(ctx, x - 18, 1100, x - 18, 1190, t.line);
      text(ctx, label, x, 1112, 15, t.muted, 600);
      text(ctx, value, x, 1180, 53, t.ink, 700);
    });
  } else {
    text(ctx, 'The choices', 60, 265, 86, t.ink, 800);
    text(ctx, 'behind my city.', 60, 364, 86, t.ink, 800);
    text(ctx, `${fmtM(total)} city budget  /  ${fmtM(cut + revenue)} gap closed`, 64, 428, 27, t.muted, 500);
    text(ctx, 'ANNUAL FUNDING', 65, 490, 15, t.muted, 600);
    text(ctx, 'MY PLAN / CHANGE FROM BUDGET', 1015, 490, 15, t.muted, 600, 'right');
    SERVICES.forEach((service, i) => {
      const y = 518 + i * 109;
      text(ctx, String(i + 1).padStart(2, '0'), 65, y + 29, 19, COLORS[i], 700);
      text(ctx, service.name, 115, y + 29, 27, t.ink, 600);
      text(ctx, fmtM(values[i]), 1015, y + 27, 31, t.ink, 700, 'right');
      const delta = values[i] - service.proposed;
      text(ctx, Math.abs(delta) < 0.0000005 ? 'No change' : `${delta > 0 ? '+' : '−'}${fmtM(Math.abs(delta))}`, 1015, y + 59, 17, t.muted, 500, 'right');
      box(ctx, 115, y + 53, 620, 9, 4, t.line);
      const fillWidth = 620 * values[i] / 20;
      if (fillWidth > 0) box(ctx, 115, y + 53, fillWidth, 9, Math.min(4, fillWidth / 2), COLORS[i]);
      const marker = 115 + 620 * service.proposed / 20;
      line(ctx, marker, y + 47, marker, y + 70, t.ink);
      line(ctx, 65, y + 91, 1015, y + 91, t.line);
    });
    text(ctx, `Potential revenue: ${fmtM(revenue)}  /  Net service cuts: ${fmtM(cut)}`, 65, 1145, 24, t.ink, 600);
    text(ctx, '| FY 26/27 budget     • Bars share a $0–$20M scale', 65, 1210, 18, t.muted, 500);
  }
  text(ctx, 'What would your DeLand look like?', 60, 1290, 26, t.ink, 600);
  text(ctx, 'BUILD YOURS', 994, 1290, 18, t.ink, 700, 'right');
  line(ctx, 1006, 1283, 1020, 1283, t.ink);
  line(ctx, 1014, 1277, 1020, 1283, t.ink);
  line(ctx, 1014, 1289, 1020, 1283, t.ink);
  text(ctx, 'Personal budget proposal · FY 2026/27 · Painted DeLand landmarks', 60, 1325, 14, t.muted, 400);
}
