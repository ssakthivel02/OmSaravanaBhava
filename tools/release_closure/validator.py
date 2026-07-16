from pathlib import Path
from .constants import PASS, FAIL
from .models import Finding
from .plan import validate_plan
def validate_closure(*, root: Path, policy: dict, contract: dict, plan: dict, mode: str, tracked_paths=None, staged_changes=None):
    findings=[]; findings.extend(validate_plan(plan,policy)); targets=set(plan.get("paths",[]))
    if contract.get("release") != 240: findings.append(Finding("contract-release","Closure contract release must be 240."))
    if contract.get("approvedBaseCommit") != policy.get("approvedBaseCommit"): findings.append(Finding("contract-base","Contract and policy base commits differ."))
    if contract.get("browserStageSubjectEnforced") is not False: findings.append(Finding("stage-subject","Stage commit subject must not be enforced."))
    if mode=="pending":
        if tracked_paths is not None:
            missing=sorted(targets-tracked_paths)
            if missing: findings.append(Finding("pending-targets","Closure targets missing before finalization: "+", ".join(missing)))
    elif mode=="staged":
        expected={p:"D" for p in targets}; expected.update({"RELEASE_240_CLOSURE_RESULT.json":"A", ".release-governance.json":"M", "data/release-240-closure.json":"M", "manifest-release-240.json":"M", "RELEASE_240_SHA256SUMS.txt":"M"})
        actual=staged_changes or {}
        missing=sorted(set(expected)-set(actual)); extra=sorted(set(actual)-set(expected)); mismatch=sorted(p for p in set(expected)&set(actual) if expected[p]!=actual[p])
        if missing: findings.append(Finding("staged-missing","Missing staged paths: "+", ".join(missing)))
        if extra: findings.append(Finding("staged-extra","Undeclared staged paths: "+", ".join(extra)))
        if mismatch: findings.append(Finding("staged-status","Incorrect staged statuses: "+", ".join(mismatch)))
    elif mode=="final":
        if tracked_paths is not None:
            remaining=sorted(targets&tracked_paths)
            if remaining: findings.append(Finding("final-targets","Closure targets remain tracked: "+", ".join(remaining)))
        if not (root/"RELEASE_240_CLOSURE_RESULT.json").is_file(): findings.append(Finding("final-result","Closure result is missing."))
    else: findings.append(Finding("mode","Unsupported closure mode."))
    return {"status":PASS if not findings else FAIL,"release":240,"mode":mode,"findingCount":len(findings),"targetCount":len(targets),"findings":[f.to_dict() for f in findings]}
