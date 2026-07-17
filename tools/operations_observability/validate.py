from __future__ import annotations
import argparse,glob,json,subprocess
from pathlib import Path
def read_json(path:Path): return json.loads(path.read_text(encoding='utf-8'))
def json_value(payload,dotted):
    current=payload
    for part in dotted.split('.') if dotted else []: current=current[part]
    return current
def evaluate(root:Path,check:dict)->dict:
    if check['mode']=='advisory': return {'id':check['id'],'status':'ADVISORY','message':'human review required'}
    target=str(check.get('target',''));path=root/target;probe=check['probe'];exp=check.get('expectation') or {}
    try:
        if probe=='file_exists': ok=path.is_file()
        elif probe=='file_absent': ok=not path.exists()
        elif probe=='text_contains': ok=path.is_file() and str(exp['text']) in path.read_text(encoding='utf-8')
        elif probe=='text_not_contains': ok=path.is_file() and str(exp['text']) not in path.read_text(encoding='utf-8')
        elif probe=='json_equals': ok=json_value(read_json(path),str(exp['path']))==exp.get('value')
        elif probe=='glob_no_match': ok=not [p for p in glob.glob(str(root/target),recursive=True) if Path(p).is_file()]
        else: ok=False
    except (OSError,KeyError,ValueError,TypeError,json.JSONDecodeError): ok=False
    return {'id':check['id'],'status':'PASS' if ok else 'FAIL','target':target}
def validate_repository(root:Path,mode:str='package')->dict:
    catalog=read_json(root/'data/operations/check-catalog.json');baseline=read_json(root/'data/production-baseline.json');manifest=read_json(root/baseline['manifest'])
    results=[evaluate(root,c) for c in catalog['checks']];failed=[r for r in results if r['status']=='FAIL']
    report={'release':manifest['release'],'mode':mode,'status':'PASS' if not failed else 'FAIL','checkCount':len(results),'automatedCount':catalog['automatedCount'],'advisoryCount':catalog['advisoryCount'],'failedCount':len(failed),'results':results}
    if mode=='final':
        parent=subprocess.check_output(['git','rev-parse','HEAD^'],cwd=root,text=True).strip();subject=subprocess.check_output(['git','log','-1','--pretty=%s'],cwd=root,text=True).strip()
        if parent!=manifest['base_commit'] or subject!=manifest['required_commit_title']: report['status']='FAIL'
    return report
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--root',default='.');ap.add_argument('--mode',choices=['package','final'],default='package');ap.add_argument('--report');args=ap.parse_args();report=validate_repository(Path(args.root).resolve(),args.mode)
    if args.report:
        p=Path(args.report);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(report,indent=2)+'\n')
    print(f"Operations observability: {report['status']} ({report['failedCount']} failed, {report['advisoryCount']} advisory)");raise SystemExit(0 if report['status']=='PASS' else 1)
if __name__=='__main__':main()
