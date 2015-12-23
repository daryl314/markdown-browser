#!/usr/bin/env python

import os
import re

# read content from validate.html
htmlContent = [x for x in open('validate.html')]

# identify template boundaries
preIdx  = htmlContent.index([ x for x in htmlContent if re.match(r'\s*<!-- START AUTO-POPULATED TESTS -->',x) ][0])
postIdx = htmlContent.index([ x for x in htmlContent if re.match(r'\s*<!-- END AUTO-POPULATED TESTS -->'  ,x) ][0]) 

# initialize output array with start of validate.html
out = htmlContent[:preIdx+1]

# files to read
files = [ f for f in os.listdir('marked/test/tests') if f.endswith('.text') ]

# iterate over files
for f in files:

    # base file name
    base = f.replace('.text','')

    # don't process tests for non-default marked.js modes
    if base.endswith('.smartypants') or base.endswith('.nogfm') or base.endswith('.breaks'):
        pass
    else:

        # extract text and html (skipping blank lines in html)
        text = ''.join([ 
            re.sub(r'\s+\n', '\n', '    '+x)
            for x in open('marked/test/tests/'+base+'.text') ])
        html = ''.join([ 
            re.sub(r'\s+\n', '\n', '    '+x)
            for x in open('marked/test/tests/'+base+'.html') 
            if not re.match(r'^\s*$',x) ])

        # escape quotes in text input
        text = text.replace('"', '&quot;')

        # generate corresponding output
        out.append('  <!-- ' + base + '-->\n')
        out.append('  <section id="' + base + '" data-text="\n')
        out.append(text + '\n')
        out.append('    ">\n')
        out.append(html + '\n')
        out.append('  </section>\n')

# extend output array with end of validate.html
out.append('\n')
out.extend(htmlContent[postIdx:])

# update validate.html file with new content
with open('validate.html', 'w') as handle:
    handle.writelines(out)