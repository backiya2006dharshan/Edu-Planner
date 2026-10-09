import os
import re

directory = r"d:\project edu\frontend\src"

replacements = [
    (r'\btext-white\b', 'text-text-primary'),
    (r'\btext-gray-100\b', 'text-text-primary'),
    (r'\btext-gray-200\b', 'text-text-primary'),
    (r'\btext-gray-300\b', 'text-text-muted'),
    (r'\btext-gray-400\b', 'text-text-muted'),
    (r'\btext-gray-500\b', 'text-text-muted'),
    (r'\bbg-black\b', 'bg-background'),
    (r'\bbg-\[\#0a0a0a\]\b', 'bg-surface'),
    (r'\bbg-white/5\b', 'bg-surface-light'),
    (r'\bbg-white/10\b', 'bg-surface-light'),
    (r'\bbg-white/20\b', 'bg-surface-light'),
    (r'\bborder-white/5\b', 'border-border'),
    (r'\bborder-white/10\b', 'border-border'),
    (r'\bborder-white/20\b', 'border-border'),
]

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for pattern, repl in replacements:
                new_content = re.sub(pattern, repl, new_content)
                
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")

print("Done.")
