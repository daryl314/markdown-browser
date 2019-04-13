#!/usr/bin/env python2

import sys, os, subprocess, datetime
from pyevernote.EvernoteMetadata import EvernoteMetadata
from pycmark.html.HTML_Generator import toStyledHTML
import pycmark.cmarkgfm.CmarkLatex as CmarkLatex

# determine output directory and create if it doesn't exist
syncdata = sys.argv[1] if len(sys.argv) > 1 else '../syncData'
if not os.path.isdir(os.path.join(syncdata, 'markdown')):
    os.mkdir(os.path.join(syncdata, 'markdown'))

# load and process sync metadata
meta = EvernoteMetadata(syncdata)

# iterate over active notes with 'markdown' tag and generate files
for note in [n for n in meta.notes.values() if 'markdown' in n.tags and not n.deleted]:
    print(note)
    nbdir = os.path.join(syncdata, 'markdown', note.notebook)
    if not os.path.isdir(nbdir):
        os.mkdir(nbdir)
    note_md = note.textContent()
    basefile = os.path.join(nbdir, note.escapedtitle)
    with open(basefile + '.md', 'wt') as F:
        F.write(note_md)
    with open(basefile + '.html', 'wt') as F:
        F.write(toStyledHTML(note_md))
    doc = CmarkLatex.LatexDocument(note_md.replace('[TOC]', ''))
    with open(basefile + '.json', 'wt') as F:
        F.write(doc.toAST()._tojson())
    with open(basefile + '.latex', 'wt') as F:
        F.write(doc.toLatex())
    # https://pandoc.org/MANUAL.html#variables-for-latex
    pandoc_args = ['pandoc',
                   basefile+'.latex',
                   '-o', basefile+'.pdf',
                   '--toc',
                   '--template', os.path.join(os.path.dirname(__file__), 'latex-template.tex'),
                   '-V' 'geometry:top=0.5in,bottom=0.5in, left=0.3in, right=0.3in',
                   '-V', 'title={}'.format(note.title),
                   '-V', 'author=Daryl St Laurent',
                   '-V', 'date={}'.format(str(datetime.date.today())),
    ]
    if max([ord(x) for x in note_md]) > 127:
        pandoc_args += [
            '--pdf-engine=xelatex',
            '-V', 'monofont=Menlo'
        ]
    subprocess.check_call(pandoc_args)
