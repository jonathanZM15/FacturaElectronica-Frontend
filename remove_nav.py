import re

file_path = r"C:\Users\CompuStore\Desktop\dos sistemas\tesis\FacturaElectronica-Frontend\src\components\Navbar\Navbar.tsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'<li className="nav-item">\s*<NavLink\s*to="/cajas"[\s\S]*?</NavLink>\s*</li>'
content = re.sub(pattern, '', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
