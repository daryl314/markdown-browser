import ctypes, sys

platform_ext = {"darwin":".dylib", "win32":".dll"}.get(sys.platform, ".so")
cmark_ext = ctypes.CDLL("libcmark-gfm-extensions" + platform_ext)


##### ENUMERATIONS #####

# enum: None
CMARK_NO_DELIM = 0
CMARK_PERIOD_DELIM = 1
CMARK_PAREN_DELIM = 2
# enum: None
LITERAL = 0
NORMAL = 1
TITLE = 2
URL = 3
# enum: None
CMARK_EVENT_NONE = 0
CMARK_EVENT_DONE = 1
CMARK_EVENT_ENTER = 2
CMARK_EVENT_EXIT = 3
# enum: None
CMARK_NO_LIST = 0
CMARK_BULLET_LIST = 1
CMARK_ORDERED_LIST = 2
# enum: None
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

##### FORWARD DECLARATIONS FOR RECURSIVE USAGE #####

class _IO_FILE(ctypes.Structure):
    pass
class _IO_FILE_plus(ctypes.Structure):
    pass
class _IO_marker(ctypes.Structure):
    pass
class _cmark_llist(ctypes.Structure):
    pass
class cmark_chunk(ctypes.Structure):
    pass
class cmark_code(ctypes.Structure):
    pass
class cmark_custom(ctypes.Structure):
    pass
class cmark_heading(ctypes.Structure):
    pass
class cmark_html_renderer(ctypes.Structure):
    pass
class cmark_inline_parser(ctypes.Structure):
    pass
class cmark_iter(ctypes.Structure):
    pass
class cmark_link(ctypes.Structure):
    pass
class cmark_list(ctypes.Structure):
    pass
class cmark_llist(ctypes.Structure):
    pass
class cmark_map(ctypes.Structure):
    pass
class cmark_map_entry(ctypes.Structure):
    pass
class cmark_mem(ctypes.Structure):
    pass
class cmark_node(ctypes.Structure):
    pass
class cmark_parser(ctypes.Structure):
    pass
class cmark_plugin(ctypes.Structure):
    pass
class cmark_renderer(ctypes.Structure):
    pass
class cmark_strbuf(ctypes.Structure):
    pass
class cmark_syntax_extension(ctypes.Structure):
    pass
class delimiter(ctypes.Structure):
    pass
class html_table_state(ctypes.Structure):
    pass
class node_cell(ctypes.Structure):
    pass
class node_table(ctypes.Structure):
    pass
class node_table_row(ctypes.Structure):
    pass
class subject(ctypes.Structure):
    pass
class table_row(ctypes.Structure):
    pass

##### FIELD DEFINITIONS #####

_IO_FILE._fields_ = [
    ("_flags", ctypes.c_int32),
    ("_IO_read_ptr", ctypes.c_char_p),
    ("_IO_read_end", ctypes.c_char_p),
    ("_IO_read_base", ctypes.c_char_p),
    ("_IO_write_base", ctypes.c_char_p),
    ("_IO_write_ptr", ctypes.c_char_p),
    ("_IO_write_end", ctypes.c_char_p),
    ("_IO_buf_base", ctypes.c_char_p),
    ("_IO_buf_end", ctypes.c_char_p),
    ("_IO_save_base", ctypes.c_char_p),
    ("_IO_backup_base", ctypes.c_char_p),
    ("_IO_save_end", ctypes.c_char_p),
    ("_markers", ctypes.POINTER(_IO_marker)),
    ("_chain", ctypes.POINTER(_IO_FILE)),
    ("_fileno", ctypes.c_int32),
    ("_flags2", ctypes.c_int32),
    ("_old_offset", ctypes.c_int64),
    ("_cur_column", ctypes.c_uint16),
    ("_vtable_offset", ctypes.c_int8),
    ("_shortbuf", ctypes.c_int8 * 0),
    ("_lock", ctypes.POINTER(type("_IO_lock_t", (ctypes.Structure,), {"_fields_":[]}))),
    ("_offset", ctypes.c_int64),
    ("__pad1", ctypes.c_void_p),
    ("__pad2", ctypes.c_void_p),
    ("__pad3", ctypes.c_void_p),
    ("__pad4", ctypes.c_void_p),
    ("__pad5", ctypes.c_uint64),
    ("_mode", ctypes.c_int32),
    ("_unused2", ctypes.c_int8 * 19)
]

_IO_FILE_plus._fields_ = []

_IO_marker._fields_ = [
    ("_next", ctypes.POINTER(_IO_marker)),
    ("_sbuf", ctypes.POINTER(_IO_FILE)),
    ("_pos", ctypes.c_int32)
]

