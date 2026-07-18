from pathlib import Path
r=Path(__file__).resolve().parents[2];m=[n for n in range(261,281) if not (r/f'release-{n}.html').exists()]
assert not m,m
print('Release range valid')