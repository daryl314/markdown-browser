import ctypes, ctypes.util, warnings
from . import libcmark_gfm as cmark, libcmark_gfm_extensions as cmark_ext
from ..util.TypedTree import TypedTree
from ..util.CtypesWalker import CtypesWalker

################################################################################

# expose libc free function
libc = ctypes.CDLL(ctypes.util.find_library('c'))
libc.free.argtypes = (ctypes.c_void_p,)

# wrap char pointer in a class to enable freeing the result
class CharP(ctypes.c_char_p):
    pass

# Options for the GFM rendering call
OPTS = 0  # defaults

# The GFM extensions that we want to use
EXTENSIONS = (
    'autolink',
    'table',
    'strikethrough',
    'tagfilter',
)

# Set up the libcmark-gfm library and its extensions
cmark_ext.cmark_gfm_core_extensions_ensure_registered()

# enable buffer free
cmark.cmark_render_xml.restype = CharP
cmark.cmark_render_html.restype = CharP
cmark.cmark_render_latex.restype = CharP

################################################################################

class CmarkWrapper(object):
    """Base class for wrapped cmark objects

    Methods are library functions that take the object of the specified type in
    the first argument and that have a name starting with a PREFIX of
    'cmark_{object_type}_`.  The PREFIX is a static property specified in the
    subclass definition

    * Wrapped objects provide access to methods starting with the PREFIX.  For
      example, obj.first_child would dispatch to cmark.cmark_node_first_child
      if PREFIX was set to 'cmark_node_'
    * Wrapped objects enable setting properties of the underlying cmark
      object by assigning to the property name.  For example:
      obj.start_column = 1
    """
    PREFIX   = None  # set to 'cmark_xxxx_' in subclass
    CMARK_FN = None  # internal to CmarkWrapper

    def __init__(self, obj):
        if self.CMARK_FN is None:
            cmark_fn = {attr for attr in dir(cmark) if attr.startswith(self.PREFIX)}
            super(CmarkWrapper, self).__setattr__('CMARK_FN', cmark_fn)
        super(CmarkWrapper, self).__setattr__('obj', obj)

    def __repr__(self):
        def suHandler(obj, x, state):
            state_ = state._replace(in_union=state.in_union or isinstance(x,ctypes.Union))
            out = dict([(f,obj._recurse(getattr(x,f),state_)) for f,_ in x._fields_])
            return TypedTree.Build(x.__class__.__name__, **out)
        def ptrHandler(obj, p, pc, state):
            return TypedTree.Build(p.__class__.__name__ + '_ptr', contents=pc)
        return CtypesWalker(struct=suHandler, union=suHandler, pointer=ptrHandler).walk(self.obj, pointers=2).__repr__()

    def __getattr__(self, item):
        if self.PREFIX + item in self.CMARK_FN:
            return lambda *args: getattr(cmark, self.PREFIX+item)(self.obj, *args)
        else:
            raise RuntimeError("Unrecognized attribute: {}".format(item))

    def __setattr__(self, key, value):
        if hasattr(self.obj.contents, key):
            setattr(self.obj.contents, key, value)
        else:
            raise RuntimeError("Unrecognized key: {}".format(key))

################################################################################

class CmarkNode(CmarkWrapper):
    PREFIX = 'cmark_node_'

    @staticmethod
    def with_mem(id, mem):
        return CmarkNode(cmark.cmark_node_new_with_mem(id, mem))

    def get_table_alignments(self):
        return cmark_ext.cmark_gfm_extensions_get_table_alignments(
            ctypes.cast(self.obj, ctypes.POINTER(cmark_ext.cmark_node))
        )

    def children(self):
        out = [self.first_child()]
        while out[-1]: # iterate until a null pointer
            out.append(CmarkNode(out[-1]).next())
        return [self.__class__(x) for x in out[:-1]]

    ##### AST GENERATION #####

    NODE_ATTR = {
        'heading'    : {'Level' : 'get_heading_level'},
        'code_block' : {'Info' : 'get_fence_info'},
        'link'       : {'Destination' : 'get_url', 'Title' : 'get_title'},
        'image'      : {'Destination' : 'get_url', 'Title' : 'get_title'},
    }
    TEXT_NODES = {'text', 'code_block', 'code', 'html_block', 'html_inline'}

    def toAST(self):
        tag = self.get_type_string()
        if tag == 'table':
            return self._tableToAST()
        elif tag == 'list':
            return self._listToAST()
        attr = {'Text':self.get_literal()} if tag in self.TEXT_NODES else {}
        for k,v in self.NODE_ATTR.get(tag, {}).items():
            attr[k] = self.__getattr__(v)()
        return self._toAST(self, **attr)

    @staticmethod
    def _toAST(n, children=None, **attr):
        if children is None:
            children = [c.toAST() for c in n.children()]
        pos = TypedTree.Build('position', r1=n.get_start_line(), c1=n.get_start_column(),
                                           r2=n.get_end_line(), c2=n.get_end_column())
        return TypedTree.Build(n.get_type_string(), position=pos, children=children, **attr)

    def _listToAST(self):
        attr = {
            'Type': ['None', 'Bullet', 'Ordered'][self.get_list_type()],
            'Tight': self.get_list_tight() != 0
        }
        if attr['Type'] == 'Ordered':
            attr['Start'] = self.get_list_start()
            attr['Delim'] = ["None", "Period", "Paren"][self.get_list_delim()]
        return self._toAST(self, **attr)

    def _tableToAST(self):
        align = self.get_table_alignments()
        rows = []
        for tr in self.children():
            cols = []
            for td,a in zip(tr.children(), align):
                cols.append(self._toAST(td, Alignment={'l': "Left", 'c': "Center", 'r': "Right"}.get(a,'Left')))
            rows.append(self._toAST(tr, children=cols))
        return self._toAST(self, children=rows)