_cmark_llist._fields_ = [
    ("next", ctypes.POINTER(_cmark_llist)),
    ("data", ctypes.c_void_p)
]

cmark_chunk._fields_ = [
    ("data", ctypes.POINTER(ctypes.c_char)),
    ("len", ctypes.c_int32),
    ("alloc", ctypes.c_int32)
]

cmark_code._fields_ = [
    ("info", type("cmark_chunk", (ctypes.Structure,), {"_fields_":[
        ("data", ctypes.POINTER(ctypes.c_char)),
        ("len", ctypes.c_int32),
        ("alloc", ctypes.c_int32)
    ]})),
    ("literal", type("cmark_chunk", (ctypes.Structure,), {"_fields_":[
        ("data", ctypes.POINTER(ctypes.c_char)),
        ("len", ctypes.c_int32),
        ("alloc", ctypes.c_int32)
    ]})),
    ("fence_length", ctypes.c_char),
    ("fence_offset", ctypes.c_char),
    ("fence_char", ctypes.c_char),
    ("fenced", ctypes.c_int8)
]

cmark_custom._fields_ = [
    ("on_enter", type("cmark_chunk", (ctypes.Structure,), {"_fields_":[
        ("data", ctypes.POINTER(ctypes.c_char)),
        ("len", ctypes.c_int32),
        ("alloc", ctypes.c_int32)
    ]})),
    ("on_exit", type("cmark_chunk", (ctypes.Structure,), {"_fields_":[
        ("data", ctypes.POINTER(ctypes.c_char)),
        ("len", ctypes.c_int32),
        ("alloc", ctypes.c_int32)
    ]}))
]

cmark_heading._fields_ = [
    ("level", ctypes.c_int32),
    ("setext", ctypes.c_bool)
]

cmark_html_renderer._fields_ = [
    ("html", ctypes.POINTER(cmark_strbuf)),
    ("plain", ctypes.POINTER(cmark_node)),
    ("filter_extensions", ctypes.POINTER(_cmark_llist)),
    ("footnote_ix", ctypes.c_uint32),
    ("written_footnote_ix", ctypes.c_uint32),
    ("opaque", ctypes.c_void_p)
]

cmark_inline_parser._fields_ = []

cmark_iter._fields_ = []

cmark_link._fields_ = [
    ("url", type("cmark_chunk", (ctypes.Structure,), {"_fields_":[
        ("data", ctypes.POINTER(ctypes.c_char)),
        ("len", ctypes.c_int32),
        ("alloc", ctypes.c_int32)
    ]})),
    ("title", type("cmark_chunk", (ctypes.Structure,), {"_fields_":[
        ("data", ctypes.POINTER(ctypes.c_char)),
        ("len", ctypes.c_int32),
        ("alloc", ctypes.c_int32)
    ]}))
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

cmark_llist._fields_ = [
    ("next", ctypes.POINTER(_cmark_llist)),
    ("data", ctypes.c_void_p)
]

cmark_map._fields_ = [
    ("mem", ctypes.POINTER(cmark_mem)),
    ("refs", ctypes.POINTER(cmark_map_entry)),
    ("sorted", ctypes.POINTER(ctypes.POINTER(cmark_map_entry))),
    ("size", ctypes.c_uint32),
    ("free", ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_map), ctypes.POINTER(cmark_map_entry))))
]

cmark_map_entry._fields_ = [
    ("next", ctypes.POINTER(cmark_map_entry)),
    ("label", ctypes.POINTER(ctypes.c_char)),
    ("age", ctypes.c_uint32)
]

cmark_mem._fields_ = [
    ("calloc", ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.c_uint64, ctypes.c_uint64))),
    ("realloc", ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.c_void_p, ctypes.c_uint64))),
    ("free", ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.c_void_p)))
]

