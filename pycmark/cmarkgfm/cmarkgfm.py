import ctypes
import sys
import os

platform_ext = {"darwin":".dylib", "win32":".dll"}.get(sys.platform, ".so")
gfm = ctypes.CDLL(os.path.join(os.path.dirname(__file__), "bin/gfm" + platform_ext))

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
class cmark_escaping:
    LITERAL = 0
    NORMAL = 1
    TITLE = 2
    URL = 3
    _dict = {
        0 : "LITERAL",
        1 : "NORMAL",
        2 : "TITLE",
        3 : "URL",
    }
class cmark_event_type:
    CMARK_EVENT_NONE = 0
    CMARK_EVENT_DONE = 1
    CMARK_EVENT_ENTER = 2
    CMARK_EVENT_EXIT = 3
    _dict = {
        0 : "CMARK_EVENT_NONE",
        1 : "CMARK_EVENT_DONE",
        2 : "CMARK_EVENT_ENTER",
        3 : "CMARK_EVENT_EXIT",
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

class _IO_FILE(ctypes.Structure):
    pass
class _IO_marker(ctypes.Structure):
    pass
class _cmark_llist(ctypes.Structure):
    pass
class bracket(ctypes.Structure):
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
class cmark_iter(ctypes.Structure):
    pass
class cmark_iter_state(ctypes.Structure):
    pass
class cmark_link(ctypes.Structure):
    pass
class cmark_list(ctypes.Structure):
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
class subject(ctypes.Structure):
    pass

##### TYPE DEFINITIONS #####

cmark_inline_parser = subject

cmark_llist = _cmark_llist

FILE = _IO_FILE

cmark_map_free_f = ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_map), ctypes.POINTER(cmark_map_entry)))

cmark_contains_inlines_func = ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node)))

cmark_can_contain_func = ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node), ctypes.c_uint32))

cmark_commonmark_escape_func = ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node), ctypes.c_int32))

cmark_match_block_func = ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_parser), ctypes.POINTER(ctypes.c_char), ctypes.c_int32, ctypes.POINTER(cmark_node)))

cmark_match_inline_func = ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.POINTER(cmark_node), ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_parser), ctypes.POINTER(cmark_node), ctypes.c_char, ctypes.POINTER(cmark_inline_parser)))

cmark_plugin_init_func = ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_plugin)))

cmark_free_func = ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_mem), ctypes.c_void_p))

cmark_postprocess_func = ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.POINTER(cmark_node), ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_parser), ctypes.POINTER(cmark_node)))

cmark_html_render_func = ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_html_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32))

cmark_common_render_func = ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32))

cmark_opaque_alloc_func = ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_mem), ctypes.POINTER(cmark_node)))

cmark_ispunct_func = ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.c_int8))

cmark_get_type_string_func = ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_char_p, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node)))

cmark_inline_predicate = ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.c_int32))

cmark_html_filter_func = ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(ctypes.c_char), ctypes.c_uint64))

cmark_xml_attr_func = ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_char_p, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node)))

cmark_opaque_free_func = ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_mem), ctypes.POINTER(cmark_node)))

cmark_inline_from_delim_func = ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.POINTER(delimiter), ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_parser), ctypes.POINTER(cmark_inline_parser), ctypes.POINTER(delimiter), ctypes.POINTER(delimiter)))

cmark_open_block_func = ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.POINTER(cmark_node), ctypes.POINTER(cmark_syntax_extension), ctypes.c_int32, ctypes.POINTER(cmark_parser), ctypes.POINTER(cmark_node), ctypes.POINTER(ctypes.c_char), ctypes.c_int32))

##### STRUCTURE FIELD DEFINITIONS #####

cmark_heading._fields_ = [
    ("level", ctypes.c_int32),
    ("setext", ctypes.c_bool)
]

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
    ("_shortbuf", ctypes.c_int8),
    ("_lock", ctypes.POINTER(type("_IO_lock_t", (ctypes.Structure,), {"_fields_":[]}))),
    ("_offset", ctypes.c_int64),
    ("__pad1", ctypes.c_void_p),
    ("__pad2", ctypes.c_void_p),
    ("__pad3", ctypes.c_void_p),
    ("__pad4", ctypes.c_void_p),
    ("__pad5", ctypes.c_uint64),
    ("_mode", ctypes.c_int32),
    ("_unused2", ctypes.c_int8 * 20)
]

bracket._fields_ = [
    ("previous", ctypes.POINTER(bracket)),
    ("previous_delimiter", ctypes.POINTER(delimiter)),
    ("inl_text", ctypes.POINTER(cmark_node)),
    ("position", ctypes.c_int32),
    ("image", ctypes.c_bool),
    ("active", ctypes.c_bool),
    ("bracket_after", ctypes.c_bool)
]

delimiter._fields_ = [
    ("previous", ctypes.POINTER(delimiter)),
    ("next", ctypes.POINTER(delimiter)),
    ("inl_text", ctypes.POINTER(cmark_node)),
    ("length", ctypes.c_int32),
    ("delim_char", ctypes.c_char),
    ("can_open", ctypes.c_int32),
    ("can_close", ctypes.c_int32)
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

cmark_plugin._fields_ = [
    ("syntax_extensions", ctypes.POINTER(cmark_llist))
]

cmark_mem._fields_ = [
    ("calloc", ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.c_uint64, ctypes.c_uint64)),
    ("realloc", ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.c_void_p, ctypes.c_uint64)),
    ("free", ctypes.CFUNCTYPE(None, ctypes.c_void_p))
]

cmark_map_entry._fields_ = [
    ("next", ctypes.POINTER(cmark_map_entry)),
    ("label", ctypes.POINTER(ctypes.c_char)),
    ("age", ctypes.c_uint32)
]

_cmark_llist._fields_ = [
    ("next", ctypes.POINTER(_cmark_llist)),
    ("data", ctypes.c_void_p)
]

cmark_map._fields_ = [
    ("mem", ctypes.POINTER(cmark_mem)),
    ("refs", ctypes.POINTER(cmark_map_entry)),
    ("sorted", ctypes.POINTER(ctypes.POINTER(cmark_map_entry))),
    ("size", ctypes.c_uint32),
    ("free", cmark_map_free_f)
]

_IO_marker._fields_ = [
    ("_next", ctypes.POINTER(_IO_marker)),
    ("_sbuf", ctypes.POINTER(_IO_FILE)),
    ("_pos", ctypes.c_int32)
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
    ("outc", ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32, ctypes.c_char)),
    ("cr", ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_renderer))),
    ("blankline", ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_renderer))),
    ("out", ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_char_p, ctypes.c_bool, ctypes.c_uint32)),
    ("footnote_ix", ctypes.c_uint32)
]

cmark_strbuf._fields_ = [
    ("mem", ctypes.POINTER(cmark_mem)),
    ("ptr", ctypes.POINTER(ctypes.c_char)),
    ("asize", ctypes.c_int32),
    ("size", ctypes.c_int32)
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
    ("thematic_break_kill_pos", ctypes.c_int32),
    ("indent", ctypes.c_int32),
    ("blank", ctypes.c_bool),
    ("partially_consumed_tab", ctypes.c_bool),
    ("curline", cmark_strbuf),
    ("last_line_length", ctypes.c_int32),
    ("linebuf", cmark_strbuf),
    ("options", ctypes.c_int32),
    ("last_buffer_ended_with_cr", ctypes.c_bool),
    ("syntax_extensions", ctypes.POINTER(cmark_llist)),
    ("inline_syntax_extensions", ctypes.POINTER(cmark_llist)),
    ("backslash_ispunct", cmark_ispunct_func)
]

cmark_html_renderer._fields_ = [
    ("html", ctypes.POINTER(cmark_strbuf)),
    ("plain", ctypes.POINTER(cmark_node)),
    ("filter_extensions", ctypes.POINTER(cmark_llist)),
    ("footnote_ix", ctypes.c_uint32),
    ("written_footnote_ix", ctypes.c_uint32),
    ("opaque", ctypes.c_void_p)
]

cmark_iter_state._fields_ = [
    ("ev_type", ctypes.c_uint32),
    ("node", ctypes.POINTER(cmark_node))
]

cmark_iter._fields_ = [
    ("mem", ctypes.POINTER(cmark_mem)),
    ("root", ctypes.POINTER(cmark_node)),
    ("cur", cmark_iter_state),
    ("next", cmark_iter_state)
]

cmark_syntax_extension._fields_ = [
    ("last_block_matches", cmark_match_block_func),
    ("try_opening_block", cmark_open_block_func),
    ("match_inline", cmark_match_inline_func),
    ("insert_inline_from_delim", cmark_inline_from_delim_func),
    ("special_inline_chars", ctypes.POINTER(cmark_llist)),
    ("name", ctypes.c_char_p),
    ("priv", ctypes.c_void_p),
    ("emphasis", ctypes.c_bool),
    ("free_function", cmark_free_func),
    ("get_type_string_func", cmark_get_type_string_func),
    ("can_contain_func", cmark_can_contain_func),
    ("contains_inlines_func", cmark_contains_inlines_func),
    ("commonmark_render_func", cmark_common_render_func),
    ("plaintext_render_func", cmark_common_render_func),
    ("latex_render_func", cmark_common_render_func),
    ("xml_attr_func", cmark_xml_attr_func),
    ("man_render_func", cmark_common_render_func),
    ("html_render_func", cmark_html_render_func),
    ("html_filter_func", cmark_html_filter_func),
    ("postprocess_func", cmark_postprocess_func),
    ("opaque_alloc_func", cmark_opaque_alloc_func),
    ("opaque_free_func", cmark_opaque_free_func),
    ("commonmark_escape_func", cmark_commonmark_escape_func)
]

cmark_chunk._fields_ = [
    ("data", ctypes.POINTER(ctypes.c_char)),
    ("len", ctypes.c_int32),
    ("alloc", ctypes.c_int32)
]

