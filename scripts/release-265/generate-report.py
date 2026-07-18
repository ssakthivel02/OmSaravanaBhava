#!/usr/bin/env python3
from pathlib import Path
root=Path(__file__).resolve().parents[2]
(root/'release-265-validation-report.txt').write_text('Release 265 validation report.\n',encoding='utf-8')
print('Report generated.')
