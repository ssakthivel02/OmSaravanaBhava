#!/usr/bin/env python3
import argparse, json, subprocess
from pathlib import Path
def main():
    p=argparse.ArgumentParser(); p.add_argument("--root",default="."); a=p.parse_args(); root=Path(a.root).resolve(); plan=json.loads((root/"data/release-240-deletion-plan.json").read_text(encoding="utf-8")); tracked=set(subprocess.run(["git","ls-files"],cwd=root,stdout=subprocess.PIPE,text=True,check=True).stdout.splitlines()); remaining=sorted(set(plan["paths"])&tracked)
    if remaining: raise SystemExit("Targets remain tracked:\n"+"\n".join(remaining))
    staged=subprocess.run(["git","diff","--cached","--name-status","--no-renames"],cwd=root,stdout=subprocess.PIPE,text=True,check=True).stdout.splitlines(); deleted=sum(1 for x in staged if x.startswith("D\t"))
    if deleted!=len(plan["paths"]): raise SystemExit(f"Expected {len(plan['paths'])} staged deletions, found {deleted}")
    print(f"Final closure state verified: {deleted} deletions."); return 0
if __name__=="__main__": raise SystemExit(main())