subject._fields_ = [
    ("mem", ctypes.POINTER(cmark_mem)),
    ("input", cmark_chunk),
    ("line", ctypes.c_int32),
    ("pos", ctypes.c_int32),
    ("block_offset", ctypes.c_int32),
    ("column_offset", ctypes.c_int32),
    ("refmap", ctypes.POINTER(cmark_map)),
    ("last_delim", ctypes.POINTER(delimiter)),
    ("last_bracket", ctypes.POINTER(bracket)),
    ("backticks", ctypes.c_int32 * 81),
    ("scanned_for_backticks", ctypes.c_bool)
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

cmark_custom._fields_ = [
    ("on_enter", cmark_chunk),
    ("on_exit", cmark_chunk)
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

##### EXPORTED VARIABLES #####

try:
    CMARK_NODE_STRIKETHROUGH = (ctypes.c_uint32).in_dll(gfm, "CMARK_NODE_STRIKETHROUGH")
except:
    pass
try:
    CMARK_NODE_TABLE = (ctypes.c_uint32).in_dll(gfm, "CMARK_NODE_TABLE")
except:
    pass
try:
    CMARK_NODE_TABLE_CELL = (ctypes.c_uint32).in_dll(gfm, "CMARK_NODE_TABLE_CELL")
except:
    pass
try:
    CMARK_NODE_TABLE_ROW = (ctypes.c_uint32).in_dll(gfm, "CMARK_NODE_TABLE_ROW")
except:
    pass
try:
    options = (ctypes.c_int32).in_dll(gfm, "options")
except:
    pass
try:
    stderr = (ctypes.POINTER(_IO_FILE)).in_dll(gfm, "stderr")
except:
    pass
try:
    stdin = (ctypes.POINTER(_IO_FILE)).in_dll(gfm, "stdin")
except:
    pass

##### FUNCTION DEFINITIONS #####

if hasattr(gfm, "_ext_scan_at"):
    gfm._ext_scan_at.restype = ctypes.c_int32
    gfm._ext_scan_at.argtypes = tuple([
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(ctypes.c_char)),  # scanner
        ctypes.POINTER(ctypes.c_char),  # ptr
        ctypes.c_int32,  # len
        ctypes.c_int32,  # offset
    ])
    def _ext_scan_at(*argv):
        if not hasattr(_ext_scan_at, "callbacks"):
            _ext_scan_at.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm._ext_scan_at.argtypes):
            if callable(arg): # wrap functions                
                _ext_scan_at.callbacks.append(fn_arg(arg))
                args.append(_ext_scan_at.callbacks[-1])
            else:
                args.append(arg)
        return gfm._ext_scan_at(*args)

if hasattr(gfm, "_scan_table_cell"):
    _scan_table_cell = gfm._scan_table_cell
    _scan_table_cell.restype = ctypes.c_int32
    _scan_table_cell.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(gfm, "_scan_table_cell_end"):
    _scan_table_cell_end = gfm._scan_table_cell_end
    _scan_table_cell_end.restype = ctypes.c_int32
    _scan_table_cell_end.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(gfm, "_scan_table_row_end"):
    _scan_table_row_end = gfm._scan_table_row_end
    _scan_table_row_end.restype = ctypes.c_int32
    _scan_table_row_end.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(gfm, "_scan_table_start"):
    _scan_table_start = gfm._scan_table_start
    _scan_table_start.restype = ctypes.c_int32
    _scan_table_start.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(gfm, "_scan_tasklist"):
    _scan_tasklist = gfm._scan_tasklist
    _scan_tasklist.restype = ctypes.c_int32
    _scan_tasklist.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(gfm, "attach_extension"):
    attach_extension = gfm.attach_extension
    attach_extension.restype = None
    attach_extension.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
        ctypes.c_char_p,  # name
    ])

if hasattr(gfm, "cmark_arena_pop"):
    cmark_arena_pop = gfm.cmark_arena_pop
    cmark_arena_pop.restype = ctypes.c_int32
    cmark_arena_pop.argtypes = tuple([

    ])

if hasattr(gfm, "cmark_arena_push"):
    cmark_arena_push = gfm.cmark_arena_push
    cmark_arena_push.restype = None
    cmark_arena_push.argtypes = tuple([

    ])

if hasattr(gfm, "cmark_arena_reset"):
    cmark_arena_reset = gfm.cmark_arena_reset
    cmark_arena_reset.restype = None
    cmark_arena_reset.argtypes = tuple([

    ])

if hasattr(gfm, "cmark_consolidate_text_nodes"):
    cmark_consolidate_text_nodes = gfm.cmark_consolidate_text_nodes
    cmark_consolidate_text_nodes.restype = None
    cmark_consolidate_text_nodes.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
    ])

if hasattr(gfm, "cmark_find_syntax_extension"):
    cmark_find_syntax_extension = gfm.cmark_find_syntax_extension
    cmark_find_syntax_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    cmark_find_syntax_extension.argtypes = tuple([
        ctypes.c_char_p,  # name
    ])

if hasattr(gfm, "cmark_get_arena_mem_allocator"):
    cmark_get_arena_mem_allocator = gfm.cmark_get_arena_mem_allocator
    cmark_get_arena_mem_allocator.restype = ctypes.POINTER(cmark_mem)
    cmark_get_arena_mem_allocator.argtypes = tuple([

    ])

if hasattr(gfm, "cmark_get_default_mem_allocator"):
    cmark_get_default_mem_allocator = gfm.cmark_get_default_mem_allocator
    cmark_get_default_mem_allocator.restype = ctypes.POINTER(cmark_mem)
    cmark_get_default_mem_allocator.argtypes = tuple([

    ])

if hasattr(gfm, "cmark_gfm_core_extensions_ensure_registered"):
    cmark_gfm_core_extensions_ensure_registered = gfm.cmark_gfm_core_extensions_ensure_registered
    cmark_gfm_core_extensions_ensure_registered.restype = None
    cmark_gfm_core_extensions_ensure_registered.argtypes = tuple([

    ])

if hasattr(gfm, "cmark_gfm_extensions_get_table_alignments"):
    cmark_gfm_extensions_get_table_alignments = gfm.cmark_gfm_extensions_get_table_alignments
    cmark_gfm_extensions_get_table_alignments.restype = ctypes.POINTER(ctypes.c_char)
    cmark_gfm_extensions_get_table_alignments.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_gfm_extensions_get_table_columns"):
    cmark_gfm_extensions_get_table_columns = gfm.cmark_gfm_extensions_get_table_columns
    cmark_gfm_extensions_get_table_columns.restype = ctypes.c_uint16
    cmark_gfm_extensions_get_table_columns.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_gfm_extensions_get_table_row_is_header"):
    cmark_gfm_extensions_get_table_row_is_header = gfm.cmark_gfm_extensions_get_table_row_is_header
    cmark_gfm_extensions_get_table_row_is_header.restype = ctypes.c_int32
    cmark_gfm_extensions_get_table_row_is_header.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_gfm_extensions_get_tasklist_state"):
    cmark_gfm_extensions_get_tasklist_state = gfm.cmark_gfm_extensions_get_tasklist_state
    cmark_gfm_extensions_get_tasklist_state.restype = ctypes.c_char_p
    cmark_gfm_extensions_get_tasklist_state.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_gfm_extensions_set_table_alignments"):
    cmark_gfm_extensions_set_table_alignments = gfm.cmark_gfm_extensions_set_table_alignments
    cmark_gfm_extensions_set_table_alignments.restype = ctypes.c_int32
    cmark_gfm_extensions_set_table_alignments.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_uint16,  # ncols
        ctypes.POINTER(ctypes.c_char),  # alignments
    ])

if hasattr(gfm, "cmark_gfm_extensions_set_table_columns"):
    cmark_gfm_extensions_set_table_columns = gfm.cmark_gfm_extensions_set_table_columns
    cmark_gfm_extensions_set_table_columns.restype = ctypes.c_int32
    cmark_gfm_extensions_set_table_columns.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_uint16,  # n_columns
    ])

if hasattr(gfm, "cmark_gfm_extensions_set_table_row_is_header"):
    cmark_gfm_extensions_set_table_row_is_header = gfm.cmark_gfm_extensions_set_table_row_is_header
    cmark_gfm_extensions_set_table_row_is_header.restype = ctypes.c_int32
    cmark_gfm_extensions_set_table_row_is_header.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_int32,  # is_header
    ])

if hasattr(gfm, "cmark_inline_parser_advance_offset"):
    cmark_inline_parser_advance_offset = gfm.cmark_inline_parser_advance_offset
    cmark_inline_parser_advance_offset.restype = None
    cmark_inline_parser_advance_offset.argtypes = tuple([
        ctypes.POINTER(cmark_inline_parser),  # parser
    ])

if hasattr(gfm, "cmark_inline_parser_get_chunk"):
    cmark_inline_parser_get_chunk = gfm.cmark_inline_parser_get_chunk
    cmark_inline_parser_get_chunk.restype = ctypes.POINTER(cmark_chunk)
    cmark_inline_parser_get_chunk.argtypes = tuple([
        ctypes.POINTER(cmark_inline_parser),  # parser
    ])

if hasattr(gfm, "cmark_inline_parser_get_column"):
    cmark_inline_parser_get_column = gfm.cmark_inline_parser_get_column
    cmark_inline_parser_get_column.restype = ctypes.c_int32
    cmark_inline_parser_get_column.argtypes = tuple([
        ctypes.POINTER(cmark_inline_parser),  # parser
    ])

if hasattr(gfm, "cmark_inline_parser_get_last_delimiter"):
    cmark_inline_parser_get_last_delimiter = gfm.cmark_inline_parser_get_last_delimiter
    cmark_inline_parser_get_last_delimiter.restype = ctypes.POINTER(delimiter)
    cmark_inline_parser_get_last_delimiter.argtypes = tuple([
        ctypes.POINTER(cmark_inline_parser),  # parser
    ])

if hasattr(gfm, "cmark_inline_parser_get_line"):
    cmark_inline_parser_get_line = gfm.cmark_inline_parser_get_line
    cmark_inline_parser_get_line.restype = ctypes.c_int32
    cmark_inline_parser_get_line.argtypes = tuple([
        ctypes.POINTER(cmark_inline_parser),  # parser
    ])

if hasattr(gfm, "cmark_inline_parser_get_offset"):
    cmark_inline_parser_get_offset = gfm.cmark_inline_parser_get_offset
    cmark_inline_parser_get_offset.restype = ctypes.c_int32
    cmark_inline_parser_get_offset.argtypes = tuple([
        ctypes.POINTER(cmark_inline_parser),  # parser
    ])

if hasattr(gfm, "cmark_inline_parser_in_bracket"):
    cmark_inline_parser_in_bracket = gfm.cmark_inline_parser_in_bracket
    cmark_inline_parser_in_bracket.restype = ctypes.c_int32
    cmark_inline_parser_in_bracket.argtypes = tuple([
        ctypes.POINTER(cmark_inline_parser),  # parser
        ctypes.c_int32,  # image
    ])

