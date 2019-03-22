import ctypes, sys

platform_ext = {"darwin":".dylib", "win32":".dll"}.get(sys.platform, ".so")
cmark = ctypes.CDLL("libcmark-gfm" + platform_ext)

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
# enum: cmark_node__internal_flags
CMARK_NODE__OPEN = 1
CMARK_NODE__LAST_LINE_BLANK = 2
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
# enum: None
NO_LINK = 0
URL_AUTOLINK = 1
EMAIL_AUTOLINK = 2
NORMAL_LINK = 3
INTERNAL_LINK = 4

##### FORWARD DECLARATIONS FOR RECURSIVE USAGE #####

class FILE(ctypes.Structure):
    pass
class _IO_FILE(ctypes.Structure):
    pass
class _IO_FILE_plus(ctypes.Structure):
    pass
class _IO_marker(ctypes.Structure):
    pass
class _cmark_llist(ctypes.Structure):
    pass
class arena_chunk(ctypes.Structure):
    pass
class bracket(ctypes.Structure):
    pass
class cmark_chunk(ctypes.Structure):
    pass
class cmark_code(ctypes.Structure):
    pass
class cmark_custom(ctypes.Structure):
    pass
class cmark_entity_node(ctypes.Structure):
    pass
class cmark_footnote(ctypes.Structure):
    pass
class cmark_heading(ctypes.Structure):
    pass
class cmark_html_renderer(ctypes.Structure):
    pass
class cmark_inline_parser(ctypes.Structure):
    pass
class cmark_iter(ctypes.Structure):
    pass
class cmark_iter_state(ctypes.Structure):
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
class cmark_reference(ctypes.Structure):
    pass
class cmark_renderer(ctypes.Structure):
    pass
class cmark_strbuf(ctypes.Structure):
    pass
class cmark_syntax_extension(ctypes.Structure):
    pass
class delimiter(ctypes.Structure):
    pass
class render_state(ctypes.Structure):
    pass
class subject(ctypes.Structure):
    pass

##### FIELD DEFINITIONS #####

FILE._fields_ = [
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

arena_chunk._fields_ = [
    ("sz", ctypes.c_uint64),
    ("used", ctypes.c_uint64),
    ("push_point", ctypes.c_char),
    ("ptr", ctypes.c_void_p),
    ("prev", ctypes.POINTER(arena_chunk))
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

cmark_entity_node._fields_ = [
    ("entity", ctypes.POINTER(ctypes.c_char)),
    ("bytes", ctypes.c_char * 7)
]

cmark_footnote._fields_ = [
    ("entry", type("cmark_map_entry", (ctypes.Structure,), {"_fields_":[
        ("next", ctypes.POINTER(cmark_map_entry)),
        ("label", ctypes.POINTER(ctypes.c_char)),
        ("age", ctypes.c_uint32)
    ]})),
    ("node", ctypes.POINTER(cmark_node)),
    ("ix", ctypes.c_uint32)
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

cmark_inline_parser._fields_ = [
    ("mem", ctypes.POINTER(cmark_mem)),
    ("input", type("cmark_chunk", (ctypes.Structure,), {"_fields_":[
        ("data", ctypes.POINTER(ctypes.c_char)),
        ("len", ctypes.c_int32),
        ("alloc", ctypes.c_int32)
    ]})),
    ("line", ctypes.c_int32),
    ("pos", ctypes.c_int32),
    ("block_offset", ctypes.c_int32),
    ("column_offset", ctypes.c_int32),
    ("refmap", ctypes.POINTER(cmark_map)),
    ("last_delim", ctypes.POINTER(delimiter)),
    ("last_bracket", ctypes.POINTER(bracket)),
    ("backticks", ctypes.c_int32 * 80),
    ("scanned_for_backticks", ctypes.c_bool)
]

cmark_iter._fields_ = [
    ("mem", ctypes.POINTER(cmark_mem)),
    ("root", ctypes.POINTER(cmark_node)),
    ("cur", type("None", (ctypes.Structure,), {"_fields_":[
        ("ev_type", ctypes.c_uint32),
        ("node", ctypes.POINTER(cmark_node))
    ]})),
    ("next", type("None", (ctypes.Structure,), {"_fields_":[
        ("ev_type", ctypes.c_uint32),
        ("node", ctypes.POINTER(cmark_node))
    ]}))
]

cmark_iter_state._fields_ = [
    ("ev_type", ctypes.c_uint32),
    ("node", ctypes.POINTER(cmark_node))
]

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
    ("calloc", ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.c_uint64, ctypes.c_uint64)),
    ("realloc", ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.c_void_p, ctypes.c_uint64)),
    ("free", ctypes.CFUNCTYPE(None, ctypes.c_void_p))
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

cmark_reference._fields_ = [
    ("entry", type("cmark_map_entry", (ctypes.Structure,), {"_fields_":[
        ("next", ctypes.POINTER(cmark_map_entry)),
        ("label", ctypes.POINTER(ctypes.c_char)),
        ("age", ctypes.c_uint32)
    ]})),
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

cmark_syntax_extension._fields_ = [
    ("last_block_matches", ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_parser), ctypes.POINTER(ctypes.c_char), ctypes.c_int32, ctypes.POINTER(cmark_node)))),
    ("try_opening_block", ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.POINTER(cmark_node), ctypes.POINTER(cmark_syntax_extension), ctypes.c_int32, ctypes.POINTER(cmark_parser), ctypes.POINTER(cmark_node), ctypes.POINTER(ctypes.c_char), ctypes.c_int32))),
    ("match_inline", ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.POINTER(cmark_node), ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_parser), ctypes.POINTER(cmark_node), ctypes.c_char, ctypes.POINTER(subject)))),
    ("insert_inline_from_delim", ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.POINTER(delimiter), ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_parser), ctypes.POINTER(subject), ctypes.POINTER(delimiter), ctypes.POINTER(delimiter)))),
    ("special_inline_chars", ctypes.POINTER(_cmark_llist)),
    ("name", ctypes.c_char_p),
    ("priv", ctypes.c_void_p),
    ("emphasis", ctypes.c_bool),
    ("free_function", ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_mem), ctypes.c_void_p))),
    ("get_type_string_func", ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_char_p, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node)))),
    ("can_contain_func", ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node), ctypes.c_uint32))),
    ("contains_inlines_func", ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node)))),
    ("commonmark_render_func", ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32))),
    ("plaintext_render_func", ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32))),
    ("latex_render_func", ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32))),
    ("xml_attr_func", ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_char_p, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node)))),
    ("man_render_func", ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32))),
    ("html_render_func", ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_html_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32))),
    ("html_filter_func", ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(ctypes.c_char), ctypes.c_uint64))),
    ("postprocess_func", ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.POINTER(cmark_node), ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_parser), ctypes.POINTER(cmark_node)))),
    ("opaque_alloc_func", ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_mem), ctypes.POINTER(cmark_node)))),
    ("opaque_free_func", ctypes.POINTER(ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_mem), ctypes.POINTER(cmark_node)))),
    ("commonmark_escape_func", ctypes.POINTER(ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node), ctypes.c_int32)))
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

render_state._fields_ = [
    ("xml", ctypes.POINTER(cmark_strbuf)),
    ("indent", ctypes.c_int32)
]

subject._fields_ = [
    ("mem", ctypes.POINTER(cmark_mem)),
    ("input", type("cmark_chunk", (ctypes.Structure,), {"_fields_":[
        ("data", ctypes.POINTER(ctypes.c_char)),
        ("len", ctypes.c_int32),
        ("alloc", ctypes.c_int32)
    ]})),
    ("line", ctypes.c_int32),
    ("pos", ctypes.c_int32),
    ("block_offset", ctypes.c_int32),
    ("column_offset", ctypes.c_int32),
    ("refmap", ctypes.POINTER(cmark_map)),
    ("last_delim", ctypes.POINTER(delimiter)),
    ("last_bracket", ctypes.POINTER(bracket)),
    ("backticks", ctypes.c_int32 * 80),
    ("scanned_for_backticks", ctypes.c_bool)
]

##### FUNCTION DEFINITIONS #####

if hasattr(cmark, "_scan_at"):
    cmark._scan_at.restype = ctypes.c_int32
    cmark._scan_at.argtypes = tuple([
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(ctypes.c_char)),  # scanner
        ctypes.POINTER(cmark_chunk),  # c
        ctypes.c_int32,  # offset
    ])
    def _scan_at(*argv):
        if not hasattr(_scan_at, "callbacks"):
            _scan_at.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark._scan_at.argtypes):
            if callable(arg): # wrap functions                
                _scan_at.callbacks.append(fn_arg(arg))
                args.append(_scan_at.callbacks[-1])
            else:
                args.append(arg)
        return cmark._scan_at(*args)

if hasattr(cmark, "_scan_atx_heading_start"):
    _scan_atx_heading_start = cmark._scan_atx_heading_start
    _scan_atx_heading_start.restype = ctypes.c_int32
    _scan_atx_heading_start.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_autolink_email"):
    _scan_autolink_email = cmark._scan_autolink_email
    _scan_autolink_email.restype = ctypes.c_int32
    _scan_autolink_email.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_autolink_uri"):
    _scan_autolink_uri = cmark._scan_autolink_uri
    _scan_autolink_uri.restype = ctypes.c_int32
    _scan_autolink_uri.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_close_code_fence"):
    _scan_close_code_fence = cmark._scan_close_code_fence
    _scan_close_code_fence.restype = ctypes.c_int32
    _scan_close_code_fence.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_dangerous_url"):
    _scan_dangerous_url = cmark._scan_dangerous_url
    _scan_dangerous_url.restype = ctypes.c_int32
    _scan_dangerous_url.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_entity"):
    _scan_entity = cmark._scan_entity
    _scan_entity.restype = ctypes.c_int32
    _scan_entity.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_footnote_definition"):
    _scan_footnote_definition = cmark._scan_footnote_definition
    _scan_footnote_definition.restype = ctypes.c_int32
    _scan_footnote_definition.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_html_block_end_1"):
    _scan_html_block_end_1 = cmark._scan_html_block_end_1
    _scan_html_block_end_1.restype = ctypes.c_int32
    _scan_html_block_end_1.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_html_block_end_2"):
    _scan_html_block_end_2 = cmark._scan_html_block_end_2
    _scan_html_block_end_2.restype = ctypes.c_int32
    _scan_html_block_end_2.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_html_block_end_3"):
    _scan_html_block_end_3 = cmark._scan_html_block_end_3
    _scan_html_block_end_3.restype = ctypes.c_int32
    _scan_html_block_end_3.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_html_block_end_4"):
    _scan_html_block_end_4 = cmark._scan_html_block_end_4
    _scan_html_block_end_4.restype = ctypes.c_int32
    _scan_html_block_end_4.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_html_block_end_5"):
    _scan_html_block_end_5 = cmark._scan_html_block_end_5
    _scan_html_block_end_5.restype = ctypes.c_int32
    _scan_html_block_end_5.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_html_block_start"):
    _scan_html_block_start = cmark._scan_html_block_start
    _scan_html_block_start.restype = ctypes.c_int32
    _scan_html_block_start.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_html_block_start_7"):
    _scan_html_block_start_7 = cmark._scan_html_block_start_7
    _scan_html_block_start_7.restype = ctypes.c_int32
    _scan_html_block_start_7.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_html_tag"):
    _scan_html_tag = cmark._scan_html_tag
    _scan_html_tag.restype = ctypes.c_int32
    _scan_html_tag.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_liberal_html_tag"):
    _scan_liberal_html_tag = cmark._scan_liberal_html_tag
    _scan_liberal_html_tag.restype = ctypes.c_int32
    _scan_liberal_html_tag.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_link_title"):
    _scan_link_title = cmark._scan_link_title
    _scan_link_title.restype = ctypes.c_int32
    _scan_link_title.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_open_code_fence"):
    _scan_open_code_fence = cmark._scan_open_code_fence
    _scan_open_code_fence.restype = ctypes.c_int32
    _scan_open_code_fence.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_scheme"):
    _scan_scheme = cmark._scan_scheme
    _scan_scheme.restype = ctypes.c_int32
    _scan_scheme.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_setext_heading_line"):
    _scan_setext_heading_line = cmark._scan_setext_heading_line
    _scan_setext_heading_line.restype = ctypes.c_int32
    _scan_setext_heading_line.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_spacechars"):
    _scan_spacechars = cmark._scan_spacechars
    _scan_spacechars.restype = ctypes.c_int32
    _scan_spacechars.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "_scan_thematic_break"):
    _scan_thematic_break = cmark._scan_thematic_break
    _scan_thematic_break.restype = ctypes.c_int32
    _scan_thematic_break.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # p
    ])

