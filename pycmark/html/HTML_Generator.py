import os
import base64
import xml.dom.minidom
import pycmark.cmarkgfm as cmark
import io
from ..ast.DocumentTree import DocumentTree
from pycmark.html.CodeHighlighter import highlight, HIGHLIGHT_LANGUAGES
from pycmark.html.Katex import processLatex, escapeUnicode

################################################################################

ROOT = os.path.dirname(__file__)

def loadAsset(asset, indent=8, escape=True):
    with open(os.path.join(ROOT, asset), 'rt') as F:
        if escape:
            return F.read().replace('{', '{{').replace('}', '}}').replace('\n', '\n' + ' ' * indent)
        else:
            return F.read().replace('\n', '\n' + ' ' * indent)

def loadBinaryAsset(asset):
    with open(os.path.join(ROOT, asset), 'rb') as F:
        return base64.b64encode(F.read())

################################################################################

def toStyledHTML(txt, withIndex=False):

    # generate a LatexDocument with [toc] entries converted to something that won't get wrapped
    doc = cmark.parse(txt.replace('[TOC]', '<toc/>').replace('[toc]', '<toc/>'))

    # hierarchical document tree
    dt = DocumentTree.fromAst(doc.toAST())

    # generate html and wrap in a dom object
    dom = xml.dom.minidom.parseString('<body>' + doc.toHTML() + '</body>')

    # identify <pre><code> elements
    pre_code = []
    for pre in dom.getElementsByTagName('pre'):
        if pre.hasChildNodes() and pre.firstChild.tagName == 'code':
            if 'class' in pre.firstChild.attributes.keys():
                language = pre.firstChild.attributes['class'].value.replace('language-', '').lower()
                if language == 'text':
                    continue
                language = {'cpp': 'c++', 'docker': 'dockerfile'}.get(language, language)
                assert language in HIGHLIGHT_LANGUAGES
            else:
                language = None
            pre_code.append((pre, language, pre.firstChild.firstChild.nodeValue))

    # perform syntax highlighting on <pre><code> elements
    syn = highlight([(lang, src) for _, lang, src in pre_code])
    for (pre, lang, _), src in zip(pre_code, syn):
        code = xml.dom.minidom.parseString('<code class="hljs language-{}">{}</code>'.format(lang, escapeUnicode(src)))
        pre.replaceChild(code.firstChild, pre.firstChild)

    # escape special characters in html
    def escapeHTML(txt):
        return txt.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

    # generate a table of contents
    def toOL(entries, ordered=True):
        out = ['<ol>' if ordered else '<ul>']
        for entry in entries:
            if len(entry.Children) == 0:
                out.append('<li><a href="#%s">%s</a></li>' % (entry.ID, escapeHTML(entry.title)))
            else:
                out += ['<li><a href="#%s">%s</a>' % (entry.ID, escapeHTML(entry.title))] \
                       + toOL(entry.Children, ordered) + ['</li>']
        return out + ['</ol>' if ordered else '</ul>']
    toc_list = xml.dom.minidom.parseString(TOC.format(toc='\n'.join(toOL(dt.Children)))).firstChild

    # replace <toc/> entries with generated table of contents
    for t in dom.getElementsByTagName('toc'):
        t.parentNode.replaceChild(toc_list, t)

    # add anchors to headings
    headings = [el for el in dom.firstChild.childNodes
                if isinstance(el, xml.dom.minidom.Element) and el.tagName in {'h2', 'h3', 'h4', 'h5', 'h6'}]
    elements = [el for el in dt.walk() if el.isHeading()]
    assert len(headings) == len(elements)
    for h, e in zip(headings, elements):
        h.attributes['id'] = e.ID

    # style tables
    for t in dom.getElementsByTagName('table'):
        t.attributes['class'] = 'table table-striped table-hover table-condensed'
    for t in dom.getElementsByTagName('thead'):
        t.attributes['class'] = 'btn-primary'

    # open hyperlinks in a new tab
    for a in dom.getElementsByTagName('a'):
        if 'href' in a.attributes.keys() and not a.attributes['href'].value.startswith('#'):
            a.attributes['target'] = '_blank'

    # create bootstrap alert boxes
    for p in dom.getElementsByTagName('p'):
        if isinstance(p.firstChild, xml.dom.minidom.Text):
            if p.firstChild.nodeValue.startswith('NOTE:'):
                p.attributes['class'] = 'alert alert-info'
            elif p.firstChild.nodeValue.startswith('WARNING:'):
                p.attributes['class'] = 'alert alert-warning'

    # identify <latex> elements
    latex = [(el, el.firstChild.nodeValue, el.attributes['class'].nodeValue == 'block')
             for el in dom.getElementsByTagName('latex')]

    # render latex equations
    latexMap = {}
    if len(latex) > 0:
        rendered = processLatex([(src, blk) for _, src, blk in latex])
        for (el, oldsrc, _), newsrc in zip(latex, rendered):
            key = 'latex_{}'.format(len(latexMap))
            el.replaceChild(dom.createTextNode(key), el.firstChild)
            latexMap[key] = newsrc

    # convert DOM back into text.  escape unicode characters.
    body = escapeUnicode(dom.firstChild.toxml().replace('<body>', '').replace('</body>', ''))

    # replace any latex placeholders with rendered latex
    if '<latex' in body:
        buf = io.StringIO()                    # output buffer
        a = 0                                  # initialize processed data pointer
        b = body.find('<latex')                # find next latex tag
        while b >= 0:                          # while there is a latex tag to process...
            b = body.find('>', b) + 1          # jump ahead to end of latex tag
            buf.write(body[a:b])               # write unprocessed data up to current location
            a = b                              # advance processed data pointer
            b = body.find('</latex', b)        # look ahead for closing tag
            key = body[a:b]                    # <latex...>key</latex>
            a = b                              # advance processed data pointer
            buf.write(latexMap.get(key, key))  # write latex data in lookup table corresponding to key
            b = body.find('<latex', b)         # find next latex tag
        buf.write(body[a:])                    # write remaining html
        body = buf.getvalue()                  # extract data from buffer
        buf.close()                            # close buffer

    # add any content-specific assets
    jslib = []
    if len(pre_code) > 0:  # highlighted code needs stylesheet
        jslib.append("<style type='text/css'>%s</style>" %
                     loadAsset('node_modules/highlight.js/styles/atelier-forest-light.css', escape=False))
    if len(latex) > 0:  # rendered latex needs stylesheet and fonts
        jslib.append("<style type='text/css'>")
        for line in loadAsset('node_modules/katex/dist/katex.css', escape=False, indent=4).rstrip().split('\n'):
            if 'src: url' in line:
                line = line.split(',')[0].strip()
                a = line.find('(') + 1
                b = line.find(')', a)
                encoded = loadBinaryAsset(os.path.join(ROOT, 'node_modules', 'katex', 'dist', line[a:b]))
                jslib.append(' '*6 + "src: url(data:font/woff2;base64,%s) format('woff2');" % encoded)
            else:
                jslib.append(line)
        jslib.append("</style>")

    # assemble html
    return HTML.format(
        navlinks='<li class="nav-item"><a class="nav-link" href="index.html">Page Index</a></li>' if withIndex else '',
        toc='\n'.join(toOL(dt.Children, ordered=False)).replace('href="', 'href="#" data-href="'),
        content=body,
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
JSCORE = loadAsset('jquery-3.3.1.slim.min.js') + loadAsset('bootstrap-4.3.1.min.js')
POSTPROCESS = loadAsset('process-rendered.js')
FAVICON = loadBinaryAsset('favicon.ico')

HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
    <style type='text/css'>
        {css}
    </style>
    <link rel="shortcut icon"type="image/x-icon" href="data:image/x-icon;base64,{favicon}"/>
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
'''.format(css=CSS, favicon=FAVICON, jscore=JSCORE, postprocess=POSTPROCESS)

################################################################################