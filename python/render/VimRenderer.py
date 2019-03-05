import sys
from .Renderer import Renderer
from ..util.TerminalColors256 import Color256
from ..ast.DocumentTree import DocumentTree

class VimRenderer(Renderer):

    def render(self, tt):
        """Render text with style tags"""
        tag = tt.simplifyStack()
        if tag in self.CONFIG:
            return '<{0}>{1}</{0}>'.format(tag, tt.text)
        else:
            raise RuntimeError("Unrecognized style tag: {}".format(tag))

    def vimStyle(self, name, fg, bg, b, i, u):
        """Generate a vim style string"""
        prop = ['guifg=#%06x ctermfg=%s guibg=#%06x ctermbg=%s' % (
                fg, Color256(fg).index256(), bg, Color256(bg).index256())]
        if b or i or u:
            attr = (['bold'] if b else []) + (['italic'] if i else []) + (['underline'] if u else [])
            prop.append('gui={0} cterm={0}'.format(','.join(attr)))
        return 'hi %s %s\n' % (name, ' '.join(prop))

    def genStyle(self, logger=sys.stdout):
        """Generate style commands for main vim window"""
        logger.write('setlocal conceallevel=2\n')
        logger.write('setlocal concealcursor=nc\n\n')
        logger.write(self.vimStyle('Normal', **self.getStyle('default')))
        for k in set(self.CONFIG.keys()) - {'default'}:
            logger.write('syn region in{0} concealends matchgroup={0} start="<{0}>" end="</{0}>"\n'.format(k))
        logger.write('\n')
        for k in set(self.CONFIG.keys()) - {'default','treeline'}:
            logger.write(self.vimStyle('in'+k, **self.getStyle(k)))

    def genTreeStyle(self, logger=sys.stdout):
        """Generate style commands for TOC vim window"""
        logger.write('syn match treeLine "\\%u2500\\|\\%u2502\\|\\%u2514\\|\\%u251c"\n')
        logger.write('syn region tocHeader concealends matchgroup=tocHeader start="{" end="$"\n')
        logger.write(self.vimStyle('tocHeader', **self.getStyle('treeline')))
        logger.write(self.vimStyle('treeLine', **self.getStyle('treeline')))
        logger.write(self.vimStyle('Normal', **self.getStyle('strong')))
        logger.write('setlocal conceallevel=2\n')
        logger.write('setlocal concealcursor=nc\n')

    @staticmethod
    def getTOC(doc):
        """Extract a table of contents tree view from a document AST"""

        TEE = u'\u251c' + u'\u2500' * 2
        ELBOW = u'\u2514' + u'\u2500' * 2
        PIPE = u'\u2502' + ' ' * 2
        SPACE = ' ' * 3

        # source data
        tree = DocumentTree.fromAst(doc)
        source_lines = [node.src for node in tree.walk()[1:]]

        # container for tree representation
        tree_repr = []

        # recursive helper function to generate tree representation
        def dump(node, leader, lastchild):
            if lastchild:
                tree_repr.append(leader + ELBOW + node.title)
            else:
                tree_repr.append(leader + TEE + node.title)
            for i, child in enumerate(node.Children):
                dump(child, SPACE if lastchild else PIPE, i + 1 == len(node.Children))

        # build up tree representation
        for i, node in enumerate(tree.Children):
            dump(node, '', i + 1 == len(tree.Children))

        # define folds: indices of entries with children and index + n_children
        folds = []
        for i, n in enumerate([node.n_children for node in tree.walk()[1:]]):
            if n > 0:
                folds.append((i, i + n))

        # return results
        return tree_repr, folds, source_lines
