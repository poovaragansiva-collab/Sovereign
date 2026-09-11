import ast
import os
import sys

def get_imports(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        try:
            tree = ast.parse(f.read(), filename=filepath)
        except:
            return set()
    
    imports = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.add(alias.name.split('.')[0])
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imports.add(node.module.split('.')[0])
    return imports

stdlib = set(sys.stdlib_module_names)
all_imports = set()

for root, _, files in os.walk(r"d:\Sovereign"):
    if 'venv' in root or '.git' in root or '__pycache__' in root:
        continue
    for f in files:
        if f.endswith('.py'):
            all_imports.update(get_imports(os.path.join(root, f)))

third_party = all_imports - stdlib
# Exclude our own modules
local_modules = {'ai', 'app', 'backend', 'models', 'plugins', 'rag', 'tools', 'verification', 'vision', 'outputs', 'tests', 'test_service', 'test_task'}
third_party -= local_modules
print("Third party imports:")
for pkg in sorted(third_party):
    print(pkg)
