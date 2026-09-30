import re
with open('data.js', 'r') as f:
    names = re.findall(r'"name": "(.*?)",', f.read())
print(names)
