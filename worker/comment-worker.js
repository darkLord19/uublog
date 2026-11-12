// Cloudflare Worker: receives a comment and files it as a GitHub issue for moderation.
// Env: GITHUB_TOKEN (secret; fine-grained, Issues:write on the repo only), REPO ("owner/name"), ALLOWED_ORIGIN ("https://blog.umang.me")
export default {
  async fetch(req, env) {
    const cors = { 'access-control-allow-origin': env.ALLOWED_ORIGIN, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' };
    const reply = (status, body = '') => new Response(body, { status, headers: cors });
    if (req.method === 'OPTIONS') return reply(204);
    if (req.method !== 'POST' || req.headers.get('origin') !== env.ALLOWED_ORIGIN) return reply(403);
    let d; try { d = await req.json(); } catch { return reply(400); }
    if (d.website) return reply(200); // honeypot: pretend success
    const author = String(d.author ?? '').trim(), msg = String(d.msg ?? '').trim(), slug = String(d.slug ?? '');
    if (!/^[a-z0-9-]{1,70}$/.test(slug) || !author || author.length > 30 || !msg || msg.length > 1000) return reply(400);
    const r = await fetch(`https://api.github.com/repos/${env.REPO}/issues`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, 'user-agent': 'blog-comments', accept: 'application/vnd.github+json' },
      body: JSON.stringify({ title: `Comment on ${slug}`, labels: ['comment'], body: '```json\n' + JSON.stringify({ slug, author, msg }, null, 2) + '\n```' }),
    });
    return reply(r.ok ? 200 : 502);
  },
};
