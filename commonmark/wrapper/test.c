#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "parser.h"
#include "render.h"
#include "registry.h"
#include "cmark-gfm.h"
#include "cmark-gfm-core-extensions.h"


/*
 * Configuration
 */

// include line numbers in output
int options = CMARK_OPT_DEFAULT | CMARK_OPT_SOURCEPOS;


/*
 * Syntax extension helper functions
 */

static cmark_node* node_from_text(cmark_syntax_extension *ext, cmark_parser *parser, cmark_inline_parser *inline_parser, int start, int stop) {

    // save current offset
    int offset = cmark_inline_parser_get_offset(inline_parser);

    // instantiate a node
    cmark_node *node = cmark_node_new_with_mem(CMARK_NODE_CODE, parser->mem);
    node->extension = ext;

    // set start position
    cmark_inline_parser_set_offset(inline_parser, start);
    node->start_line = cmark_inline_parser_get_line(inline_parser);
    node->start_column = cmark_inline_parser_get_column(inline_parser);

    // set end position
    cmark_inline_parser_set_offset(inline_parser, stop);
    node->end_line = cmark_inline_parser_get_line(inline_parser);
    node->end_column = cmark_inline_parser_get_column(inline_parser);

    // copy text from inline parser into node
    cmark_strbuf buf;
    cmark_strbuf_init(parser->mem, &buf, stop - start);
    for (int i = start; i < stop; i++) cmark_strbuf_putc(&buf, cmark_inline_parser_peek_at(inline_parser, i));
    cmark_node_set_literal(node, cmark_strbuf_cstr(&buf));
    cmark_strbuf_free(&buf);

    // restore offset and return the node
    cmark_inline_parser_set_offset(inline_parser, offset);
    return node;
}

static bool parser_strcmp(cmark_inline_parser *inline_parser, int offset, const char *text) {
    int base_offset = cmark_inline_parser_get_offset(inline_parser);
    if (base_offset + offset >= 0) {
        for (int i = 0; text[i] != '\x00'; i++) {
            if (text[i] != cmark_inline_parser_peek_at(inline_parser, base_offset + offset + i)) {
                return false;
            }
        }
    }
    return true;
}

static void rewind_node(cmark_node *container, int n) {
    cmark_node_unput(container, n);
    cmark_node *prev = cmark_node_last_child(container);
    const char *text = cmark_node_get_literal(prev);
    if (text == NULL || text[0] == '\x00') {
        cmark_node_unlink(prev);
        cmark_node_free(prev);
    }
}


/*
 * Node type name functions
 */

static const char *get_type_string_b_latex(cmark_syntax_extension *extension, cmark_node *node) {
  return node->type == CMARK_NODE_CODE ? "latex_block" : "<unknown>";
}

static const char *get_type_string_i_latex(cmark_syntax_extension *extension, cmark_node *node) {
  return node->type == CMARK_NODE_CODE ? "latex_inline" : "<unknown>";
}


/*
 * Rendering functions
 */

static inline void render_inside(cmark_renderer *renderer, cmark_node *node, const char *before, const char *after) {
    renderer->out(renderer, node, before, false, LITERAL);
    renderer->out(renderer, node, cmark_node_get_literal(node), false, LITERAL);
    renderer->out(renderer, node, after, false, LITERAL);    
}

static inline void render_inside_h(cmark_html_renderer *renderer, cmark_node *node, const char *before, const char *after) {
    cmark_strbuf_puts(renderer->html, before);
    cmark_strbuf_puts(renderer->html, cmark_node_get_literal(node));
    cmark_strbuf_puts(renderer->html, after);
}

static void latex_render_b_latex(cmark_syntax_extension *extension, cmark_renderer *renderer, cmark_node *node, cmark_event_type ev_type, int options) {
    render_inside(renderer, node, "\\[", "\\]");
}

static void latex_render_i_latex(cmark_syntax_extension *extension, cmark_renderer *renderer, cmark_node *node, cmark_event_type ev_type, int options) {
    render_inside(renderer, node, "\\(", "\\)");
}

static void html_render_b_latex(cmark_syntax_extension *extension, cmark_html_renderer *renderer, cmark_node *node, cmark_event_type ev_type, int options) {
    render_inside_h(renderer, node, "<latex class=\"block\">", "</latex>");
}

static void html_render_i_latex(cmark_syntax_extension *extension, cmark_html_renderer *renderer, cmark_node *node, cmark_event_type ev_type, int options) {
    render_inside_h(renderer, node, "<latex class=\"inline\">", "</latex>");
}

