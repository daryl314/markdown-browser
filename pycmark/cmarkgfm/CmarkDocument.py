import ctypes
from . import cmarkgfm
from ..util.TypedTree import TypedTree


cmarkgfm.document_to_html.restype = ctypes.POINTER(ctypes.c_char)

class CmarkDocument(object):

    def __init__(self, txt, encoding='utf_8'):
        if not isinstance(txt, bytes):
            txt = txt.encode(encoding=encoding)
        self._doc = cmarkgfm.string_to_document(txt)

    def toHTML(self):
        result = cmarkgfm.document_to_html(self._doc)
        out = ctypes.cast(result, ctypes.c_char_p).value.decode()
        cmarkgfm.cmark_get_default_mem_allocator().contents.free(result)
        return out

    def toLatex(self):
        result = cmarkgfm.document_to_latex(self._doc)
        out = ctypes.cast(result, ctypes.c_char_p).value.decode()
        cmarkgfm.cmark_get_default_mem_allocator().contents.free(result)
        return out

    def toAST(self):
        return TypedTree.Build('Document', nodes=[self._toAST(c) for c in self._children(self._doc)])

    ##### AST GENERATION #####

    @classmethod
    def _children(cls, node):
        out = [cmarkgfm.cmark_node_first_child(node)]
        while out[-1]:  # iterate until null pointer
            out.append(cmarkgfm.cmark_node_next(out[-1]))
        return tuple(out[:-1])

    @classmethod
    def _position(cls, node):
        return TypedTree.Build('position',
                               r1=cmarkgfm.cmark_node_get_start_line(node),
                               c1=cmarkgfm.cmark_node_get_start_column(node),
                               r2=cmarkgfm.cmark_node_get_end_line(node),
                               c2=cmarkgfm.cmark_node_get_end_column(node))

    @classmethod
    def _toAST(cls, node, children=None, **attr):
        tag = cmarkgfm.cmark_node_get_type_string(node).decode()

        if tag == 'table' and children is None:
            return cls._tableToAST(node)
        elif tag == 'list' and len(attr) == 0:
            return cls._listToAST(node)

        if children is None:
            children = [cls._toAST(c) for c in cls._children(node)]

        if tag in {'text', 'code_block', 'code', 'html_block', 'html_inline', 'latex_block', 'latex_inline'}:
            attr['Text'] = cmarkgfm.cmark_node_get_literal(node).decode()
        if tag == 'heading':
            attr['Level'] = cmarkgfm.cmark_node_get_heading_level(node)
        if tag == 'code_block':
            attr['Info'] = cmarkgfm.cmark_node_get_fence_info(node).decode()
        if tag in {'link', 'image'}:
            attr['Destination'] = cmarkgfm.cmark_node_get_url(node).decode()
            attr['Title'] = cmarkgfm.cmark_node_get_title(node).decode()

        return TypedTree.Build(tag, position=cls._position(node), children=children, **attr)

    @classmethod
    def _listToAST(cls, node):
        attr = {
            'Type': ['None', 'Bullet', 'Ordered'][cmarkgfm.cmark_node_get_list_type(node)],
            'Tight': cmarkgfm.cmark_node_get_list_tight(node) != 0
        }
        if attr['Type'] == 'Ordered':
            attr['Start'] = cmarkgfm.cmark_node_get_list_start(node)
            attr['Delim'] = ["None", "Period", "Paren"][cmarkgfm.cmark_node_get_list_delim(node)]
        return cls._toAST(node, **attr)

    @classmethod
    def _tableToAST(cls, node):
        align = cmarkgfm.cmark_gfm_extensions_get_table_alignments(node)
        rows = []
        for tr in cls._children(node):
            cols = []
            for td, a in zip(cls._children(tr), align):
                cols.append(cls._toAST(td, Alignment={'l': "Left", 'c': "Center", 'r': "Right"}.get(a,'Left')))
            rows.append(cls._toAST(tr, children=cols))
        return cls._toAST(node, children=rows)