import ctypes
import sys

platform_ext = {"darwin":".dylib", "win32":".dll"}.get(sys.platform, ".so")
libcmark_gfm_extensions = ctypes.CDLL("libcmark-gfm-extensions" + platform_ext)

##### ENUMERATIONS #####

class cmark_delim_type:
    CMARK_NO_DELIM = 0
    CMARK_PERIOD_DELIM = 1
    CMARK_PAREN_DELIM = 2
    _dict = {
        0 : "CMARK_NO_DELIM",
        1 : "CMARK_PERIOD_DELIM",
        2 : "CMARK_PAREN_DELIM",
    }
class cmark_list_type:
    CMARK_NO_LIST = 0
    CMARK_BULLET_LIST = 1
    CMARK_ORDERED_LIST = 2
    _dict = {
        0 : "CMARK_NO_LIST",
        1 : "CMARK_BULLET_LIST",
        2 : "CMARK_ORDERED_LIST",
    }
class cmark_node_type:
    CMARK_NODE_NONE = 0
    CMARK_NODE_DOCUMENT = 32769
    CMARK_NODE_BLOCK_QUOTE = 32770
    CMARK_NODE_LIST = 32771
    CMARK_NODE_ITEM = 32772
    CMARK_NODE_CODE_BLOCK = 32773
    CMARK_NODE_HTML_BLOCK = 32774
    CMARK_NODE_CUSTOM_BLOCK = 32775
    CMARK_NODE_PARAGRAPH = 32776
    CMARK_NODE_HEADING = 32777
    CMARK_NODE_THEMATIC_BREAK = 32778
    CMARK_NODE_FOOTNOTE_DEFINITION = 32779
    CMARK_NODE_TEXT = 49153
    CMARK_NODE_SOFTBREAK = 49154
    CMARK_NODE_LINEBREAK = 49155
    CMARK_NODE_CODE = 49156
    CMARK_NODE_HTML_INLINE = 49157
    CMARK_NODE_CUSTOM_INLINE = 49158
    CMARK_NODE_EMPH = 49159
    CMARK_NODE_STRONG = 49160
    CMARK_NODE_LINK = 49161
    CMARK_NODE_IMAGE = 49162
    CMARK_NODE_FOOTNOTE_REFERENCE = 49163
    _dict = {
        0 : "CMARK_NODE_NONE",
        32769 : "CMARK_NODE_DOCUMENT",
        32770 : "CMARK_NODE_BLOCK_QUOTE",
        32771 : "CMARK_NODE_LIST",
        32772 : "CMARK_NODE_ITEM",
        32773 : "CMARK_NODE_CODE_BLOCK",
        32774 : "CMARK_NODE_HTML_BLOCK",
        32775 : "CMARK_NODE_CUSTOM_BLOCK",
        32776 : "CMARK_NODE_PARAGRAPH",
        32777 : "CMARK_NODE_HEADING",
        32778 : "CMARK_NODE_THEMATIC_BREAK",
        32779 : "CMARK_NODE_FOOTNOTE_DEFINITION",
        49153 : "CMARK_NODE_TEXT",
        49154 : "CMARK_NODE_SOFTBREAK",
        49155 : "CMARK_NODE_LINEBREAK",
        49156 : "CMARK_NODE_CODE",
        49157 : "CMARK_NODE_HTML_INLINE",
        49158 : "CMARK_NODE_CUSTOM_INLINE",
        49159 : "CMARK_NODE_EMPH",
        49160 : "CMARK_NODE_STRONG",
        49161 : "CMARK_NODE_LINK",
        49162 : "CMARK_NODE_IMAGE",
        49163 : "CMARK_NODE_FOOTNOTE_REFERENCE",
    }

##### FORWARD DECLARATIONS FOR RECURSIVE USAGE #####

class cmark_chunk(ctypes.Structure):
    pass
class cmark_code(ctypes.Structure):
    pass
class cmark_custom(ctypes.Structure):
    pass
class cmark_heading(ctypes.Structure):
    pass
class cmark_link(ctypes.Structure):
    pass
class cmark_list(ctypes.Structure):
    pass
class cmark_mem(ctypes.Structure):
    pass
class cmark_node(ctypes.Structure):
    pass
class cmark_strbuf(ctypes.Structure):
    pass
class cmark_syntax_extension(ctypes.Structure):
    pass

##### TYPE DEFINITIONS #####

cmark_free_func = ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_mem), ctypes.c_void_p))

##### STRUCTURE FIELD DEFINITIONS #####

cmark_mem._fields_ = [
    ("calloc", ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.c_uint64, ctypes.c_uint64)),
    ("realloc", ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.c_void_p, ctypes.c_uint64)),
    ("free", ctypes.CFUNCTYPE(None, ctypes.c_void_p))
]

