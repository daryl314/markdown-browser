import os, re
from ..cmarkgfm import CmarkLatex
from ..ast.DocumentTree import DocumentTree

################################################################################

def toStyledHTML(txt, root='.'):

    # generate a LatexDocument with [toc] entries converted to something that won't get wrapped
    doc = CmarkLatex.LatexDocument(txt.replace('[TOC]', '<toc/>').replace('[toc]', '<toc/>'))

    # hierarchical document tree
    dt = DocumentTree.fromAst(doc.toAST())

    # base html representation of document
    body = doc.toHTML().strip().split('\n')

    # generate a table of contents
    def toOL(entries, ordered=True):
        out = ['<ol>' if ordered else '<ul>']
        for entry in entries:
            if len(entry.Children) == 0:
                out.append('<li><a href="#%s">%s</a></li>' % (entry.ID, entry.title))
            else:
                out += ['<li><a href="#%s">%s</a>' % (entry.ID, entry.title)] + toOL(entry.Children, ordered) + ['</li>']
        return out + ['</ol>' if ordered else '</ul>']
    toc = '\n'.join(toOL(dt.Children))

    # replace <toc/> entries with generated table of contents
    for i,h in enumerate(body):
        if h == '<toc/>':
            body[i] = toc

    # add anchors to headings
    headings = [i for i,txt in enumerate(body) if re.match('<h[2-6]>', txt)]
    for h,e in zip(headings, dt.walk()[1:]):
        body[h] = body[h][:3] + ' id="%s"' % e.ID + body[h][3:]

    # add any content-specific libraries
    jslib = []
    if any(['<pre><code' in h for h in body]):
        jslib.append('<link rel="stylesheet" href="{root}/lib/highlight-atelier-forest-light.min.css" />'.format(root=root))
        jslib.append('<script type="text/javascript" src="{root}/lib/highlight.pack.js"></script>'.format(root=root))
    if any(['<latex' in h for h in body]):
        jslib.append('<script src="{root}/katex-0.5.1/katex.min.js"></script>'.format(root=root))
        jslib.append('<link rel="stylesheet" href="{root}/katex-0.5.1/katex.min.css">'.format(root=root))

    # assemble html
    return HTML.format(
        root=root,
        toc='\n'.join(toOL(dt.Children, ordered=False)).replace('href="', 'href="#" data-href="'),
        content='\n'.join(body),
        jslib='    \n'.join(jslib)
    )

################################################################################

with open(os.path.join(os.path.dirname(__file__), 'style.css'), 'rt') as F:
    CSS = F.read().replace('{', '{{').replace('}', '}}').replace('\n', '\n' + ' '*8)

with open(os.path.join(os.path.dirname(__file__), 'bootswatch-cosmo-4.3.1.min.css'), 'rt') as F:
    CSS += F.read().replace('{', '{{').replace('}', '}}').replace('\n', '\n' + ' '*8)

with open(os.path.join(os.path.dirname(__file__), 'process-rendered.js'), 'rt') as F:
    POSTPROCESS = F.read().replace('{', '{{').replace('}', '}}').replace('\n', '\n' + ' '*8)

HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
    <style type='text/css'>
        {css}
    </style>
</head>
<body>   
    <!-- CONTENT -->
    <div id="container" class="container">
        <!-- NAVIGATION BAR -->
        <nav class="navbar navbar-expand-md navbar-dark bg-primary">
            <a class='navbar-brand' href='#'>&#9776; <span>Page Title</span></a>
            <div id="navbar" class="navbar-collapse collapse">
                <ul class="navbar-nav mr-auto">
                    <li class="nav-item"><a class="nav-link" id="map-mode-toggle" href="#">Map Mode <span class="sr-only">(current)</span></a></li>
                    <li class="nav-item"><a class="nav-link" id="map-mode-help" href="#">Help</a></li>
                    <li class="nav-item"><a class="nav-link" id="map-show-all" href="#">Show All</a></li>
                    <li class="nav-item"><a class="nav-link" href="index.html">Page Index</a></li>
                </ul>
            </div>
        </nav>
    <div id="row" class="row">
        <div id="markdown-toc" class="hidden-print col-md-auto">
            {{toc}}
        </div> <!-- markdown-toc -->
        <div id="markdown-container" class="col">
{{content}}
        </div> <!-- markdown-container -->
    </div></div>
    
    <!-- JAVASCRIPT LIBRARIES -->
    <script type="text/javascript" src="{{root}}/lib/jquery.min.js"></script>
    <script type="text/javascript" src="{{root}}/lib/slideout.min.js"></script>
    {{jslib}}
    
    <!-- PROCESS RENDERED MARKDOWN -->
    <script type="text/javascript">
        {postprocess}
    </script>
</body>
</html>
'''.format(css=CSS, postprocess=POSTPROCESS)

################################################################################