cmark_node._fields_ = [
    ("content", type("None", (ctypes.Structure,), {"_fields_":[
        ("mem", ctypes.POINTER(cmark_mem)),
        ("ptr", ctypes.POINTER(ctypes.c_char)),
        ("asize", ctypes.c_int32),
        ("size", ctypes.c_int32)
    ]})),
    ("next", ctypes.POINTER(cmark_node)),
    ("prev", ctypes.POINTER(cmark_node)),
    ("parent", ctypes.POINTER(cmark_node)),
    ("first_child", ctypes.POINTER(cmark_node)),
    ("last_child", ctypes.POINTER(cmark_node)),
    ("user_data", ctypes.c_void_p),
    ("user_data_free_func", ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_mem), ctypes.c_void_p))),
    ("start_line", ctypes.c_int32),
    ("start_column", ctypes.c_int32),
    ("end_line", ctypes.c_int32),
    ("end_column", ctypes.c_int32),
    ("internal_offset", ctypes.c_int32),
    ("type", ctypes.c_uint16),
    ("flags", ctypes.c_uint16),
    ("extension", ctypes.POINTER(cmark_syntax_extension)),
    ("as", type("None", (ctypes.Union,    ), {"_fields_":[
        ("literal", type("cmark_chunk", (ctypes.Structure,), {"_fields_":[
            ("data", ctypes.POINTER(ctypes.c_char)),
            ("len", ctypes.c_int32),
            ("alloc", ctypes.c_int32)
        ]})),
        ("list", type("None", (ctypes.Structure,), {"_fields_":[
            ("list_type", ctypes.c_uint32),
            ("marker_offset", ctypes.c_int32),
            ("padding", ctypes.c_int32),
            ("start", ctypes.c_int32),
            ("delimiter", ctypes.c_uint32),
            ("bullet_char", ctypes.c_char),
            ("tight", ctypes.c_bool)
        ]})),
        ("code", type("None", (ctypes.Structure,), {"_fields_":[
            ("info", type("cmark_chunk", (ctypes.Structure,), {"_fields_":[
                ("data", ctypes.POINTER(ctypes.c_char)),
                ("len", ctypes.c_int32),
                ("alloc", ctypes.c_int32)
            ]})),
            ("literal", type("cmark_chunk", (ctypes.Structure,), {"_fields_":[
                ("data", ctypes.POINTER(ctypes.c_char)),
                ("len", ctypes.c_int32),
                ("alloc", ctypes.c_int32)
            ]})),
            ("fence_length", ctypes.c_char),
            ("fence_offset", ctypes.c_char),
            ("fence_char", ctypes.c_char),
            ("fenced", ctypes.c_int8)
        ]})),
        ("heading", type("None", (ctypes.Structure,), {"_fields_":[
            ("level", ctypes.c_int32),
            ("setext", ctypes.c_bool)
        ]})),
        ("link", type("None", (ctypes.Structure,), {"_fields_":[
            ("url", type("cmark_chunk", (ctypes.Structure,), {"_fields_":[
                ("data", ctypes.POINTER(ctypes.c_char)),
                ("len", ctypes.c_int32),
                ("alloc", ctypes.c_int32)
            ]})),
            ("title", type("cmark_chunk", (ctypes.Structure,), {"_fields_":[
                ("data", ctypes.POINTER(ctypes.c_char)),
                ("len", ctypes.c_int32),
                ("alloc", ctypes.c_int32)
            ]}))
        ]})),
        ("custom", type("None", (ctypes.Structure,), {"_fields_":[
            ("on_enter", type("cmark_chunk", (ctypes.Structure,), {"_fields_":[
                ("data", ctypes.POINTER(ctypes.c_char)),
                ("len", ctypes.c_int32),
                ("alloc", ctypes.c_int32)
            ]})),
            ("on_exit", type("cmark_chunk", (ctypes.Structure,), {"_fields_":[
                ("data", ctypes.POINTER(ctypes.c_char)),
                ("len", ctypes.c_int32),
                ("alloc", ctypes.c_int32)
            ]}))
        ]})),
        ("html_block_type", ctypes.c_int32),
        ("opaque", ctypes.c_void_p)
    ]}))
]

cmark_parser._fields_ = [
    ("mem", ctypes.POINTER(cmark_mem)),
    ("refmap", ctypes.POINTER(cmark_map)),
    ("root", ctypes.POINTER(cmark_node)),
    ("current", ctypes.POINTER(cmark_node)),
    ("line_number", ctypes.c_int32),
    ("offset", ctypes.c_int32),
    ("column", ctypes.c_int32),
    ("first_nonspace", ctypes.c_int32),
    ("first_nonspace_column", ctypes.c_int32),
    ("indent", ctypes.c_int32),
    ("blank", ctypes.c_bool),
    ("partially_consumed_tab", ctypes.c_bool),
    ("curline", type("None", (ctypes.Structure,), {"_fields_":[
        ("mem", ctypes.POINTER(cmark_mem)),
        ("ptr", ctypes.POINTER(ctypes.c_char)),
        ("asize", ctypes.c_int32),
        ("size", ctypes.c_int32)
    ]})),
    ("last_line_length", ctypes.c_int32),
    ("linebuf", type("None", (ctypes.Structure,), {"_fields_":[
        ("mem", ctypes.POINTER(cmark_mem)),
        ("ptr", ctypes.POINTER(ctypes.c_char)),
        ("asize", ctypes.c_int32),
        ("size", ctypes.c_int32)
    ]})),
    ("options", ctypes.c_int32),
    ("last_buffer_ended_with_cr", ctypes.c_bool),
    ("syntax_extensions", ctypes.POINTER(_cmark_llist)),
    ("inline_syntax_extensions", ctypes.POINTER(_cmark_llist)),
    ("backslash_ispunct", ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.c_int8)))
]

