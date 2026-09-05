import os
def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except: return
    if ".eq('user_id', 'default_user')" in content:
        content = content.replace(".eq('user_id', 'default_user')", "")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print('Fixed', filepath)
    elif "user_id: 'default_user'" in content:
        content = content.replace("user_id: 'default_user'", "user_id: null")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print('Fixed', filepath)

for root, _, files in os.walk('.'):
    if 'node_modules' in root or '.next' in root: continue
    for f in files:
        if f.endswith('.ts') or f.endswith('.tsx') or f.endswith('.js'):
            fix_file(os.path.join(root, f))
