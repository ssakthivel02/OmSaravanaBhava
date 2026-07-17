#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, os, shutil, subprocess, sys, tempfile, zipfile
from pathlib import Path

BASE = 'dfef1e4e76582b1fe5995547bbfa561300fbea9b'
TITLE = 'Release 242: recover production baseline and remove misuploaded release packages'
REMOTE = "https://github.com/ssakthivel02/OmSaravanaBhava.git"
MANIFEST = "manifest-release-242.json"

def run(command, cwd, env=None, capture=False, check=True):
    print("$", " ".join(map(str, command)))
    result = subprocess.run(
        command, cwd=cwd, env=env, text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.STDOUT if capture else None,
        check=False,
    )
    if check and result.returncode:
        if capture and result.stdout:
            print(result.stdout)
        raise SystemExit(result.returncode)
    return (result.stdout or "").strip() if capture else result.returncode

def chunks(values, size=40):
    for index in range(0, len(values), size):
        yield values[index:index + size]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--package-root", required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--no-push", action="store_true")
    args = parser.parse_args()

    package = Path(args.package_root).resolve()
    target = Path(args.target).resolve()
    payload_zip = package / "RELEASE_242_PAYLOAD.zip"
    if not payload_zip.is_file():
        raise SystemExit(f"Missing payload archive: {payload_zip}")
    if target.exists() and any(target.iterdir()):
        raise SystemExit(f"Target is not empty: {target}")
    target.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="osb-r242-payload-") as temp:
        payload = Path(temp) / "payload"
        payload.mkdir()
        with zipfile.ZipFile(payload_zip) as archive:
            archive.extractall(payload)
        manifest = json.loads((payload / MANIFEST).read_text(encoding="utf-8"))

        run(["git", "clone", "--branch", "main", "--single-branch", REMOTE, str(target)], target.parent)
        actual = run(["git", "rev-parse", "HEAD"], target, capture=True)
        if actual != BASE:
            raise SystemExit(f"Expected remote base {BASE}, found {actual}")

        tracked = set(run(["git", "ls-files"], target, capture=True).splitlines())
        missing = sorted(set(manifest["deleted_files"]) - tracked)
        if missing:
            raise SystemExit("Required deletion targets are not tracked:\n" + "\n".join(missing))

        for relative in manifest["added_files"] + manifest["modified_files"]:
            source = payload / relative
            destination = target / relative
            if not source.is_file():
                raise SystemExit(f"Missing payload: {relative}")
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)

        for batch in chunks(manifest["deleted_files"]):
            run(["git", "rm", "-f", "--", *batch], target)
        for batch in chunks(manifest["added_files"] + manifest["modified_files"]):
            run(["git", "add", "--", *batch], target)

        env = dict(os.environ)
        env["PYTHONDONTWRITEBYTECODE"] = "1"
        run([sys.executable, "-B", "-m", "tools.production_baseline.validate", "--root", ".", "--mode", "staged"], target, env)
        js_tests = sorted(str(p.relative_to(target)) for p in (target / "tests/js").glob("*.test.mjs"))
        run(["node", "--test", *js_tests], target, env)
        run([sys.executable, "-B", "-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py", "-v"], target, env)
        run([sys.executable, "-B", "-m", "tools.deployment_conformance.validate", "--root", "."], target, env)
        run([sys.executable, "-B", "-m", "tools.effective_route_consumers.validate", "--root", "."], target, env)
        run([sys.executable, "-B", "-m", "tools.repository_hygiene.validate", "--root", "."], target, env)
        run([sys.executable, "-B", "-m", "tools.repository_integrity.validate", "--root", ".", "--manifest", MANIFEST], target, env)

        name = run(["git", "config", "--get", "user.name"], target, capture=True, check=False)
        email = run(["git", "config", "--get", "user.email"], target, capture=True, check=False)
        if not name:
            run(["git", "config", "user.name", "Sakthivel S"], target)
        if not email:
            email = input("Git commit email: ").strip()
            if not email:
                raise SystemExit("Git commit email is required.")
            run(["git", "config", "user.email", email], target)

        run(["git", "diff", "--cached", "--name-status"], target)
        run(["git", "commit", "-m", TITLE], target)
        run([sys.executable, "-B", "-m", "tools.production_baseline.validate", "--root", ".", "--mode", "final"], target, env)

        parent = run(["git", "rev-parse", "HEAD^"], target, capture=True)
        subject = run(["git", "log", "-1", "--format=%s"], target, capture=True)
        if parent != BASE:
            raise SystemExit(f"Final parent mismatch: {parent}")
        if subject != TITLE:
            raise SystemExit(f"Final subject mismatch: {subject}")

        if not args.no_push:
            run(["git", "push", "origin", "HEAD:main"], target)

        result = {
            "release": 242,
            "status": "PASS",
            "commit": run(["git", "rev-parse", "HEAD"], target, capture=True),
            "parent": parent,
            "subject": subject,
            "changedPaths": 337,
            "added": 28,
            "modified": 16,
            "deleted": 293,
            "target": str(target),
            "pushed": not args.no_push,
        }
        (package / "RELEASE_242_PUBLISH_RESULT.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(result, indent=2))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
