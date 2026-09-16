import os
import re

p = re.compile(
    r'(TODO|FIXME|NotImplemented|mock|dummy|placeholder|localhost|127\.0\.0\.1|0\.0\.0\.0|http://|https://|requests\.|httpx\.|fetch\(|axios\.|subprocess\.|os\.system|eval\(|exec\(|hash\(|@ts-ignore)',
    re.IGNORECASE
)

for rt, _, fs in os.walk('.'):
    if any(x in rt for x in ['.git', 'node_modules', 'venv', 'tests', '__pycache__', 'dist']):
        continue
    for f in fs:
        if f.endswith(('.py', '.ts', '.tsx')) and f != 'test_login.py':
            path = os.path.join(rt, f)
            try:
                with open(path, encoding='utf-8', errors='ignore') as fp:
                    for i, l in enumerate(fp):
                        if p.search(l):
                            print(f'{path}:{i+1} {l.strip().encode("ascii", "ignore").decode("ascii")}')
            except Exception:
                pass
