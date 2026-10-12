// Gera assets/languages.svg com as linguagens dos repositórios públicos do usuário.
// Roda na GitHub Action .github/workflows/languages.yml (a cada hora).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const USER = process.env.USERNAME;
const TOKEN = process.env.GITHUB_TOKEN;
const OUTPUT = 'assets/languages.svg';
const MAX_LANGS = 8;
// Mesmo cálculo do github-readme-stats: peso = bytes^SIZE_WEIGHT * repositórios^COUNT_WEIGHT
const SIZE_WEIGHT = 1;
const COUNT_WEIGHT = 0;
const EXCLUDE = [];  // linguagens a esconder, ex.: ['Jupyter Notebook']

// Cores oficiais do GitHub (linguist)
const COLORS = {
  'C': '#555555', 'C#': '#178600', 'C++': '#f34b7d', 'CSS': '#663399', 'Dart': '#00B4AB',
  'Dockerfile': '#384d54', 'GDScript': '#355570', 'Go': '#00ADD8', 'HTML': '#e34c26', 'Java': '#b07219',
  'JavaScript': '#f1e05a', 'Jupyter Notebook': '#DA5B0B', 'Kotlin': '#A97BFF', 'Lua': '#000080',
  'PHP': '#4F5D95', 'PLSQL': '#dad8d8', 'PowerShell': '#012456', 'Python': '#3572A5', 'R': '#198CE7',
  'Ruby': '#701516', 'Rust': '#dea584', 'SCSS': '#c6538c', 'Shell': '#89e051', 'Swift': '#F05138',
  'TSQL': '#e38c00', 'TypeScript': '#3178c6', 'Vue': '#41b883',
};
const THEME = { bg: '#0D0D0D', title: '#E11D2E', text: '#FFFFFF', border: '#333333' };

async function api(path) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': USER };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch('https://api.github.com' + path, { headers });
  if (!res.ok) throw new Error(`GitHub respondeu ${res.status} em ${path}`);
  return res.json();
}

const escape = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const repos = (await api(`/users/${USER}/repos?per_page=100&type=owner`)).filter(r => !r.fork);
const totals = {};
for (const repo of repos) {
  const langs = await api(`/repos/${USER}/${repo.name}/languages`);
  for (const [name, bytes] of Object.entries(langs)) {
    if (EXCLUDE.includes(name)) continue;
    totals[name] ??= { bytes: 0, repos: 0 };
    totals[name].bytes += bytes;
    totals[name].repos += 1;
  }
}

const ranked = Object.entries(totals)
  .map(([name, t]) => ({ name, weight: t.bytes ** SIZE_WEIGHT * t.repos ** COUNT_WEIGHT }))
  .sort((a, b) => b.weight - a.weight)
  .slice(0, MAX_LANGS);
const total = ranked.reduce((sum, l) => sum + l.weight, 0);
for (const l of ranked) l.percent = (l.weight / total) * 100;

// Layout compacto: título, barra única e legenda em duas colunas
const W = 420, PAD = 25, BAR_W = W - PAD * 2;
const rows = Math.ceil(ranked.length / 2);
const H = 95 + rows * 25;
let x = 0;
const bar = ranked.map(l => {
  const w = (l.percent / 100) * BAR_W;
  const rect = `<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="8" fill="${COLORS[l.name] || '#8b8b8b'}"/>`;
  x += w;
  return rect;
}).join('');
const legend = ranked.map((l, i) => {
  // preenche a coluna da esquerda primeiro, como o card original
  const col = i < rows ? 0 : 1, row = i < rows ? i : i - rows;
  const lx = PAD + col * (BAR_W / 2), ly = 92 + row * 25;
  return `<g transform="translate(${lx},${ly})"><circle cx="5" cy="-4" r="5" fill="${COLORS[l.name] || '#8b8b8b'}"/>` +
    `<text x="17" y="0" class="lang">${escape(l.name)} ${l.percent.toFixed(2)}%</text></g>`;
}).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">
<title id="t">Most Used Languages</title>
<style>
  .title { font: 600 18px 'Segoe UI', Ubuntu, sans-serif; fill: ${THEME.title}; }
  .lang { font: 400 12px 'Segoe UI', Ubuntu, sans-serif; fill: ${THEME.text}; }
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="4.5" fill="${THEME.bg}" stroke="${THEME.border}"/>
<text x="${PAD}" y="35" class="title">Most Used Languages</text>
<clipPath id="bar"><rect x="0" y="0" width="${BAR_W}" height="8" rx="5"/></clipPath>
<g transform="translate(${PAD},55)" clip-path="url(#bar)">${bar}</g>
${legend}
</svg>
`;

let previous = '';
try { previous = readFileSync(OUTPUT, 'utf8'); } catch {}
if (svg === previous) {
  console.log('Sem mudanças nas linguagens.');
} else {
  mkdirSync('assets', { recursive: true });
  writeFileSync(OUTPUT, svg);
  console.log('Atualizado:', ranked.map(l => `${l.name} ${l.percent.toFixed(2)}%`).join(', '));
}