if hasattr(cmark, "cmark_arena_pop"):
    cmark_arena_pop = cmark.cmark_arena_pop
    cmark_arena_pop.restype = ctypes.c_int32
    cmark_arena_pop.argtypes = tuple([

    ])

if hasattr(cmark, "cmark_arena_push"):
    cmark_arena_push = cmark.cmark_arena_push
    cmark_arena_push.restype = None
    cmark_arena_push.argtypes = tuple([

    ])

if hasattr(cmark, "cmark_arena_reset"):
    cmark_arena_reset = cmark.cmark_arena_reset
    cmark_arena_reset.restype = None
    cmark_arena_reset.argtypes = tuple([

    ])

if hasattr(cmark, "cmark_can_contain_func"):
    cmark_can_contain_func = cmark.cmark_can_contain_func
    cmark_can_contain_func.restype = ctypes.c_int32
    cmark_can_contain_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # None
        ctypes.POINTER(cmark_node),  # None
        ctypes.c_uint32,  # None
    ])

if hasattr(cmark, "cmark_clean_title"):
    cmark_clean_title = cmark.cmark_clean_title
    cmark_clean_title.restype = type("cmark_chunk", (ctypes.Structure,), {"_fields_":[
    ("data", ctypes.POINTER(ctypes.c_char)),
    ("len", ctypes.c_int32),
    ("alloc", ctypes.c_int32)
]})
    cmark_clean_title.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
        ctypes.POINTER(cmark_chunk),  # title
    ])

if hasattr(cmark, "cmark_clean_url"):
    cmark_clean_url = cmark.cmark_clean_url
    cmark_clean_url.restype = type("cmark_chunk", (ctypes.Structure,), {"_fields_":[
    ("data", ctypes.POINTER(ctypes.c_char)),
    ("len", ctypes.c_int32),
    ("alloc", ctypes.c_int32)
]})
    cmark_clean_url.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
        ctypes.POINTER(cmark_chunk),  # url
    ])

if hasattr(cmark, "cmark_common_render_func"):
    cmark_common_render_func = cmark.cmark_common_render_func
    cmark_common_render_func.restype = None
    cmark_common_render_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # None
        ctypes.POINTER(cmark_renderer),  # None
        ctypes.POINTER(cmark_node),  # None
        ctypes.c_uint32,  # None
        ctypes.c_int32,  # None
    ])

if hasattr(cmark, "cmark_commonmark_escape_func"):
    cmark_commonmark_escape_func = cmark.cmark_commonmark_escape_func
    cmark_commonmark_escape_func.restype = ctypes.c_int32
    cmark_commonmark_escape_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # None
        ctypes.POINTER(cmark_node),  # None
        ctypes.c_int32,  # None
    ])

if hasattr(cmark, "cmark_consolidate_text_nodes"):
    cmark_consolidate_text_nodes = cmark.cmark_consolidate_text_nodes
    cmark_consolidate_text_nodes.restype = None
    cmark_consolidate_text_nodes.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
    ])

if hasattr(cmark, "cmark_contains_inlines_func"):
    cmark_contains_inlines_func = cmark.cmark_contains_inlines_func
    cmark_contains_inlines_func.restype = ctypes.c_int32
    cmark_contains_inlines_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # None
        ctypes.POINTER(cmark_node),  # None
    ])

if hasattr(cmark, "cmark_find_syntax_extension"):
    cmark_find_syntax_extension = cmark.cmark_find_syntax_extension
    cmark_find_syntax_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    cmark_find_syntax_extension.argtypes = tuple([
        ctypes.c_char_p,  # name
    ])

if hasattr(cmark, "cmark_footnote_create"):
    cmark_footnote_create = cmark.cmark_footnote_create
    cmark_footnote_create.restype = None
    cmark_footnote_create.argtypes = tuple([
        ctypes.POINTER(cmark_map),  # map
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_footnote_map_new"):
    cmark_footnote_map_new = cmark.cmark_footnote_map_new
    cmark_footnote_map_new.restype = ctypes.POINTER(cmark_map)
    cmark_footnote_map_new.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
    ])

if hasattr(cmark, "cmark_free_func"):
    cmark_free_func = cmark.cmark_free_func
    cmark_free_func.restype = None
    cmark_free_func.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # None
        ctypes.c_void_p,  # None
    ])

if hasattr(cmark, "cmark_get_arena_mem_allocator"):
    cmark_get_arena_mem_allocator = cmark.cmark_get_arena_mem_allocator
    cmark_get_arena_mem_allocator.restype = ctypes.POINTER(cmark_mem)
    cmark_get_arena_mem_allocator.argtypes = tuple([

    ])

if hasattr(cmark, "cmark_get_default_mem_allocator"):
    cmark_get_default_mem_allocator = cmark.cmark_get_default_mem_allocator
    cmark_get_default_mem_allocator.restype = ctypes.POINTER(cmark_mem)
    cmark_get_default_mem_allocator.argtypes = tuple([

    ])

if hasattr(cmark, "cmark_get_type_string_func"):
    cmark_get_type_string_func = cmark.cmark_get_type_string_func
    cmark_get_type_string_func.restype = ctypes.c_char_p
    cmark_get_type_string_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # None
        ctypes.POINTER(cmark_node),  # None
    ])

if hasattr(cmark, "cmark_html_filter_func"):
    cmark_html_filter_func = cmark.cmark_html_filter_func
    cmark_html_filter_func.restype = ctypes.c_int32
    cmark_html_filter_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # None
        ctypes.POINTER(ctypes.c_char),  # None
        ctypes.c_uint64,  # None
    ])

if hasattr(cmark, "cmark_html_render_func"):
    cmark_html_render_func = cmark.cmark_html_render_func
    cmark_html_render_func.restype = None
    cmark_html_render_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # None
        ctypes.POINTER(cmark_html_renderer),  # None
        ctypes.POINTER(cmark_node),  # None
        ctypes.c_uint32,  # None
        ctypes.c_int32,  # None
    ])

if hasattr(cmark, "cmark_inline_from_delim_func"):
    cmark_inline_from_delim_func = cmark.cmark_inline_from_delim_func
    cmark_inline_from_delim_func.restype = ctypes.POINTER(delimiter)
    cmark_inline_from_delim_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # None
        ctypes.POINTER(cmark_parser),  # None
        ctypes.POINTER(subject),  # None
        ctypes.POINTER(delimiter),  # None
        ctypes.POINTER(delimiter),  # None
    ])

if hasattr(cmark, "cmark_inline_parser_advance_offset"):
    cmark_inline_parser_advance_offset = cmark.cmark_inline_parser_advance_offset
    cmark_inline_parser_advance_offset.restype = None
    cmark_inline_parser_advance_offset.argtypes = tuple([
        ctypes.POINTER(subject),  # parser
    ])

if hasattr(cmark, "cmark_inline_parser_get_chunk"):
    cmark_inline_parser_get_chunk = cmark.cmark_inline_parser_get_chunk
    cmark_inline_parser_get_chunk.restype = ctypes.POINTER(cmark_chunk)
    cmark_inline_parser_get_chunk.argtypes = tuple([
        ctypes.POINTER(subject),  # parser
    ])

if hasattr(cmark, "cmark_inline_parser_get_column"):
    cmark_inline_parser_get_column = cmark.cmark_inline_parser_get_column
    cmark_inline_parser_get_column.restype = ctypes.c_int32
    cmark_inline_parser_get_column.argtypes = tuple([
        ctypes.POINTER(subject),  # parser
    ])

if hasattr(cmark, "cmark_inline_parser_get_last_delimiter"):
    cmark_inline_parser_get_last_delimiter = cmark.cmark_inline_parser_get_last_delimiter
    cmark_inline_parser_get_last_delimiter.restype = ctypes.POINTER(delimiter)
    cmark_inline_parser_get_last_delimiter.argtypes = tuple([
        ctypes.POINTER(subject),  # parser
    ])

if hasattr(cmark, "cmark_inline_parser_get_line"):
    cmark_inline_parser_get_line = cmark.cmark_inline_parser_get_line
    cmark_inline_parser_get_line.restype = ctypes.c_int32
    cmark_inline_parser_get_line.argtypes = tuple([
        ctypes.POINTER(subject),  # parser
    ])

if hasattr(cmark, "cmark_inline_parser_get_offset"):
    cmark_inline_parser_get_offset = cmark.cmark_inline_parser_get_offset
    cmark_inline_parser_get_offset.restype = ctypes.c_int32
    cmark_inline_parser_get_offset.argtypes = tuple([
        ctypes.POINTER(subject),  # parser
    ])

if hasattr(cmark, "cmark_inline_parser_in_bracket"):
    cmark_inline_parser_in_bracket = cmark.cmark_inline_parser_in_bracket
    cmark_inline_parser_in_bracket.restype = ctypes.c_int32
    cmark_inline_parser_in_bracket.argtypes = tuple([
        ctypes.POINTER(subject),  # parser
        ctypes.c_int32,  # image
    ])

if hasattr(cmark, "cmark_inline_parser_is_eof"):
    cmark_inline_parser_is_eof = cmark.cmark_inline_parser_is_eof
    cmark_inline_parser_is_eof.restype = ctypes.c_int32
    cmark_inline_parser_is_eof.argtypes = tuple([
        ctypes.POINTER(subject),  # parser
    ])

if hasattr(cmark, "cmark_inline_parser_peek_at"):
    cmark_inline_parser_peek_at = cmark.cmark_inline_parser_peek_at
    cmark_inline_parser_peek_at.restype = ctypes.c_char
    cmark_inline_parser_peek_at.argtypes = tuple([
        ctypes.POINTER(subject),  # parser
        ctypes.c_int32,  # pos
    ])

if hasattr(cmark, "cmark_inline_parser_peek_char"):
    cmark_inline_parser_peek_char = cmark.cmark_inline_parser_peek_char
    cmark_inline_parser_peek_char.restype = ctypes.c_char
    cmark_inline_parser_peek_char.argtypes = tuple([
        ctypes.POINTER(subject),  # parser
    ])

if hasattr(cmark, "cmark_inline_parser_push_delimiter"):
    cmark_inline_parser_push_delimiter = cmark.cmark_inline_parser_push_delimiter
    cmark_inline_parser_push_delimiter.restype = None
    cmark_inline_parser_push_delimiter.argtypes = tuple([
        ctypes.POINTER(subject),  # parser
        ctypes.c_char,  # c
        ctypes.c_int32,  # can_open
        ctypes.c_int32,  # can_close
        ctypes.POINTER(cmark_node),  # inl_text
    ])

