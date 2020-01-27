from pycmark.taggedtext.render.VimRenderer import VimRenderer, StringIO
from pycmark.util.TypedTree import TypedTree
from pycmark.taggedtext.TaggedCmarkDocument import TaggedTextDocument

class VimHandler(object):
    """Helper class for vim operations"""

    # header text for table of contents window
    TOCHEADER = [
        '{TAB: switch windows',
        '{ENTER: follow link',
        '{Ctrl-]: follow links',
        '{Ctrl-R: resize',
        '{Ctrl-T: toggle TOC',
        '{za: toggle TOC fold',
        '',
        'Contents'
    ]

    def __init__(self, vim):
        self.vim = vim                 # reference to vim module
        self.tocBuffer = None          # buffer number for table of contents
        self.contentBuffer = None      # buffer number for rendered markdown
        self.renderer = VimRenderer()  # rendering object

    def parseJSON(self):
        inData = '\n'.join(self.vim.current.buffer)
        if TypedTree._isSeralizedData(inData):
            try:
                self.tt = TypedTree._fromjson(inData)
            except:
                self.vim.command('let g:json_load_ok = 0')
                return
            self.inData = inData
            self.vim.command('only')  # ???
            self.vim.command('bd')    # ???
            self.contentBuffer = self.vim.current.buffer.number
            for line in self.renderer.genStyle().split('\n'):
                self.vim.command(line)
            self.vim.command('let g:json_load_ok = 1')
        else:
            self.vim.command('let g:json_load_ok = 0')
            return

    def RenderText(self):
        contentWindow = [w for w in self.vim.windows if w.buffer.number == self.contentBuffer][0]
        nCols = int(contentWindow.width) - int(contentWindow.options['numberwidth'])
        buf = StringIO()
        doc = TaggedTextDocument.fromAST(self.tt, width=min(nCols, 100))
        doc.render(self.renderer.render, writer=buf)
        renderedLines = buf.getvalue().split('\n')
        self.vim.buffers[self.contentBuffer].options['modifiable'] = True
        self.vim.buffers[self.contentBuffer][:] = renderedLines
        self.vim.buffers[self.contentBuffer].options['buftype'] = 'nofile'
        self.vim.buffers[self.contentBuffer].options['modifiable'] = False

    def RenderTOC(self):
        self.tree, self.rawfolds, self.folds = self.renderer.getTOC(self.tt, offset=1+len(self.TOCHEADER))
        self.vim.current.buffer[:] = self.TOCHEADER + self.tree
        for f in self.folds:
            self.vim.command('%d,%dfold | normal zR' % f)
        for line in self.renderer.genTreeStyle().split('\n'):
            self.vim.command(line)

    def GenerateFolds(self):
        headings = [i for i, b in enumerate(self.vim.current.buffer) if b.startswith('<heading>') and '</heading>' in b]
        contentIndices = headings + [len(self.vim.current.buffer)]
        if len(headings) > 0:
            for a, b in [(i, dict(self.rawfolds).get(i, i)) for i in range(len(self.tree))]:
                self.vim.command('%d,%dfold | normal zR' % (contentIndices[a] + 1, contentIndices[b + 1]))
