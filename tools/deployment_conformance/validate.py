import argparse,json,sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--root',default='.');a=p.parse_args();root=Path(a.root);c=json.loads((root/'config/release-281/deployment-contract.json').read_text());errors=[]
for route in c['critical_routes']:
    if not (root/route).exists():errors.append('Missing '+route)
for d in c['required_directories']:
    if not (root/d).is_dir():errors.append('Missing directory '+d)
(root/'deployment-conformance-report.txt').write_text(('FAILED\n'+'\n'.join(errors)) if errors else 'PASSED\nRelease 281 deployment contract validated.\n')
print('\n'.join(errors) if errors else 'Deployment conformance passed.')
raise SystemExit(1 if errors else 0)