if hasattr(cmark, "cmark_inline_parser_remove_delimiter"):
    cmark_inline_parser_remove_delimiter = cmark.cmark_inline_parser_remove_delimiter
    cmark_inline_parser_remove_delimiter.restype = None
    cmark_inline_parser_remove_delimiter.argtypes = tuple([
        ctypes.POINTER(subject),  # parser
        ctypes.POINTER(delimiter),  # delim
    ])

if hasattr(cmark, "cmark_inline_parser_scan_delimiters"):
    cmark_inline_parser_scan_delimiters = cmark.cmark_inline_parser_scan_delimiters
    cmark_inline_parser_scan_delimiters.restype = ctypes.c_int32
    cmark_inline_parser_scan_delimiters.argtypes = tuple([
        ctypes.POINTER(subject),  # parser
        ctypes.c_int32,  # max_delims
        ctypes.c_char,  # c
        ctypes.POINTER(ctypes.c_int32),  # left_flanking
        ctypes.POINTER(ctypes.c_int32),  # right_flanking
        ctypes.POINTER(ctypes.c_int32),  # punct_before
        ctypes.POINTER(ctypes.c_int32),  # punct_after
    ])

if hasattr(cmark, "cmark_inline_parser_set_offset"):
    cmark_inline_parser_set_offset = cmark.cmark_inline_parser_set_offset
    cmark_inline_parser_set_offset.restype = None
    cmark_inline_parser_set_offset.argtypes = tuple([
        ctypes.POINTER(subject),  # parser
        ctypes.c_int32,  # offset
    ])

if hasattr(cmark, "cmark_inline_parser_take_while"):
    cmark.cmark_inline_parser_take_while.restype = ctypes.c_char_p
    cmark.cmark_inline_parser_take_while.argtypes = tuple([
        ctypes.POINTER(subject),  # parser
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.c_int32),  # pred
    ])
    def cmark_inline_parser_take_while(*argv):
        if not hasattr(cmark_inline_parser_take_while, "callbacks"):
            cmark_inline_parser_take_while.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_inline_parser_take_while.argtypes):
            if callable(arg): # wrap functions                
                cmark_inline_parser_take_while.callbacks.append(fn_arg(arg))
                args.append(cmark_inline_parser_take_while.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_inline_parser_take_while(*args)

if hasattr(cmark, "cmark_inline_predicate"):
    cmark_inline_predicate = cmark.cmark_inline_predicate
    cmark_inline_predicate.restype = ctypes.c_int32
    cmark_inline_predicate.argtypes = tuple([
        ctypes.c_int32,  # None
    ])

if hasattr(cmark, "cmark_inlines_add_special_character"):
    cmark_inlines_add_special_character = cmark.cmark_inlines_add_special_character
    cmark_inlines_add_special_character.restype = None
    cmark_inlines_add_special_character.argtypes = tuple([
        ctypes.c_char,  # c
        ctypes.c_bool,  # emphasis
    ])

if hasattr(cmark, "cmark_inlines_remove_special_character"):
    cmark_inlines_remove_special_character = cmark.cmark_inlines_remove_special_character
    cmark_inlines_remove_special_character.restype = None
    cmark_inlines_remove_special_character.argtypes = tuple([
        ctypes.c_char,  # c
        ctypes.c_bool,  # emphasis
    ])

if hasattr(cmark, "cmark_isalnum"):
    cmark_isalnum = cmark.cmark_isalnum
    cmark_isalnum.restype = ctypes.c_int32
    cmark_isalnum.argtypes = tuple([
        ctypes.c_int8,  # c
    ])

if hasattr(cmark, "cmark_isalpha"):
    cmark_isalpha = cmark.cmark_isalpha
    cmark_isalpha.restype = ctypes.c_int32
    cmark_isalpha.argtypes = tuple([
        ctypes.c_int8,  # c
    ])

if hasattr(cmark, "cmark_isdigit"):
    cmark_isdigit = cmark.cmark_isdigit
    cmark_isdigit.restype = ctypes.c_int32
    cmark_isdigit.argtypes = tuple([
        ctypes.c_int8,  # c
    ])

if hasattr(cmark, "cmark_ispunct"):
    cmark_ispunct = cmark.cmark_ispunct
    cmark_ispunct.restype = ctypes.c_int32
    cmark_ispunct.argtypes = tuple([
        ctypes.c_int8,  # c
    ])

if hasattr(cmark, "cmark_ispunct_func"):
    cmark_ispunct_func = cmark.cmark_ispunct_func
    cmark_ispunct_func.restype = ctypes.c_int32
    cmark_ispunct_func.argtypes = tuple([
        ctypes.c_int8,  # None
    ])

if hasattr(cmark, "cmark_isspace"):
    cmark_isspace = cmark.cmark_isspace
    cmark_isspace.restype = ctypes.c_int32
    cmark_isspace.argtypes = tuple([
        ctypes.c_int8,  # c
    ])

if hasattr(cmark, "cmark_iter_free"):
    cmark_iter_free = cmark.cmark_iter_free
    cmark_iter_free.restype = None
    cmark_iter_free.argtypes = tuple([
        ctypes.POINTER(cmark_iter),  # iter
    ])

if hasattr(cmark, "cmark_iter_get_event_type"):
    cmark_iter_get_event_type = cmark.cmark_iter_get_event_type
    cmark_iter_get_event_type.restype = ctypes.c_uint32
    cmark_iter_get_event_type.argtypes = tuple([
        ctypes.POINTER(cmark_iter),  # iter
    ])

if hasattr(cmark, "cmark_iter_get_node"):
    cmark_iter_get_node = cmark.cmark_iter_get_node
    cmark_iter_get_node.restype = ctypes.POINTER(cmark_node)
    cmark_iter_get_node.argtypes = tuple([
        ctypes.POINTER(cmark_iter),  # iter
    ])

if hasattr(cmark, "cmark_iter_get_root"):
    cmark_iter_get_root = cmark.cmark_iter_get_root
    cmark_iter_get_root.restype = ctypes.POINTER(cmark_node)
    cmark_iter_get_root.argtypes = tuple([
        ctypes.POINTER(cmark_iter),  # iter
    ])

if hasattr(cmark, "cmark_iter_new"):
    cmark_iter_new = cmark.cmark_iter_new
    cmark_iter_new.restype = ctypes.POINTER(cmark_iter)
    cmark_iter_new.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
    ])

if hasattr(cmark, "cmark_iter_next"):
    cmark_iter_next = cmark.cmark_iter_next
    cmark_iter_next.restype = ctypes.c_uint32
    cmark_iter_next.argtypes = tuple([
        ctypes.POINTER(cmark_iter),  # iter
    ])

if hasattr(cmark, "cmark_iter_reset"):
    cmark_iter_reset = cmark.cmark_iter_reset
    cmark_iter_reset.restype = None
    cmark_iter_reset.argtypes = tuple([
        ctypes.POINTER(cmark_iter),  # iter
        ctypes.POINTER(cmark_node),  # current
        ctypes.c_uint32,  # event_type
    ])

if hasattr(cmark, "cmark_list_syntax_extensions"):
    cmark_list_syntax_extensions = cmark.cmark_list_syntax_extensions
    cmark_list_syntax_extensions.restype = ctypes.POINTER(_cmark_llist)
    cmark_list_syntax_extensions.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
    ])

if hasattr(cmark, "cmark_llist_append"):
    cmark_llist_append = cmark.cmark_llist_append
    cmark_llist_append.restype = ctypes.POINTER(_cmark_llist)
    cmark_llist_append.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
        ctypes.POINTER(_cmark_llist),  # head
        ctypes.c_void_p,  # data
    ])

if hasattr(cmark, "cmark_llist_free"):
    cmark_llist_free = cmark.cmark_llist_free
    cmark_llist_free.restype = None
    cmark_llist_free.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
        ctypes.POINTER(_cmark_llist),  # head
    ])

if hasattr(cmark, "cmark_llist_free_full"):
    cmark.cmark_llist_free_full.restype = None
    cmark.cmark_llist_free_full.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
        ctypes.POINTER(_cmark_llist),  # head
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_mem), ctypes.c_void_p),  # free_func
    ])
    def cmark_llist_free_full(*argv):
        if not hasattr(cmark_llist_free_full, "callbacks"):
            cmark_llist_free_full.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_llist_free_full.argtypes):
            if callable(arg): # wrap functions                
                cmark_llist_free_full.callbacks.append(fn_arg(arg))
                args.append(cmark_llist_free_full.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_llist_free_full(*args)

if hasattr(cmark, "cmark_manage_extensions_special_characters"):
    cmark_manage_extensions_special_characters = cmark.cmark_manage_extensions_special_characters
    cmark_manage_extensions_special_characters.restype = None
    cmark_manage_extensions_special_characters.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
        ctypes.c_int32,  # add
    ])

if hasattr(cmark, "cmark_map_free"):
    cmark_map_free = cmark.cmark_map_free
    cmark_map_free.restype = None
    cmark_map_free.argtypes = tuple([
        ctypes.POINTER(cmark_map),  # map
    ])

if hasattr(cmark, "cmark_map_free_f"):
    cmark_map_free_f = cmark.cmark_map_free_f
    cmark_map_free_f.restype = None
    cmark_map_free_f.argtypes = tuple([
        ctypes.POINTER(cmark_map),  # None
        ctypes.POINTER(cmark_map_entry),  # None
    ])

if hasattr(cmark, "cmark_map_lookup"):
    cmark_map_lookup = cmark.cmark_map_lookup
    cmark_map_lookup.restype = ctypes.POINTER(cmark_map_entry)
    cmark_map_lookup.argtypes = tuple([
        ctypes.POINTER(cmark_map),  # map
        ctypes.POINTER(cmark_chunk),  # label
    ])

if hasattr(cmark, "cmark_map_new"):
    cmark.cmark_map_new.restype = ctypes.POINTER(cmark_map)
    cmark.cmark_map_new.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_map), ctypes.POINTER(cmark_map_entry)),  # free
    ])
    def cmark_map_new(*argv):
        if not hasattr(cmark_map_new, "callbacks"):
            cmark_map_new.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_map_new.argtypes):
            if callable(arg): # wrap functions                
                cmark_map_new.callbacks.append(fn_arg(arg))
                args.append(cmark_map_new.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_map_new(*args)

if hasattr(cmark, "cmark_markdown_to_html"):
    cmark_markdown_to_html = cmark.cmark_markdown_to_html
    cmark_markdown_to_html.restype = ctypes.c_char_p
    cmark_markdown_to_html.argtypes = tuple([
        ctypes.c_char_p,  # text
        ctypes.c_uint64,  # len
        ctypes.c_int32,  # options
    ])

if hasattr(cmark, "cmark_match_block_func"):
    cmark_match_block_func = cmark.cmark_match_block_func
    cmark_match_block_func.restype = ctypes.c_int32
    cmark_match_block_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # None
        ctypes.POINTER(cmark_parser),  # None
        ctypes.POINTER(ctypes.c_char),  # None
        ctypes.c_int32,  # None
        ctypes.POINTER(cmark_node),  # None
    ])

if hasattr(cmark, "cmark_match_inline_func"):
    cmark_match_inline_func = cmark.cmark_match_inline_func
    cmark_match_inline_func.restype = ctypes.POINTER(cmark_node)
    cmark_match_inline_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # None
        ctypes.POINTER(cmark_parser),  # None
        ctypes.POINTER(cmark_node),  # None
        ctypes.c_char,  # None
        ctypes.POINTER(subject),  # None
    ])

if hasattr(cmark, "cmark_node_append_child"):
    cmark_node_append_child = cmark.cmark_node_append_child
    cmark_node_append_child.restype = ctypes.c_int32
    cmark_node_append_child.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.POINTER(cmark_node),  # child
    ])