static void cmark_render_b_latex(cmark_syntax_extension *extension, cmark_renderer *renderer, cmark_node *node, cmark_event_type ev_type, int options) {
    render_inside(renderer, node, "$$", "$$");
}

static void cmark_render_i_latex(cmark_syntax_extension *extension, cmark_renderer *renderer, cmark_node *node, cmark_event_type ev_type, int options) {
    render_inside(renderer, node, "\\\\(", "\\\\)");
}


/*
 * Inline match functions
 */

static cmark_node *match_b_latex(cmark_syntax_extension *self, cmark_parser *parser,
        cmark_node *parent, unsigned char character, cmark_inline_parser *inline_parser) {
    if (character == '$' && parser_strcmp(inline_parser, 0, "$$")) {
        for (int cur_offset = 2; cmark_inline_parser_peek_at(inline_parser, cur_offset) != '\x00'; cur_offset++) {
            if (parser_strcmp(inline_parser, cur_offset, "$$")) {
                int base_offset = cmark_inline_parser_get_offset(inline_parser);
                cmark_inline_parser_set_offset(inline_parser, base_offset + cur_offset + 2);
                return node_from_text(self, parser, inline_parser, base_offset + 2, base_offset + cur_offset);
            }
        }
    }
    return NULL;
}

static cmark_node *match_i_latex(cmark_syntax_extension *self, cmark_parser *parser,
        cmark_node *parent, unsigned char character, cmark_inline_parser *inline_parser) {
    if (character == '(' && parser_strcmp(inline_parser, -2, "\\\\(")) {
        for (int cur_offset = 3; cmark_inline_parser_peek_at(inline_parser, cur_offset) != '\x00'; cur_offset++) {
            if (parser_strcmp(inline_parser, cur_offset, "\\\\)")) {
                rewind_node(parent, 1);  // remove leading backslash from parent
                int base_offset = cmark_inline_parser_get_offset(inline_parser);
                cmark_inline_parser_set_offset(inline_parser, base_offset + cur_offset + 3);
                return node_from_text(self, parser, inline_parser, base_offset + 1, base_offset + cur_offset);
            }
        }
    }
    return NULL;
}

cmark_syntax_extension *create_latex_block_extension(void) {
    // cmark_syntax_extension_set_can_contain_func shouldn't be needed -- acts as a code node
    // TODO: determine if cmark_syntax_extension_set_inline_from_delim_func is needed
    cmark_syntax_extension *ext = cmark_syntax_extension_new("latex_block");
    cmark_mem *mem = cmark_get_default_mem_allocator();

    // special characters
    cmark_llist *special_characters = NULL;
    special_characters = cmark_llist_append(mem, special_characters, (void *)'$');
    cmark_syntax_extension_set_special_inline_chars(ext, special_characters);

    // used for cmark_node_get_type_string in node.c
    cmark_syntax_extension_set_get_type_string_func(ext, get_type_string_b_latex);

    // TODO: determine if this is needed
    cmark_syntax_extension_set_emphasis(ext, 1);

    // match function for inline text
    cmark_syntax_extension_set_match_inline_func(ext, match_b_latex);

    // rendering -- rely on code renderer for other document types
    cmark_syntax_extension_set_latex_render_func(ext, latex_render_b_latex);
    cmark_syntax_extension_set_html_render_func(ext, html_render_b_latex);
    cmark_syntax_extension_set_commonmark_render_func(ext, cmark_render_b_latex);
    return ext;
}

cmark_syntax_extension *create_latex_inline_extension(void) {
    // cmark_syntax_extension_set_can_contain_func shouldn't be needed -- acts as a code node
    // TODO: determine if cmark_syntax_extension_set_inline_from_delim_func is needed
    cmark_syntax_extension *ext = cmark_syntax_extension_new("latex_inline");

    // used for cmark_node_get_type_string in node.c
    cmark_syntax_extension_set_get_type_string_func(ext, get_type_string_i_latex);

    // TODO: determine if this is needed
    cmark_syntax_extension_set_emphasis(ext, 1);

    // match function for inline text
    cmark_syntax_extension_set_match_inline_func(ext, match_i_latex);

    // rendering -- rely on code renderer for other document types
    cmark_syntax_extension_set_latex_render_func(ext, latex_render_i_latex);
    cmark_syntax_extension_set_html_render_func(ext, html_render_i_latex);
    cmark_syntax_extension_set_commonmark_render_func(ext, cmark_render_i_latex);
    return ext;
}


/*
 * Application
 */

void startup(void) {
    cmark_gfm_core_extensions_ensure_registered();
}

