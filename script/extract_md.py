#!/usr/bin/env python2

import sys, os, subprocess, re, datetime
from pyevernote.EvernoteMetadata import EvernoteMetadata
from pycmark.html.HTML_Generator import toStyledHTML
from pycmark.ast.DocumentTree import DocumentTree
import pycmark.cmarkgfm.CmarkLatex as CmarkLatex
from pycmark.taggedtext.render.RtfRenderer import RtfRenderer

# determine output directory and create if it doesn't exist
syncdata = sys.argv[1] if len(sys.argv) > 1 else '../syncData'
if not os.path.isdir(os.path.join(syncdata, 'markdown')):
    os.mkdir(os.path.join(syncdata, 'markdown'))

# load and process sync metadata
meta = EvernoteMetadata(syncdata)

# active notes with 'markdown' tag
active_notes = [n for n in meta.notes.values() if 'markdown' in n.tags and not n.deleted]

# notes grouped by notebook
nb_notes = {}
for note in active_notes:
    nb_notes.setdefault(note.notebook, set()).add(note)

# generate table of contents index pages
nb_index = []
for nb in sorted(nb_notes.keys()):
    nb_index.append('## {} ##\n'.format(nb))
    for n in sorted(nb_notes[nb], key=lambda nn: nn.title):
        nb_index.append('* [{title}](../{notebook}/{etitle}.html)'.format(
            title=n.title,
            notebook=n.notebook.replace(' ', '%20'),
            etitle=n.escapedtitle.replace(' ', '%20')))
    nb_index.append('')
nb_index = toStyledHTML('\n'.join(nb_index))

# generate table of contents index pages
for nb in nb_notes.keys():
    nbdir = os.path.join(syncdata, 'markdown', nb)
    if not os.path.isdir(nbdir):
        os.mkdir(nbdir)
    with open(os.path.join(nbdir, 'index.html'), 'wt') as F:
        F.write(nb_index)

# iterate over active notes
for note in active_notes:
    print(note)

    # extract markdown text
    # strip trailing whitespace from lines to prevent inadvertent line breaks from ' '*2 + '\n'
    note_md = re.sub(r' +\n', '\n', note.textContent())

    # output filename without extension
    basefile = os.path.join(syncdata, 'markdown', note.notebook, note.escapedtitle)

    # original markdown
    with open(basefile + '.md', 'wt') as F:
        F.write(note_md)

    # html rendering
    with open(basefile + '.html', 'wt') as F:
        F.write(toStyledHTML(note_md, withIndex=True))

    # generate a LatexDocument without TOC tags and the corresponding AST
    doc = CmarkLatex.LatexDocument(note_md.replace('[TOC]', ''))
    ast = doc.toAST()

    # AST representations
    with open(basefile + '.ast', 'wt') as F:
        F.write(ast.__repr__())
    with open(basefile + '.json', 'wt') as F:
        F.write(ast._tojson())

    # rendered latex
    with open(basefile + '.latex', 'wt') as F:
        F.write(doc.toLatex())

    # RTF
    dt = DocumentTree.fromAst(ast)  # hierarchical document tree
    with open(basefile + '.rtf', 'wt') as F:
        F.write(RtfRenderer.renderFromDoc(dt, width=100, title=note.title))

    ##### PDF FROM LATEX #####

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