if hasattr(cmark, "cmark_node_can_contain_type"):
    cmark_node_can_contain_type = cmark.cmark_node_can_contain_type
    cmark_node_can_contain_type.restype = ctypes.c_bool
    cmark_node_can_contain_type.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_uint32,  # child_type
    ])

if hasattr(cmark, "cmark_node_check"):
    cmark_node_check = cmark.cmark_node_check
    cmark_node_check.restype = ctypes.c_int32
    cmark_node_check.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.POINTER(_IO_FILE),  # out
    ])

if hasattr(cmark, "cmark_node_first_child"):
    cmark_node_first_child = cmark.cmark_node_first_child
    cmark_node_first_child.restype = ctypes.POINTER(cmark_node)
    cmark_node_first_child.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_free"):
    cmark_node_free = cmark.cmark_node_free
    cmark_node_free.restype = None
    cmark_node_free.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_end_column"):
    cmark_node_get_end_column = cmark.cmark_node_get_end_column
    cmark_node_get_end_column.restype = ctypes.c_int32
    cmark_node_get_end_column.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_end_line"):
    cmark_node_get_end_line = cmark.cmark_node_get_end_line
    cmark_node_get_end_line.restype = ctypes.c_int32
    cmark_node_get_end_line.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_fence_info"):
    cmark_node_get_fence_info = cmark.cmark_node_get_fence_info
    cmark_node_get_fence_info.restype = ctypes.c_char_p
    cmark_node_get_fence_info.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_fenced"):
    cmark_node_get_fenced = cmark.cmark_node_get_fenced
    cmark_node_get_fenced.restype = ctypes.c_int32
    cmark_node_get_fenced.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.POINTER(ctypes.c_int32),  # length
        ctypes.POINTER(ctypes.c_int32),  # offset
        ctypes.c_char_p,  # character
    ])

if hasattr(cmark, "cmark_node_get_heading_level"):
    cmark_node_get_heading_level = cmark.cmark_node_get_heading_level
    cmark_node_get_heading_level.restype = ctypes.c_int32
    cmark_node_get_heading_level.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_list_delim"):
    cmark_node_get_list_delim = cmark.cmark_node_get_list_delim
    cmark_node_get_list_delim.restype = ctypes.c_uint32
    cmark_node_get_list_delim.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_list_start"):
    cmark_node_get_list_start = cmark.cmark_node_get_list_start
    cmark_node_get_list_start.restype = ctypes.c_int32
    cmark_node_get_list_start.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_list_tight"):
    cmark_node_get_list_tight = cmark.cmark_node_get_list_tight
    cmark_node_get_list_tight.restype = ctypes.c_int32
    cmark_node_get_list_tight.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_list_type"):
    cmark_node_get_list_type = cmark.cmark_node_get_list_type
    cmark_node_get_list_type.restype = ctypes.c_uint32
    cmark_node_get_list_type.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_literal"):
    cmark_node_get_literal = cmark.cmark_node_get_literal
    cmark_node_get_literal.restype = ctypes.c_char_p
    cmark_node_get_literal.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_on_enter"):
    cmark_node_get_on_enter = cmark.cmark_node_get_on_enter
    cmark_node_get_on_enter.restype = ctypes.c_char_p
    cmark_node_get_on_enter.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_on_exit"):
    cmark_node_get_on_exit = cmark.cmark_node_get_on_exit
    cmark_node_get_on_exit.restype = ctypes.c_char_p
    cmark_node_get_on_exit.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_start_column"):
    cmark_node_get_start_column = cmark.cmark_node_get_start_column
    cmark_node_get_start_column.restype = ctypes.c_int32
    cmark_node_get_start_column.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_start_line"):
    cmark_node_get_start_line = cmark.cmark_node_get_start_line
    cmark_node_get_start_line.restype = ctypes.c_int32
    cmark_node_get_start_line.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_string_content"):
    cmark_node_get_string_content = cmark.cmark_node_get_string_content
    cmark_node_get_string_content.restype = ctypes.c_char_p
    cmark_node_get_string_content.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_syntax_extension"):
    cmark_node_get_syntax_extension = cmark.cmark_node_get_syntax_extension
    cmark_node_get_syntax_extension.restype = ctypes.POINTER(cmark_syntax_extension)
    cmark_node_get_syntax_extension.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_title"):
    cmark_node_get_title = cmark.cmark_node_get_title
    cmark_node_get_title.restype = ctypes.c_char_p
    cmark_node_get_title.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_type"):
    cmark_node_get_type = cmark.cmark_node_get_type
    cmark_node_get_type.restype = ctypes.c_uint32
    cmark_node_get_type.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_type_string"):
    cmark_node_get_type_string = cmark.cmark_node_get_type_string
    cmark_node_get_type_string.restype = ctypes.c_char_p
    cmark_node_get_type_string.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_url"):
    cmark_node_get_url = cmark.cmark_node_get_url
    cmark_node_get_url.restype = ctypes.c_char_p
    cmark_node_get_url.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_get_user_data"):
    cmark_node_get_user_data = cmark.cmark_node_get_user_data
    cmark_node_get_user_data.restype = ctypes.c_void_p
    cmark_node_get_user_data.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_insert_after"):
    cmark_node_insert_after = cmark.cmark_node_insert_after
    cmark_node_insert_after.restype = ctypes.c_int32
    cmark_node_insert_after.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.POINTER(cmark_node),  # sibling
    ])

if hasattr(cmark, "cmark_node_insert_before"):
    cmark_node_insert_before = cmark.cmark_node_insert_before
    cmark_node_insert_before.restype = ctypes.c_int32
    cmark_node_insert_before.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.POINTER(cmark_node),  # sibling
    ])

if hasattr(cmark, "cmark_node_last_child"):
    cmark_node_last_child = cmark.cmark_node_last_child
    cmark_node_last_child.restype = ctypes.POINTER(cmark_node)
    cmark_node_last_child.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_new"):
    cmark_node_new = cmark.cmark_node_new
    cmark_node_new.restype = ctypes.POINTER(cmark_node)
    cmark_node_new.argtypes = tuple([
        ctypes.c_uint32,  # type
    ])

if hasattr(cmark, "cmark_node_new_with_ext"):
    cmark_node_new_with_ext = cmark.cmark_node_new_with_ext
    cmark_node_new_with_ext.restype = ctypes.POINTER(cmark_node)
    cmark_node_new_with_ext.argtypes = tuple([
        ctypes.c_uint32,  # type
        ctypes.POINTER(cmark_syntax_extension),  # extension
    ])

if hasattr(cmark, "cmark_node_new_with_mem"):
    cmark_node_new_with_mem = cmark.cmark_node_new_with_mem
    cmark_node_new_with_mem.restype = ctypes.POINTER(cmark_node)
    cmark_node_new_with_mem.argtypes = tuple([
        ctypes.c_uint32,  # type
        ctypes.POINTER(cmark_mem),  # mem
    ])

if hasattr(cmark, "cmark_node_new_with_mem_and_ext"):
    cmark_node_new_with_mem_and_ext = cmark.cmark_node_new_with_mem_and_ext
    cmark_node_new_with_mem_and_ext.restype = ctypes.POINTER(cmark_node)
    cmark_node_new_with_mem_and_ext.argtypes = tuple([
        ctypes.c_uint32,  # type
        ctypes.POINTER(cmark_mem),  # mem
        ctypes.POINTER(cmark_syntax_extension),  # extension
    ])

if hasattr(cmark, "cmark_node_next"):
    cmark_node_next = cmark.cmark_node_next
    cmark_node_next.restype = ctypes.POINTER(cmark_node)
    cmark_node_next.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_own"):
    cmark_node_own = cmark.cmark_node_own
    cmark_node_own.restype = None
    cmark_node_own.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
    ])

if hasattr(cmark, "cmark_node_parent"):
    cmark_node_parent = cmark.cmark_node_parent
    cmark_node_parent.restype = ctypes.POINTER(cmark_node)
    cmark_node_parent.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_prepend_child"):
    cmark_node_prepend_child = cmark.cmark_node_prepend_child
    cmark_node_prepend_child.restype = ctypes.c_int32
    cmark_node_prepend_child.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.POINTER(cmark_node),  # child
    ])

if hasattr(cmark, "cmark_node_previous"):
    cmark_node_previous = cmark.cmark_node_previous
    cmark_node_previous.restype = ctypes.POINTER(cmark_node)
    cmark_node_previous.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_replace"):
    cmark_node_replace = cmark.cmark_node_replace
    cmark_node_replace.restype = ctypes.c_int32
    cmark_node_replace.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # oldnode
        ctypes.POINTER(cmark_node),  # newnode
    ])

if hasattr(cmark, "cmark_node_set_fence_info"):
    cmark_node_set_fence_info = cmark.cmark_node_set_fence_info
    cmark_node_set_fence_info.restype = ctypes.c_int32
    cmark_node_set_fence_info.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_char_p,  # info
    ])

if hasattr(cmark, "cmark_node_set_fenced"):
    cmark_node_set_fenced = cmark.cmark_node_set_fenced
    cmark_node_set_fenced.restype = ctypes.c_int32
    cmark_node_set_fenced.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_int32,  # fenced
        ctypes.c_int32,  # length
        ctypes.c_int32,  # offset
        ctypes.c_int8,  # character
    ])

if hasattr(cmark, "cmark_node_set_heading_level"):
    cmark_node_set_heading_level = cmark.cmark_node_set_heading_level
    cmark_node_set_heading_level.restype = ctypes.c_int32
    cmark_node_set_heading_level.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_int32,  # level
    ])

if hasattr(cmark, "cmark_node_set_list_delim"):
    cmark_node_set_list_delim = cmark.cmark_node_set_list_delim
    cmark_node_set_list_delim.restype = ctypes.c_int32
    cmark_node_set_list_delim.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_uint32,  # delim
    ])

if hasattr(cmark, "cmark_node_set_list_start"):
    cmark_node_set_list_start = cmark.cmark_node_set_list_start
    cmark_node_set_list_start.restype = ctypes.c_int32
    cmark_node_set_list_start.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_int32,  # start
    ])

if hasattr(cmark, "cmark_node_set_list_tight"):
    cmark_node_set_list_tight = cmark.cmark_node_set_list_tight
    cmark_node_set_list_tight.restype = ctypes.c_int32
    cmark_node_set_list_tight.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_int32,  # tight
    ])

if hasattr(cmark, "cmark_node_set_list_type"):
    cmark_node_set_list_type = cmark.cmark_node_set_list_type
    cmark_node_set_list_type.restype = ctypes.c_int32
    cmark_node_set_list_type.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_uint32,  # type
    ])

if hasattr(cmark, "cmark_node_set_literal"):
    cmark_node_set_literal = cmark.cmark_node_set_literal
    cmark_node_set_literal.restype = ctypes.c_int32
    cmark_node_set_literal.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_char_p,  # content
    ])

if hasattr(cmark, "cmark_node_set_on_enter"):
    cmark_node_set_on_enter = cmark.cmark_node_set_on_enter
    cmark_node_set_on_enter.restype = ctypes.c_int32
    cmark_node_set_on_enter.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_char_p,  # on_enter
    ])

if hasattr(cmark, "cmark_node_set_on_exit"):
    cmark_node_set_on_exit = cmark.cmark_node_set_on_exit
    cmark_node_set_on_exit.restype = ctypes.c_int32
    cmark_node_set_on_exit.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_char_p,  # on_exit
    ])

if hasattr(cmark, "cmark_node_set_string_content"):
    cmark_node_set_string_content = cmark.cmark_node_set_string_content
    cmark_node_set_string_content.restype = ctypes.c_int32
    cmark_node_set_string_content.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_char_p,  # content
    ])

