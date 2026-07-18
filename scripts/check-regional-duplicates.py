import json,sys
from pathlib import Path
b=Path(__file__).resolve().parents[1];d=json.loads((b/"data/editorial/regional-duplicate-registry.json").read_text(encoding="utf-8"));seen=set();seenid=set();e=[]
for x in d["keys"]:
  if x["official_temple_id"] in seen:e.append("Duplicate official ID: "+x["official_temple_id"])
  if x["id"] in seenid:e.append("Duplicate record ID: "+x["id"])
  seen.add(x["official_temple_id"]);seenid.add(x["id"])
print("Duplicate check passed for 10 records." if not e else "\n".join(e));sys.exit(1 if e else 0)