if hasattr(gfm, "cmark_inline_parser_is_eof"):
    cmark_inline_parser_is_eof = gfm.cmark_inline_parser_is_eof
    cmark_inline_parser_is_eof.restype = ctypes.c_int32
    cmark_inline_parser_is_eof.argtypes = tuple([
        ctypes.POINTER(cmark_inline_parser),  # parser
    ])

if hasattr(gfm, "cmark_inline_parser_peek_at"):
    cmark_inline_parser_peek_at = gfm.cmark_inline_parser_peek_at
    cmark_inline_parser_peek_at.restype = ctypes.c_char
    cmark_inline_parser_peek_at.argtypes = tuple([
        ctypes.POINTER(cmark_inline_parser),  # parser
        ctypes.c_int32,  # pos
    ])

if hasattr(gfm, "cmark_inline_parser_peek_char"):
    cmark_inline_parser_peek_char = gfm.cmark_inline_parser_peek_char
    cmark_inline_parser_peek_char.restype = ctypes.c_char
    cmark_inline_parser_peek_char.argtypes = tuple([
        ctypes.POINTER(cmark_inline_parser),  # parser
    ])

if hasattr(gfm, "cmark_inline_parser_push_delimiter"):
    cmark_inline_parser_push_delimiter = gfm.cmark_inline_parser_push_delimiter
    cmark_inline_parser_push_delimiter.restype = None
    cmark_inline_parser_push_delimiter.argtypes = tuple([
        ctypes.POINTER(cmark_inline_parser),  # parser
        ctypes.c_char,  # c
        ctypes.c_int32,  # can_open
        ctypes.c_int32,  # can_close
        ctypes.POINTER(cmark_node),  # inl_text
    ])

if hasattr(gfm, "cmark_inline_parser_remove_delimiter"):
    cmark_inline_parser_remove_delimiter = gfm.cmark_inline_parser_remove_delimiter
    cmark_inline_parser_remove_delimiter.restype = None
    cmark_inline_parser_remove_delimiter.argtypes = tuple([
        ctypes.POINTER(cmark_inline_parser),  # parser
        ctypes.POINTER(delimiter),  # delim
    ])

if hasattr(gfm, "cmark_inline_parser_scan_delimiters"):
    cmark_inline_parser_scan_delimiters = gfm.cmark_inline_parser_scan_delimiters
    cmark_inline_parser_scan_delimiters.restype = ctypes.c_int32
    cmark_inline_parser_scan_delimiters.argtypes = tuple([
        ctypes.POINTER(cmark_inline_parser),  # parser
        ctypes.c_int32,  # max_delims
        ctypes.c_char,  # c
        ctypes.POINTER(ctypes.c_int32),  # left_flanking
        ctypes.POINTER(ctypes.c_int32),  # right_flanking
        ctypes.POINTER(ctypes.c_int32),  # punct_before
        ctypes.POINTER(ctypes.c_int32),  # punct_after
    ])

if hasattr(gfm, "cmark_inline_parser_set_offset"):
    cmark_inline_parser_set_offset = gfm.cmark_inline_parser_set_offset
    cmark_inline_parser_set_offset.restype = None
    cmark_inline_parser_set_offset.argtypes = tuple([
        ctypes.POINTER(cmark_inline_parser),  # parser
        ctypes.c_int32,  # offset
    ])

if hasattr(gfm, "cmark_inline_parser_take_while"):
    gfm.cmark_inline_parser_take_while.restype = ctypes.c_char_p
    gfm.cmark_inline_parser_take_while.argtypes = tuple([
        ctypes.POINTER(cmark_inline_parser),  # parser
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.c_int32),  # pred
    ])
    def cmark_inline_parser_take_while(*argv):
        if not hasattr(cmark_inline_parser_take_while, "callbacks"):
            cmark_inline_parser_take_while.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_inline_parser_take_while.argtypes):
            if callable(arg): # wrap functions                
                cmark_inline_parser_take_while.callbacks.append(fn_arg(arg))
                args.append(cmark_inline_parser_take_while.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_inline_parser_take_while(*args)

if hasattr(gfm, "cmark_isalnum"):
    cmark_isalnum = gfm.cmark_isalnum
    cmark_isalnum.restype = ctypes.c_int32
    cmark_isalnum.argtypes = tuple([
        ctypes.c_int8,  # c
    ])

if hasattr(gfm, "cmark_isalpha"):
    cmark_isalpha = gfm.cmark_isalpha
    cmark_isalpha.restype = ctypes.c_int32
    cmark_isalpha.argtypes = tuple([
        ctypes.c_int8,  # c
    ])

if hasattr(gfm, "cmark_isdigit"):
    cmark_isdigit = gfm.cmark_isdigit
    cmark_isdigit.restype = ctypes.c_int32
    cmark_isdigit.argtypes = tuple([
        ctypes.c_int8,  # c
    ])

if hasattr(gfm, "cmark_ispunct"):
    cmark_ispunct = gfm.cmark_ispunct
    cmark_ispunct.restype = ctypes.c_int32
    cmark_ispunct.argtypes = tuple([
        ctypes.c_int8,  # c
    ])

if hasattr(gfm, "cmark_isspace"):
    cmark_isspace = gfm.cmark_isspace
    cmark_isspace.restype = ctypes.c_int32
    cmark_isspace.argtypes = tuple([
        ctypes.c_int8,  # c
    ])

if hasattr(gfm, "cmark_iter_free"):
    cmark_iter_free = gfm.cmark_iter_free
    cmark_iter_free.restype = None
    cmark_iter_free.argtypes = tuple([
        ctypes.POINTER(cmark_iter),  # iter
    ])

if hasattr(gfm, "cmark_iter_get_event_type"):
    cmark_iter_get_event_type = gfm.cmark_iter_get_event_type
    cmark_iter_get_event_type.restype = ctypes.c_uint32
    cmark_iter_get_event_type.argtypes = tuple([
        ctypes.POINTER(cmark_iter),  # iter
    ])

if hasattr(gfm, "cmark_iter_get_node"):
    cmark_iter_get_node = gfm.cmark_iter_get_node
    cmark_iter_get_node.restype = ctypes.POINTER(cmark_node)
    cmark_iter_get_node.argtypes = tuple([
        ctypes.POINTER(cmark_iter),  # iter
    ])

if hasattr(gfm, "cmark_iter_get_root"):
    cmark_iter_get_root = gfm.cmark_iter_get_root
    cmark_iter_get_root.restype = ctypes.POINTER(cmark_node)
    cmark_iter_get_root.argtypes = tuple([
        ctypes.POINTER(cmark_iter),  # iter
    ])

if hasattr(gfm, "cmark_iter_new"):
    cmark_iter_new = gfm.cmark_iter_new
    cmark_iter_new.restype = ctypes.POINTER(cmark_iter)
    cmark_iter_new.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
    ])

if hasattr(gfm, "cmark_iter_next"):
    cmark_iter_next = gfm.cmark_iter_next
    cmark_iter_next.restype = ctypes.c_uint32
    cmark_iter_next.argtypes = tuple([
        ctypes.POINTER(cmark_iter),  # iter
    ])

if hasattr(gfm, "cmark_iter_reset"):
    cmark_iter_reset = gfm.cmark_iter_reset
    cmark_iter_reset.restype = None
    cmark_iter_reset.argtypes = tuple([
        ctypes.POINTER(cmark_iter),  # iter
        ctypes.POINTER(cmark_node),  # current
        ctypes.c_uint32,  # event_type
    ])

if hasattr(gfm, "cmark_list_syntax_extensions"):
    cmark_list_syntax_extensions = gfm.cmark_list_syntax_extensions
    cmark_list_syntax_extensions.restype = ctypes.POINTER(cmark_llist)
    cmark_list_syntax_extensions.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
    ])

if hasattr(gfm, "cmark_llist_append"):
    cmark_llist_append = gfm.cmark_llist_append
    cmark_llist_append.restype = ctypes.POINTER(cmark_llist)
    cmark_llist_append.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
        ctypes.POINTER(cmark_llist),  # head
        ctypes.c_void_p,  # data
    ])

if hasattr(gfm, "cmark_llist_free"):
    cmark_llist_free = gfm.cmark_llist_free
    cmark_llist_free.restype = None
    cmark_llist_free.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
        ctypes.POINTER(cmark_llist),  # head
    ])

if hasattr(gfm, "cmark_llist_free_full"):
    gfm.cmark_llist_free_full.restype = None
    gfm.cmark_llist_free_full.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
        ctypes.POINTER(cmark_llist),  # head
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_mem), ctypes.c_void_p),  # free_func
    ])
    def cmark_llist_free_full(*argv):
        if not hasattr(cmark_llist_free_full, "callbacks"):
            cmark_llist_free_full.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_llist_free_full.argtypes):
            if callable(arg): # wrap functions                
                cmark_llist_free_full.callbacks.append(fn_arg(arg))
                args.append(cmark_llist_free_full.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_llist_free_full(*args)

if hasattr(gfm, "cmark_manage_extensions_special_characters"):
    cmark_manage_extensions_special_characters = gfm.cmark_manage_extensions_special_characters
    cmark_manage_extensions_special_characters.restype = None
    cmark_manage_extensions_special_characters.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
        ctypes.c_int32,  # add
    ])

if hasattr(gfm, "cmark_markdown_to_html"):
    cmark_markdown_to_html = gfm.cmark_markdown_to_html
    cmark_markdown_to_html.restype = ctypes.c_char_p
    cmark_markdown_to_html.argtypes = tuple([
        ctypes.c_char_p,  # text
        ctypes.c_uint64,  # len
        ctypes.c_int32,  # options
    ])

if hasattr(gfm, "cmark_node_append_child"):
    cmark_node_append_child = gfm.cmark_node_append_child
    cmark_node_append_child.restype = ctypes.c_int32
    cmark_node_append_child.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.POINTER(cmark_node),  # child
    ])

if hasattr(gfm, "cmark_node_can_contain_type"):
    cmark_node_can_contain_type = gfm.cmark_node_can_contain_type
    cmark_node_can_contain_type.restype = ctypes.c_bool
    cmark_node_can_contain_type.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_uint32,  # child_type
    ])

if hasattr(gfm, "cmark_node_check"):
    cmark_node_check = gfm.cmark_node_check
    cmark_node_check.restype = ctypes.c_int32
    cmark_node_check.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.POINTER(FILE),  # out
    ])