if hasattr(cmark, "cmark_node_set_syntax_extension"):
    cmark_node_set_syntax_extension = cmark.cmark_node_set_syntax_extension
    cmark_node_set_syntax_extension.restype = ctypes.c_int32
    cmark_node_set_syntax_extension.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.POINTER(cmark_syntax_extension),  # extension
    ])

if hasattr(cmark, "cmark_node_set_title"):
    cmark_node_set_title = cmark.cmark_node_set_title
    cmark_node_set_title.restype = ctypes.c_int32
    cmark_node_set_title.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_char_p,  # title
    ])

if hasattr(cmark, "cmark_node_set_type"):
    cmark_node_set_type = cmark.cmark_node_set_type
    cmark_node_set_type.restype = ctypes.c_int32
    cmark_node_set_type.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_uint32,  # type
    ])

if hasattr(cmark, "cmark_node_set_url"):
    cmark_node_set_url = cmark.cmark_node_set_url
    cmark_node_set_url.restype = ctypes.c_int32
    cmark_node_set_url.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_char_p,  # url
    ])

if hasattr(cmark, "cmark_node_set_user_data"):
    cmark_node_set_user_data = cmark.cmark_node_set_user_data
    cmark_node_set_user_data.restype = ctypes.c_int32
    cmark_node_set_user_data.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_void_p,  # user_data
    ])

if hasattr(cmark, "cmark_node_set_user_data_free_func"):
    cmark.cmark_node_set_user_data_free_func.restype = ctypes.c_int32
    cmark.cmark_node_set_user_data_free_func.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_mem), ctypes.c_void_p),  # free_func
    ])
    def cmark_node_set_user_data_free_func(*argv):
        if not hasattr(cmark_node_set_user_data_free_func, "callbacks"):
            cmark_node_set_user_data_free_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_node_set_user_data_free_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_node_set_user_data_free_func.callbacks.append(fn_arg(arg))
                args.append(cmark_node_set_user_data_free_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_node_set_user_data_free_func(*args)

if hasattr(cmark, "cmark_node_unlink"):
    cmark_node_unlink = cmark.cmark_node_unlink
    cmark_node_unlink.restype = None
    cmark_node_unlink.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
    ])

if hasattr(cmark, "cmark_node_unput"):
    cmark_node_unput = cmark.cmark_node_unput
    cmark_node_unput.restype = None
    cmark_node_unput.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # node
        ctypes.c_int32,  # n
    ])

if hasattr(cmark, "cmark_opaque_alloc_func"):
    cmark_opaque_alloc_func = cmark.cmark_opaque_alloc_func
    cmark_opaque_alloc_func.restype = None
    cmark_opaque_alloc_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # None
        ctypes.POINTER(cmark_mem),  # None
        ctypes.POINTER(cmark_node),  # None
    ])

if hasattr(cmark, "cmark_opaque_free_func"):
    cmark_opaque_free_func = cmark.cmark_opaque_free_func
    cmark_opaque_free_func.restype = None
    cmark_opaque_free_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # None
        ctypes.POINTER(cmark_mem),  # None
        ctypes.POINTER(cmark_node),  # None
    ])

if hasattr(cmark, "cmark_open_block_func"):
    cmark_open_block_func = cmark.cmark_open_block_func
    cmark_open_block_func.restype = ctypes.POINTER(cmark_node)
    cmark_open_block_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # None
        ctypes.c_int32,  # None
        ctypes.POINTER(cmark_parser),  # None
        ctypes.POINTER(cmark_node),  # None
        ctypes.POINTER(ctypes.c_char),  # None
        ctypes.c_int32,  # None
    ])

if hasattr(cmark, "cmark_parse_document"):
    cmark_parse_document = cmark.cmark_parse_document
    cmark_parse_document.restype = ctypes.POINTER(cmark_node)
    cmark_parse_document.argtypes = tuple([
        ctypes.c_char_p,  # buffer
        ctypes.c_uint64,  # len
        ctypes.c_int32,  # options
    ])

if hasattr(cmark, "cmark_parse_file"):
    cmark_parse_file = cmark.cmark_parse_file
    cmark_parse_file.restype = ctypes.POINTER(cmark_node)
    cmark_parse_file.argtypes = tuple([
        ctypes.POINTER(_IO_FILE),  # f
        ctypes.c_int32,  # options
    ])

if hasattr(cmark, "cmark_parse_inlines"):
    cmark_parse_inlines = cmark.cmark_parse_inlines
    cmark_parse_inlines.restype = None
    cmark_parse_inlines.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
        ctypes.POINTER(cmark_node),  # parent
        ctypes.POINTER(cmark_map),  # refmap
        ctypes.c_int32,  # options
    ])

if hasattr(cmark, "cmark_parse_reference_inline"):
    cmark_parse_reference_inline = cmark.cmark_parse_reference_inline
    cmark_parse_reference_inline.restype = ctypes.c_int32
    cmark_parse_reference_inline.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
        ctypes.POINTER(cmark_chunk),  # input
        ctypes.POINTER(cmark_map),  # refmap
    ])

if hasattr(cmark, "cmark_parser_add_child"):
    cmark_parser_add_child = cmark.cmark_parser_add_child
    cmark_parser_add_child.restype = ctypes.POINTER(cmark_node)
    cmark_parser_add_child.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
        ctypes.POINTER(cmark_node),  # parent
        ctypes.c_uint32,  # block_type
        ctypes.c_int32,  # start_column
    ])

if hasattr(cmark, "cmark_parser_advance_offset"):
    cmark_parser_advance_offset = cmark.cmark_parser_advance_offset
    cmark_parser_advance_offset.restype = None
    cmark_parser_advance_offset.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
        ctypes.c_char_p,  # input
        ctypes.c_int32,  # count
        ctypes.c_int32,  # columns
    ])

if hasattr(cmark, "cmark_parser_attach_syntax_extension"):
    cmark_parser_attach_syntax_extension = cmark.cmark_parser_attach_syntax_extension
    cmark_parser_attach_syntax_extension.restype = ctypes.c_int32
    cmark_parser_attach_syntax_extension.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
        ctypes.POINTER(cmark_syntax_extension),  # extension
    ])

if hasattr(cmark, "cmark_parser_feed"):
    cmark_parser_feed = cmark.cmark_parser_feed
    cmark_parser_feed.restype = None
    cmark_parser_feed.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
        ctypes.c_char_p,  # buffer
        ctypes.c_uint64,  # len
    ])

if hasattr(cmark, "cmark_parser_feed_reentrant"):
    cmark_parser_feed_reentrant = cmark.cmark_parser_feed_reentrant
    cmark_parser_feed_reentrant.restype = None
    cmark_parser_feed_reentrant.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
        ctypes.c_char_p,  # buffer
        ctypes.c_uint64,  # len
    ])

if hasattr(cmark, "cmark_parser_finish"):
    cmark_parser_finish = cmark.cmark_parser_finish
    cmark_parser_finish.restype = ctypes.POINTER(cmark_node)
    cmark_parser_finish.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(cmark, "cmark_parser_free"):
    cmark_parser_free = cmark.cmark_parser_free
    cmark_parser_free.restype = None
    cmark_parser_free.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(cmark, "cmark_parser_get_column"):
    cmark_parser_get_column = cmark.cmark_parser_get_column
    cmark_parser_get_column.restype = ctypes.c_int32
    cmark_parser_get_column.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(cmark, "cmark_parser_get_first_nonspace"):
    cmark_parser_get_first_nonspace = cmark.cmark_parser_get_first_nonspace
    cmark_parser_get_first_nonspace.restype = ctypes.c_int32
    cmark_parser_get_first_nonspace.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(cmark, "cmark_parser_get_first_nonspace_column"):
    cmark_parser_get_first_nonspace_column = cmark.cmark_parser_get_first_nonspace_column
    cmark_parser_get_first_nonspace_column.restype = ctypes.c_int32
    cmark_parser_get_first_nonspace_column.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(cmark, "cmark_parser_get_indent"):
    cmark_parser_get_indent = cmark.cmark_parser_get_indent
    cmark_parser_get_indent.restype = ctypes.c_int32
    cmark_parser_get_indent.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(cmark, "cmark_parser_get_last_line_length"):
    cmark_parser_get_last_line_length = cmark.cmark_parser_get_last_line_length
    cmark_parser_get_last_line_length.restype = ctypes.c_int32
    cmark_parser_get_last_line_length.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(cmark, "cmark_parser_get_line_number"):
    cmark_parser_get_line_number = cmark.cmark_parser_get_line_number
    cmark_parser_get_line_number.restype = ctypes.c_int32
    cmark_parser_get_line_number.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(cmark, "cmark_parser_get_offset"):
    cmark_parser_get_offset = cmark.cmark_parser_get_offset
    cmark_parser_get_offset.restype = ctypes.c_int32
    cmark_parser_get_offset.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(cmark, "cmark_parser_get_syntax_extensions"):
    cmark_parser_get_syntax_extensions = cmark.cmark_parser_get_syntax_extensions
    cmark_parser_get_syntax_extensions.restype = ctypes.POINTER(_cmark_llist)
    cmark_parser_get_syntax_extensions.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(cmark, "cmark_parser_has_partially_consumed_tab"):
    cmark_parser_has_partially_consumed_tab = cmark.cmark_parser_has_partially_consumed_tab
    cmark_parser_has_partially_consumed_tab.restype = ctypes.c_int32
    cmark_parser_has_partially_consumed_tab.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(cmark, "cmark_parser_is_blank"):
    cmark_parser_is_blank = cmark.cmark_parser_is_blank
    cmark_parser_is_blank.restype = ctypes.c_int32
    cmark_parser_is_blank.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
    ])

if hasattr(cmark, "cmark_parser_new"):
    cmark_parser_new = cmark.cmark_parser_new
    cmark_parser_new.restype = ctypes.POINTER(cmark_parser)
    cmark_parser_new.argtypes = tuple([
        ctypes.c_int32,  # options
    ])

if hasattr(cmark, "cmark_parser_new_with_mem"):
    cmark_parser_new_with_mem = cmark.cmark_parser_new_with_mem
    cmark_parser_new_with_mem.restype = ctypes.POINTER(cmark_parser)
    cmark_parser_new_with_mem.argtypes = tuple([
        ctypes.c_int32,  # options
        ctypes.POINTER(cmark_mem),  # mem
    ])

