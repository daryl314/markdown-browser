import os
import re

# files to read
files = [ f for f in os.listdir('marked/test/tests') if f.endswith('.text') ]

# iterate over files
for f in files:

    # base file name
    base = f.replace('.text','')
    
    # don't process non-GFM or smartypants tests
    if base.endswith('.smartypants') or base.endswith('.nogfm'):
        pass
    else:

        # extract text and html (skipping blank lines in html)
        text = '  '.join([ x for x in open('marked/test/tests/'+base+'.text') ])
        html = '  '.join([ x for x in open('marked/test/tests/'+base+'.html') if not re.match(r'^\s*$',x) ])
        
        # escape quotes in text input
        text = text.replace('"', '&quot;')
        
        # generate corresponding output
        print('<!-- ' + base + '-->')
        print('<section id="' + base + '" data-text="')
        print('  ' + text)
        print('  ">')
        print('  ' + html)
        print('</section>')    
