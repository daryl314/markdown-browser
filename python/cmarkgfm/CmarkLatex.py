import ctypes, ctypes.util
from ..util.TypedTree import TypedTree
from CmarkBase import CmarkSyntaxExtension, CmarkInlineParser, CmarkNode, Document, cmark

################################################################################

class InlineLatexExtension(CmarkSyntaxExtension):
    NAME = 'latex_inline'
    SPECIAL_CHARS = ('$',)
    ID = cmark.CMARK_NODE_CODE

    def matchFn(self, ext, parser, parent, character, inline_parser):
        """Attempt to match"""
        if character == '$':
            ip = CmarkInlineParser(inline_parser)
            if ip.lookahead(2) == '$$':
                ip.advance(2)
                n = ip.extractTo('$$', self.ID, parser.contents.mem, ext)
                if n is not None:
                    return ctypes.cast(n.obj, ctypes.c_void_p).value
                else:
                    ip.advance(-2)

    def renderLatex(self, node):
        """Render node in latex"""
        return '${}$'.format(node.get_literal())

    def renderHTML(self, node):
        """Render node in HTML"""
        return '<latex class="inline">{}</latex>'.format(node.get_literal())

class BlockLatexExtension(CmarkSyntaxExtension):
    NAME = 'latex_block'
    ID = cmark.CMARK_NODE_CODE

    def matchFn(self, ext, parser, parent, character, inline_parser):
        """Attempt to match"""
        if character == '(':
            ip = CmarkInlineParser(inline_parser)
            o = ip.get_offset()
            if o >= 2 and ip[o-2:o+1] == '\\\\(':
                CmarkInlineParser.rewind(parent, 1)  # remove leading backslash from parent
                ip.advance(1)
                n = ip.extractTo('\\\\)', self.ID, parser.contents.mem, ext)
                if n is not None:
                    return ctypes.cast(n.obj, ctypes.c_void_p).value
                else:
                    ip.advance(-1)

    def renderLatex(self, node):
        """Render node in latex"""
        return '$${}$$'.format(node.get_literal())

    def renderHTML(self, node):
        """Render node in HTML"""
        return '<latex class="block">{}</latex>'.format(node.get_literal())

################################################################################

class LatexNode(CmarkNode):
    TEXT_NODES = CmarkNode.TEXT_NODES | {'latex_inline', 'latex_block'}


class LatexDocument(Document):

    def __init__(self, text):
        super(LatexDocument,self).__init__(text, user_extensions=(
            InlineLatexExtension().obj,
            BlockLatexExtension().obj,
        ))

    def children(self):
        return LatexNode(self.doc).children()

################################################################################

TEST_TEXT = '''# `This` is ~Testing~ text

This is $$a * b * c$$ or \\\\(d * e * f\\\\) ...


## Some content ##

* This is $$ a test of \\\\( non-terminated latex...
* Hello ~strikethrough~ **bold** *italic* `code` [link](http://google.com)

foo | bar | baz
----|:---:|----
abc | def | ghi
jkl | mno | pqr

1. Foo
2. Bar
3. Baz

[ ] Task 1
[x] Task 2
    [ ] Task 2.1
    [x] Task 2.2
    [ ] Task 2.3


```python
arr = [1,2,3]
y = [2*x for x in arr]
```

> this is
> some quoted
>
> silly
> text

    And this is some
    preformatted
    text

'''

if __name__ == '__main__':

    doc = LatexDocument(TEST_TEXT)
    print doc.toXML()
    print doc.toAST()
    print doc.toAST() == TypedTree._fromjson(doc.toAST()._tojson())
    print doc.toHTML()
    print doc.toLatex()