cmark_list._fields_ = [
    ("list_type", ctypes.c_uint32),
    ("marker_offset", ctypes.c_int32),
    ("padding", ctypes.c_int32),
    ("start", ctypes.c_int32),
    ("delimiter", ctypes.c_uint32),
    ("bullet_char", ctypes.c_char),
    ("tight", ctypes.c_bool)
]

cmark_heading._fields_ = [
    ("level", ctypes.c_int32),
    ("setext", ctypes.c_bool)
]

cmark_strbuf._fields_ = [
    ("mem", ctypes.POINTER(cmark_mem)),
    ("ptr", ctypes.POINTER(ctypes.c_char)),
    ("asize", ctypes.c_int32),
    ("size", ctypes.c_int32)
]

cmark_syntax_extension._fields_ = []

cmark_chunk._fields_ = [
    ("data", ctypes.POINTER(ctypes.c_char)),
    ("len", ctypes.c_int32),
    ("alloc", ctypes.c_int32)
]

cmark_custom._fields_ = [
    ("on_enter", cmark_chunk),
    ("on_exit", cmark_chunk)
]

cmark_code._fields_ = [
    ("info", cmark_chunk),
    ("literal", cmark_chunk),
    ("fence_length", ctypes.c_char),
    ("fence_offset", ctypes.c_char),
    ("fence_char", ctypes.c_char),
    ("fenced", ctypes.c_int8)
]

cmark_link._fields_ = [
    ("url", cmark_chunk),
    ("title", cmark_chunk)
]

cmark_node._fields_ = [
    ("content", cmark_strbuf),
    ("next", ctypes.POINTER(cmark_node)),
    ("prev", ctypes.POINTER(cmark_node)),
    ("parent", ctypes.POINTER(cmark_node)),
    ("first_child", ctypes.POINTER(cmark_node)),
    ("last_child", ctypes.POINTER(cmark_node)),
    ("user_data", ctypes.c_void_p),
    ("user_data_free_func", cmark_free_func),
    ("start_line", ctypes.c_int32),
    ("start_column", ctypes.c_int32),
    ("end_line", ctypes.c_int32),
    ("end_column", ctypes.c_int32),
    ("internal_offset", ctypes.c_int32),
    ("type", ctypes.c_uint16),
    ("flags", ctypes.c_uint16),
    ("extension", ctypes.POINTER(cmark_syntax_extension)),
    ("as", type("None", (ctypes.Union,), {"_fields_":[
        ("literal", cmark_chunk),
        ("list", cmark_list),
        ("code", cmark_code),
        ("heading", cmark_heading),
        ("link", cmark_link),
        ("custom", cmark_custom),
        ("html_block_type", ctypes.c_int32),
        ("opaque", ctypes.c_void_p)
    ]}))
]

##### FUNCTION DEFINITIONS #####

if hasattr(libcmark_gfm_extensions, "_ext_scan_at"):
    libcmark_gfm_extensions._ext_scan_at.restype = ctypes.c_int32
    libcmark_gfm_extensions._ext_scan_at.argtypes = tuple([
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(ctypes.c_char)),  # scanner
        ctypes.POINTER(ctypes.c_char),  # ptr
        ctypes.c_int32,  # len
        ctypes.c_int32,  # offset
    ])
    def _ext_scan_at(*argv):
        if not hasattr(_ext_scan_at, "callbacks"):
            _ext_scan_at.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,libcmark_gfm_extensions._ext_scan_at.argtypes):
            if callable(arg): # wrap functions                
                _ext_scan_at.callbacks.append(fn_arg(arg))
                args.append(_ext_scan_at.callbacks[-1])
            else:
                args.append(arg)
        return libcmark_gfm_extensions._ext_scan_at(*args)

if hasattr(libcmark_gfm_extensions, "_scan_table_cell"):
    _scan_table_cell = libcmark_gfm_extensions._scan_table_cell
    _scan_table_cell.restype = ctypes.c_int32
    _scan_table_cell.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(libcmark_gfm_extensions, "_scan_table_cell_end"):
    _scan_table_cell_end = libcmark_gfm_extensions._scan_table_cell_end
    _scan_table_cell_end.restype = ctypes.c_int32
    _scan_table_cell_end.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(libcmark_gfm_extensions, "_scan_table_row_end"):
    _scan_table_row_end = libcmark_gfm_extensions._scan_table_row_end
    _scan_table_row_end.restype = ctypes.c_int32
    _scan_table_row_end.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(libcmark_gfm_extensions, "_scan_table_start"):
    _scan_table_start = libcmark_gfm_extensions._scan_table_start
    _scan_table_start.restype = ctypes.c_int32
    _scan_table_start.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(libcmark_gfm_extensions, "_scan_tasklist"):
    _scan_tasklist = libcmark_gfm_extensions._scan_tasklist
    _scan_tasklist.restype = ctypes.c_int32
    _scan_tasklist.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(libcmark_gfm_extensions, "cmark_gfm_core_extensions_ensure_registered"):
    cmark_gfm_core_extensions_ensure_registered = libcmark_gfm_extensions.cmark_gfm_core_extensions_ensure_registered
    cmark_gfm_core_extensions_ensure_registered.restype = None
    cmark_gfm_core_extensions_ensure_registered.argtypes = tuple([

    ])

