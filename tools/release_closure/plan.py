from .models import Finding
def validate_plan(plan, policy):
    findings=[]; paths=[str(x) for x in plan.get("paths",[])]
    if plan.get("release") != 240: findings.append(Finding("plan-release","Deletion plan release must be 240."))
    if len(paths) != int(plan.get("expectedCount",-1)): findings.append(Finding("plan-count","Deletion plan expectedCount differs from its path count."))
    if len(paths) != len(set(paths)): findings.append(Finding("plan-duplicate","Deletion plan paths must be unique."))
    if len(paths) > int(policy.get("maximumFinalChangedFiles",500))-4: findings.append(Finding("plan-limit","Final closure would exceed the changed-file limit."))
    forbidden=sum(1 for p in paths if "__pycache__" in p or p.endswith((".pyc",".pyo")) or p=="assets/js/site-directory.js")
    if forbidden != 14: findings.append(Finding("forbidden-count","Plan must include the fourteen known forbidden artifacts."))
    return findings