if hasattr(gfm, "cmark_node_first_child"):
    cmark_node_first_child = gfm.cmark_node_first_child
    cmark_node_first_child.restype = ctypes.POINTER(cmark_node)
    cmark_node_first_child.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_free"):
    cmark_node_free = gfm.cmark_node_free
    cmark_node_free.restype = None
    cmark_node_free.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_end_column"):
    cmark_node_get_end_column = gfm.cmark_node_get_end_column
    cmark_node_get_end_column.restype = ctypes.c_int32
    cmark_node_get_end_column.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_end_line"):
    cmark_node_get_end_line = gfm.cmark_node_get_end_line
    cmark_node_get_end_line.restype = ctypes.c_int32
    cmark_node_get_end_line.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_fence_info"):
    cmark_node_get_fence_info = gfm.cmark_node_get_fence_info
    cmark_node_get_fence_info.restype = ctypes.c_char_p
    cmark_node_get_fence_info.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_fenced"):
    cmark_node_get_fenced = gfm.cmark_node_get_fenced
    cmark_node_get_fenced.restype = ctypes.c_int32
    cmark_node_get_fenced.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.POINTER(ctypes.c_int32),  # length
        ctypes.POINTER(ctypes.c_int32),  # offset
        ctypes.c_char_p,  # character
    ])

if hasattr(gfm, "cmark_node_get_heading_level"):
    cmark_node_get_heading_level = gfm.cmark_node_get_heading_level
    cmark_node_get_heading_level.restype = ctypes.c_int32
    cmark_node_get_heading_level.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_list_delim"):
    cmark_node_get_list_delim = gfm.cmark_node_get_list_delim
    cmark_node_get_list_delim.restype = ctypes.c_uint32
    cmark_node_get_list_delim.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_list_start"):
    cmark_node_get_list_start = gfm.cmark_node_get_list_start
    cmark_node_get_list_start.restype = ctypes.c_int32
    cmark_node_get_list_start.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_list_tight"):
    cmark_node_get_list_tight = gfm.cmark_node_get_list_tight
    cmark_node_get_list_tight.restype = ctypes.c_int32
    cmark_node_get_list_tight.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_list_type"):
    cmark_node_get_list_type = gfm.cmark_node_get_list_type
    cmark_node_get_list_type.restype = ctypes.c_uint32
    cmark_node_get_list_type.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_literal"):
    cmark_node_get_literal = gfm.cmark_node_get_literal
    cmark_node_get_literal.restype = ctypes.c_char_p
    cmark_node_get_literal.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_on_enter"):
    cmark_node_get_on_enter = gfm.cmark_node_get_on_enter
    cmark_node_get_on_enter.restype = ctypes.c_char_p
    cmark_node_get_on_enter.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_on_exit"):
    cmark_node_get_on_exit = gfm.cmark_node_get_on_exit
    cmark_node_get_on_exit.restype = ctypes.c_char_p
    cmark_node_get_on_exit.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_start_column"):
    cmark_node_get_start_column = gfm.cmark_node_get_start_column
    cmark_node_get_start_column.restype = ctypes.c_int32
    cmark_node_get_start_column.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_start_line"):
    cmark_node_get_start_line = gfm.cmark_node_get_start_line
    cmark_node_get_start_line.restype = ctypes.c_int32
    cmark_node_get_start_line.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_string_content"):
    cmark_node_get_string_content = gfm.cmark_node_get_string_content
    cmark_node_get_string_content.restype = ctypes.c_char_p
    cmark_node_get_string_content.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_syntax_extension"):
    cmark_node_get_syntax_extension = gfm.cmark_node_get_syntax_extension
    cmark_node_get_syntax_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    cmark_node_get_syntax_extension.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_title"):
    cmark_node_get_title = gfm.cmark_node_get_title
    cmark_node_get_title.restype = ctypes.c_char_p
    cmark_node_get_title.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_type"):
    cmark_node_get_type = gfm.cmark_node_get_type
    cmark_node_get_type.restype = ctypes.c_uint32
    cmark_node_get_type.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_type_string"):
    cmark_node_get_type_string = gfm.cmark_node_get_type_string
    cmark_node_get_type_string.restype = ctypes.c_char_p
    cmark_node_get_type_string.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_url"):
    cmark_node_get_url = gfm.cmark_node_get_url
    cmark_node_get_url.restype = ctypes.c_char_p
    cmark_node_get_url.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_get_user_data"):
    cmark_node_get_user_data = gfm.cmark_node_get_user_data
    cmark_node_get_user_data.restype = ctypes.c_void_p
    cmark_node_get_user_data.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_insert_after"):
    cmark_node_insert_after = gfm.cmark_node_insert_after
    cmark_node_insert_after.restype = ctypes.c_int32
    cmark_node_insert_after.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.POINTER(cmark_node),  # sibling
    ])

if hasattr(gfm, "cmark_node_insert_before"):
    cmark_node_insert_before = gfm.cmark_node_insert_before
    cmark_node_insert_before.restype = ctypes.c_int32
    cmark_node_insert_before.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.POINTER(cmark_node),  # sibling
    ])

if hasattr(gfm, "cmark_node_last_child"):
    cmark_node_last_child = gfm.cmark_node_last_child
    cmark_node_last_child.restype = ctypes.POINTER(cmark_node)
    cmark_node_last_child.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_new"):
    cmark_node_new = gfm.cmark_node_new
    cmark_node_new.restype = ctypes.POINTER(cmark_node)
    cmark_node_new.argtypes = tuple([
        ctypes.c_uint32,  # type
    ])

if hasattr(gfm, "cmark_node_new_with_ext"):
    cmark_node_new_with_ext = gfm.cmark_node_new_with_ext
    cmark_node_new_with_ext.restype = ctypes.POINTER(cmark_node)
    cmark_node_new_with_ext.argtypes = tuple([
        ctypes.c_uint32,  # type
        ctypes.POINTER(cmark_syntax_extension),  # extension
    ])

if hasattr(gfm, "cmark_node_new_with_mem"):
    cmark_node_new_with_mem = gfm.cmark_node_new_with_mem
    cmark_node_new_with_mem.restype = ctypes.POINTER(cmark_node)
    cmark_node_new_with_mem.argtypes = tuple([
        ctypes.c_uint32,  # type
        ctypes.POINTER(cmark_mem),  # mem
    ])

if hasattr(gfm, "cmark_node_new_with_mem_and_ext"):
    cmark_node_new_with_mem_and_ext = gfm.cmark_node_new_with_mem_and_ext
    cmark_node_new_with_mem_and_ext.restype = ctypes.POINTER(cmark_node)
    cmark_node_new_with_mem_and_ext.argtypes = tuple([
        ctypes.c_uint32,  # type
        ctypes.POINTER(cmark_mem),  # mem
        ctypes.POINTER(cmark_syntax_extension),  # extension
    ])

if hasattr(gfm, "cmark_node_next"):
    cmark_node_next = gfm.cmark_node_next
    cmark_node_next.restype = ctypes.POINTER(cmark_node)
    cmark_node_next.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_own"):
    cmark_node_own = gfm.cmark_node_own
    cmark_node_own.restype = None
    cmark_node_own.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
    ])

if hasattr(gfm, "cmark_node_parent"):
    cmark_node_parent = gfm.cmark_node_parent
    cmark_node_parent.restype = ctypes.POINTER(cmark_node)
    cmark_node_parent.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_prepend_child"):
    cmark_node_prepend_child = gfm.cmark_node_prepend_child
    cmark_node_prepend_child.restype = ctypes.c_int32
    cmark_node_prepend_child.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.POINTER(cmark_node),  # child
    ])

if hasattr(gfm, "cmark_node_previous"):
    cmark_node_previous = gfm.cmark_node_previous
    cmark_node_previous.restype = ctypes.POINTER(cmark_node)
    cmark_node_previous.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_replace"):
    cmark_node_replace = gfm.cmark_node_replace
    cmark_node_replace.restype = ctypes.c_int32
    cmark_node_replace.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # oldnode
        ctypes.POINTER(cmark_node),  # newnode
    ])

if hasattr(gfm, "cmark_node_set_fence_info"):
    cmark_node_set_fence_info = gfm.cmark_node_set_fence_info
    cmark_node_set_fence_info.restype = ctypes.c_int32
    cmark_node_set_fence_info.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_char_p,  # info
    ])

if hasattr(gfm, "cmark_node_set_fenced"):
    cmark_node_set_fenced = gfm.cmark_node_set_fenced
    cmark_node_set_fenced.restype = ctypes.c_int32
    cmark_node_set_fenced.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_int32,  # fenced
        ctypes.c_int32,  # length
        ctypes.c_int32,  # offset
        ctypes.c_int8,  # character
    ])

if hasattr(gfm, "cmark_node_set_heading_level"):
    cmark_node_set_heading_level = gfm.cmark_node_set_heading_level
    cmark_node_set_heading_level.restype = ctypes.c_int32
    cmark_node_set_heading_level.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_int32,  # level
    ])

if hasattr(gfm, "cmark_node_set_list_delim"):
    cmark_node_set_list_delim = gfm.cmark_node_set_list_delim
    cmark_node_set_list_delim.restype = ctypes.c_int32
    cmark_node_set_list_delim.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_uint32,  # delim
    ])

if hasattr(gfm, "cmark_node_set_list_start"):
    cmark_node_set_list_start = gfm.cmark_node_set_list_start
    cmark_node_set_list_start.restype = ctypes.c_int32
    cmark_node_set_list_start.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_int32,  # start
    ])

if hasattr(gfm, "cmark_node_set_list_tight"):
    cmark_node_set_list_tight = gfm.cmark_node_set_list_tight
    cmark_node_set_list_tight.restype = ctypes.c_int32
    cmark_node_set_list_tight.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_int32,  # tight
    ])

if hasattr(gfm, "cmark_node_set_list_type"):
    cmark_node_set_list_type = gfm.cmark_node_set_list_type
    cmark_node_set_list_type.restype = ctypes.c_int32
    cmark_node_set_list_type.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_uint32,  # type
    ])

if hasattr(gfm, "cmark_node_set_literal"):
    cmark_node_set_literal = gfm.cmark_node_set_literal
    cmark_node_set_literal.restype = ctypes.c_int32
    cmark_node_set_literal.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_char_p,  # content
    ])

if hasattr(gfm, "cmark_node_set_on_enter"):
    cmark_node_set_on_enter = gfm.cmark_node_set_on_enter
    cmark_node_set_on_enter.restype = ctypes.c_int32
    cmark_node_set_on_enter.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_char_p,  # on_enter
    ])

