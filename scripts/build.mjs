import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { marked } from 'marked';

const site = JSON.parse(readFileSync('site.json', 'utf8'));
const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = d => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

const posts = readdirSync('content/posts').filter(f => f.endsWith('.md')).map(f => {
  const raw = readFileSync(`content/posts/${f}`, 'utf8');
  const [, head, body] = raw.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
  const meta = Object.fromEntries(head.split('\n').map(l => { const i = l.indexOf(': '); return [l.slice(0, i), JSON.parse(l.slice(i + 2))]; }));
  return { ...meta, body };
}).filter(p => p.published_date).sort((a, b) => b.published_date.localeCompare(a.published_date));

const css = `:root{--bg:#fbfaf7;--fg:#222;--mute:#6b6b6b;--line:#e4e1d8;--accent:#a4401f}
@media(prefers-color-scheme:dark){:root{--bg:#161615;--fg:#e8e6e1;--mute:#9a978f;--line:#2e2d2a;--accent:#e5885f}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:18px/1.7 Georgia,serif}
main,header,footer{max-width:42rem;margin:0 auto;padding:0 16px}header{padding-top:2rem;padding-bottom:1rem;border-bottom:1px solid var(--line)}
header a{font-weight:700;font-size:1.3rem;color:var(--fg);text-decoration:none}a{color:var(--accent)}
h1{line-height:1.25}.meta{color:var(--mute);font-size:.85rem;font-family:system-ui,sans-serif}
pre{overflow:auto;background:var(--line);padding:1rem;border-radius:6px;font-size:.85rem}code{font-size:.9em}
blockquote{margin-left:0;padding-left:1rem;border-left:3px solid var(--line);color:var(--mute)}img{max-width:100%}
ul.posts{list-style:none;padding:0}ul.posts li{margin:1.5rem 0}ul.posts a{font-size:1.25rem}
.legacy{border-top:1px solid var(--line);margin-top:3rem;padding-top:1rem}.c{margin:1rem 0;font-size:.95rem}.c b{font-family:system-ui,sans-serif}
footer{color:var(--mute);font-size:.8rem;padding-bottom:3rem;padding-top:2rem}`;

const page = (title, inner, desc = site.description) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"><link rel="alternate" type="application/rss+xml" href="${BASE}/feed.xml">
<style>${css}</style></head><body><header><a href="${BASE}/">${esc(site.title)}</a></header><main>${inner}</main>
<footer>&copy; ${new Date().getFullYear()} ${esc(site.title)}</footer></body></html>`;

const g = site.giscus;
const giscus = g.repoId ? `<section class="legacy"><h2>Comments</h2><script src="https://giscus.app/client.js" data-repo="${esc(g.repo)}" data-repo-id="${esc(g.repoId)}" data-category="${esc(g.category)}" data-category-id="${esc(g.categoryId)}" data-mapping="pathname" data-reactions-enabled="1" data-input-position="top" data-theme="preferred_color_scheme" crossorigin="anonymous" async></script></section>` : '';

rmSync('dist', { recursive: true, force: true });
const out = (path, html) => { mkdirSync(`dist/${path}`, { recursive: true }); writeFileSync(`dist/${path}/index.html`, html); };

for (const p of posts) {
  const cf = `content/comments/${p.slug}.json`;
  const old = existsSync(cf) ? JSON.parse(readFileSync(cf, 'utf8')) : [];
  const legacy = old.length ? `<section class="legacy"><h2>Earlier comments (${old.length})</h2>${old.map(c =>
    `<div class="c"><b>${esc(c.author)}</b> <span class="meta">${fmt(c.created_date)}</span><br>${esc(c.msg).replace(/\n/g, '<br>')}</div>`).join('')}</section>` : '';
  out(`posts/${p.slug}`, page(`${p.title} · ${site.title}`,
    `<article><h1>${esc(p.title)}</h1><p class="meta">${fmt(p.published_date)} · ${esc(p.category)}</p>${marked.parse(p.body, { breaks: true })}</article>${legacy}${giscus}`,
    p.body.replace(/\s+/g, ' ').slice(0, 155)));
}
out('', page(site.title, `<ul class="posts">${posts.map(p => `<li><a href="${BASE}/posts/${p.slug}/">${esc(p.title)}</a><div class="meta">${fmt(p.published_date)} · ${esc(p.category)}</div></li>`).join('')}</ul>`));
const base = (process.env.SITE_URL || 'https://example.com') + BASE;
writeFileSync('dist/feed.xml', `<?xml version="1.0"?><rss version="2.0"><channel><title>${esc(site.title)}</title><link>${base}</link><description>${esc(site.description)}</description>${posts.map(p =>
  `<item><title>${esc(p.title)}</title><link>${base}/posts/${p.slug}/</link><guid>${base}/posts/${p.slug}/</guid><pubDate>${new Date(p.published_date).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`);
console.log(`built ${posts.length} posts`);