if hasattr(cmark, "cmark_parser_set_backslash_ispunct_func"):
    cmark.cmark_parser_set_backslash_ispunct_func.restype = None
    cmark.cmark_parser_set_backslash_ispunct_func.argtypes = tuple([
        ctypes.POINTER(cmark_parser),  # parser
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.c_int8),  # func
    ])
    def cmark_parser_set_backslash_ispunct_func(*argv):
        if not hasattr(cmark_parser_set_backslash_ispunct_func, "callbacks"):
            cmark_parser_set_backslash_ispunct_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_parser_set_backslash_ispunct_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_parser_set_backslash_ispunct_func.callbacks.append(fn_arg(arg))
                args.append(cmark_parser_set_backslash_ispunct_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_parser_set_backslash_ispunct_func(*args)

if hasattr(cmark, "cmark_plugin_free"):
    cmark_plugin_free = cmark.cmark_plugin_free
    cmark_plugin_free.restype = None
    cmark_plugin_free.argtypes = tuple([
        ctypes.POINTER(cmark_plugin),  # plugin
    ])

if hasattr(cmark, "cmark_plugin_init_func"):
    cmark_plugin_init_func = cmark.cmark_plugin_init_func
    cmark_plugin_init_func.restype = ctypes.c_int32
    cmark_plugin_init_func.argtypes = tuple([
        ctypes.POINTER(cmark_plugin),  # None
    ])

if hasattr(cmark, "cmark_plugin_new"):
    cmark_plugin_new = cmark.cmark_plugin_new
    cmark_plugin_new.restype = ctypes.POINTER(cmark_plugin)
    cmark_plugin_new.argtypes = tuple([

    ])

if hasattr(cmark, "cmark_plugin_register_syntax_extension"):
    cmark_plugin_register_syntax_extension = cmark.cmark_plugin_register_syntax_extension
    cmark_plugin_register_syntax_extension.restype = ctypes.c_int32
    cmark_plugin_register_syntax_extension.argtypes = tuple([
        ctypes.POINTER(cmark_plugin),  # plugin
        ctypes.POINTER(cmark_syntax_extension),  # extension
    ])

if hasattr(cmark, "cmark_plugin_steal_syntax_extensions"):
    cmark_plugin_steal_syntax_extensions = cmark.cmark_plugin_steal_syntax_extensions
    cmark_plugin_steal_syntax_extensions.restype = ctypes.POINTER(_cmark_llist)
    cmark_plugin_steal_syntax_extensions.argtypes = tuple([
        ctypes.POINTER(cmark_plugin),  # plugin
    ])

if hasattr(cmark, "cmark_postprocess_func"):
    cmark_postprocess_func = cmark.cmark_postprocess_func
    cmark_postprocess_func.restype = ctypes.POINTER(cmark_node)
    cmark_postprocess_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # None
        ctypes.POINTER(cmark_parser),  # None
        ctypes.POINTER(cmark_node),  # None
    ])

if hasattr(cmark, "cmark_reference_create"):
    cmark_reference_create = cmark.cmark_reference_create
    cmark_reference_create.restype = None
    cmark_reference_create.argtypes = tuple([
        ctypes.POINTER(cmark_map),  # map
        ctypes.POINTER(cmark_chunk),  # label
        ctypes.POINTER(cmark_chunk),  # url
        ctypes.POINTER(cmark_chunk),  # title
    ])

if hasattr(cmark, "cmark_reference_map_new"):
    cmark_reference_map_new = cmark.cmark_reference_map_new
    cmark_reference_map_new.restype = ctypes.POINTER(cmark_map)
    cmark_reference_map_new.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
    ])

if hasattr(cmark, "cmark_register_plugin"):
    cmark.cmark_register_plugin.restype = None
    cmark.cmark_register_plugin.argtypes = tuple([
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_plugin)),  # reg_fn
    ])
    def cmark_register_plugin(*argv):
        if not hasattr(cmark_register_plugin, "callbacks"):
            cmark_register_plugin.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_register_plugin.argtypes):
            if callable(arg): # wrap functions                
                cmark_register_plugin.callbacks.append(fn_arg(arg))
                args.append(cmark_register_plugin.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_register_plugin(*args)

if hasattr(cmark, "cmark_release_plugins"):
    cmark_release_plugins = cmark.cmark_release_plugins
    cmark_release_plugins.restype = None
    cmark_release_plugins.argtypes = tuple([

    ])

if hasattr(cmark, "cmark_render"):
    cmark.cmark_render.restype = ctypes.c_char_p
    cmark.cmark_render.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.c_int32,  # width
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32, ctypes.c_char),  # outc
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32),  # render_node
    ])
    def cmark_render(*argv):
        if not hasattr(cmark_render, "callbacks"):
            cmark_render.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_render.argtypes):
            if callable(arg): # wrap functions                
                cmark_render.callbacks.append(fn_arg(arg))
                args.append(cmark_render.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_render(*args)

if hasattr(cmark, "cmark_render_ascii"):
    cmark_render_ascii = cmark.cmark_render_ascii
    cmark_render_ascii.restype = None
    cmark_render_ascii.argtypes = tuple([
        ctypes.POINTER(cmark_renderer),  # renderer
        ctypes.c_char_p,  # s
    ])

if hasattr(cmark, "cmark_render_code_point"):
    cmark_render_code_point = cmark.cmark_render_code_point
    cmark_render_code_point.restype = None
    cmark_render_code_point.argtypes = tuple([
        ctypes.POINTER(cmark_renderer),  # renderer
        ctypes.c_uint32,  # c
    ])

if hasattr(cmark, "cmark_render_commonmark"):
    cmark_render_commonmark = cmark.cmark_render_commonmark
    cmark_render_commonmark.restype = ctypes.c_char_p
    cmark_render_commonmark.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.c_int32,  # width
    ])

if hasattr(cmark, "cmark_render_commonmark_with_mem"):
    cmark_render_commonmark_with_mem = cmark.cmark_render_commonmark_with_mem
    cmark_render_commonmark_with_mem.restype = ctypes.c_char_p
    cmark_render_commonmark_with_mem.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.c_int32,  # width
        ctypes.POINTER(cmark_mem),  # mem
    ])

if hasattr(cmark, "cmark_render_html"):
    cmark_render_html = cmark.cmark_render_html
    cmark_render_html.restype = ctypes.c_char_p
    cmark_render_html.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.POINTER(_cmark_llist),  # extensions
    ])

if hasattr(cmark, "cmark_render_html_with_mem"):
    cmark_render_html_with_mem = cmark.cmark_render_html_with_mem
    cmark_render_html_with_mem.restype = ctypes.c_char_p
    cmark_render_html_with_mem.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.POINTER(_cmark_llist),  # extensions
        ctypes.POINTER(cmark_mem),  # mem
    ])

if hasattr(cmark, "cmark_render_latex"):
    cmark_render_latex = cmark.cmark_render_latex
    cmark_render_latex.restype = ctypes.c_char_p
    cmark_render_latex.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.c_int32,  # width
    ])

if hasattr(cmark, "cmark_render_latex_with_mem"):
    cmark_render_latex_with_mem = cmark.cmark_render_latex_with_mem
    cmark_render_latex_with_mem.restype = ctypes.c_char_p
    cmark_render_latex_with_mem.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.c_int32,  # width
        ctypes.POINTER(cmark_mem),  # mem
    ])

if hasattr(cmark, "cmark_render_man"):
    cmark_render_man = cmark.cmark_render_man
    cmark_render_man.restype = ctypes.c_char_p
    cmark_render_man.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.c_int32,  # width
    ])

if hasattr(cmark, "cmark_render_man_with_mem"):
    cmark_render_man_with_mem = cmark.cmark_render_man_with_mem
    cmark_render_man_with_mem.restype = ctypes.c_char_p
    cmark_render_man_with_mem.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.c_int32,  # width
        ctypes.POINTER(cmark_mem),  # mem
    ])

if hasattr(cmark, "cmark_render_plaintext"):
    cmark_render_plaintext = cmark.cmark_render_plaintext
    cmark_render_plaintext.restype = ctypes.c_char_p
    cmark_render_plaintext.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.c_int32,  # width
    ])

if hasattr(cmark, "cmark_render_plaintext_with_mem"):
    cmark_render_plaintext_with_mem = cmark.cmark_render_plaintext_with_mem
    cmark_render_plaintext_with_mem.restype = ctypes.c_char_p
    cmark_render_plaintext_with_mem.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.c_int32,  # width
        ctypes.POINTER(cmark_mem),  # mem
    ])

if hasattr(cmark, "cmark_render_xml"):
    cmark_render_xml = cmark.cmark_render_xml
    cmark_render_xml.restype = ctypes.c_char_p
    cmark_render_xml.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
    ])

if hasattr(cmark, "cmark_render_xml_with_mem"):
    cmark_render_xml_with_mem = cmark.cmark_render_xml_with_mem
    cmark_render_xml_with_mem.restype = ctypes.c_char_p
    cmark_render_xml_with_mem.argtypes = tuple([
        ctypes.POINTER(cmark_node),  # root
        ctypes.c_int32,  # options
        ctypes.POINTER(cmark_mem),  # mem
    ])

if hasattr(cmark, "cmark_strbuf_clear"):
    cmark_strbuf_clear = cmark.cmark_strbuf_clear
    cmark_strbuf_clear.restype = None
    cmark_strbuf_clear.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
    ])

if hasattr(cmark, "cmark_strbuf_cmp"):
    cmark_strbuf_cmp = cmark.cmark_strbuf_cmp
    cmark_strbuf_cmp.restype = ctypes.c_int32
    cmark_strbuf_cmp.argtypes = tuple([
        ctypes.POINTER(type("None", (ctypes.Structure,), {"_fields_":[
        ("mem", ctypes.POINTER(cmark_mem)),
        ("ptr", ctypes.POINTER(ctypes.c_char)),
        ("asize", ctypes.c_int32),
        ("size", ctypes.c_int32)
    ]})),  # a
        ctypes.POINTER(type("None", (ctypes.Structure,), {"_fields_":[
        ("mem", ctypes.POINTER(cmark_mem)),
        ("ptr", ctypes.POINTER(ctypes.c_char)),
        ("asize", ctypes.c_int32),
        ("size", ctypes.c_int32)
    ]})),  # b
    ])

if hasattr(cmark, "cmark_strbuf_copy_cstr"):
    cmark_strbuf_copy_cstr = cmark.cmark_strbuf_copy_cstr
    cmark_strbuf_copy_cstr.restype = None
    cmark_strbuf_copy_cstr.argtypes = tuple([
        ctypes.c_char_p,  # data
        ctypes.c_int32,  # datasize
        ctypes.POINTER(type("None", (ctypes.Structure,), {"_fields_":[
        ("mem", ctypes.POINTER(cmark_mem)),
        ("ptr", ctypes.POINTER(ctypes.c_char)),
        ("asize", ctypes.c_int32),
        ("size", ctypes.c_int32)
    ]})),  # buf
    ])

if hasattr(cmark, "cmark_strbuf_detach"):
    cmark_strbuf_detach = cmark.cmark_strbuf_detach
    cmark_strbuf_detach.restype = ctypes.POINTER(ctypes.c_char)
    cmark_strbuf_detach.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
    ])

if hasattr(cmark, "cmark_strbuf_drop"):
    cmark_strbuf_drop = cmark.cmark_strbuf_drop
    cmark_strbuf_drop.restype = None
    cmark_strbuf_drop.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.c_int32,  # n
    ])

if hasattr(cmark, "cmark_strbuf_free"):
    cmark_strbuf_free = cmark.cmark_strbuf_free
    cmark_strbuf_free.restype = None
    cmark_strbuf_free.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
    ])

if hasattr(cmark, "cmark_strbuf_grow"):
    cmark_strbuf_grow = cmark.cmark_strbuf_grow
    cmark_strbuf_grow.restype = None
    cmark_strbuf_grow.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.c_int32,  # target_size
    ])

if hasattr(cmark, "cmark_strbuf_init"):
    cmark_strbuf_init = cmark.cmark_strbuf_init
    cmark_strbuf_init.restype = None
    cmark_strbuf_init.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.c_int32,  # initial_size
    ])

if hasattr(cmark, "cmark_strbuf_len"):
    cmark_strbuf_len = cmark.cmark_strbuf_len
    cmark_strbuf_len.restype = ctypes.c_int32
    cmark_strbuf_len.argtypes = tuple([
        ctypes.POINTER(type("None", (ctypes.Structure,), {"_fields_":[
        ("mem", ctypes.POINTER(cmark_mem)),
        ("ptr", ctypes.POINTER(ctypes.c_char)),
        ("asize", ctypes.c_int32),
        ("size", ctypes.c_int32)
    ]})),  # buf
    ])

