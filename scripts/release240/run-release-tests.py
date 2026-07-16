#!/usr/bin/env python3
import argparse, os, subprocess
from pathlib import Path
def run(cmd,root,env):
    print("$"," ".join(cmd)); r=subprocess.run(cmd,cwd=root,env=env,check=False);
    if r.returncode: raise SystemExit(r.returncode)
def main():
    p=argparse.ArgumentParser(); p.add_argument("--root",default="."); a=p.parse_args(); root=Path(a.root).resolve(); env=dict(os.environ); env["PYTHONDONTWRITEBYTECODE"]="1"
    js=sorted(x.relative_to(root).as_posix() for x in (root/"tests/js").glob("*.test.mjs")); run(["node","--test",*js],root,env); run(["python","-B","-m","unittest","discover","-s","tests","-p","test_*.py","-v"],root,env); run(["python","-B","-m","tools.deployment_conformance.validate","--root","."],root,env); run(["python","-B","-m","tools.effective_route_consumers.validate","--root","."],root,env)
    return 0
if __name__=="__main__": raise SystemExit(main())
