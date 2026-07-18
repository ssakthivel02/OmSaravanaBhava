import json
from pathlib import Path
r=Path(__file__).resolve().parents[2];a={'regional-temple-map.html':'release-263.html','regional-pilgrimage.html':'pilgrimage-builder.html','regional-festival-calendar.html':'festival-knowledge.html','regional-gallery.html':'temple-gallery.html'}
for s,t in a.items():assert (r/s).exists() and (r/t).exists() and t in (r/s).read_text()
print('Aliases valid')