################################################################################

class CmarkInlineParser(CmarkWrapper):
    PREFIX = 'cmark_inline_parser_'

    def __getitem__(self, item):

        # self[xx:yy] or self[:yy]
        if isinstance(item, slice):
            # must have a stop and must not have a step
            if item.stop is None or item.step is not None:
                raise RuntimeError("Invalid slice")
            # if no start position is specified, start with current offset
            if item.start is None:
                start = self.get_offset()
            else:
                start = item.start
            # extract text
            return ''.join([self[x] for x in range(start, item.stop, 1)])

        # self[xx]
        else:
            return self.peek_at(item)

    def lookahead(self, n):
        offset = self.get_offset()
        return self[offset:offset+n]

    def advance(self, n):
        self.set_offset(self.get_offset() + n)

    def scanFor(self, substring, offset=0):
        idx = self.get_offset() + offset
        c = self[idx]
        while c != '\x00':
            if c == substring[0] and self[idx:idx+len(substring)] == substring:
                return idx + len(substring)
            idx += 1
            c = self[idx]

    def extractTo(self, pat, node_id, mem, ext):
        idx = self.scanFor(pat)
        if idx is not None:
            # start location for extracted text
            r1 = self.get_line()
            c1 = self.get_column()
            # extract text
            txt = self[:idx-len(pat)]
            # advance parser to character after closing pattern
            self.set_offset(idx)
            # end location for extracted text
            r2 = self.get_line()
            c2 = self.get_column() - len(pat) - 1
            # construct and return a node
            n = CmarkNode.with_mem(node_id, mem)
            n.start_column = c1+2
            n.start_line = r1
            n.end_column = c2-3
            n.end_line = r2
            n.extension = ext
            assert n.set_literal(txt)
            return n

    @staticmethod
    def rewind(container, n):
        """Remove n characters from last child of a container node"""
        p = CmarkNode(container)
        p.unput(n)
        # if removing characters leaves an empty last child, remove the empty node
        prev = CmarkNode(p.last_child())
        if len(prev.get_literal()) == 0:
            prev.unlink()
            prev.free()

################################################################################

class CmarkParser(CmarkWrapper):
    PREFIX = 'cmark_parser_'

################################################################################

class Document(object):

    def __init__(self, text, OPTS=OPTS, extension_names=EXTENSIONS, user_extensions=()):
        self.OPTS = OPTS
        self.parser = CmarkParser(cmark.cmark_parser_new(OPTS))
        for ext in user_extensions:
            assert self.parser.attach_syntax_extension(ext)
        for name in extension_names:
            assert self.parser.attach_syntax_extension(cmark.cmark_find_syntax_extension(name))
        self.exts = self.parser.get_syntax_extensions()
        self.parser.feed(text, len(text))
        self.doc = self.parser.finish()

    def __del__(self):
        self.parser.free()
        cmark.cmark_node_free(self.doc)

    def children(self):
        return CmarkNode(self.doc).children()

    def toXML(self):
        return self._render(cmark.cmark_render_xml, self.OPTS)

    def toHTML(self):
        return self._render(cmark.cmark_render_html, self.OPTS, self.exts)

    def toLatex(self, width=0):
        return self._render(cmark.cmark_render_latex, self.OPTS, width)

    def _render(self, fn, *args):
        # freeing the buffer below -- should be okay to ignore the memory leak warning
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            buf = fn(self.doc, *args)
        txt = buf.value
        libc.free(buf)
        return txt

    def toAST(self):
        return TypedTree.Build('Document', nodes=[child.toAST() for child in self.children()])

################################################################################

class CmarkSyntaxExtension(CmarkWrapper):
    PREFIX = 'cmark_syntax_extension_'

    NAME = None
    ID = None
    SPECIAL_CHARS = ()

    def __init__(self):
        super(CmarkSyntaxExtension, self).__init__(cmark.cmark_syntax_extension_new(self.NAME))
        char_list = ctypes.cast(ctypes.c_void_p(), ctypes.POINTER(cmark._cmark_llist))
        mem = cmark.cmark_get_default_mem_allocator()
        for c in self.SPECIAL_CHARS:
            char_list = cmark.cmark_llist_append(mem, char_list, ord(c))
        self.set_special_inline_chars(char_list)
        self.set_emphasis(1)
        self.set_match_inline_func    (object.__getattribute__(self, 'matchFn'     ))
        self.set_get_type_string_func (object.__getattribute__(self, 'typeFn'      ))
        if hasattr(self, 'renderLatex'):
            self.set_latex_render_func(object.__getattribute__(self, '_renderLatex'))
        if hasattr(self, 'renderHTML'):
            self.set_html_render_func (object.__getattribute__(self, '_renderHTML' ))

    def typeFn(self, ext, node):
        """Return the type name of a node"""
        if node.contents.type == self.ID:
            return self.NAME
        else:
            return '<unknown>'

    def matchFn(self, ext, parser, parent, character, inline_parser):
        """Attempt to match"""
        raise NotImplementedError("Implement in subclass")

    def _renderLatex(self, extension, renderer, node, ev_type, options):
        txt = self.renderLatex(CmarkNode(node))
        renderer.contents.out(renderer, node, txt, False, cmark.LITERAL)

    def _renderHTML(self, extension, renderer, node, ev_type, options):
        txt = self.renderHTML(CmarkNode(node))
        cmark.cmark_strbuf_puts(renderer.contents.html, txt)
