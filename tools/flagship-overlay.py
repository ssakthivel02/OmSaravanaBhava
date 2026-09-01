#!/usr/bin/env python3
from pathlib import Path
import json, shutil, sys
root = Path(sys.argv[1] if len(sys.argv) > 1 else '_site')
source = Path(__file__).resolve().parents[1]
if not root.exists(): raise SystemExit(f'missing artifact: {root}')
text_exts={'.html','.xml','.txt','.json','.webmanifest','.js','.mjs','.css'}
for p in root.rglob('*'):
    if not p.is_file() or p.suffix.lower() not in text_exts: continue
    try: text=p.read_text(encoding='utf-8')
    except UnicodeDecodeError: continue
    new=text.replace('https://kandan.omsaravanabhava.org','https://omsaravanabhava.org')
    new=new.replace('Kandan — Lord Murugan Devotional Knowledge Platform','OmSaravanaBhava — Lord Murugan Devotional Knowledge Platform')
    new=new.replace('Kandan | Lord Murugan Devotional Knowledge Platform','ஓம் சரவணபவ | Lord Murugan Devotional Knowledge Platform')
    new=new.replace('Kandan Guided Search','OmSaravanaBhava Guided Search')
    if new!=text: p.write_text(new,encoding='utf-8')
for name in ('manifest.json','manifest.webmanifest'):
    p=root/name
    if not p.exists(): continue
    try: data=json.loads(p.read_text(encoding='utf-8'))
    except Exception: continue
    data['name']='OmSaravanaBhava'; data['short_name']='OSB'
    for shortcut in data.get('shortcuts',[]):
        if shortcut.get('name')=='Kandan Guided Search': shortcut['name']='OmSaravanaBhava Guided Search'
    p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(root/'assets/css').mkdir(parents=True,exist_ok=True); (root/'assets/js').mkdir(parents=True,exist_ok=True)
shutil.copy2(source/'assets/css/flagship-nextgen.css',root/'assets/css/flagship-nextgen.css')
shutil.copy2(source/'assets/js/flagship-nextgen.js',root/'assets/js/flagship-nextgen.js')
for p in root.rglob('*.html'):
    try: html=p.read_text(encoding='utf-8')
    except UnicodeDecodeError: continue
    if 'flagship-nextgen.css' not in html and '</head>' in html: html=html.replace('</head>','  <link rel="stylesheet" href="/assets/css/flagship-nextgen.css?v=20260901">\n</head>',1)
    if 'flagship-nextgen.js' not in html and '</body>' in html: html=html.replace('</body>','  <script src="/assets/js/flagship-nextgen.js?v=20260901" defer></script>\n</body>',1)
    p.write_text(html,encoding='utf-8')
html_count=sum(1 for _ in root.rglob('*.html'))
manifest={'release':'flagship-parity-v2','donorRepository':'ssakthivel02/kandan-legacy','donorCommit':'5d2670e286d0a32df2e564a2c280fa976866facf','publicOrigin':'https://omsaravanabhava.org','htmlPageCount':html_count,'strategy':'deterministic-donor-build-plus-additive-flagship-overlay','legacyProductionUntouched':True}
(root/'flagship-release.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps(manifest,indent=2))
