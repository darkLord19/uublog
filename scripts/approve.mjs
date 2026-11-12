// Run by CI when an issue is labelled "approved". Reads the issue body from $ISSUE_BODY.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
const m = (process.env.ISSUE_BODY || '').match(/```json\n([\s\S]*?)\n```/);
if (!m) throw new Error('no comment payload');
const { slug, author, msg } = JSON.parse(m[1]);
const ok = (s, n) => typeof s === 'string' && s.trim() && s.length <= n;
if (!/^[a-z0-9-]{1,70}$/.test(slug) || !ok(author, 30) || !ok(msg, 1000)) throw new Error('invalid comment');
if (!readdirSync('content/posts').some(f => f.endsWith(`-${slug}.md`))) throw new Error('unknown post');
const file = `content/comments/${slug}.json`;
const list = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
const id = Math.max(0, ...list.map(c => c.id || 0), 1000) + 1;
list.push({ id, author: author.trim(), msg: msg.trim(), created_date: new Date().toISOString(), comment_visibility: true });
writeFileSync(file, JSON.stringify(list, null, 2) + '\n');
console.log(`added comment ${id} to ${slug}`);