if hasattr(gfm, "cmark_node_set_on_exit"):
    cmark_node_set_on_exit = gfm.cmark_node_set_on_exit
    cmark_node_set_on_exit.restype = ctypes.c_int32
    cmark_node_set_on_exit.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_char_p,  # on_exit
    ])

if hasattr(gfm, "cmark_node_set_string_content"):
    cmark_node_set_string_content = gfm.cmark_node_set_string_content
    cmark_node_set_string_content.restype = ctypes.c_int32
    cmark_node_set_string_content.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_char_p,  # content
    ])

if hasattr(gfm, "cmark_node_set_syntax_extension"):
    cmark_node_set_syntax_extension = gfm.cmark_node_set_syntax_extension
    cmark_node_set_syntax_extension.restype = ctypes.c_int32
    cmark_node_set_syntax_extension.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.POINTER(cmark_syntax_extension),  # extension
    ])

if hasattr(gfm, "cmark_node_set_title"):
    cmark_node_set_title = gfm.cmark_node_set_title
    cmark_node_set_title.restype = ctypes.c_int32
    cmark_node_set_title.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_char_p,  # title
    ])

if hasattr(gfm, "cmark_node_set_type"):
    cmark_node_set_type = gfm.cmark_node_set_type
    cmark_node_set_type.restype = ctypes.c_int32
    cmark_node_set_type.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_uint32,  # type
    ])

if hasattr(gfm, "cmark_node_set_url"):
    cmark_node_set_url = gfm.cmark_node_set_url
    cmark_node_set_url.restype = ctypes.c_int32
    cmark_node_set_url.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_char_p,  # url
    ])

if hasattr(gfm, "cmark_node_set_user_data"):
    cmark_node_set_user_data = gfm.cmark_node_set_user_data
    cmark_node_set_user_data.restype = ctypes.c_int32
    cmark_node_set_user_data.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_void_p,  # user_data
    ])

if hasattr(gfm, "cmark_node_set_user_data_free_func"):
    gfm.cmark_node_set_user_data_free_func.restype = ctypes.c_int32
    gfm.cmark_node_set_user_data_free_func.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_mem), ctypes.c_void_p),  # free_func
    ])
    def cmark_node_set_user_data_free_func(*argv):
        if not hasattr(cmark_node_set_user_data_free_func, "callbacks"):
            cmark_node_set_user_data_free_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_node_set_user_data_free_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_node_set_user_data_free_func.callbacks.append(fn_arg(arg))
                args.append(cmark_node_set_user_data_free_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_node_set_user_data_free_func(*args)

if hasattr(gfm, "cmark_node_unlink"):
    cmark_node_unlink = gfm.cmark_node_unlink
    cmark_node_unlink.restype = None
    cmark_node_unlink.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(gfm, "cmark_node_unput"):
    cmark_node_unput = gfm.cmark_node_unput
    cmark_node_unput.restype = None
    cmark_node_unput.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_int32,  # n
    ])

if hasattr(gfm, "cmark_parse_document"):
    cmark_parse_document = gfm.cmark_parse_document
    cmark_parse_document.restype = ctypes.POINTER(cmark_node)
    cmark_parse_document.argtypes = tuple([
        ctypes.c_char_p,  # buffer
        ctypes.c_uint64,  # len
        ctypes.c_int32,  # options
    ])

if hasattr(gfm, "cmark_parse_file"):
    cmark_parse_file = gfm.cmark_parse_file
    cmark_parse_file.restype = ctypes.POINTER(cmark_node)
    cmark_parse_file.argtypes = tuple([
        ctypes.POINTER(FILE),  # f
        ctypes.c_int32,  # options
    ])

if hasattr(gfm, "cmark_parse_inlines"):
    cmark_parse_inlines = gfm.cmark_parse_inlines
    cmark_parse_inlines.restype = None
    cmark_parse_inlines.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
        ctypes.POINTER(cmark_node),  # parent
        ctypes.POINTER(cmark_map),  # refmap
        ctypes.c_int32,  # options
    ])

if hasattr(gfm, "cmark_parser_add_child"):
    cmark_parser_add_child = gfm.cmark_parser_add_child
    cmark_parser_add_child.restype = ctypes.POINTER(cmark_node)
    cmark_parser_add_child.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
        ctypes.POINTER(cmark_node),  # parent
        ctypes.c_uint32,  # block_type
        ctypes.c_int32,  # start_column
    ])

if hasattr(gfm, "cmark_parser_advance_offset"):
    cmark_parser_advance_offset = gfm.cmark_parser_advance_offset
    cmark_parser_advance_offset.restype = None
    cmark_parser_advance_offset.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
        ctypes.c_char_p,  # input
        ctypes.c_int32,  # count
        ctypes.c_int32,  # columns
    ])

if hasattr(gfm, "cmark_parser_attach_syntax_extension"):
    cmark_parser_attach_syntax_extension = gfm.cmark_parser_attach_syntax_extension
    cmark_parser_attach_syntax_extension.restype = ctypes.c_int32
    cmark_parser_attach_syntax_extension.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
        ctypes.POINTER(cmark_syntax_extension),  # extension
    ])

if hasattr(gfm, "cmark_parser_feed"):
    cmark_parser_feed = gfm.cmark_parser_feed
    cmark_parser_feed.restype = None
    cmark_parser_feed.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
        ctypes.c_char_p,  # buffer
        ctypes.c_uint64,  # len
    ])

if hasattr(gfm, "cmark_parser_feed_reentrant"):
    cmark_parser_feed_reentrant = gfm.cmark_parser_feed_reentrant
    cmark_parser_feed_reentrant.restype = None
    cmark_parser_feed_reentrant.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
        ctypes.c_char_p,  # buffer
        ctypes.c_uint64,  # len
    ])

if hasattr(gfm, "cmark_parser_finish"):
    cmark_parser_finish = gfm.cmark_parser_finish
    cmark_parser_finish.restype = ctypes.POINTER(cmark_node)
    cmark_parser_finish.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(gfm, "cmark_parser_free"):
    cmark_parser_free = gfm.cmark_parser_free
    cmark_parser_free.restype = None
    cmark_parser_free.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(gfm, "cmark_parser_get_column"):
    cmark_parser_get_column = gfm.cmark_parser_get_column
    cmark_parser_get_column.restype = ctypes.c_int32
    cmark_parser_get_column.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(gfm, "cmark_parser_get_first_nonspace"):
    cmark_parser_get_first_nonspace = gfm.cmark_parser_get_first_nonspace
    cmark_parser_get_first_nonspace.restype = ctypes.c_int32
    cmark_parser_get_first_nonspace.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(gfm, "cmark_parser_get_first_nonspace_column"):
    cmark_parser_get_first_nonspace_column = gfm.cmark_parser_get_first_nonspace_column
    cmark_parser_get_first_nonspace_column.restype = ctypes.c_int32
    cmark_parser_get_first_nonspace_column.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(gfm, "cmark_parser_get_indent"):
    cmark_parser_get_indent = gfm.cmark_parser_get_indent
    cmark_parser_get_indent.restype = ctypes.c_int32
    cmark_parser_get_indent.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(gfm, "cmark_parser_get_last_line_length"):
    cmark_parser_get_last_line_length = gfm.cmark_parser_get_last_line_length
    cmark_parser_get_last_line_length.restype = ctypes.c_int32
    cmark_parser_get_last_line_length.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(gfm, "cmark_parser_get_line_number"):
    cmark_parser_get_line_number = gfm.cmark_parser_get_line_number
    cmark_parser_get_line_number.restype = ctypes.c_int32
    cmark_parser_get_line_number.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(gfm, "cmark_parser_get_offset"):
    cmark_parser_get_offset = gfm.cmark_parser_get_offset
    cmark_parser_get_offset.restype = ctypes.c_int32
    cmark_parser_get_offset.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(gfm, "cmark_parser_get_syntax_extensions"):
    cmark_parser_get_syntax_extensions = gfm.cmark_parser_get_syntax_extensions
    cmark_parser_get_syntax_extensions.restype = ctypes.POINTER(cmark_llist)
    cmark_parser_get_syntax_extensions.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(gfm, "cmark_parser_has_partially_consumed_tab"):
    cmark_parser_has_partially_consumed_tab = gfm.cmark_parser_has_partially_consumed_tab
    cmark_parser_has_partially_consumed_tab.restype = ctypes.c_int32
    cmark_parser_has_partially_consumed_tab.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(gfm, "cmark_parser_is_blank"):
    cmark_parser_is_blank = gfm.cmark_parser_is_blank
    cmark_parser_is_blank.restype = ctypes.c_int32
    cmark_parser_is_blank.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(gfm, "cmark_parser_new"):
    cmark_parser_new = gfm.cmark_parser_new
    cmark_parser_new.restype = ctypes.POINTER(cmark_parser)
    cmark_parser_new.argtypes = tuple([
        ctypes.c_int32,  # options
    ])

if hasattr(gfm, "cmark_parser_new_with_mem"):
    cmark_parser_new_with_mem = gfm.cmark_parser_new_with_mem
    cmark_parser_new_with_mem.restype = ctypes.POINTER(cmark_parser)
    cmark_parser_new_with_mem.argtypes = tuple([
        ctypes.c_int32,  # options
        ctypes.POINTER(cmark_mem),  # mem
    ])

if hasattr(gfm, "cmark_parser_set_backslash_ispunct_func"):
    gfm.cmark_parser_set_backslash_ispunct_func.restype = None
    gfm.cmark_parser_set_backslash_ispunct_func.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.c_int8),  # func
    ])
    def cmark_parser_set_backslash_ispunct_func(*argv):
        if not hasattr(cmark_parser_set_backslash_ispunct_func, "callbacks"):
            cmark_parser_set_backslash_ispunct_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_parser_set_backslash_ispunct_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_parser_set_backslash_ispunct_func.callbacks.append(fn_arg(arg))
                args.append(cmark_parser_set_backslash_ispunct_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_parser_set_backslash_ispunct_func(*args)

if hasattr(gfm, "cmark_plugin_register_syntax_extension"):
    cmark_plugin_register_syntax_extension = gfm.cmark_plugin_register_syntax_extension
    cmark_plugin_register_syntax_extension.restype = ctypes.c_int32
    cmark_plugin_register_syntax_extension.argtypes = tuple([
        ctypes.POINTER(cmark_plugin),  # plugin
        ctypes.POINTER(cmark_syntax_extension),  # extension
    ])

if hasattr(gfm, "cmark_register_plugin"):
    gfm.cmark_register_plugin.restype = None
    gfm.cmark_register_plugin.argtypes = tuple([
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_plugin)),  # reg_fn
    ])
    def cmark_register_plugin(*argv):
        if not hasattr(cmark_register_plugin, "callbacks"):
            cmark_register_plugin.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_register_plugin.argtypes):
            if callable(arg): # wrap functions                
                cmark_register_plugin.callbacks.append(fn_arg(arg))
                args.append(cmark_register_plugin.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_register_plugin(*args)

if hasattr(gfm, "cmark_release_plugins"):
    cmark_release_plugins = gfm.cmark_release_plugins
    cmark_release_plugins.restype = None
    cmark_release_plugins.argtypes = tuple([

    ])

if hasattr(gfm, "cmark_render_commonmark"):
    cmark_render_commonmark = gfm.cmark_render_commonmark
    cmark_render_commonmark.restype = ctypes.c_char_p
    cmark_render_commonmark.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.c_int32,  # width
    ])

