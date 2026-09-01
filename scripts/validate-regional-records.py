import json,sys
from pathlib import Path
b=Path(__file__).resolve().parents[1];i=json.loads((b/"data/temples/regional/index.json").read_text(encoding="utf-8"));e=[]
for x in i["records"]:
 p=b/"data/temples/regional"/(x["id"]+".json")
 if not p.exists():e.append("Missing "+p.name)
if i["count"]!=len(i["records"]):e.append("Index count mismatch")
print("Structural validation passed for 10 records." if not e else "\n".join(e));sys.exit(1 if e else 0)