if hasattr(cmark, "cmark_strbuf_normalize_whitespace"):
    cmark_strbuf_normalize_whitespace = cmark.cmark_strbuf_normalize_whitespace
    cmark_strbuf_normalize_whitespace.restype = None
    cmark_strbuf_normalize_whitespace.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # s
    ])

if hasattr(cmark, "cmark_strbuf_put"):
    cmark_strbuf_put = cmark.cmark_strbuf_put
    cmark_strbuf_put.restype = None
    cmark_strbuf_put.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.POINTER(ctypes.c_char),  # data
        ctypes.c_int32,  # len
    ])

if hasattr(cmark, "cmark_strbuf_putc"):
    cmark_strbuf_putc = cmark.cmark_strbuf_putc
    cmark_strbuf_putc.restype = None
    cmark_strbuf_putc.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.c_int32,  # c
    ])

if hasattr(cmark, "cmark_strbuf_puts"):
    cmark_strbuf_puts = cmark.cmark_strbuf_puts
    cmark_strbuf_puts.restype = None
    cmark_strbuf_puts.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.c_char_p,  # string
    ])

if hasattr(cmark, "cmark_strbuf_rtrim"):
    cmark_strbuf_rtrim = cmark.cmark_strbuf_rtrim
    cmark_strbuf_rtrim.restype = None
    cmark_strbuf_rtrim.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
    ])

if hasattr(cmark, "cmark_strbuf_set"):
    cmark_strbuf_set = cmark.cmark_strbuf_set
    cmark_strbuf_set.restype = None
    cmark_strbuf_set.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.POINTER(ctypes.c_char),  # data
        ctypes.c_int32,  # len
    ])

if hasattr(cmark, "cmark_strbuf_sets"):
    cmark_strbuf_sets = cmark.cmark_strbuf_sets
    cmark_strbuf_sets.restype = None
    cmark_strbuf_sets.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.c_char_p,  # string
    ])

if hasattr(cmark, "cmark_strbuf_strchr"):
    cmark_strbuf_strchr = cmark.cmark_strbuf_strchr
    cmark_strbuf_strchr.restype = ctypes.c_int32
    cmark_strbuf_strchr.argtypes = tuple([
        ctypes.POINTER(type("None", (ctypes.Structure,), {"_fields_":[
        ("mem", ctypes.POINTER(cmark_mem)),
        ("ptr", ctypes.POINTER(ctypes.c_char)),
        ("asize", ctypes.c_int32),
        ("size", ctypes.c_int32)
    ]})),  # buf
        ctypes.c_int32,  # c
        ctypes.c_int32,  # pos
    ])

if hasattr(cmark, "cmark_strbuf_strrchr"):
    cmark_strbuf_strrchr = cmark.cmark_strbuf_strrchr
    cmark_strbuf_strrchr.restype = ctypes.c_int32
    cmark_strbuf_strrchr.argtypes = tuple([
        ctypes.POINTER(type("None", (ctypes.Structure,), {"_fields_":[
        ("mem", ctypes.POINTER(cmark_mem)),
        ("ptr", ctypes.POINTER(ctypes.c_char)),
        ("asize", ctypes.c_int32),
        ("size", ctypes.c_int32)
    ]})),  # buf
        ctypes.c_int32,  # c
        ctypes.c_int32,  # pos
    ])

if hasattr(cmark, "cmark_strbuf_swap"):
    cmark_strbuf_swap = cmark.cmark_strbuf_swap
    cmark_strbuf_swap.restype = None
    cmark_strbuf_swap.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf_a
        ctypes.POINTER(cmark_strbuf),  # buf_b
    ])

if hasattr(cmark, "cmark_strbuf_trim"):
    cmark_strbuf_trim = cmark.cmark_strbuf_trim
    cmark_strbuf_trim.restype = None
    cmark_strbuf_trim.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
    ])

if hasattr(cmark, "cmark_strbuf_truncate"):
    cmark_strbuf_truncate = cmark.cmark_strbuf_truncate
    cmark_strbuf_truncate.restype = None
    cmark_strbuf_truncate.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
        ctypes.c_int32,  # len
    ])

if hasattr(cmark, "cmark_strbuf_unescape"):
    cmark_strbuf_unescape = cmark.cmark_strbuf_unescape
    cmark_strbuf_unescape.restype = None
    cmark_strbuf_unescape.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # buf
    ])

if hasattr(cmark, "cmark_syntax_extension_add_node"):
    cmark_syntax_extension_add_node = cmark.cmark_syntax_extension_add_node
    cmark_syntax_extension_add_node.restype = ctypes.c_uint32
    cmark_syntax_extension_add_node.argtypes = tuple([
        ctypes.c_int32,  # is_inline
    ])

if hasattr(cmark, "cmark_syntax_extension_free"):
    cmark_syntax_extension_free = cmark.cmark_syntax_extension_free
    cmark_syntax_extension_free.restype = None
    cmark_syntax_extension_free.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
        ctypes.POINTER(cmark_syntax_extension),  # extension
    ])

if hasattr(cmark, "cmark_syntax_extension_get_private"):
    cmark_syntax_extension_get_private = cmark.cmark_syntax_extension_get_private
    cmark_syntax_extension_get_private.restype = ctypes.c_void_p
    cmark_syntax_extension_get_private.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
    ])

if hasattr(cmark, "cmark_syntax_extension_new"):
    cmark_syntax_extension_new = cmark.cmark_syntax_extension_new
    cmark_syntax_extension_new.restype = ctypes.POINTER(cmark_syntax_extension)
    cmark_syntax_extension_new.argtypes = tuple([
        ctypes.c_char_p,  # name
    ])

if hasattr(cmark, "cmark_syntax_extension_set_can_contain_func"):
    cmark.cmark_syntax_extension_set_can_contain_func.restype = None
    cmark.cmark_syntax_extension_set_can_contain_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node), ctypes.c_uint32),  # func
    ])
    def cmark_syntax_extension_set_can_contain_func(*argv):
        if not hasattr(cmark_syntax_extension_set_can_contain_func, "callbacks"):
            cmark_syntax_extension_set_can_contain_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_can_contain_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_can_contain_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_can_contain_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_can_contain_func(*args)

if hasattr(cmark, "cmark_syntax_extension_set_commonmark_escape_func"):
    cmark.cmark_syntax_extension_set_commonmark_escape_func.restype = None
    cmark.cmark_syntax_extension_set_commonmark_escape_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node), ctypes.c_int32),  # func
    ])
    def cmark_syntax_extension_set_commonmark_escape_func(*argv):
        if not hasattr(cmark_syntax_extension_set_commonmark_escape_func, "callbacks"):
            cmark_syntax_extension_set_commonmark_escape_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_commonmark_escape_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_commonmark_escape_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_commonmark_escape_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_commonmark_escape_func(*args)

if hasattr(cmark, "cmark_syntax_extension_set_commonmark_render_func"):
    cmark.cmark_syntax_extension_set_commonmark_render_func.restype = None
    cmark.cmark_syntax_extension_set_commonmark_render_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32),  # func
    ])
    def cmark_syntax_extension_set_commonmark_render_func(*argv):
        if not hasattr(cmark_syntax_extension_set_commonmark_render_func, "callbacks"):
            cmark_syntax_extension_set_commonmark_render_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_commonmark_render_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_commonmark_render_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_commonmark_render_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_commonmark_render_func(*args)

if hasattr(cmark, "cmark_syntax_extension_set_contains_inlines_func"):
    cmark.cmark_syntax_extension_set_contains_inlines_func.restype = None
    cmark.cmark_syntax_extension_set_contains_inlines_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node)),  # func
    ])
    def cmark_syntax_extension_set_contains_inlines_func(*argv):
        if not hasattr(cmark_syntax_extension_set_contains_inlines_func, "callbacks"):
            cmark_syntax_extension_set_contains_inlines_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_contains_inlines_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_contains_inlines_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_contains_inlines_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_contains_inlines_func(*args)

if hasattr(cmark, "cmark_syntax_extension_set_emphasis"):
    cmark_syntax_extension_set_emphasis = cmark.cmark_syntax_extension_set_emphasis
    cmark_syntax_extension_set_emphasis.restype = None
    cmark_syntax_extension_set_emphasis.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.c_int32,  # emphasis
    ])

if hasattr(cmark, "cmark_syntax_extension_set_get_type_string_func"):
    cmark.cmark_syntax_extension_set_get_type_string_func.restype = None
    cmark.cmark_syntax_extension_set_get_type_string_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_char_p, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node)),  # func
    ])
    def cmark_syntax_extension_set_get_type_string_func(*argv):
        if not hasattr(cmark_syntax_extension_set_get_type_string_func, "callbacks"):
            cmark_syntax_extension_set_get_type_string_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_get_type_string_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_get_type_string_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_get_type_string_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_get_type_string_func(*args)

if hasattr(cmark, "cmark_syntax_extension_set_html_filter_func"):
    cmark.cmark_syntax_extension_set_html_filter_func.restype = None
    cmark.cmark_syntax_extension_set_html_filter_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(ctypes.c_char), ctypes.c_uint64),  # func
    ])
    def cmark_syntax_extension_set_html_filter_func(*argv):
        if not hasattr(cmark_syntax_extension_set_html_filter_func, "callbacks"):
            cmark_syntax_extension_set_html_filter_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_html_filter_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_html_filter_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_html_filter_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_html_filter_func(*args)

if hasattr(cmark, "cmark_syntax_extension_set_html_render_func"):
    cmark.cmark_syntax_extension_set_html_render_func.restype = None
    cmark.cmark_syntax_extension_set_html_render_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_html_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32),  # func
    ])
    def cmark_syntax_extension_set_html_render_func(*argv):
        if not hasattr(cmark_syntax_extension_set_html_render_func, "callbacks"):
            cmark_syntax_extension_set_html_render_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_html_render_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_html_render_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_html_render_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_html_render_func(*args)

if hasattr(cmark, "cmark_syntax_extension_set_inline_from_delim_func"):
    cmark.cmark_syntax_extension_set_inline_from_delim_func.restype = None
    cmark.cmark_syntax_extension_set_inline_from_delim_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_parser), ctypes.POINTER(subject), ctypes.POINTER(delimiter), ctypes.POINTER(delimiter)),  # func
    ])
    def cmark_syntax_extension_set_inline_from_delim_func(*argv):
        if not hasattr(cmark_syntax_extension_set_inline_from_delim_func, "callbacks"):
            cmark_syntax_extension_set_inline_from_delim_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_inline_from_delim_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_inline_from_delim_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_inline_from_delim_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_inline_from_delim_func(*args)

if hasattr(cmark, "cmark_syntax_extension_set_latex_render_func"):
    cmark.cmark_syntax_extension_set_latex_render_func.restype = None
    cmark.cmark_syntax_extension_set_latex_render_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32),  # func
    ])
    def cmark_syntax_extension_set_latex_render_func(*argv):
        if not hasattr(cmark_syntax_extension_set_latex_render_func, "callbacks"):
            cmark_syntax_extension_set_latex_render_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_latex_render_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_latex_render_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_latex_render_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_latex_render_func(*args)

if hasattr(cmark, "cmark_syntax_extension_set_man_render_func"):
    cmark.cmark_syntax_extension_set_man_render_func.restype = None
    cmark.cmark_syntax_extension_set_man_render_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32),  # func
    ])
    def cmark_syntax_extension_set_man_render_func(*argv):
        if not hasattr(cmark_syntax_extension_set_man_render_func, "callbacks"):
            cmark_syntax_extension_set_man_render_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_man_render_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_man_render_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_man_render_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_man_render_func(*args)