if hasattr(gfm, "cmark_render_commonmark_with_mem"):
    cmark_render_commonmark_with_mem = gfm.cmark_render_commonmark_with_mem
    cmark_render_commonmark_with_mem.restype = ctypes.c_char_p
    cmark_render_commonmark_with_mem.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.c_int32,  # width
        ctypes.POINTER(cmark_mem),  # mem
    ])

if hasattr(gfm, "cmark_render_html"):
    cmark_render_html = gfm.cmark_render_html
    cmark_render_html.restype = ctypes.c_char_p
    cmark_render_html.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.POINTER(cmark_llist),  # extensions
    ])

if hasattr(gfm, "cmark_render_html_with_mem"):
    cmark_render_html_with_mem = gfm.cmark_render_html_with_mem
    cmark_render_html_with_mem.restype = ctypes.c_char_p
    cmark_render_html_with_mem.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.POINTER(cmark_llist),  # extensions
        ctypes.POINTER(cmark_mem),  # mem
    ])

if hasattr(gfm, "cmark_render_latex"):
    cmark_render_latex = gfm.cmark_render_latex
    cmark_render_latex.restype = ctypes.c_char_p
    cmark_render_latex.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.c_int32,  # width
    ])

if hasattr(gfm, "cmark_render_latex_with_mem"):
    cmark_render_latex_with_mem = gfm.cmark_render_latex_with_mem
    cmark_render_latex_with_mem.restype = ctypes.c_char_p
    cmark_render_latex_with_mem.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.c_int32,  # width
        ctypes.POINTER(cmark_mem),  # mem
    ])

if hasattr(gfm, "cmark_render_xml"):
    cmark_render_xml = gfm.cmark_render_xml
    cmark_render_xml.restype = ctypes.c_char_p
    cmark_render_xml.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
    ])

if hasattr(gfm, "cmark_render_xml_with_mem"):
    cmark_render_xml_with_mem = gfm.cmark_render_xml_with_mem
    cmark_render_xml_with_mem.restype = ctypes.c_char_p
    cmark_render_xml_with_mem.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.POINTER(cmark_mem),  # mem
    ])

if hasattr(gfm, "cmark_strbuf_clear"):
    cmark_strbuf_clear = gfm.cmark_strbuf_clear
    cmark_strbuf_clear.restype = None
    cmark_strbuf_clear.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
    ])

if hasattr(gfm, "cmark_strbuf_cmp"):
    cmark_strbuf_cmp = gfm.cmark_strbuf_cmp
    cmark_strbuf_cmp.restype = ctypes.c_int32
    cmark_strbuf_cmp.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # a
        ctypes.POINTER(cmark_strbuf),  # b
    ])

if hasattr(gfm, "cmark_strbuf_copy_cstr"):
    cmark_strbuf_copy_cstr = gfm.cmark_strbuf_copy_cstr
    cmark_strbuf_copy_cstr.restype = None
    cmark_strbuf_copy_cstr.argtypes = tuple([
        ctypes.c_char_p,  # data
        ctypes.c_int32,  # datasize
        ctypes.POINTER(cmark_strbuf),  # buf
    ])

if hasattr(gfm, "cmark_strbuf_detach"):
    cmark_strbuf_detach = gfm.cmark_strbuf_detach
    cmark_strbuf_detach.restype = ctypes.POINTER(ctypes.c_char)
    cmark_strbuf_detach.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
    ])

if hasattr(gfm, "cmark_strbuf_drop"):
    cmark_strbuf_drop = gfm.cmark_strbuf_drop
    cmark_strbuf_drop.restype = None
    cmark_strbuf_drop.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.c_int32,  # n
    ])

if hasattr(gfm, "cmark_strbuf_free"):
    cmark_strbuf_free = gfm.cmark_strbuf_free
    cmark_strbuf_free.restype = None
    cmark_strbuf_free.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
    ])

if hasattr(gfm, "cmark_strbuf_grow"):
    cmark_strbuf_grow = gfm.cmark_strbuf_grow
    cmark_strbuf_grow.restype = None
    cmark_strbuf_grow.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.c_int32,  # target_size
    ])

if hasattr(gfm, "cmark_strbuf_init"):
    cmark_strbuf_init = gfm.cmark_strbuf_init
    cmark_strbuf_init.restype = None
    cmark_strbuf_init.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.c_int32,  # initial_size
    ])

if hasattr(gfm, "cmark_strbuf_len"):
    cmark_strbuf_len = gfm.cmark_strbuf_len
    cmark_strbuf_len.restype = ctypes.c_int32
    cmark_strbuf_len.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
    ])

if hasattr(gfm, "cmark_strbuf_normalize_whitespace"):
    cmark_strbuf_normalize_whitespace = gfm.cmark_strbuf_normalize_whitespace
    cmark_strbuf_normalize_whitespace.restype = None
    cmark_strbuf_normalize_whitespace.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # s
    ])

if hasattr(gfm, "cmark_strbuf_put"):
    cmark_strbuf_put = gfm.cmark_strbuf_put
    cmark_strbuf_put.restype = None
    cmark_strbuf_put.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.POINTER(ctypes.c_char),  # data
        ctypes.c_int32,  # len
    ])

if hasattr(gfm, "cmark_strbuf_putc"):
    cmark_strbuf_putc = gfm.cmark_strbuf_putc
    cmark_strbuf_putc.restype = None
    cmark_strbuf_putc.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.c_int32,  # c
    ])

if hasattr(gfm, "cmark_strbuf_puts"):
    cmark_strbuf_puts = gfm.cmark_strbuf_puts
    cmark_strbuf_puts.restype = None
    cmark_strbuf_puts.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.c_char_p,  # string
    ])

if hasattr(gfm, "cmark_strbuf_rtrim"):
    cmark_strbuf_rtrim = gfm.cmark_strbuf_rtrim
    cmark_strbuf_rtrim.restype = None
    cmark_strbuf_rtrim.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
    ])

if hasattr(gfm, "cmark_strbuf_set"):
    cmark_strbuf_set = gfm.cmark_strbuf_set
    cmark_strbuf_set.restype = None
    cmark_strbuf_set.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.POINTER(ctypes.c_char),  # data
        ctypes.c_int32,  # len
    ])

if hasattr(gfm, "cmark_strbuf_sets"):
    cmark_strbuf_sets = gfm.cmark_strbuf_sets
    cmark_strbuf_sets.restype = None
    cmark_strbuf_sets.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.c_char_p,  # string
    ])

if hasattr(gfm, "cmark_strbuf_strchr"):
    cmark_strbuf_strchr = gfm.cmark_strbuf_strchr
    cmark_strbuf_strchr.restype = ctypes.c_int32
    cmark_strbuf_strchr.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.c_int32,  # c
        ctypes.c_int32,  # pos
    ])

if hasattr(gfm, "cmark_strbuf_strrchr"):
    cmark_strbuf_strrchr = gfm.cmark_strbuf_strrchr
    cmark_strbuf_strrchr.restype = ctypes.c_int32
    cmark_strbuf_strrchr.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.c_int32,  # c
        ctypes.c_int32,  # pos
    ])

if hasattr(gfm, "cmark_strbuf_swap"):
    cmark_strbuf_swap = gfm.cmark_strbuf_swap
    cmark_strbuf_swap.restype = None
    cmark_strbuf_swap.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf_a
        ctypes.POINTER(cmark_strbuf),  # buf_b
    ])

if hasattr(gfm, "cmark_strbuf_trim"):
    cmark_strbuf_trim = gfm.cmark_strbuf_trim
    cmark_strbuf_trim.restype = None
    cmark_strbuf_trim.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
    ])

if hasattr(gfm, "cmark_strbuf_truncate"):
    cmark_strbuf_truncate = gfm.cmark_strbuf_truncate
    cmark_strbuf_truncate.restype = None
    cmark_strbuf_truncate.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.c_int32,  # len
    ])

if hasattr(gfm, "cmark_strbuf_unescape"):
    cmark_strbuf_unescape = gfm.cmark_strbuf_unescape
    cmark_strbuf_unescape.restype = None
    cmark_strbuf_unescape.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
    ])

if hasattr(gfm, "cmark_syntax_extension_add_node"):
    cmark_syntax_extension_add_node = gfm.cmark_syntax_extension_add_node
    cmark_syntax_extension_add_node.restype = ctypes.c_uint32
    cmark_syntax_extension_add_node.argtypes = tuple([
        ctypes.c_int32,  # is_inline
    ])

if hasattr(gfm, "cmark_syntax_extension_free"):
    cmark_syntax_extension_free = gfm.cmark_syntax_extension_free
    cmark_syntax_extension_free.restype = None
    cmark_syntax_extension_free.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
        ctypes.POINTER(cmark_syntax_extension),  # extension
    ])

if hasattr(gfm, "cmark_syntax_extension_get_private"):
    cmark_syntax_extension_get_private = gfm.cmark_syntax_extension_get_private
    cmark_syntax_extension_get_private.restype = ctypes.c_void_p
    cmark_syntax_extension_get_private.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
    ])

if hasattr(gfm, "cmark_syntax_extension_new"):
    cmark_syntax_extension_new = gfm.cmark_syntax_extension_new
    cmark_syntax_extension_new.restype = ctypes.POINTER(cmark_syntax_extension)
    cmark_syntax_extension_new.argtypes = tuple([
        ctypes.c_char_p,  # name
    ])

