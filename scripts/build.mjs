import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { Marked } from 'marked';
import hljs from 'highlight.js';

const site = JSON.parse(readFileSync('site.json', 'utf8'));
const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');
const ORIGIN = (process.env.SITE_URL || 'https://example.com').replace(/\/$/, '');
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = d => { const x = new Date(d); return `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}, ${x.getUTCFullYear()}`; };
const slugify = s => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'section';
const stripMd = s => s.replace(/```[\s\S]*?```/g, ' ').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/^#+\s*/gm, '').replace(/[>*_`]/g, '').replace(/\s+/g, ' ').trim();
const excerpt = (s, n) => { const t = stripMd(s); return t.length > n ? t.slice(0, t.lastIndexOf(' ', n)) + '…' : t; };

// ---------- Markdown ----------
function renderMarkdown(src) {
  const used = new Map();
  const md = new Marked({ gfm: true, breaks: true });
  md.use({
    renderer: {
      heading(text, level) {
        let id = slugify(text); const n = used.get(id) || 0; used.set(id, n + 1); if (n) id += `-${n}`;
        return `<h${level} id="${id}"><a class="anchor" href="#${id}" aria-label="Link to this section">#</a>${text}</h${level}>\n`;
      },
      link(href, title, text) {
        const ext = /^https?:\/\//.test(href) && !href.startsWith(ORIGIN);
        return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`;
      },
      code(code, info) {
        const lang = (info || '').match(/^\S+/)?.[0];
        const known = lang && hljs.getLanguage(lang);
        const html = known ? hljs.highlight(code, { language: lang }).value : esc(code);
        return `<div class="code"><button class="copy" type="button" aria-label="Copy code">Copy</button><pre><code class="hljs${known ? ` language-${lang}` : ''}">${html}</code></pre></div>\n`;
      },
      image(href, title, text) {
        const img = `<img src="${esc(href)}" alt="${esc(text)}" loading="lazy">`;
        return title ? `<figure>${img}<figcaption>${esc(title)}</figcaption></figure>` : img;
      },
      table(header, body) { return `<div class="table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>\n`; },
    },
  });
  return md.parse(src);
}

// ---------- Content ----------
const posts = readdirSync('content/posts').filter(f => f.endsWith('.md')).map(f => {
  const raw = readFileSync(`content/posts/${f}`, 'utf8');
  const [, head, body] = raw.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
  const meta = Object.fromEntries(head.split('\n').map(l => { const i = l.indexOf(': '); return [l.slice(0, i), JSON.parse(l.slice(i + 2))]; }));
  const d = new Date(meta.published_date || 0);
  const comments = existsSync(`content/comments/${meta.slug}.json`) ? JSON.parse(readFileSync(`content/comments/${meta.slug}.json`, 'utf8')) : [];
  // Same URL scheme as the old Django blog: /<year>/<month>/<slug>
  return { ...meta, body, comments, path: `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${meta.slug}`, minutes: Math.max(1, Math.round(stripMd(body).split(' ').length / 220)) };
}).filter(p => p.published_date).sort((a, b) => b.published_date.localeCompare(a.published_date));

const catName = c => site.categories[c] || c;
const url = p => `${BASE}/${p}${p && !p.endsWith('/') ? '/' : ''}`;
const postUrl = p => url(p.path);

// ---------- Layout ----------
const css = `:root{--bg:#fbfaf7;--fg:#222;--mute:#6b6b6b;--line:#e4e1d8;--accent:#a4401f;--code:#efece4;
--h-kw:#a4401f;--h-str:#4d6b2f;--h-com:#8a877e;--h-num:#8c5a00;--h-fn:#2f5d8a}
@media(prefers-color-scheme:dark){:root{--bg:#161615;--fg:#e8e6e1;--mute:#9a978f;--line:#2e2d2a;--accent:#e5885f;--code:#201f1d;
--h-kw:#e5885f;--h-str:#a3c27d;--h-com:#7d7a72;--h-num:#e0b15c;--h-fn:#7fb2e0}}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--fg);font:18px/1.7 Georgia,serif;min-height:100vh;display:flex;flex-direction:column}
main{flex:1}main,header .in,footer .in{max-width:42rem;margin:0 auto;padding:0 16px}
header{border-bottom:1px solid var(--line);padding:1.5rem 0 .8rem}
.brand{font-weight:700;font-size:1.3rem;color:var(--fg);text-decoration:none}
nav{font:.85rem system-ui,sans-serif;margin-top:.5rem;display:flex;flex-wrap:wrap;gap:.4rem 1.1rem}
nav a{color:var(--mute);text-decoration:none}nav a:hover,nav a[aria-current]{color:var(--accent)}
.cats{display:inline-flex;gap:.8rem;flex-wrap:wrap}
a{color:var(--accent)}h1{line-height:1.25;margin-bottom:.3rem}h2,h3,h4{line-height:1.3;margin-top:2rem}
.meta{color:var(--mute);font-size:.85rem;font-family:system-ui,sans-serif}.tagline{color:var(--mute);font-style:italic}
.anchor{margin-left:-1.1rem;padding-right:.35rem;text-decoration:none;opacity:0;font-weight:400}h2:hover .anchor,h3:hover .anchor,h4:hover .anchor,.anchor:focus{opacity:.6}
article p,article li{overflow-wrap:break-word}
.code{position:relative;margin:1.2rem 0}.code pre{overflow:auto;background:var(--code);padding:1rem;border-radius:6px;font-size:.85rem;line-height:1.55;margin:0;border:1px solid var(--line)}
.code code{font-family:ui-monospace,Menlo,monospace}.copy{position:absolute;top:.4rem;right:.4rem;font:.7rem system-ui,sans-serif;background:var(--bg);color:var(--mute);border:1px solid var(--line);border-radius:4px;padding:.15rem .5rem;cursor:pointer;opacity:0}.code:hover .copy,.copy:focus{opacity:1}
p code,li code{background:var(--code);padding:.1em .35em;border-radius:4px;font-size:.88em;font-family:ui-monospace,Menlo,monospace}
.hljs-keyword,.hljs-selector-tag,.hljs-built_in{color:var(--h-kw)}.hljs-string,.hljs-regexp,.hljs-addition{color:var(--h-str)}
.hljs-comment,.hljs-quote,.hljs-meta{color:var(--h-com);font-style:italic}.hljs-number,.hljs-literal,.hljs-symbol,.hljs-bullet{color:var(--h-num)}
.hljs-title,.hljs-section,.hljs-attr,.hljs-name,.hljs-type,.hljs-variable{color:var(--h-fn)}.hljs-deletion{color:var(--h-kw)}
blockquote{margin:1.2rem 0;padding:.1rem 0 .1rem 1rem;border-left:3px solid var(--accent);color:var(--mute)}
img{max-width:100%;height:auto;border-radius:4px}figure{margin:1.5rem 0}figcaption{color:var(--mute);font-size:.85rem;text-align:center;font-family:system-ui,sans-serif}
.table-wrap{overflow-x:auto;margin:1.2rem 0}table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{border:1px solid var(--line);padding:.4rem .7rem;text-align:left}th{background:var(--code)}
hr{border:0;border-top:1px solid var(--line);margin:2rem 0}
ul.posts{list-style:none;padding:0}ul.posts li{margin:2rem 0}ul.posts h2{margin:0;font-size:1.35rem}ul.posts h2 a{text-decoration:none}ul.posts p{margin:.4rem 0}
.arch h2{border-bottom:1px solid var(--line);padding-bottom:.2rem}.arch h3{font-size:1rem;color:var(--mute);margin:1.2rem 0 .3rem;font-family:system-ui,sans-serif}.arch ul{margin:.2rem 0;padding-left:1.2rem}
.pn{display:flex;justify-content:space-between;gap:1rem;margin-top:3rem;font-size:.9rem;font-family:system-ui,sans-serif}.pn a{max-width:48%;text-decoration:none}.pn .r{text-align:right;margin-left:auto}
form input,form textarea{width:100%;font:inherit;font-size:.95rem;padding:.5rem;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:4px}
form button{font:.9rem system-ui,sans-serif;background:var(--accent);color:var(--bg);border:0;border-radius:4px;padding:.5rem 1.2rem;cursor:pointer}
.legacy{border-top:1px solid var(--line);margin-top:3rem;padding-top:1rem}.c{margin:1rem 0;font-size:.95rem}.c b{font-family:system-ui,sans-serif}
footer{border-top:1px solid var(--line);margin-top:3rem;color:var(--mute);font:.8rem system-ui,sans-serif;padding:1.5rem 0 2.5rem}footer a{color:var(--mute)}
@media(max-width:480px){body{font-size:17px}.anchor{display:none}}`;

const JS = `document.addEventListener('click',e=>{const b=e.target.closest('.copy');if(!b)return;
navigator.clipboard.writeText(b.parentElement.querySelector('code').innerText).then(()=>{b.textContent='Copied';setTimeout(()=>b.textContent='Copy',1500)})})`;

const activeCats = Object.keys(site.categories).filter(c => posts.some(p => p.category === c));
const link = (href, label, cur, key) => `<a href="${href}"${cur === key ? ' aria-current="page"' : ''}>${label}</a>`;

const page = ({ title, desc = site.description, path = '', cur = '', inner, type = 'website', extraHead = '' }) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"><meta name="author" content="${esc(site.title)}">
<link rel="canonical" href="${ORIGIN}${url(path)}"><link rel="alternate" type="application/rss+xml" title="${esc(site.title)}" href="${BASE}/feed.xml">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="${type}"><meta property="og:url" content="${ORIGIN}${url(path)}">
${extraHead}<style>${css}</style></head><body>
<header><div class="in"><a class="brand" href="${url('')}">${esc(site.title)}</a>
<nav aria-label="Main">${link(url(''), 'Home', cur, 'home')}${link(url('about'), 'About', cur, 'about')}${link(url('archives'), 'Archives', cur, 'archives')}
<span class="cats">${activeCats.map(c => link(url(`category/${c}`), catName(c), cur, c)).join('')}</span></nav></div></header>
<main>${inner}</main>
<footer><div class="in"><a href="${site.github}" target="_blank" rel="noopener">github</a> · <a href="${site.linkedin}" target="_blank" rel="noopener">linkedin</a> · <a href="${BASE}/feed.xml">rss</a><br>Copyright &copy; ${esc(site.title)} ${new Date().getFullYear()}</div></footer>
<script>${JS}${FORM_JS}</script></body></html>`;

const commentForm = p => site.comments?.endpoint ? `<section class="legacy"><h2>Leave a comment</h2>
<form id="cform" data-endpoint="${esc(site.comments.endpoint)}" data-slug="${esc(p.slug)}"><p><label>Name<br><input name="author" required maxlength="30" autocomplete="name"></label></p>
<p><label>Comment<br><textarea name="msg" required maxlength="1000" rows="4"></textarea></label></p>
<p hidden><label>Leave empty <input name="website" tabindex="-1" autocomplete="off"></label></p>
<button type="submit">Send</button> <span id="cstatus" class="meta" role="status"></span></form></section>` : '';
const FORM_JS = `const f=document.getElementById('cform');if(f)f.addEventListener('submit',async e=>{e.preventDefault();const s=document.getElementById('cstatus');s.textContent='Sending…';
try{const d=Object.fromEntries(new FormData(f));const r=await fetch(f.dataset.endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug:f.dataset.slug,...d})});
if(!r.ok)throw 0;f.reset();s.textContent='Thanks! Your comment will appear once approved.'}catch{s.textContent='Sorry, something went wrong. Please try again later.'}})`;

rmSync('dist', { recursive: true, force: true });
const out = (path, html, file = 'index.html') => { mkdirSync(`dist/${path}`, { recursive: true }); writeFileSync(`dist/${path}/${file}`, html); };
const redirect = (from, to) => out(from, `<!doctype html><meta charset="utf-8"><title>Redirecting…</title><link rel="canonical" href="${to}"><meta http-equiv="refresh" content="0;url=${to}"><a href="${to}">Moved here</a>`);

const list = items => `<ul class="posts">${items.map(p => `<li><h2><a href="${postUrl(p)}">${esc(p.title)}</a></h2>
<div class="meta">${fmt(p.published_date)} · <a href="${url(`category/${p.category}`)}">${esc(catName(p.category))}</a> · ${p.minutes} min read</div><p>${esc(excerpt(p.body, 260))}</p></li>`).join('')}</ul>`;

// Posts
posts.forEach((p, i) => {
  const newer = posts[i - 1], older = posts[i + 1];
  const legacy = p.comments.length ? `<section class="legacy"><h2>Earlier comments (${p.comments.length})</h2>${p.comments.map(c =>
    `<div class="c"><b>${esc(c.author)}</b> <span class="meta">${fmt(c.created_date)}</span><br>${esc(c.msg).replace(/\n/g, '<br>')}</div>`).join('')}</section>` : '';
  const desc = excerpt(p.body, 155);
  out(p.path, page({
    title: `${p.title} · ${site.title}`, desc, path: p.path, type: 'article',
    extraHead: `<meta name="keywords" content="${esc(p.keywords || 'blog, tech, umang, stories')}"><meta property="article:published_time" content="${p.published_date}">`,
    inner: `<article><h1>${esc(p.title)}</h1><p class="meta">${fmt(p.published_date)} · <a href="${url(`category/${p.category}`)}">${esc(catName(p.category))}</a> · ${p.minutes} min read</p>${renderMarkdown(p.body)}</article>
