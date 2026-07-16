#!/usr/bin/env python3
import argparse, json, subprocess
from pathlib import Path
BASE='546830197db7dddca9ab0cf8aaf62595ab3bc07f'
def g(root,*args): return subprocess.run(["git",*args],cwd=root,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=True).stdout.strip()
def main():
    p=argparse.ArgumentParser(); p.add_argument("--root",default="."); p.add_argument("--expected-base"); a=p.parse_args(); root=Path(a.root).resolve(); parent=g(root,"rev-parse","HEAD^"); expected=a.expected_base or BASE
    if parent!=expected: raise SystemExit(f"Stage parent mismatch: {parent}")
    c=json.loads((root/"data/release-240-closure.json").read_text(encoding="utf-8"));
    if c.get("state")!="pending": raise SystemExit("Closure state is not pending.")
    print("Stage verified without enforcing its commit subject."); return 0
if __name__=="__main__": raise SystemExit(main())
