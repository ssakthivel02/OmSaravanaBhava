#!/usr/bin/env python3
import argparse, json
from pathlib import Path
from .git import tracked, staged
from .jsonio import load_json
from .validator import validate_closure
def main():
    p=argparse.ArgumentParser(); p.add_argument("--root",default="."); p.add_argument("--mode",choices=("pending","staged","final"),required=True); a=p.parse_args(); root=Path(a.root).resolve()
    report=validate_closure(root=root,policy=load_json(root/"policies/release-closure.json"),contract=load_json(root/"data/release-240-closure.json"),plan=load_json(root/"data/release-240-deletion-plan.json"),mode=a.mode,tracked_paths=tracked(root) if a.mode in ("pending","final") else None,staged_changes=staged(root) if a.mode=="staged" else None)
    print(json.dumps(report,ensure_ascii=False,indent=2)); return 0 if report["status"]=="PASS" else 1
if __name__=="__main__": raise SystemExit(main())
