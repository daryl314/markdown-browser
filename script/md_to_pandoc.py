#!/usr/bin/env python
import sys, re

# read data from stdin
txt = sys.stdin.read()

# escape inline latex
#txt = re.sub(r'(?m)\$\$\s*([\s\S]*?)\s*\$\$', r'$$\1$$', txt)
txt = re.sub(r'(?m)\$\$\s*([\s\S]*?)\s*\$\$', r'$\1$', txt)

# escape block latex
txt = re.sub(r'\\\\\(\s*([\s\S]*?)\s*\\\\\)', r'$$\1$$', txt)

# remove TOC entries
txt = re.sub(r'\[TOC\]\s*', '', txt)

# dump a header
print '''---
geometry: "top=0.5in, bottom=0.5in, left=0.3in, right=0.3in"
header-includes: |
    \\usepackage{fancyhdr}
    \\pagestyle{fancy}
---'''

# dump data back to stdout
sys.stdout.write(txt)
