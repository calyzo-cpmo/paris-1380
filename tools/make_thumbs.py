#!/usr/bin/env python3
"""Fabrique data/thumbs.json : vignettes (JPEG réduits, en data-URI) des représentations du domaine public.

Usage : python3 tools/make_thumbs.py <dossier contenant cle.orig + meta.json>
La vignette du plan ALPAGE est tirée du SVG source du dépôt (rendu préalable en PNG : <dossier>/alpage1380.png).
"""
import base64, json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1]
out = {'thumbs': {}, 'pages': {}}
meta = {}
mp = os.path.join(src, 'meta.json')
if os.path.exists(mp): meta = json.load(open(mp))
for f in sorted(os.listdir(src)):
    key, ext = os.path.splitext(f)
    if ext not in ('.orig', '.png') or key.startswith('_'): continue
    p = os.path.join(src, f)
    if os.path.getsize(p) < 8000: continue
    tmp = os.path.join(src, '_t.jpg')
    r = subprocess.run(['convert', p + '[0]', '-auto-orient', '-thumbnail', '168x208^', '-gravity', 'center', '-extent', '168x208', '-strip', '-quality', '68', tmp], capture_output=True)
    if r.returncode != 0 or not os.path.exists(tmp): print('échec', key); continue
    out['thumbs'][key] = 'data:image/jpeg;base64,' + base64.b64encode(open(tmp, 'rb').read()).decode()
    if key in meta: out['pages'][key] = meta[key]['page']
    os.remove(tmp)
json.dump(out, open(os.path.join(HERE, '..', 'data', 'thumbs.json'), 'w'), ensure_ascii=False)
print('vignettes :', ', '.join(out['thumbs']) or 'aucune', '—', sum(len(v) for v in out['thumbs'].values()) // 1024, 'Ko')