cmark_plugin._fields_ = [
    ("syntax_extensions", ctypes.POINTER(_cmark_llist))
]

cmark_renderer._fields_ = [
    ("mem", ctypes.POINTER(cmark_mem)),
    ("buffer", ctypes.POINTER(cmark_strbuf)),
    ("prefix", ctypes.POINTER(cmark_strbuf)),
    ("column", ctypes.c_int32),
    ("width", ctypes.c_int32),
    ("need_cr", ctypes.c_int32),
    ("last_breakable", ctypes.c_int32),
    ("begin_line", ctypes.c_bool),
    ("begin_content", ctypes.c_bool),
    ("no_linebreaks", ctypes.c_bool),
    ("in_tight_list_item", ctypes.c_bool),
    ("outc", ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32, ctypes.c_char))),
    ("cr", ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_renderer)))),
    ("blankline", ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_renderer)))),
    ("out", ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_char_p, ctypes.c_bool, ctypes.c_uint32))),
    ("footnote_ix", ctypes.c_uint32)
]

cmark_strbuf._fields_ = [
    ("mem", ctypes.POINTER(cmark_mem)),
    ("ptr", ctypes.POINTER(ctypes.c_char)),
    ("asize", ctypes.c_int32),
    ("size", ctypes.c_int32)
]

cmark_syntax_extension._fields_ = []

delimiter._fields_ = [
    ("previous", ctypes.POINTER(delimiter)),
    ("next", ctypes.POINTER(delimiter)),
    ("inl_text", ctypes.POINTER(cmark_node)),
    ("length", ctypes.c_int32),
    ("delim_char", ctypes.c_char),
    ("can_open", ctypes.c_int32),
    ("can_close", ctypes.c_int32)
]

html_table_state._fields_ = [
    ("need_closing_table_body", ctypes.c_uint32),
    ("in_table_header", ctypes.c_uint32)
]

node_cell._fields_ = [
    ("buf", ctypes.POINTER(cmark_strbuf)),
    ("start_offset", ctypes.c_int32),
    ("end_offset", ctypes.c_int32),
    ("internal_offset", ctypes.c_int32)
]

node_table._fields_ = [
    ("n_columns", ctypes.c_uint16),
    ("alignments", ctypes.POINTER(ctypes.c_char))
]

node_table_row._fields_ = [
    ("is_header", ctypes.c_bool)
]

subject._fields_ = []

table_row._fields_ = [
    ("n_columns", ctypes.c_uint16),
    ("cells", ctypes.POINTER(_cmark_llist))
]

##### FUNCTION DEFINITIONS #####

if hasattr(cmark_ext, "_ext_scan_at"):
    cmark_ext._ext_scan_at.restype = ctypes.c_int32
    cmark_ext._ext_scan_at.argtypes = tuple([
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(ctypes.c_char)),  # scanner
        ctypes.POINTER(ctypes.c_char),  # ptr
        ctypes.c_int32,  # len
        ctypes.c_int32,  # offset
    ])
    def _ext_scan_at(*argv):
        if not hasattr(_ext_scan_at, "callbacks"):
            _ext_scan_at.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark_ext._ext_scan_at.argtypes):
            if callable(arg): # wrap functions                
                _ext_scan_at.callbacks.append(fn_arg(arg))
                args.append(_ext_scan_at.callbacks[-1])
            else:
                args.append(arg)
        return cmark_ext._ext_scan_at(*args)

if hasattr(cmark_ext, "_scan_table_cell"):
    _scan_table_cell = cmark_ext._scan_table_cell
    _scan_table_cell.restype = ctypes.c_int32
    _scan_table_cell.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark_ext, "_scan_table_cell_end"):
    _scan_table_cell_end = cmark_ext._scan_table_cell_end
    _scan_table_cell_end.restype = ctypes.c_int32
    _scan_table_cell_end.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark_ext, "_scan_table_row_end"):
    _scan_table_row_end = cmark_ext._scan_table_row_end
    _scan_table_row_end.restype = ctypes.c_int32
    _scan_table_row_end.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark_ext, "_scan_table_start"):
    _scan_table_start = cmark_ext._scan_table_start
    _scan_table_start.restype = ctypes.c_int32
    _scan_table_start.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark_ext, "cmark_free_func"):
    cmark_free_func = cmark_ext.cmark_free_func
    cmark_free_func.restype = None
    cmark_free_func.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # None
        ctypes.c_void_p,  # None
    ])