if hasattr(cmark, "cmark_syntax_extension_set_match_block_func"):
    cmark.cmark_syntax_extension_set_match_block_func.restype = None
    cmark.cmark_syntax_extension_set_match_block_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_int32, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_parser), ctypes.POINTER(ctypes.c_char), ctypes.c_int32, ctypes.POINTER(cmark_node)),  # func
    ])
    def cmark_syntax_extension_set_match_block_func(*argv):
        if not hasattr(cmark_syntax_extension_set_match_block_func, "callbacks"):
            cmark_syntax_extension_set_match_block_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_match_block_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_match_block_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_match_block_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_match_block_func(*args)

if hasattr(cmark, "cmark_syntax_extension_set_match_inline_func"):
    cmark.cmark_syntax_extension_set_match_inline_func.restype = None
    cmark.cmark_syntax_extension_set_match_inline_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_parser), ctypes.POINTER(cmark_node), ctypes.c_char, ctypes.POINTER(subject)),  # func
    ])
    def cmark_syntax_extension_set_match_inline_func(*argv):
        if not hasattr(cmark_syntax_extension_set_match_inline_func, "callbacks"):
            cmark_syntax_extension_set_match_inline_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_match_inline_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_match_inline_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_match_inline_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_match_inline_func(*args)

if hasattr(cmark, "cmark_syntax_extension_set_opaque_alloc_func"):
    cmark.cmark_syntax_extension_set_opaque_alloc_func.restype = None
    cmark.cmark_syntax_extension_set_opaque_alloc_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_mem), ctypes.POINTER(cmark_node)),  # func
    ])
    def cmark_syntax_extension_set_opaque_alloc_func(*argv):
        if not hasattr(cmark_syntax_extension_set_opaque_alloc_func, "callbacks"):
            cmark_syntax_extension_set_opaque_alloc_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_opaque_alloc_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_opaque_alloc_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_opaque_alloc_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_opaque_alloc_func(*args)

if hasattr(cmark, "cmark_syntax_extension_set_opaque_free_func"):
    cmark.cmark_syntax_extension_set_opaque_free_func.restype = None
    cmark.cmark_syntax_extension_set_opaque_free_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_mem), ctypes.POINTER(cmark_node)),  # func
    ])
    def cmark_syntax_extension_set_opaque_free_func(*argv):
        if not hasattr(cmark_syntax_extension_set_opaque_free_func, "callbacks"):
            cmark_syntax_extension_set_opaque_free_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_opaque_free_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_opaque_free_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_opaque_free_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_opaque_free_func(*args)

if hasattr(cmark, "cmark_syntax_extension_set_open_block_func"):
    cmark.cmark_syntax_extension_set_open_block_func.restype = None
    cmark.cmark_syntax_extension_set_open_block_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.POINTER(cmark_syntax_extension), ctypes.c_int32, ctypes.POINTER(cmark_parser), ctypes.POINTER(cmark_node), ctypes.POINTER(ctypes.c_char), ctypes.c_int32),  # func
    ])
    def cmark_syntax_extension_set_open_block_func(*argv):
        if not hasattr(cmark_syntax_extension_set_open_block_func, "callbacks"):
            cmark_syntax_extension_set_open_block_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_open_block_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_open_block_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_open_block_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_open_block_func(*args)

if hasattr(cmark, "cmark_syntax_extension_set_plaintext_render_func"):
    cmark.cmark_syntax_extension_set_plaintext_render_func.restype = None
    cmark.cmark_syntax_extension_set_plaintext_render_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_renderer), ctypes.POINTER(cmark_node), ctypes.c_uint32, ctypes.c_int32),  # func
    ])
    def cmark_syntax_extension_set_plaintext_render_func(*argv):
        if not hasattr(cmark_syntax_extension_set_plaintext_render_func, "callbacks"):
            cmark_syntax_extension_set_plaintext_render_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_plaintext_render_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_plaintext_render_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_plaintext_render_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_plaintext_render_func(*args)

if hasattr(cmark, "cmark_syntax_extension_set_postprocess_func"):
    cmark.cmark_syntax_extension_set_postprocess_func.restype = None
    cmark.cmark_syntax_extension_set_postprocess_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_parser), ctypes.POINTER(cmark_node)),  # func
    ])
    def cmark_syntax_extension_set_postprocess_func(*argv):
        if not hasattr(cmark_syntax_extension_set_postprocess_func, "callbacks"):
            cmark_syntax_extension_set_postprocess_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_postprocess_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_postprocess_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_postprocess_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_postprocess_func(*args)

if hasattr(cmark, "cmark_syntax_extension_set_private"):
    cmark.cmark_syntax_extension_set_private.restype = None
    cmark.cmark_syntax_extension_set_private.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.c_void_p,  # priv
        ctypes.CFUNCTYPE(None, ctypes.POINTER(cmark_mem), ctypes.c_void_p),  # free_func
    ])
    def cmark_syntax_extension_set_private(*argv):
        if not hasattr(cmark_syntax_extension_set_private, "callbacks"):
            cmark_syntax_extension_set_private.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_private.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_private.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_private.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_private(*args)

if hasattr(cmark, "cmark_syntax_extension_set_special_inline_chars"):
    cmark_syntax_extension_set_special_inline_chars = cmark.cmark_syntax_extension_set_special_inline_chars
    cmark_syntax_extension_set_special_inline_chars.restype = None
    cmark_syntax_extension_set_special_inline_chars.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.POINTER(_cmark_llist),  # special_chars
    ])

if hasattr(cmark, "cmark_syntax_extension_set_xml_attr_func"):
    cmark.cmark_syntax_extension_set_xml_attr_func.restype = None
    cmark.cmark_syntax_extension_set_xml_attr_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # extension
        ctypes.CFUNCTYPE(ctypes.c_char_p, ctypes.POINTER(cmark_syntax_extension), ctypes.POINTER(cmark_node)),  # func
    ])
    def cmark_syntax_extension_set_xml_attr_func(*argv):
        if not hasattr(cmark_syntax_extension_set_xml_attr_func, "callbacks"):
            cmark_syntax_extension_set_xml_attr_func.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,cmark.cmark_syntax_extension_set_xml_attr_func.argtypes):
            if callable(arg): # wrap functions                
                cmark_syntax_extension_set_xml_attr_func.callbacks.append(fn_arg(arg))
                args.append(cmark_syntax_extension_set_xml_attr_func.callbacks[-1])
            else:
                args.append(arg)
        return cmark.cmark_syntax_extension_set_xml_attr_func(*args)

if hasattr(cmark, "cmark_utf8proc_case_fold"):
    cmark_utf8proc_case_fold = cmark.cmark_utf8proc_case_fold
    cmark_utf8proc_case_fold.restype = None
    cmark_utf8proc_case_fold.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # dest
        ctypes.POINTER(ctypes.c_char),  # str
        ctypes.c_int32,  # len
    ])

if hasattr(cmark, "cmark_utf8proc_check"):
    cmark_utf8proc_check = cmark.cmark_utf8proc_check
    cmark_utf8proc_check.restype = None
    cmark_utf8proc_check.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # ob
        ctypes.POINTER(ctypes.c_char),  # line
        ctypes.c_int32,  # size
    ])

if hasattr(cmark, "cmark_utf8proc_encode_char"):
    cmark_utf8proc_encode_char = cmark.cmark_utf8proc_encode_char
    cmark_utf8proc_encode_char.restype = None
    cmark_utf8proc_encode_char.argtypes = tuple([
        ctypes.c_int32,  # uc
        ctypes.POINTER(cmark_strbuf),  # buf
    ])

if hasattr(cmark, "cmark_utf8proc_is_punctuation"):
    cmark_utf8proc_is_punctuation = cmark.cmark_utf8proc_is_punctuation
    cmark_utf8proc_is_punctuation.restype = ctypes.c_int32
    cmark_utf8proc_is_punctuation.argtypes = tuple([
        ctypes.c_int32,  # uc
    ])

if hasattr(cmark, "cmark_utf8proc_is_space"):
    cmark_utf8proc_is_space = cmark.cmark_utf8proc_is_space
    cmark_utf8proc_is_space.restype = ctypes.c_int32
    cmark_utf8proc_is_space.argtypes = tuple([
        ctypes.c_int32,  # uc
    ])

if hasattr(cmark, "cmark_utf8proc_iterate"):
    cmark_utf8proc_iterate = cmark.cmark_utf8proc_iterate
    cmark_utf8proc_iterate.restype = ctypes.c_int32
    cmark_utf8proc_iterate.argtypes = tuple([
        ctypes.POINTER(ctypes.c_char),  # str
        ctypes.c_int32,  # str_len
        ctypes.POINTER(ctypes.c_int32),  # dst
    ])

if hasattr(cmark, "cmark_version"):
    cmark_version = cmark.cmark_version
    cmark_version.restype = ctypes.c_int32
    cmark_version.argtypes = tuple([

    ])

if hasattr(cmark, "cmark_version_string"):
    cmark_version_string = cmark.cmark_version_string
    cmark_version_string.restype = ctypes.c_char_p
    cmark_version_string.argtypes = tuple([

    ])

if hasattr(cmark, "cmark_xml_attr_func"):
    cmark_xml_attr_func = cmark.cmark_xml_attr_func
    cmark_xml_attr_func.restype = ctypes.c_char_p
    cmark_xml_attr_func.argtypes = tuple([
        ctypes.POINTER(cmark_syntax_extension),  # None
        ctypes.POINTER(cmark_node),  # None
    ])

if hasattr(cmark, "houdini_escape_href"):
    houdini_escape_href = cmark.houdini_escape_href
    houdini_escape_href.restype = ctypes.c_int32
    houdini_escape_href.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # ob
        ctypes.POINTER(ctypes.c_char),  # src
        ctypes.c_int32,  # size
    ])

if hasattr(cmark, "houdini_escape_html"):
    houdini_escape_html = cmark.houdini_escape_html
    houdini_escape_html.restype = ctypes.c_int32
    houdini_escape_html.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # ob
        ctypes.POINTER(ctypes.c_char),  # src
        ctypes.c_int32,  # size
    ])

if hasattr(cmark, "houdini_escape_html0"):
    houdini_escape_html0 = cmark.houdini_escape_html0
    houdini_escape_html0.restype = ctypes.c_int32
    houdini_escape_html0.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # ob
        ctypes.POINTER(ctypes.c_char),  # src
        ctypes.c_int32,  # size
        ctypes.c_int32,  # secure
    ])

if hasattr(cmark, "houdini_unescape_ent"):
    houdini_unescape_ent = cmark.houdini_unescape_ent
    houdini_unescape_ent.restype = ctypes.c_int32
    houdini_unescape_ent.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # ob
        ctypes.POINTER(ctypes.c_char),  # src
        ctypes.c_int32,  # size
    ])

if hasattr(cmark, "houdini_unescape_html"):
    houdini_unescape_html = cmark.houdini_unescape_html
    houdini_unescape_html.restype = ctypes.c_int32
    houdini_unescape_html.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # ob
        ctypes.POINTER(ctypes.c_char),  # src
        ctypes.c_int32,  # size
    ])

if hasattr(cmark, "houdini_unescape_html_f"):
    houdini_unescape_html_f = cmark.houdini_unescape_html_f
    houdini_unescape_html_f.restype = None
    houdini_unescape_html_f.argtypes = tuple([
        ctypes.POINTER(cmark_strbuf),  # ob
        ctypes.POINTER(ctypes.c_char),  # src
        ctypes.c_int32,  # size
    ])

if hasattr(cmark, "normalize_map_label"):
    normalize_map_label = cmark.normalize_map_label
    normalize_map_label.restype = ctypes.POINTER(ctypes.c_char)
    normalize_map_label.argtypes = tuple([
        ctypes.POINTER(cmark_mem),  # mem
        ctypes.POINTER(cmark_chunk),  # ref
    ])

