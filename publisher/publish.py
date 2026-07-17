#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, os, shutil, subprocess, sys
from pathlib import Path

BASE = 'b9099a1fde77bb97f5d09411ce1fc05daaab40d0'
TITLE = 'Release 241: establish verified production baseline and retire legacy release machinery'
REMOTE = "https://github.com/ssakthivel02/OmSaravanaBhava.git"

def run(command, cwd, env=None, capture=False):
    print("$", " ".join(map(str, command)))
    result=subprocess.run(command,cwd=cwd,env=env,text=True,stdout=subprocess.PIPE if capture else None,stderr=subprocess.STDOUT if capture else None,check=False)
    if result.returncode:
        if capture and result.stdout: print(result.stdout)
        raise SystemExit(result.returncode)
    return result.stdout.strip() if capture else ""

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--package-root", required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--no-push", action="store_true")
    args=parser.parse_args()
    package=Path(args.package_root).resolve()
    target=Path(args.target).resolve()
    payload=package/"payload"
    manifest=json.loads((payload/"manifest-release-241.json").read_text(encoding="utf-8"))
    if target.exists() and any(target.iterdir()):
        raise SystemExit(f"Target is not empty: {target}")
    target.mkdir(parents=True,exist_ok=True)
    run(["git","clone","--branch","main","--single-branch",REMOTE,str(target)], target.parent)
    actual=run(["git","rev-parse","HEAD"],target,capture=True)
    if actual != BASE:
        raise SystemExit(f"Expected remote base {BASE}, found {actual}")
    tracked=set(run(["git","ls-files"],target,capture=True).splitlines())
    missing=sorted(set(manifest["deleted_files"])-tracked)
    if missing:
        raise SystemExit("Required deletion targets are not tracked:\n"+"\n".join(missing))
    for relative in manifest["added_files"]+manifest["modified_files"]:
        source=payload/relative
        destination=target/relative
        if not source.is_file(): raise SystemExit(f"Missing payload: {relative}")
        destination.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(source,destination)
    run(["git","rm","-f","--",*manifest["deleted_files"]],target)
    run(["git","add","--",*(manifest["added_files"]+manifest["modified_files"])],target)
    env=dict(os.environ); env["PYTHONDONTWRITEBYTECODE"]="1"
    run([sys.executable,"-B","-m","tools.production_baseline.validate","--root",".","--mode","staged"],target,env)
    run(["node","--test",*sorted(str(p.relative_to(target)) for p in (target/"tests/js").glob("*.test.mjs"))],target,env)
    run([sys.executable,"-B","-m","unittest","discover","-s","tests","-p","test_*.py","-v"],target,env)
    run([sys.executable,"-B","-m","tools.deployment_conformance.validate","--root","."],target,env)
    run([sys.executable,"-B","-m","tools.effective_route_consumers.validate","--root","."],target,env)
    run([sys.executable,"-B","-m","tools.repository_hygiene.validate","--root","."],target,env)
    run([sys.executable,"-B","-m","tools.repository_integrity.validate","--root",".","--manifest","manifest-release-241.json"],target,env)
    if not run(["git","config","user.name"],target,capture=True): run(["git","config","user.name","Sakthivel S"],target)
    if not run(["git","config","user.email"],target,capture=True):
        email=input("Git commit email: ").strip()
        if not email: raise SystemExit("Commit email is required.")
        run(["git","config","user.email",email],target)
    run(["git","diff","--cached","--name-status"],target)
    run(["git","commit","-m",TITLE],target)
    run([sys.executable,"-B","-m","tools.production_baseline.validate","--root",".","--mode","final"],target,env)
    if not args.no_push: run(["git","push","origin","HEAD:main"],target)
    result={
        "release":241,
        "status":"PASS",
        "commit":run(["git","rev-parse","HEAD"],target,capture=True),
        "parent":run(["git","rev-parse","HEAD^"],target,capture=True),
        "subject":run(["git","log","-1","--format=%s"],target,capture=True),
        "target":str(target),
        "pushed":not args.no_push,
    }
    (package/"RELEASE_241_PUBLISH_RESULT.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(result,indent=2))
    return 0

if __name__ == "__main__": raise SystemExit(main())
