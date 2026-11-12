// Vercel Function: receives a comment and files it as a GitHub issue for moderation.
// Env: GITHUB_TOKEN (fine-grained, Issues:write on the repo only), REPO ("owner/name"), ALLOWED_ORIGIN ("https://blog.umang.me")
module.exports = async (req, res) => {
  const origin = process.env.ALLOWED_ORIGIN;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST' || req.headers.origin !== origin) return res.status(403).end();
  const d = req.body && typeof req.body === 'object' ? req.body : {};
  if (d.website) return res.status(200).end(); // honeypot: pretend success
  const author = String(d.author ?? '').trim(), msg = String(d.msg ?? '').trim(), slug = String(d.slug ?? '');
  if (!/^[a-z0-9-]{1,70}$/.test(slug) || !author || author.length > 30 || !msg || msg.length > 1000) return res.status(400).end();
  const r = await fetch(`https://api.github.com/repos/${process.env.REPO}/issues`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'user-agent': 'blog-comments', accept: 'application/vnd.github+json' },
    body: JSON.stringify({ title: `Comment on ${slug}`, labels: ['comment'], body: '```json\n' + JSON.stringify({ slug, author, msg }, null, 2) + '\n```' }),
  });
  res.status(r.ok ? 200 : 502).end();
};