void shutdown(void) {
    cmark_release_plugins();
}

void attach_extension(cmark_parser *parser, const char *name) {
    cmark_syntax_extension *syntax_extension = cmark_find_syntax_extension(name);
    if (!syntax_extension) {
        fprintf(stderr, "Unknown extension %s\n", name);
        exit(1);
    } else {
        cmark_parser_attach_syntax_extension(parser, syntax_extension);
    }
}

cmark_parser* get_parser() {
    cmark_parser *parser = cmark_parser_new_with_mem(options, cmark_get_arena_mem_allocator());
    attach_extension(parser, "autolink");
    attach_extension(parser, "table");
    attach_extension(parser, "strikethrough");
    attach_extension(parser, "tagfilter");
    attach_extension(parser, "tasklist");
    cmark_parser_attach_syntax_extension(parser, create_latex_block_extension());
    cmark_parser_attach_syntax_extension(parser, create_latex_inline_extension());
    return parser;
}

cmark_node* file_to_document(FILE *fp) {
    char buffer[4096];
    size_t bytes;
    cmark_parser *parser = get_parser();
    while ((bytes = fread(buffer, 1, sizeof(buffer), fp)) > 0) {
        cmark_parser_feed(parser, buffer, bytes);
        if (bytes < sizeof(buffer)) {
            break;
        }
    }
    cmark_node *document = cmark_parser_finish(parser);
    cmark_parser_free(parser);
    return document;
}

cmark_node* filename_to_document(const char *file_name) {
    FILE *fp = fopen(file_name, "rb");
    if (fp == NULL) {
        fprintf(stderr, "Error opening file %s\n", file_name);
        exit(1);
    }
    cmark_node *document = file_to_document(fp);
    fclose(fp);
    return document;
}

cmark_node* stdin_to_document(void) {
    return file_to_document(stdin);
}

cmark_node* string_to_document(const char *md) {
    cmark_parser *parser = get_parser();
    cmark_parser_feed(parser, md, strlen(md));
    cmark_node *document = cmark_parser_finish(parser);
    cmark_parser_free(parser);
    return document;
}

char* document_to_html(cmark_node *document) {
    cmark_parser *parser = get_parser();
    cmark_mem *mem = cmark_get_default_mem_allocator();
    char *result = cmark_render_html_with_mem(document, options, cmark_parser_get_syntax_extensions(parser), mem);
    cmark_parser_free(parser);
    return result; 
}

char* document_to_xml(cmark_node *document) {
    cmark_mem *mem = cmark_get_default_mem_allocator();
    return cmark_render_xml_with_mem(document, options, mem);
}

char* document_to_cmark(cmark_node *document) {
    cmark_mem *mem = cmark_get_default_mem_allocator();
    return cmark_render_commonmark_with_mem(document, options, 80, mem);
}

void print_and_free(const char *fmt, char *result) {
    printf(fmt, result);
    cmark_get_default_mem_allocator()->free(result);
}

void print_usage(const char* bin_name) {
    printf("Usage:   %s [MARKDOWN_FILE]\n", bin_name);
    printf("Options:\n");
    printf("  -                 Read input from stdin\n");
    printf("  --help            Display help message\n");
    printf("  --xml             Render as XML instead of HTML\n");
    printf("  --cmark           Render as commonmark instead of HTML\n");
}

int main(int argc, char *argv[]) {
    startup();

    int i;
    bool is_xml = false, is_cmark = false;
    cmark_node *document = NULL;

    if (argc == 1) {
        print_usage(argv[0]);
        printf("\n==========\n\n");
    }

    for (i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--help") == 0) {
            print_usage(argv[0]);
            return 0;
        } else if (strcmp(argv[i], "--xml") == 0) {
            is_xml   = true;
        } else if (strcmp(argv[i], "--cmark") == 0) {
            is_cmark = true;
        } else if (strcmp(argv[i], "-") == 0) {
            document = stdin_to_document();
        } else {
            document = filename_to_document(argv[i]);
        }
    }

    if (!document) {
        const char* md = "# Test #\n\n* This ~is~ `code` ... $$\n* test $$block$$ or \\\\(inline\\\\) text\n\n$$a*2$$\n\n\\\\(b*2\\\\)";
        document = string_to_document(md);
    }
    
    if (is_xml) {
        print_and_free("%s\n", document_to_xml(document));
    } else if (is_cmark) {
        print_and_free("%s\n", document_to_cmark(document));
    } else {
        print_and_free("%s\n", document_to_html(document));
    }

    cmark_node_free(document);
    shutdown();
    return 0;
}
