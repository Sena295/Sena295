// Gera assets/stats.svg (estatísticas do GitHub) no mesmo estilo do card de linguagens.
// Substitui o github-readme-stats.vercel.app, que está fora do ar (503 DEPLOYMENT_PAUSED).
// Roda na GitHub Action .github/workflows/languages.yml (a cada hora).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const USER = process.env.USERNAME;
const TOKEN = process.env.GITHUB_TOKEN;
const OUTPUT = 'assets/stats.svg';
const THEME = { bg: '#0D0D0D', title: '#E11D2E', text: '#FFFFFF', muted: '#9CA3AF', border: '#333333' };

async function api(path) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': USER };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch('https://api.github.com' + path, { headers });
  if (!res.ok) throw new Error(`GitHub respondeu ${res.status} em ${path}`);
  return res.json();
}

const user = await api(`/users/${USER}`);
const repos = (await api(`/users/${USER}/repos?per_page=100&type=owner`)).filter(r => !r.fork);
const [commits, prs, issues] = await Promise.all([
  api(`/search/commits?q=author:${USER}&per_page=1`),
  api(`/search/issues?q=author:${USER}+type:pr&per_page=1`),
  api(`/search/issues?q=author:${USER}+type:issue&per_page=1`),
]);

const items = [
  ['Public Repos', user.public_repos],
  ['Total Stars', repos.reduce((n, r) => n + r.stargazers_count, 0)],
  ['Total Commits', commits.total_count],
  ['Pull Requests', prs.total_count],
  ['Issues', issues.total_count],
  ['Followers', user.followers],
];

const W = 420, H = 195, PAD = 25;
const cells = items.map(([label, value], i) => {
  const col = i % 2, row = Math.floor(i / 2);
  const x = PAD + col * 185, y = 80 + row * 44;
  return `<text x="${x}" y="${y}" class="value">${Number(value).toLocaleString('en-US')}</text>` +
    `<text x="${x}" y="${y + 16}" class="label">${label}</text>`;
}).join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">
<title id="t">GitHub Statistics</title>
<style>
  .title { font: 600 18px 'Segoe UI', Ubuntu, sans-serif; fill: ${THEME.title}; }
  .value { font: 600 20px 'Segoe UI', Ubuntu, sans-serif; fill: ${THEME.text}; }
  .label { font: 400 12px 'Segoe UI', Ubuntu, sans-serif; fill: ${THEME.muted}; }
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="4.5" fill="${THEME.bg}" stroke="${THEME.border}"/>
<text x="${PAD}" y="35" class="title">GitHub Statistics</text>
${cells}
</svg>
`;

let previous = '';
try { previous = readFileSync(OUTPUT, 'utf8'); } catch {}
if (svg === previous) {
  console.log('Sem mudanças nas estatísticas.');
} else {
  mkdirSync('assets', { recursive: true });
  writeFileSync(OUTPUT, svg);
  console.log('Atualizado:', items.map(([l, v]) => `${l} ${v}`).join(', '));
}