if hasattr(cmark_ext, "cmark_gfm_core_extensions_ensure_registered"):
    cmark_gfm_core_extensions_ensure_registered = cmark_ext.cmark_gfm_core_extensions_ensure_registered
    cmark_gfm_core_extensions_ensure_registered.restype = None
    cmark_gfm_core_extensions_ensure_registered.argtypes = tuple([

    ])

if hasattr(cmark_ext, "cmark_gfm_extensions_get_table_alignments"):
    cmark_gfm_extensions_get_table_alignments = cmark_ext.cmark_gfm_extensions_get_table_alignments
    cmark_gfm_extensions_get_table_alignments.restype = ctypes.POINTER(ctypes.c_char)
    cmark_gfm_extensions_get_table_alignments.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark_ext, "cmark_gfm_extensions_get_table_columns"):
    cmark_gfm_extensions_get_table_columns = cmark_ext.cmark_gfm_extensions_get_table_columns
    cmark_gfm_extensions_get_table_columns.restype = ctypes.c_uint16
    cmark_gfm_extensions_get_table_columns.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark_ext, "cmark_gfm_extensions_get_table_row_is_header"):
    cmark_gfm_extensions_get_table_row_is_header = cmark_ext.cmark_gfm_extensions_get_table_row_is_header
    cmark_gfm_extensions_get_table_row_is_header.restype = ctypes.c_int32
    cmark_gfm_extensions_get_table_row_is_header.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark_ext, "cmark_gfm_extensions_set_table_alignments"):
    cmark_gfm_extensions_set_table_alignments = cmark_ext.cmark_gfm_extensions_set_table_alignments
    cmark_gfm_extensions_set_table_alignments.restype = ctypes.c_int32
    cmark_gfm_extensions_set_table_alignments.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_uint16,  # ncols
        ctypes.POINTER(ctypes.c_char),  # alignments
    ])

if hasattr(cmark_ext, "cmark_gfm_extensions_set_table_columns"):
    cmark_gfm_extensions_set_table_columns = cmark_ext.cmark_gfm_extensions_set_table_columns
    cmark_gfm_extensions_set_table_columns.restype = ctypes.c_int32
    cmark_gfm_extensions_set_table_columns.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_uint16,  # n_columns
    ])

if hasattr(cmark_ext, "cmark_gfm_extensions_set_table_row_is_header"):
    cmark_gfm_extensions_set_table_row_is_header = cmark_ext.cmark_gfm_extensions_set_table_row_is_header
    cmark_gfm_extensions_set_table_row_is_header.restype = ctypes.c_int32
    cmark_gfm_extensions_set_table_row_is_header.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_int32,  # is_header
    ])

if hasattr(cmark_ext, "cmark_ispunct_func"):
    cmark_ispunct_func = cmark_ext.cmark_ispunct_func
    cmark_ispunct_func.restype = ctypes.c_int32
    cmark_ispunct_func.argtypes = tuple([
        ctypes.c_int8,  # None
    ])

if hasattr(cmark_ext, "cmark_map_free_f"):
    cmark_map_free_f = cmark_ext.cmark_map_free_f
    cmark_map_free_f.restype = None
    cmark_map_free_f.argtypes = tuple([
        ctypes.POINTER(cmark_map),  # None
        ctypes.POINTER(cmark_map_entry),  # None
    ])

if hasattr(cmark_ext, "create_autolink_extension"):
    create_autolink_extension = cmark_ext.create_autolink_extension
    create_autolink_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    create_autolink_extension.argtypes = tuple([

    ])

if hasattr(cmark_ext, "create_strikethrough_extension"):
    create_strikethrough_extension = cmark_ext.create_strikethrough_extension
    create_strikethrough_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    create_strikethrough_extension.argtypes = tuple([

    ])

if hasattr(cmark_ext, "create_table_extension"):
    create_table_extension = cmark_ext.create_table_extension
    create_table_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    create_table_extension.argtypes = tuple([

    ])

if hasattr(cmark_ext, "create_tagfilter_extension"):
    create_tagfilter_extension = cmark_ext.create_tagfilter_extension
    create_tagfilter_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    create_tagfilter_extension.argtypes = tuple([

    ])

