import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync, copyFileSync } from 'node:fs';
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
// Fonts are self-hosted (scripts/fonts → dist/fonts): no third-party requests.
const css = readFileSync('scripts/style.css', 'utf8').replaceAll('__BASE__', BASE);

const JS = `document.addEventListener('click',e=>{const b=e.target.closest('.copy');if(!b)return;
navigator.clipboard.writeText(b.parentElement.querySelector('code').innerText).then(()=>{b.textContent='Copied';setTimeout(()=>b.textContent='Copy',1500)})})`;

const activeCats = Object.keys(site.categories).filter(c => posts.some(p => p.category === c));
const link = (href, label, cur, key) => `<a href="${href}"${cur === key ? ' aria-current="page"' : ''}>${label}</a>`;
const short = d => { const x = new Date(d); return `${MONTHS[x.getUTCMonth()].slice(0, 3).toLowerCase()} ${x.getUTCDate()}`; };
const year = d => new Date(d).getUTCFullYear();

const page = ({ title, desc = site.description, path = '', cur = '', inner, type = 'website', extraHead = '', letters = false }) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"><meta name="author" content="${esc(site.title)}">
<link rel="canonical" href="${ORIGIN}${url(path)}"><link rel="alternate" type="application/rss+xml" title="${esc(site.title)}" href="${BASE}/feed.xml">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="${type}"><meta property="og:url" content="${ORIGIN}${url(path)}">
${extraHead}<link rel="preload" href="${BASE}/fonts/atkinson-next.woff2" as="font" type="font/woff2" crossorigin>
<style>${css}</style></head><body>
<div class="wrap"><nav class="top" aria-label="Main"><a href="https://umang.me">← umang parmar</a>
<div>${link(url('archives'), 'archives', cur, 'archives')}${activeCats.map(c => link(url(`category/${c}`), catName(c).toLowerCase(), cur, c)).join('')}<a href="${BASE}/feed.xml">rss</a></div></nav>
${inner}</div>
<footer><a href="${site.github}" target="_blank" rel="noopener">github</a> · <a href="${site.linkedin}" target="_blank" rel="noopener">linkedin</a> · <a href="${BASE}/feed.xml">rss</a><br>Copyright &copy; ${esc(site.title)} ${new Date().getFullYear()}</footer>
<script>${JS};\n${FORM_JS}</script>${letters ? `<script src="${BASE}/letters.js" defer></script>` : ''}</body></html>`;

// Throwable letters: static, readable markup that letters.js enhances.
const lettersBox = (word, { max, hw, hn, visible = false, center = false, label }) =>
  `<div class="letters" data-letters="${esc(word)}" data-max="${max}" data-height-wide="${hw}" data-height-narrow="${hn}"${visible ? ' data-start-on-visible' : ''}${center ? ' data-align="center"' : ''} style="--max:${max}px;--hw:${hw}px;--hn:${hn}px">${[...word].map(c => `<span class="lt${c === '.' ? ' dot' : ''}" aria-hidden="true">${esc(c)}</span>`).join('')}</div>${label ? `<span class="sr">${esc(label)}</span>` : ''}`;

const commentForm = p => site.comments?.endpoint ? `<section class="legacy"><h2>Leave a comment</h2>
<form id="cform" data-endpoint="${esc(site.comments.endpoint)}" data-slug="${esc(p.slug)}">
<label for="c-author">Name<input id="c-author" name="author" required maxlength="30" autocomplete="name"></label>
<label for="c-msg">Comment<textarea id="c-msg" name="msg" required maxlength="1000" rows="4"></textarea></label>
<p hidden><label>Leave empty <input name="website" tabindex="-1" autocomplete="off"></label></p>
<div class="send"><button type="submit">Send</button><span id="cstatus" class="meta" role="status"></span></div></form></section>` : '';
const FORM_JS = `const f=document.getElementById('cform');if(f)f.addEventListener('submit',async e=>{e.preventDefault();const s=document.getElementById('cstatus');s.textContent='Sending…';
try{const d=Object.fromEntries(new FormData(f));const r=await fetch(f.dataset.endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug:f.dataset.slug,...d})});
if(!r.ok)throw 0;f.reset();s.textContent='Thanks! Your comment will appear once approved.'}catch{s.textContent='Sorry, something went wrong. Please try again later.'}})`;

rmSync('dist', { recursive: true, force: true });
const out = (path, html, file = 'index.html') => { mkdirSync(`dist/${path}`, { recursive: true }); writeFileSync(`dist/${path}/${file}`, html); };
const redirect = (from, to) => out(from, `<!doctype html><meta charset="utf-8"><title>Redirecting…</title><link rel="canonical" href="${to}"><meta http-equiv="refresh" content="0;url=${to}"><a href="${to}">Moved here</a>`);
mkdirSync('dist', { recursive: true });
copyFileSync('scripts/letters.js', 'dist/letters.js');
mkdirSync('dist/fonts', { recursive: true });
for (const f of readdirSync('scripts/fonts')) copyFileSync(`scripts/fonts/${f}`, `dist/fonts/${f}`);

// Posts grouped by year: label on the left, rows on the right.
const list = items => {
  const ys = [...new Set(items.map(p => year(p.published_date)))];
  return `<section class="years">${ys.map(y => `<div class="year"><h2>${y}</h2><div class="rows">${items.filter(p => year(p.published_date) === y).map(p =>
    `<a class="row" href="${postUrl(p)}"><span class="t">${esc(p.title)}</span><span class="meta">${short(p.published_date)} · ${p.minutes} min · ${esc(catName(p.category).toLowerCase())}</span></a>`).join('')}</div></div>`).join('')}</section>`;
};

// Posts
posts.forEach((p, i) => {
  const newer = posts[i - 1], older = posts[i + 1];
  const legacy = p.comments.length ? `<section class="legacy"><h2>Earlier comments (${p.comments.length})</h2>${p.comments.map(c =>
    `<div class="c"><b>${esc(c.author)}</b><span class="meta">${fmt(c.created_date)}</span><div>${esc(c.msg).replace(/\n/g, '<br>')}</div></div>`).join('')}</section>` : '';
  const desc = excerpt(p.body, 155);
  out(p.path, page({
    title: `${p.title} · ${site.title}`, desc, path: p.path, type: 'article', letters: true,
    extraHead: `<meta name="keywords" content="${esc(p.keywords || 'blog, tech, umang, stories')}"><meta property="article:published_time" content="${p.published_date}">`,
    inner: `<div class="col"><article class="post"><div class="meta">${short(p.published_date).toLowerCase()}, ${year(p.published_date)} · ${p.minutes} min · <a href="${url(`category/${p.category}`)}">${esc(catName(p.category).toLowerCase())}</a></div>
