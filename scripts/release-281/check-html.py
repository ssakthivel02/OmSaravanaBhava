from pathlib import Path
r=Path(__file__).resolve().parents[2]
for x in ['platform-hub.html','regional-temple-map.html','regional-pilgrimage.html','regional-festival-calendar.html','regional-gallery.html']:
 t=(r/x).read_text();assert '<title>' in t and 'viewport' in t
print('HTML valid')