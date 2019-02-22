#!/usr/bin/env python

import argparse, glob
from pycmark.cmarkgfm import CmarkLatex
from pycmark.taggedtext.TaggedCmarkDocument import TaggedTextDocument
from pycmark.render.TerminalRenderer import TerminalRenderer

################################################################################

if __name__ == '__main__':

    # parse input arguments
    parser = argparse.ArgumentParser(description="Markdown processing tool")
    parser.add_argument('infile', help="markdown file to process", nargs='?')
    parser.add_argument('--action', help="Processing action", default="RenderTerminal")
    parser.add_argument('--width', help="Output width", type=int, default=80)
    parser.add_argument('--test', action='store_true', help="Run tests")
    args = parser.parse_args()

    # read input data
    if args.infile is not None:
        txt = open(args.infile, 'rt').read()
    else:
        txt = CmarkLatex.TEST_TEXT

    # perform action
    if args.action == 'RenderTerminal':
        doc = TaggedTextDocument.fromMarkdown(txt, width=args.width)
        doc.render(TerminalRenderer.render)
    elif args.action == 'AST':
        doc = CmarkLatex.LatexDocument(txt)
        print doc.toAST()
    elif args.action == 'JSON':
        doc = CmarkLatex.LatexDocument(txt)
        print doc.toAST()._tojson()
    elif args.action == 'JSONPP':
        doc = CmarkLatex.LatexDocument(txt)
        print doc.toAST()._tojson(sort_keys=True, indent=4, separators=(',', ': '))

    # run tests
    if args.test:
        mdfiles = ['sample.md'] + glob.glob('../syncData/html/*/*.md')
        for mdFile in mdfiles:
            print "Testing file:", mdFile
            TaggedTextDocument.fromMarkdown(open(mdFile,'rt').read())
