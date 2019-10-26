#!/usr/bin/env python3

import sys, os, subprocess, re, datetime, json
from pyevernote.EvernoteMetadata import EvernoteMetadata
from pycmark.html.HTML_Generator import toStyledHTML
import pycmark.cmarkgfm as cmark
from pycmark.ast.DocumentTree import DocumentTree
from pycmark.taggedtext.render.RtfRenderer import RtfRenderer

# determine output directories and create if necessary
syncdata = sys.argv[1] if len(sys.argv) > 1 else '../syncData'
if not os.path.isdir(os.path.join(syncdata, 'markdown')):
    os.mkdir(os.path.join(syncdata, 'markdown'))
if not os.path.isdir(os.path.join(syncdata, 'json')):
    os.mkdir(os.path.join(syncdata, 'json'))

# load and process sync metadata
meta = EvernoteMetadata(syncdata)

# active notes with 'markdown' tag
active_notes = [n for n in meta.notes.values() if 'markdown' in n.tags and not n.deleted]

# notes grouped by notebook
nb_notes = {}
for note in active_notes:
    nb_notes.setdefault(note.notebook, set()).add(note)

# notebook metadata
nb_meta = {}
for nb, nbn in nb_notes.items():
    nb_meta[nb] = [
        {'title': n.title, 'notebook': n.notebook.replace(' ', '%20'), 'etitle': n.escapedtitle.replace(' ', '%20')}
        for n in sorted(nbn, key=lambda nn: nn.title)
    ]

# generate table of contents index pages
nb_index = []
for nb in sorted(nb_meta.keys()):
    nb_index.append('## {} ##\n'.format(nb))
    nb_index += ['* [{title}](../{notebook}/{etitle}.html) [[PDF]](../{notebook}/{etitle}.pdf)'.format(**n)
                 for n in nb_meta[nb]]
    nb_index.append('')
nb_index = toStyledHTML('\n'.join(nb_index))

# generate directories for notebooks
for nb in nb_notes.keys():
    if not os.path.isdir(os.path.join(syncdata, 'markdown', nb)):
        os.mkdir(os.path.join(syncdata, 'markdown', nb))
    if not os.path.isdir(os.path.join(syncdata, 'json', nb)):
        os.mkdir(os.path.join(syncdata, 'json', nb))

# generate index json
with open(os.path.join(syncdata, 'markdown', 'index.json'), 'wt') as F:
    json.dump(nb_meta, F)

# generate table of contents index pages
for nb in nb_notes.keys():
    nbdir = os.path.join(syncdata, 'markdown', nb)
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
    doc = cmark.parse(note_md.replace('[TOC]', ''))
    ast = doc.toAST()

    # AST representations
    with open(basefile + '.ast', 'wt') as F:
        F.write(ast.__repr__())
    with open(basefile + '.json', 'wt') as F:
        F.write(ast._tojson())
    with open(os.path.join(syncdata, 'json', note.notebook, note.escapedtitle) + '.json', 'wt') as F:
        F.write(ast._tojson())

    # rendered latex
    with open(basefile + '.latex', 'wb') as F:
        F.write(cmark.mdToLatex(note_md.replace('[TOC]', '')))

    # RTF
    dt = DocumentTree.fromAst(ast)  # hierarchical document tree
    with open(basefile + '.rtf', 'wb') as F:
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