<nav class="pn" aria-label="Posts">${older ? `<a href="${postUrl(older)}">← ${esc(older.title)}</a>` : ''}${newer ? `<a class="r" href="${postUrl(newer)}">${esc(newer.title)} →</a>` : ''}</nav>${legacy}${commentForm(p)}`,
  }));
  redirect(`posts/${p.slug}`, `${postUrl(p)}`); // short-lived earlier URL scheme
});

// Home, categories
out('', page({ title: site.title, cur: 'home', inner: `<h1>${esc(site.title)}</h1><p class="tagline">${esc(site.tagline)}</p>${list(posts)}` }));
for (const c of Object.keys(site.categories)) {
  const items = posts.filter(p => p.category === c);
  out(`category/${c}`, page({ title: `${catName(c)} · ${site.title}`, path: `category/${c}`, cur: c,
    inner: `<h1>${esc(catName(c))}</h1>${items.length ? list(items) : '<p class="meta">Nothing here yet.</p>'}` }));
}

// About
out('about', page({ title: `About · ${site.title}`, path: 'about', cur: 'about', desc: `About ${site.title}`,
  inner: `<h1>About</h1><p class="tagline">${esc(site.tagline)}</p>${site.about.map(t => `<p>${esc(t)}</p>`).join('')}
<p>Find me on <a href="${site.github}" target="_blank" rel="noopener">GitHub</a> or <a href="${site.linkedin}" target="_blank" rel="noopener">LinkedIn</a>.</p>` }));

// Archives (year → month → posts)
const years = [...new Set(posts.map(p => new Date(p.published_date).getUTCFullYear()))];
out('archives', page({ title: `Archives · ${site.title}`, path: 'archives', cur: 'archives',
  inner: `<h1>Archives</h1><div class="arch">${years.map(y => {
    const inYear = posts.filter(p => new Date(p.published_date).getUTCFullYear() === y);
    const months = [...new Set(inYear.map(p => new Date(p.published_date).getUTCMonth()))];
    return `<h2>${y} <span class="meta">(${inYear.length})</span></h2>${months.map(m => `<h3>${MONTHS[m]}</h3><ul>${inYear.filter(p => new Date(p.published_date).getUTCMonth() === m)
      .map(p => `<li><a href="${postUrl(p)}">${esc(p.title)}</a></li>`).join('')}</ul>`).join('')}`;
  }).join('')}</div>` }));

// 404
writeFileSync('dist/404.html', page({ title: `Not found · ${site.title}`, inner: `<h1>Page not found</h1><p>That page doesn't exist. Try the <a href="${url('')}">home page</a> or the <a href="${url('archives')}">archives</a>.</p>` }));

// Feed (+ old /feed URL), sitemap, robots
const feedItems = posts.map(p => `<item><title>${esc(p.title)}</title><link>${ORIGIN}${postUrl(p)}</link><guid>${ORIGIN}${postUrl(p)}</guid><pubDate>${new Date(p.published_date).toUTCString()}</pubDate><description>${esc(excerpt(p.body, 400))}</description></item>`).join('');
writeFileSync('dist/feed.xml', `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(site.title)}</title><link>${ORIGIN}${url('')}</link><description>${esc(site.description)}</description>${feedItems}</channel></rss>`);
redirect('feed', `${BASE}/feed.xml`);
const urls = ['', 'about', 'archives', ...activeCats.map(c => `category/${c}`), ...posts.map(p => p.path)];
writeFileSync('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${ORIGIN}${url(u)}</loc></url>`).join('')}</urlset>`);
writeFileSync('dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}${BASE}/sitemap.xml\n`);

console.log(`built ${posts.length} posts, ${years.length} archive years, ${activeCats.length} categories`);
