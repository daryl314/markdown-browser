import os, re
from ..cmarkgfm import CmarkLatex
from ..ast.DocumentTree import DocumentTree

################################################################################

def loadAsset(asset, indent=8, escape=True):
    with open(os.path.join(os.path.dirname(__file__), asset), 'rt') as F:
        if escape:
            return F.read().replace('{', '{{').replace('}', '}}').replace('\n', '\n' + ' ' * indent)
        else:
            return F.read().replace('\n', '\n' + ' ' * indent)

################################################################################

def toStyledHTML(txt, root='.', withIndex=False):

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
            body[i] = TOC.format(toc=toc)

    # add anchors to headings
    headings = [i for i,txt in enumerate(body) if re.match('<h[2-6]>', txt)]
    for h,e in zip(headings, dt.walk()[1:]):
        body[h] = body[h][:3] + ' id="%s"' % e.ID + body[h][3:]

    # add any content-specific libraries
    jslib = []
    if any(['<pre><code' in h for h in body]):
        jslib.append("<style type='text/css'>%s</style>" % loadAsset('highlight-9.12.0/styles/atelier-forest-light.css', escape=False))
        jslib.append("<script type='text/javascript'>%s</script>" % loadAsset('highlight-9.12.0/highlight.pack.js', escape=False))
    if any(['<latex' in h for h in body]):
        jslib.append('<script src="{root}/katex-0.5.1/katex.min.js"></script>'.format(root=root))
        jslib.append('<link rel="stylesheet" href="{root}/katex-0.5.1/katex.min.css">'.format(root=root))

    # assemble html
    return HTML.format(
        root=root,
        navlinks='<li class="nav-item"><a class="nav-link" href="index.html">Page Index</a></li>' if withIndex else '',
        toc='\n'.join(toOL(dt.Children, ordered=False)).replace('href="', 'href="#" data-href="'),
        content='\n'.join(body),
        jslib='    \n'.join(jslib)
    )

TOC = '''
<details class="toc">
    <summary>Table of Contents</summary>
    <toc>
        {toc}
    </toc>
</details>
'''

################################################################################

CSS = loadAsset('style.css') + loadAsset('bootswatch-cosmo-4.3.1.min.css')
JSCORE = loadAsset('jquery-3.3.1.slim.min.js') + loadAsset('slideout-1.0.1.min.js')+ loadAsset('bootstrap-4.3.1.min.js')
POSTPROCESS = loadAsset('process-rendered.js')

HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
    <style type='text/css'>
        {css}
    </style>
</head>
<body> 
  
    <!-- MODAL HELP DIALOG -->
    <div class="modal fade" id="helpDialog" tabindex="-1" role="dialog" aria-labelledby="helpDialogLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header bg-primary">
            <h5 class="modal-title" id="helpDialogLabel" style="color: #fff">Usage</h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true" style="color: #fff">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <h5>Navigation Bar</h5>
            <ul>
              <li>Click on hamburger menu (or slide from right on iPhone) to toggle navigation bar</li>
              <li>Current location is highlighted red in navigation</li>
              <li>Click on a node's bullet to expand/collapse the node</li>
              <li>Double click on a node's bullet to expand entire tree</li>
              <li>Click on a node's text jump to the associated section</li>
            </ul>
            <h5>Map Mode</h5>
            <ul>
              <li>Click on "Map Mode" in toolbar to toggle map mode</li>
              <li>Clicking on node text in the navigation bar filters text to that section</li>
              <li>Clicking on "Show All" in toolbar shows entire document</li>
            </ul>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>   
         
    <!-- CONTENT -->
    <div id="container" class="container">
        <!-- NAVIGATION BAR -->
        <nav class="navbar navbar-expand-md navbar-dark bg-primary">
            <a id="navbar-title" class='navbar-brand' href='#'>&#9776; <span>Page Title</span></a>
            <div id="navbar" class="navbar-collapse collapse">
                <ul class="navbar-nav mr-auto">
                    <li class="nav-item"><a class="nav-link" id="map-mode-toggle" href="#">Map Mode <span class="sr-only">(current)</span></a></li>
                    <li class="nav-item"><a class="nav-link" id="map-show-all" href="#">Show All</a></li>
                    {{navlinks}}
                    <li class="nav-item"><a class="nav-link" id="map-mode-help" data-toggle="modal" data-target="#helpDialog" href="#">Help</a></li>
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
    <script type="text/javascript">
{jscore}
    </script>
    {{jslib}}
    
    <!-- PROCESS RENDERED MARKDOWN -->
    <script type="text/javascript">
        {postprocess}
    </script>
</body>
</html>
'''.format(css=CSS, jscore=JSCORE, postprocess=POSTPROCESS)

################################################################################