#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import sys
import signal

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

if __name__ == '__main__':

    # parse input arguments
    parser = argparse.ArgumentParser(description="Markdown processing tool")
    parser.add_argument('infile', help="markdown file to process", nargs='?')
    parser.add_argument('--action', help="Processing action", default="RenderTerminal")
    parser.add_argument('--width', help="Output width", type=int, default=80)
    args = parser.parse_args()

    # read input data
    if args.infile is not None:
        txt = open(args.infile, 'rt').read()
    else:
        txt = TEST_TEXT

    # special case: process tagged text json
    if args.infile is not None and args.infile.endswith('.json') and txt[0] == '{':
        tt = TypedTree._fromjson(txt)
        signal.signal(signal.SIGPIPE, sigpipe_handler)
        doc = TaggedTextDocument.fromAST(tt, width=args.width)
        doc.render(TerminalRenderer().render)
        sys.exit(0)

    # perform action
    cdoc = cmark.parse(txt)
    if args.action == 'RenderTerminal':
        signal.signal(signal.SIGPIPE, sigpipe_handler)
        tt = cmark.parse(txt).toAST()
        doc = TaggedTextDocument.fromAST(tt, width=args.width)
        doc.render(TerminalRenderer().render)
    elif args.action == 'SimpleHTML':
        print(cdoc.toHTML())
    elif args.action == 'HTML':
        print(toStyledHTML(txt))
    elif args.action == 'Latex':
        print(cmark.mdToLatex(txt))
    elif args.action == 'AST':
        print(cdoc.toAST())
    elif args.action == 'JSON':
        print(cdoc.toAST()._tojson())
    elif args.action == 'JSONPP':
        print(cdoc.toAST()._tojson(sort_keys=True, indent=4, separators=(',', ': ')))

