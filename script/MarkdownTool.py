#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import sys
import signal
import subprocess

import pycmark.cmarkgfm as cmark
from pycmark.taggedtext.TaggedCmarkDocument import TaggedTextDocument
from pycmark.taggedtext.render.TerminalRenderer import TerminalRenderer
from pycmark.util.TypedTree import TypedTree
from pycmark.html.HTML_Generator import toStyledHTML

################################################################################

TEST_TEXT = '''# 🍺 `This` is ~Testing~ text

This is $$a * b * c$$ or \\\\(d * e * f\\\\) ...


## Some content ##

* This is $$ a test of \\\\( non-terminated latex...
* Hello ~strikethrough~ **bold** *italic* `code` [link](http://google.com)

foo | bar | baz
----|:---:|----
abc | def | ghi
jkl | mno | pqr

1. Foo
2. Bar
3. Baz
    1. Nested Baz.1
        1. Nested Baz.1.1
    2. Nested Baz.2

- [ ] Task 1
- [x] Task 2
    - [ ] Task 2.1
    - [x] Task 2.2
    - [ ] Task 2.3


```python
arr = [1,2,3]
y = [2*x for x in arr]
```

> this is
> some quoted
>
> silly
> text

    And this is some
    preformatted
    text

'''

# handler to stop processing if stdout is closed
def sigpipe_handler(e):
    sys.exit(0)

HELP_TEXT = '''Markdown processing tool

Valid actions (default is RenderTerminal):
    - RenderTerminal  Render output to terminal (and ignore outfile)
    - SimpleHTML      Generate HTML without styling
    - HTML            Generate single-page styled HTML
    - Latex           Generate a Latex document
    - AST             Generate human-readable AST representation of document
    - JSON            Generate compact JSON export of document AST
    - JSONPP          Generate expanded JSON export of document AST
    
If an input file isn't given the internal test document is used as a source
'''

if __name__ == '__main__':

    # parse input arguments
    parser = argparse.ArgumentParser(
        description=HELP_TEXT,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('infile', help="markdown file to process", nargs='?')
    parser.add_argument('--action', help="Processing action", default="RenderTerminal")
    parser.add_argument('--width', help="Output width", type=int, default=80)
    parser.add_argument('--auto-width', action="store_true", help="Adjust to terminal width")
    parser.add_argument('--outfile', help="Output file (default stdout)")
    args = parser.parse_args()

    # adjust to terminal width?
    if args.auto_width:
        args.width = int(subprocess.check_output(['tput', 'cols']))

    # read input data
    if args.infile is not None:
        txt = open(args.infile, 'rt').read()
    else:
        txt = TEST_TEXT

    # special case: process tagged text json and render to stdout
    if args.infile is not None and args.infile.endswith('.json') and txt[0] == '{':
        tt = TypedTree._fromjson(txt)
        signal.signal(signal.SIGPIPE, sigpipe_handler)
        doc = TaggedTextDocument.fromAST(tt, width=args.width)
        doc.render(TerminalRenderer().render)
        sys.exit(0)

    # output writer
    if args.outfile is not None:
        writer = open(args.outfile, 'wt')
    else:
        writer = sys.stdout

    # perform action
    cdoc = cmark.parse(txt)
    if args.action == 'RenderTerminal':
        signal.signal(signal.SIGPIPE, sigpipe_handler)
        tt = cmark.parse(txt).toAST()
        doc = TaggedTextDocument.fromAST(tt, width=args.width)
        doc.render(TerminalRenderer().render)
    elif args.action == 'SimpleHTML':
        writer.write(cdoc.toHTML() + '\n')
    elif args.action == 'HTML':
        writer.write(toStyledHTML(txt) + '\n')
    elif args.action == 'Latex':
        writer.write(cmark.mdToLatex(txt) + '\n')
    elif args.action == 'AST':
        writer.write(cdoc.toAST().__repr__() + '\n')
    elif args.action == 'JSON':
        writer.write(cdoc.toAST()._tojson() + '\n')
    elif args.action == 'JSONPP':
        writer.write(cdoc.toAST()._tojson(sort_keys=True, indent=4, separators=(',', ': ')) + '\n')
    else:
        sys.stderr.write("Valid actions: RenderTerminal, SimpleHTML, HTML, Latex, AST, JSON, JSONPP\n")
        sys.exit(1)

