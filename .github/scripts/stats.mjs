// Gera assets/stats.svg reproduzindo o card do github-readme-stats (tema escuro/vermelho, rank_icon=github).
// Substitui o github-readme-stats.vercel.app, que está fora do ar (503 DEPLOYMENT_PAUSED).
// Roda na GitHub Action .github/workflows/languages.yml (a cada hora).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const USER = process.env.USERNAME;
const TOKEN = process.env.GITHUB_TOKEN;
const OUTPUT = 'assets/stats.svg';
const THEME = { bg: '#0D0D0D', title: '#E11D2E', text: '#FFFFFF', icon: '#E11D2E', border: '#333333' };

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

// Ícones octicons (viewBox 16x16), os mesmos usados pelo github-readme-stats
const ICONS = {
  star: 'M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z',
  commit: 'M10.5 7.75a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm1.43.75a4.002 4.002 0 01-7.86 0H.75a.75.75 0 110-1.5h3.32a4.001 4.001 0 017.86 0h3.32a.75.75 0 110 1.5h-3.32z',
  pr: 'M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z',
  issue: 'M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z',
  repo: 'M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z',
  github: 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z',
};

const stars = repos.reduce((n, r) => n + r.stargazers_count, 0);
const rows = [
  ['star', 'Total Stars Earned:', stars],
  ['commit', 'Total Commits:', commits.total_count],
  ['pr', 'Total PRs:', prs.total_count],
  ['issue', 'Total Issues:', issues.total_count],
  ['repo', 'Public Repos:', user.public_repos],
];

const W = 495, H = 195;
const name = (user.name || USER).trim();
const lines = rows.map(([icon, label, value], i) => {
  const y = 66 + i * 25;
  return `<g transform="translate(25,${y})">` +
    `<svg x="0" y="-13" viewBox="0 0 16 16" width="16" height="16"><path fill="${THEME.icon}" fill-rule="evenodd" d="${ICONS[icon]}"/></svg>` +
    `<text x="25" y="0" class="stat">${label}</text>` +
    `<text x="215" y="0" class="stat bold">${Number(value).toLocaleString('en-US')}</text></g>`;
}).join('\n');

// Círculo do rank (rank_icon=github): anel + logo do GitHub no centro
const R = 40, C = 2 * Math.PI * R;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">
<title id="t">${name}'s GitHub Stats</title>
<style>
  .header { font: 600 18px 'Segoe UI', Ubuntu, sans-serif; fill: ${THEME.title}; }
  .stat { font: 600 14px 'Segoe UI', Ubuntu, "Helvetica Neue", sans-serif; fill: ${THEME.text}; }
  .bold { font-weight: 700; }
</style>
<rect x="0.5" y="0.5" width="${W - 2}" height="${H - 1}" rx="4.5" fill="${THEME.bg}" stroke="${THEME.border}"/>
<text x="25" y="35" class="header">${name}'s GitHub Stats</text>
${lines}
<g transform="translate(400,${H / 2 + 5})">
  <circle r="${R}" fill="none" stroke="${THEME.title}" stroke-width="6" opacity="0.2"/>
  <circle r="${R}" fill="none" stroke="${THEME.title}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(C * 0.65).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90)"/>
  <svg x="-18" y="-18" viewBox="0 0 16 16" width="36" height="36"><path fill="${THEME.title}" d="${ICONS.github}"/></svg>
</g>
</svg>
`;

let previous = '';
try { previous = readFileSync(OUTPUT, 'utf8'); } catch {}
if (svg === previous) {
  console.log('Sem mudanças nas estatísticas.');
} else {
  mkdirSync('assets', { recursive: true });
  writeFileSync(OUTPUT, svg);
  console.log('Atualizado:', rows.map(([, l, v]) => `${l} ${v}`).join(', '));
}