<h1>${esc(p.title)}</h1><div class="prose">${renderMarkdown(p.body)}</div></article>
<div class="end">${lettersBox('fin.', { max: 110, hw: 220, hn: 170, visible: true, center: true, label: 'The end.' })}
<nav class="pn" aria-label="Posts">${older ? `<a href="${postUrl(older)}"><small>← older</small><span class="pt">${esc(older.title)}</span></a>` : ''}${newer ? `<a class="r" href="${postUrl(newer)}"><small>newer →</small><span class="pt">${esc(newer.title)}</span></a>` : ''}</nav></div>
${legacy}${commentForm(p)}</div>`,
  }));
  redirect(`posts/${p.slug}`, `${postUrl(p)}`); // short-lived earlier URL scheme
});

// Home, categories
out('', page({ title: site.title, cur: 'home', letters: true,
  inner: `<h1 class="sr">blog</h1>${lettersBox('blog.', { max: 150, hw: 260, hn: 190 })}<p class="lede">${esc(site.description)}</p>${list(posts)}` }));
for (const c of Object.keys(site.categories)) {
  const items = posts.filter(p => p.category === c);
  out(`category/${c}`, page({ title: `${catName(c)} · ${site.title}`, path: `category/${c}`, cur: c,
    inner: `<h1 class="page">${esc(catName(c).toLowerCase())}</h1>${items.length ? list(items) : '<p class="empty">Nothing here yet.</p>'}` }));
}

// Archives (all posts by year)
const years = [...new Set(posts.map(p => year(p.published_date)))];
out('archives', page({ title: `Archives · ${site.title}`, path: 'archives', cur: 'archives',
  inner: `<h1 class="page">archives</h1>${list(posts)}` }));

// 404
writeFileSync('dist/404.html', page({ title: `Not found · ${site.title}`, inner: `<h1 class="page">page not found</h1><p class="lede">That page doesn't exist. Try the <a href="${url('')}">home page</a> or the <a href="${url('archives')}">archives</a>.</p>` }));

// Feed (+ old /feed URL), sitemap, robots
const feedItems = posts.map(p => `<item><title>${esc(p.title)}</title><link>${ORIGIN}${postUrl(p)}</link><guid>${ORIGIN}${postUrl(p)}</guid><pubDate>${new Date(p.published_date).toUTCString()}</pubDate><description>${esc(excerpt(p.body, 400))}</description></item>`).join('');
writeFileSync('dist/feed.xml', `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(site.title)}</title><link>${ORIGIN}${url('')}</link><description>${esc(site.description)}</description>${feedItems}</channel></rss>`);
redirect('feed', `${BASE}/feed.xml`);
const urls = ['', 'archives', ...activeCats.map(c => `category/${c}`), ...posts.map(p => p.path)];
writeFileSync('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${ORIGIN}${url(u)}</loc></url>`).join('')}</urlset>`);
writeFileSync('dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}${BASE}/sitemap.xml\n`);

console.log(`built ${posts.length} posts, ${years.length} archive years, ${activeCats.length} categories`);