if hasattr(gfm, "cmark_syntax_extension_set_can_contain_func"):
    gfm.cmark_syntax_extension_set_can_contain_func.restype = None
    gfm.cmark_syntax_extension_set_can_contain_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node), ctypes.c_uint32),  # func
    ])
    def cmark_syntax_extension_set_can_contain_func(*argv):
        if not hasattr(cmark_syntax_extension_set_can_contain_func, "callbacks"):
            cmark_syntax_extension_set_can_contain_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_can_contain_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_can_contain_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_can_contain_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_can_contain_func(*args)

if hasattr(gfm, "cmark_syntax_extension_set_commonmark_escape_func"):
    gfm.cmark_syntax_extension_set_commonmark_escape_func.restype = None
    gfm.cmark_syntax_extension_set_commonmark_escape_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node), ctypes.c_int32),  # func
    ])
    def cmark_syntax_extension_set_commonmark_escape_func(*argv):
        if not hasattr(cmark_syntax_extension_set_commonmark_escape_func, "callbacks"):
            cmark_syntax_extension_set_commonmark_escape_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_commonmark_escape_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_commonmark_escape_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_commonmark_escape_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_commonmark_escape_func(*args)

if hasattr(gfm, "cmark_syntax_extension_set_commonmark_render_func"):
    gfm.cmark_syntax_extension_set_commonmark_render_func.restype = None
    gfm.cmark_syntax_extension_set_commonmark_render_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32),  # func
    ])
    def cmark_syntax_extension_set_commonmark_render_func(*argv):
        if not hasattr(cmark_syntax_extension_set_commonmark_render_func, "callbacks"):
            cmark_syntax_extension_set_commonmark_render_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_commonmark_render_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_commonmark_render_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_commonmark_render_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_commonmark_render_func(*args)

if hasattr(gfm, "cmark_syntax_extension_set_contains_inlines_func"):
    gfm.cmark_syntax_extension_set_contains_inlines_func.restype = None
    gfm.cmark_syntax_extension_set_contains_inlines_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node)),  # func
    ])
    def cmark_syntax_extension_set_contains_inlines_func(*argv):
        if not hasattr(cmark_syntax_extension_set_contains_inlines_func, "callbacks"):
            cmark_syntax_extension_set_contains_inlines_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_contains_inlines_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_contains_inlines_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_contains_inlines_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_contains_inlines_func(*args)

if hasattr(gfm, "cmark_syntax_extension_set_emphasis"):
    cmark_syntax_extension_set_emphasis = gfm.cmark_syntax_extension_set_emphasis
    cmark_syntax_extension_set_emphasis.restype = None
    cmark_syntax_extension_set_emphasis.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.c_int32,  # emphasis
    ])

if hasattr(gfm, "cmark_syntax_extension_set_get_type_string_func"):
    gfm.cmark_syntax_extension_set_get_type_string_func.restype = None
    gfm.cmark_syntax_extension_set_get_type_string_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_char_p, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node)),  # func
    ])
    def cmark_syntax_extension_set_get_type_string_func(*argv):
        if not hasattr(cmark_syntax_extension_set_get_type_string_func, "callbacks"):
            cmark_syntax_extension_set_get_type_string_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_get_type_string_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_get_type_string_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_get_type_string_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_get_type_string_func(*args)

if hasattr(gfm, "cmark_syntax_extension_set_html_filter_func"):
    gfm.cmark_syntax_extension_set_html_filter_func.restype = None
    gfm.cmark_syntax_extension_set_html_filter_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(ctypes.c_char), ctypes.c_uint64),  # func
    ])
    def cmark_syntax_extension_set_html_filter_func(*argv):
        if not hasattr(cmark_syntax_extension_set_html_filter_func, "callbacks"):
            cmark_syntax_extension_set_html_filter_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_html_filter_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_html_filter_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_html_filter_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_html_filter_func(*args)

if hasattr(gfm, "cmark_syntax_extension_set_html_render_func"):
    gfm.cmark_syntax_extension_set_html_render_func.restype = None
    gfm.cmark_syntax_extension_set_html_render_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_html_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32),  # func
    ])
    def cmark_syntax_extension_set_html_render_func(*argv):
        if not hasattr(cmark_syntax_extension_set_html_render_func, "callbacks"):
            cmark_syntax_extension_set_html_render_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_html_render_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_html_render_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_html_render_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_html_render_func(*args)

if hasattr(gfm, "cmark_syntax_extension_set_inline_from_delim_func"):
    gfm.cmark_syntax_extension_set_inline_from_delim_func.restype = None
    gfm.cmark_syntax_extension_set_inline_from_delim_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_parser), ctypes.POINTER(cmark_inline_parser), ctypes.POINTER(delimiter), ctypes.POINTER(delimiter)),  # func
    ])
    def cmark_syntax_extension_set_inline_from_delim_func(*argv):
        if not hasattr(cmark_syntax_extension_set_inline_from_delim_func, "callbacks"):
            cmark_syntax_extension_set_inline_from_delim_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_inline_from_delim_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_inline_from_delim_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_inline_from_delim_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_inline_from_delim_func(*args)

if hasattr(gfm, "cmark_syntax_extension_set_latex_render_func"):
    gfm.cmark_syntax_extension_set_latex_render_func.restype = None
    gfm.cmark_syntax_extension_set_latex_render_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32),  # func
    ])
    def cmark_syntax_extension_set_latex_render_func(*argv):
        if not hasattr(cmark_syntax_extension_set_latex_render_func, "callbacks"):
            cmark_syntax_extension_set_latex_render_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_latex_render_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_latex_render_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_latex_render_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_latex_render_func(*args)

if hasattr(gfm, "cmark_syntax_extension_set_man_render_func"):
    gfm.cmark_syntax_extension_set_man_render_func.restype = None
    gfm.cmark_syntax_extension_set_man_render_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32),  # func
    ])
    def cmark_syntax_extension_set_man_render_func(*argv):
        if not hasattr(cmark_syntax_extension_set_man_render_func, "callbacks"):
            cmark_syntax_extension_set_man_render_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_man_render_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_man_render_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_man_render_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_man_render_func(*args)

if hasattr(gfm, "cmark_syntax_extension_set_match_block_func"):
    gfm.cmark_syntax_extension_set_match_block_func.restype = None
    gfm.cmark_syntax_extension_set_match_block_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_parser), ctypes.POINTER(ctypes.c_char), ctypes.c_int32, ctypes.POINTER(cmark_node)),  # func
    ])
    def cmark_syntax_extension_set_match_block_func(*argv):
        if not hasattr(cmark_syntax_extension_set_match_block_func, "callbacks"):
            cmark_syntax_extension_set_match_block_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_match_block_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_match_block_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_match_block_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_match_block_func(*args)

if hasattr(gfm, "cmark_syntax_extension_set_match_inline_func"):
    gfm.cmark_syntax_extension_set_match_inline_func.restype = None
    gfm.cmark_syntax_extension_set_match_inline_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_parser), ctypes.POINTER(cmark_node), ctypes.c_char, ctypes.POINTER(cmark_inline_parser)),  # func
    ])
    def cmark_syntax_extension_set_match_inline_func(*argv):
        if not hasattr(cmark_syntax_extension_set_match_inline_func, "callbacks"):
            cmark_syntax_extension_set_match_inline_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_match_inline_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_match_inline_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_match_inline_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_match_inline_func(*args)

if hasattr(gfm, "cmark_syntax_extension_set_opaque_alloc_func"):
    gfm.cmark_syntax_extension_set_opaque_alloc_func.restype = None
    gfm.cmark_syntax_extension_set_opaque_alloc_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_mem), ctypes.POINTER(cmark_node)),  # func
    ])
    def cmark_syntax_extension_set_opaque_alloc_func(*argv):
        if not hasattr(cmark_syntax_extension_set_opaque_alloc_func, "callbacks"):
            cmark_syntax_extension_set_opaque_alloc_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_opaque_alloc_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_opaque_alloc_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_opaque_alloc_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_opaque_alloc_func(*args)

if hasattr(gfm, "cmark_syntax_extension_set_opaque_free_func"):
    gfm.cmark_syntax_extension_set_opaque_free_func.restype = None
    gfm.cmark_syntax_extension_set_opaque_free_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_mem), ctypes.POINTER(cmark_node)),  # func
    ])
    def cmark_syntax_extension_set_opaque_free_func(*argv):
        if not hasattr(cmark_syntax_extension_set_opaque_free_func, "callbacks"):
            cmark_syntax_extension_set_opaque_free_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_opaque_free_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_opaque_free_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_opaque_free_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_opaque_free_func(*args)

if hasattr(gfm, "cmark_syntax_extension_set_open_block_func"):
    gfm.cmark_syntax_extension_set_open_block_func.restype = None
    gfm.cmark_syntax_extension_set_open_block_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.POINTER(cmark_syntax_extension), ctypes.c_int32, ctypes.POINTER(cmark_parser), ctypes.POINTER(cmark_node), ctypes.POINTER(ctypes.c_char), ctypes.c_int32),  # func
    ])
    def cmark_syntax_extension_set_open_block_func(*argv):
        if not hasattr(cmark_syntax_extension_set_open_block_func, "callbacks"):
            cmark_syntax_extension_set_open_block_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_open_block_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_open_block_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_open_block_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_open_block_func(*args)

if hasattr(gfm, "cmark_syntax_extension_set_plaintext_render_func"):
    gfm.cmark_syntax_extension_set_plaintext_render_func.restype = None
    gfm.cmark_syntax_extension_set_plaintext_render_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32),  # func
    ])
    def cmark_syntax_extension_set_plaintext_render_func(*argv):
        if not hasattr(cmark_syntax_extension_set_plaintext_render_func, "callbacks"):
            cmark_syntax_extension_set_plaintext_render_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_plaintext_render_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_plaintext_render_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_plaintext_render_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_plaintext_render_func(*args)

if hasattr(gfm, "cmark_syntax_extension_set_postprocess_func"):
    gfm.cmark_syntax_extension_set_postprocess_func.restype = None
    gfm.cmark_syntax_extension_set_postprocess_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_parser), ctypes.POINTER(cmark_node)),  # func
    ])
    def cmark_syntax_extension_set_postprocess_func(*argv):
        if not hasattr(cmark_syntax_extension_set_postprocess_func, "callbacks"):
            cmark_syntax_extension_set_postprocess_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_postprocess_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_postprocess_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_postprocess_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_postprocess_func(*args)

