import subprocess
from pathlib import Path
def run(root: Path, *args: str):
    result=subprocess.run(["git",*args],cwd=root,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False)
    if result.returncode: raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout.strip()
def tracked(root): return set(filter(None, run(root,"ls-files").splitlines()))
def staged(root):
    out=run(root,"diff","--cached","--name-status","--no-renames")
    result={}
    for line in out.splitlines():
        if line:
            status,path=line.split("\t",1); result[path]=status[0]
    return result