if hasattr(libcmark_gfm_extensions, "cmark_gfm_extensions_get_table_alignments"):
    cmark_gfm_extensions_get_table_alignments = libcmark_gfm_extensions.cmark_gfm_extensions_get_table_alignments
    cmark_gfm_extensions_get_table_alignments.restype = ctypes.POINTER(ctypes.c_char)
    cmark_gfm_extensions_get_table_alignments.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(libcmark_gfm_extensions, "cmark_gfm_extensions_get_table_columns"):
    cmark_gfm_extensions_get_table_columns = libcmark_gfm_extensions.cmark_gfm_extensions_get_table_columns
    cmark_gfm_extensions_get_table_columns.restype = ctypes.c_uint16
    cmark_gfm_extensions_get_table_columns.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(libcmark_gfm_extensions, "cmark_gfm_extensions_get_table_row_is_header"):
    cmark_gfm_extensions_get_table_row_is_header = libcmark_gfm_extensions.cmark_gfm_extensions_get_table_row_is_header
    cmark_gfm_extensions_get_table_row_is_header.restype = ctypes.c_int32
    cmark_gfm_extensions_get_table_row_is_header.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(libcmark_gfm_extensions, "cmark_gfm_extensions_get_tasklist_state"):
    cmark_gfm_extensions_get_tasklist_state = libcmark_gfm_extensions.cmark_gfm_extensions_get_tasklist_state
    cmark_gfm_extensions_get_tasklist_state.restype = ctypes.c_char_p
    cmark_gfm_extensions_get_tasklist_state.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(libcmark_gfm_extensions, "cmark_gfm_extensions_set_table_alignments"):
    cmark_gfm_extensions_set_table_alignments = libcmark_gfm_extensions.cmark_gfm_extensions_set_table_alignments
    cmark_gfm_extensions_set_table_alignments.restype = ctypes.c_int32
    cmark_gfm_extensions_set_table_alignments.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_uint16,  # ncols
        ctypes.POINTER(ctypes.c_char),  # alignments
    ])

if hasattr(libcmark_gfm_extensions, "cmark_gfm_extensions_set_table_columns"):
    cmark_gfm_extensions_set_table_columns = libcmark_gfm_extensions.cmark_gfm_extensions_set_table_columns
    cmark_gfm_extensions_set_table_columns.restype = ctypes.c_int32
    cmark_gfm_extensions_set_table_columns.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_uint16,  # n_columns
    ])

if hasattr(libcmark_gfm_extensions, "cmark_gfm_extensions_set_table_row_is_header"):
    cmark_gfm_extensions_set_table_row_is_header = libcmark_gfm_extensions.cmark_gfm_extensions_set_table_row_is_header
    cmark_gfm_extensions_set_table_row_is_header.restype = ctypes.c_int32
    cmark_gfm_extensions_set_table_row_is_header.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_int32,  # is_header
    ])

if hasattr(libcmark_gfm_extensions, "create_autolink_extension"):
    create_autolink_extension = libcmark_gfm_extensions.create_autolink_extension
    create_autolink_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    create_autolink_extension.argtypes = tuple([

    ])

if hasattr(libcmark_gfm_extensions, "create_strikethrough_extension"):
    create_strikethrough_extension = libcmark_gfm_extensions.create_strikethrough_extension
    create_strikethrough_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    create_strikethrough_extension.argtypes = tuple([

    ])

if hasattr(libcmark_gfm_extensions, "create_table_extension"):
    create_table_extension = libcmark_gfm_extensions.create_table_extension
    create_table_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    create_table_extension.argtypes = tuple([

    ])

if hasattr(libcmark_gfm_extensions, "create_tagfilter_extension"):
    create_tagfilter_extension = libcmark_gfm_extensions.create_tagfilter_extension
    create_tagfilter_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    create_tagfilter_extension.argtypes = tuple([

    ])

if hasattr(libcmark_gfm_extensions, "create_tasklist_extension"):
    create_tasklist_extension = libcmark_gfm_extensions.create_tasklist_extension
    create_tasklist_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    create_tasklist_extension.argtypes = tuple([

    ])

