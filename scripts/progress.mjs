import fs from 'fs';

// ---------- 可調參數 ----------
const GRID_COLS = parseInt(process.env.GRID_COLS || '20', 10);
const GRID_ROWS = parseInt(process.env.GRID_ROWS || '10', 10);
const CELL = parseInt(process.env.CELL || '12', 10);    // 每顆方塊大小 px
const GAP  = parseInt(process.env.GAP  || '3', 10);     // 間距 px
const COLOR_FILL  = process.env.COLOR_FILL  || '#2ea043'; // 綠
const COLOR_EMPTY = process.env.COLOR_EMPTY || '#e5e7eb'; // 淺灰
const UNITS = parseInt(process.env.UNITS || '1', 10);     // 本次要增加的色塊數
const TZ = process.env.TZ || 'Asia/Taipei';
const DATA_PATH = 'data/progress.json';
const OUT_SVG = 'assets/progress.svg';
const MILESTONES = (process.env.MILESTONES || '50,100,200').split(',').map(n => parseInt(n,10)).filter(Boolean);

// ---------- 讀資料 ----------
fs.mkdirSync('data', { recursive: true });
let data = { total: 0, dates: {} };
if (fs.existsSync(DATA_PATH)) {
  data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

// 以台北時區記錄今天
const nowStr = new Date().toLocaleString('en-US', { timeZone: TZ });
const d = new Date(nowStr);
const today = d.toISOString().slice(0, 10);

// ---------- 累積 ----------
data.dates[today] = (data.dates[today] || 0) + UNITS;
data.total = Object.values(data.dates).reduce((a, b) => a + b, 0);

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

// ---------- 產 SVG（積木風：從左到右、上到下填滿） ----------
fs.mkdirSync('assets', { recursive: true });
const maxCells = GRID_COLS * GRID_ROWS;
const filled = Math.min(data.total, maxCells);
const width = GRID_COLS * (CELL + GAP) - GAP;
const height = GRID_ROWS * (CELL + GAP) - GAP;

let rects = '';
for (let i = 0; i < maxCells; i++) {
  const row = Math.floor(i / GRID_COLS);
  const col = i % GRID_COLS;
  const x = col * (CELL + GAP);
  const y = row * (CELL + GAP);
  const color = i < filled ? COLOR_FILL : COLOR_EMPTY;
  rects += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" ry="2" fill="${color}"/>`;
}

const title = `Total blocks: ${data.total}`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
<title>${title}</title>
${rects}
</svg>`;

fs.writeFileSync(OUT_SVG, svg);

// ---------- 輸出里程碑狀態供 workflow 使用 ----------
const hit = MILESTONES.find(m => data.total === m);
if (hit) {
  fs.writeFileSync('data/.milestone_hit', String(hit));
} else if (fs.existsSync('data/.milestone_hit')) {
  fs.rmSync('data/.milestone_hit');
}

console.log(`✅ Updated progress to ${data.total}. SVG: ${OUT_SVG}`);
