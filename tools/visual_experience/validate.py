from __future__ import annotations
import argparse,json
from pathlib import Path
def validate(root:Path)->dict:
    policy=json.loads((root/'policies/visual-experience.json').read_text(encoding='utf-8'));contract=json.loads((root/'data/visual-experience.json').read_text(encoding='utf-8'));findings=[]
    for path in policy['requiredStyles']+policy['requiredModules']+policy['requiredAssets']:
        if not (root/path).is_file(): findings.append({'rule':'missing','path':path})
    index=(root/'index.html').read_text(encoding='utf-8')
    for token in ('premium-hero','premium-menu-button','data-motion-toggle'):
        if token not in index: findings.append({'rule':'homepage-token','path':token})
    motion=(root/'assets/css/premium-motion.css').read_text(encoding='utf-8')
    if 'prefers-reduced-motion:reduce' not in motion: findings.append({'rule':'reduced-motion'})
    if contract.get('release')!=245: findings.append({'rule':'release'})
    if any(x in index for x in ('googletagmanager','gtag(','facebook.net')): findings.append({'rule':'tracking'})
    return {'release':245,'status':'PASS' if not findings else 'FAIL','findingCount':len(findings),'findings':findings}
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--root',default='.');args=ap.parse_args();report=validate(Path(args.root).resolve());print(json.dumps(report,indent=2));raise SystemExit(0 if report['status']=='PASS' else 1)
if __name__=='__main__':main()
