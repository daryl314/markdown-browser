#!/usr/bin/env python2

import sys, os
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
    with open(os.path.join(nbdir, note.escapedtitle + '.md'), 'wt') as F:
        F.write(note_md)
    with open(os.path.join(nbdir, note.escapedtitle + '.html'), 'wt') as F:
        F.write(toStyledHTML(note_md))
    with open(os.path.join(nbdir, note.escapedtitle + '.json'), 'wt') as F:
        F.write(CmarkLatex.LatexDocument(note_md).toAST()._tojson())