if hasattr(gfm, "cmark_syntax_extension_set_private"):
    gfm.cmark_syntax_extension_set_private.restype = None
    gfm.cmark_syntax_extension_set_private.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.c_void_p,  # priv
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_mem), ctypes.c_void_p),  # free_func
    ])
    def cmark_syntax_extension_set_private(*argv):
        if not hasattr(cmark_syntax_extension_set_private, "callbacks"):
            cmark_syntax_extension_set_private.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_private.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_private.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_private.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_private(*args)

if hasattr(gfm, "cmark_syntax_extension_set_special_inline_chars"):
    cmark_syntax_extension_set_special_inline_chars = gfm.cmark_syntax_extension_set_special_inline_chars
    cmark_syntax_extension_set_special_inline_chars.restype = None
    cmark_syntax_extension_set_special_inline_chars.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.POINTER(cmark_llist),  # special_chars
    ])

if hasattr(gfm, "cmark_syntax_extension_set_xml_attr_func"):
    gfm.cmark_syntax_extension_set_xml_attr_func.restype = None
    gfm.cmark_syntax_extension_set_xml_attr_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_char_p, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node)),  # func
    ])
    def cmark_syntax_extension_set_xml_attr_func(*argv):
        if not hasattr(cmark_syntax_extension_set_xml_attr_func, "callbacks"):
            cmark_syntax_extension_set_xml_attr_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,gfm.cmark_syntax_extension_set_xml_attr_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_xml_attr_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_xml_attr_func.callbacks[-1])
            else:
                args.append(arg)
        return gfm.cmark_syntax_extension_set_xml_attr_func(*args)

if hasattr(gfm, "cmark_utf8proc_case_fold"):
    cmark_utf8proc_case_fold = gfm.cmark_utf8proc_case_fold
    cmark_utf8proc_case_fold.restype = None
    cmark_utf8proc_case_fold.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # dest
        ctypes.POINTER(ctypes.c_char),  # str
        ctypes.c_int32,  # len
    ])

if hasattr(gfm, "cmark_utf8proc_check"):
    cmark_utf8proc_check = gfm.cmark_utf8proc_check
    cmark_utf8proc_check.restype = None
    cmark_utf8proc_check.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # ob
        ctypes.POINTER(ctypes.c_char),  # line
        ctypes.c_int32,  # size
    ])

if hasattr(gfm, "cmark_utf8proc_encode_char"):
    cmark_utf8proc_encode_char = gfm.cmark_utf8proc_encode_char
    cmark_utf8proc_encode_char.restype = None
    cmark_utf8proc_encode_char.argtypes = tuple([
        ctypes.c_int32,  # uc
        ctypes.POINTER(cmark_strbuf),  # buf
    ])

if hasattr(gfm, "cmark_utf8proc_is_punctuation"):
    cmark_utf8proc_is_punctuation = gfm.cmark_utf8proc_is_punctuation
    cmark_utf8proc_is_punctuation.restype = ctypes.c_int32
    cmark_utf8proc_is_punctuation.argtypes = tuple([
        ctypes.c_int32,  # uc
    ])

if hasattr(gfm, "cmark_utf8proc_is_space"):
    cmark_utf8proc_is_space = gfm.cmark_utf8proc_is_space
    cmark_utf8proc_is_space.restype = ctypes.c_int32
    cmark_utf8proc_is_space.argtypes = tuple([
        ctypes.c_int32,  # uc
    ])

if hasattr(gfm, "cmark_utf8proc_iterate"):
    cmark_utf8proc_iterate = gfm.cmark_utf8proc_iterate
    cmark_utf8proc_iterate.restype = ctypes.c_int32
    cmark_utf8proc_iterate.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # str
        ctypes.c_int32,  # str_len
        ctypes.POINTER(ctypes.c_int32),  # dst
    ])

if hasattr(gfm, "cmark_version"):
    cmark_version = gfm.cmark_version
    cmark_version.restype = ctypes.c_int32
    cmark_version.argtypes = tuple([

    ])

if hasattr(gfm, "cmark_version_string"):
    cmark_version_string = gfm.cmark_version_string
    cmark_version_string.restype = ctypes.c_char_p
    cmark_version_string.argtypes = tuple([

    ])

if hasattr(gfm, "create_autolink_extension"):
    create_autolink_extension = gfm.create_autolink_extension
    create_autolink_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    create_autolink_extension.argtypes = tuple([

    ])

if hasattr(gfm, "create_latex_block_extension"):
    create_latex_block_extension = gfm.create_latex_block_extension
    create_latex_block_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    create_latex_block_extension.argtypes = tuple([

    ])

if hasattr(gfm, "create_latex_inline_extension"):
    create_latex_inline_extension = gfm.create_latex_inline_extension
    create_latex_inline_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    create_latex_inline_extension.argtypes = tuple([

    ])

if hasattr(gfm, "create_strikethrough_extension"):
    create_strikethrough_extension = gfm.create_strikethrough_extension
    create_strikethrough_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    create_strikethrough_extension.argtypes = tuple([

    ])

if hasattr(gfm, "create_table_extension"):
    create_table_extension = gfm.create_table_extension
    create_table_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    create_table_extension.argtypes = tuple([

    ])

if hasattr(gfm, "create_tagfilter_extension"):
    create_tagfilter_extension = gfm.create_tagfilter_extension
    create_tagfilter_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    create_tagfilter_extension.argtypes = tuple([

    ])

if hasattr(gfm, "create_tasklist_extension"):
    create_tasklist_extension = gfm.create_tasklist_extension
    create_tasklist_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    create_tasklist_extension.argtypes = tuple([

    ])

if hasattr(gfm, "document_to_cmark"):
    document_to_cmark = gfm.document_to_cmark
    document_to_cmark.restype = ctypes.c_char_p
    document_to_cmark.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # document
    ])

if hasattr(gfm, "document_to_html"):
    document_to_html = gfm.document_to_html
    document_to_html.restype = ctypes.c_char_p
    document_to_html.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # document
    ])

if hasattr(gfm, "document_to_latex"):
    document_to_latex = gfm.document_to_latex
    document_to_latex.restype = ctypes.c_char_p
    document_to_latex.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # document
    ])

if hasattr(gfm, "document_to_xml"):
    document_to_xml = gfm.document_to_xml
    document_to_xml.restype = ctypes.c_char_p
    document_to_xml.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # document
    ])

if hasattr(gfm, "file_to_document"):
    file_to_document = gfm.file_to_document
    file_to_document.restype = ctypes.POINTER(cmark_node)
    file_to_document.argtypes = tuple([
        ctypes.POINTER(FILE),  # fp
    ])

if hasattr(gfm, "filename_to_document"):
    filename_to_document = gfm.filename_to_document
    filename_to_document.restype = ctypes.POINTER(cmark_node)
    filename_to_document.argtypes = tuple([
        ctypes.c_char_p,  # file_name
    ])

if hasattr(gfm, "get_parser"):
    get_parser = gfm.get_parser
    get_parser.restype = ctypes.POINTER(cmark_parser)
    get_parser.argtypes = tuple([

    ])

if hasattr(gfm, "houdini_escape_href"):
    houdini_escape_href = gfm.houdini_escape_href
    houdini_escape_href.restype = ctypes.c_int32
    houdini_escape_href.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # ob
        ctypes.POINTER(ctypes.c_char),  # src
        ctypes.c_int32,  # size
    ])

if hasattr(gfm, "houdini_escape_html"):
    houdini_escape_html = gfm.houdini_escape_html
    houdini_escape_html.restype = ctypes.c_int32
    houdini_escape_html.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # ob
        ctypes.POINTER(ctypes.c_char),  # src
        ctypes.c_int32,  # size
    ])

if hasattr(gfm, "houdini_escape_html0"):
    houdini_escape_html0 = gfm.houdini_escape_html0
    houdini_escape_html0.restype = ctypes.c_int32
    houdini_escape_html0.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # ob
        ctypes.POINTER(ctypes.c_char),  # src
        ctypes.c_int32,  # size
        ctypes.c_int32,  # secure
    ])

if hasattr(gfm, "houdini_unescape_ent"):
    houdini_unescape_ent = gfm.houdini_unescape_ent
    houdini_unescape_ent.restype = ctypes.c_int32
    houdini_unescape_ent.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # ob
        ctypes.POINTER(ctypes.c_char),  # src
        ctypes.c_int32,  # size
    ])

if hasattr(gfm, "houdini_unescape_html"):
    houdini_unescape_html = gfm.houdini_unescape_html
    houdini_unescape_html.restype = ctypes.c_int32
    houdini_unescape_html.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # ob
        ctypes.POINTER(ctypes.c_char),  # src
        ctypes.c_int32,  # size
    ])

if hasattr(gfm, "houdini_unescape_html_f"):
    houdini_unescape_html_f = gfm.houdini_unescape_html_f
    houdini_unescape_html_f.restype = None
    houdini_unescape_html_f.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # ob
        ctypes.POINTER(ctypes.c_char),  # src
        ctypes.c_int32,  # size
    ])

if hasattr(gfm, "main"):
    main = gfm.main
    main.restype = ctypes.c_int32
    main.argtypes = tuple([
        ctypes.c_int32,  # argc
        ctypes.POINTER(ctypes.c_char_p),  # argv
    ])

if hasattr(gfm, "print_and_free"):
    print_and_free = gfm.print_and_free
    print_and_free.restype = None
    print_and_free.argtypes = tuple([
        ctypes.c_char_p,  # fmt
        ctypes.c_char_p,  # result
    ])

if hasattr(gfm, "print_usage"):
    print_usage = gfm.print_usage
    print_usage.restype = None
    print_usage.argtypes = tuple([
        ctypes.c_char_p,  # bin_name
    ])

if hasattr(gfm, "shutdown"):
    shutdown = gfm.shutdown
    shutdown.restype = None
    shutdown.argtypes = tuple([

    ])

if hasattr(gfm, "startup"):
    startup = gfm.startup
    startup.restype = None
    startup.argtypes = tuple([

    ])

if hasattr(gfm, "stdin_to_document"):
    stdin_to_document = gfm.stdin_to_document
    stdin_to_document.restype = ctypes.POINTER(cmark_node)
    stdin_to_document.argtypes = tuple([

    ])

if hasattr(gfm, "string_to_document"):
    string_to_document = gfm.string_to_document
    string_to_document.restype = ctypes.POINTER(cmark_node)
    string_to_document.argtypes = tuple([
        ctypes.c_char_p,  # md
    ])

