import json, sys, pathlib
src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
posts = json.load(open(src/'posts.json')); comments = json.load(open(src/'comments.json'))
for p in posts:
    fm = {k: p[k] for k in ('id','title','slug','category','author','created_date','published_date','keywords')}
    body = p['body'].replace('\r\n', '\n').strip() + '\n'
    (out/'posts'/f"{p['id']}-{p['slug']}.md").write_text(
        '---\n' + '\n'.join(f'{k}: {json.dumps(v, ensure_ascii=False)}' for k, v in fm.items()) + '\n---\n\n' + body)
    cs = [c for c in comments if c['post_id'] == p['id'] and c['comment_visibility']]
    if cs:
        (out/'comments'/f"{p['slug']}.json").write_text(json.dumps(cs, indent=2, ensure_ascii=False) + '\n')
print(len(posts), 'posts;', len(comments), 'comments')
