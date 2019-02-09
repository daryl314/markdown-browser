import ctypes, ctypes.util, warnings, yaml
import libcmark_gfm as cmark, libcmark_gfm_extensions as cmark_ext
import ObjectDumper

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
        return yaml.dump({self.PREFIX : ObjectDumper.toObject(self.obj, pointers=2)}, indent=4)

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
        return [CmarkNode(x) for x in out[:-1]]

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
        self.set_match_inline_func   (object.__getattribute__(self, 'matchFn'    ))
        self.set_get_type_string_func(object.__getattribute__(self, 'typeFn'     ))
        self.set_latex_render_func   (object.__getattribute__(self, 'renderLatex'))
        if hasattr(self, 'renderHTML'):
            self.set_html_render_func(object.__getattribute__(self, 'renderHTML' ))

    def matchFn(self, ext, parser, parent, character, inline_parser):
        """Attempt to match"""
        raise NotImplementedError("Implement in subclass")

    def typeFn(self, ext, node):
        """Return the type name of a node"""
        if node.contents.type == self.ID:
            return self.NAME
        else:
            return '<unknown>'

    def renderLatex(self, extension, renderer, node, ev_type, options):
        """Render node in latex"""
        raise NotImplementedError("Implement in subclass")

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

    def renderLatex(self, extension, renderer, node, ev_type, options):
        """Render node in latex"""
        renderer.contents.out(renderer, node, '${}$'.format(CmarkNode(node).get_literal()), False, cmark.LITERAL)

    def renderHTML(self, extension, renderer, node, ev_type, options):
        """Render node in HTML"""
        cmark.cmark_strbuf_puts(renderer.contents.html, '<latex class="inline">{}</latex>'.format(CmarkNode(node).get_literal()))

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

    def renderLatex(self, extension, renderer, node, ev_type, options):
        """Render node in latex"""
        renderer.contents.out(renderer, node, '$${}$$'.format(CmarkNode(node).get_literal()), False, cmark.LITERAL)

    def renderHTML(self, extension, renderer, node, ev_type, options):
        """Render node in HTML"""
        cmark.cmark_strbuf_puts(renderer.contents.html, '<latex class="block">{}</latex>'.format(CmarkNode(node).get_literal()))

################################################################################

class LatexDocument(Document):
    def __init__(self, text):
        super(LatexDocument,self).__init__(text, user_extensions=(
            InlineLatexExtension().obj,
            BlockLatexExtension().obj,
        ))

################################################################################

TEST_TEXT = '''# `This` is ~Testing~ text

This is $$a * b * c$$ or \\\\(d * e * f\\\\) ...

* This is $$ a test of \\\\( non-terminated latex...

Hello ~world~

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
    print doc.toHTML()
    print doc.toLatex()