UNAME=$(shell uname)
INCLUDES= -I../cmark-gfm/src -I../cmark-gfm/build_$(UNAME)/src -I../cmark-gfm/extensions -I../cmark-gfm/build_$(UNAME)/extensions
EFLAGS=-O3 -s WASM=1
EXPORTS='[\
		"_md_to_html", \
		"_string_to_document", \
		"_cmark_node_get_type_string", \
		"_cmark_node_first_child", \
		"_cmark_node_next", \
		"_cmark_node_get_start_line", \
		"_cmark_node_get_start_column", \
		"_cmark_node_get_end_line", \
		"_cmark_node_get_end_column", \
		"_cmark_node_get_literal", \
		"_cmark_node_get_heading_level", \
		"_cmark_node_get_fence_info", \
		"_cmark_node_get_url", \
		"_cmark_node_get_title", \
		"_cmark_node_get_list_type", \
		"_cmark_node_get_list_tight", \
		"_cmark_node_get_list_start", \
		"_cmark_node_get_list_delim", \
		"_cmark_gfm_extensions_get_table_alignments"]'
EXTRA_FLAGS=-s "EXTRA_EXPORTED_RUNTIME_METHODS=['cwrap', 'getValue']" -s EXPORTED_FUNCTIONS=$(EXPORTS)

.PHONY: clean

all: cmark.js

clean:
	rm -rf build_emcc cmark.* cmark_debug.*

build_emcc/main.c.bc: ../cmark-gfm/src ../cmark-gfm/extensions Makefile
	mkdir -p build_emcc
	for FILE in $$(ls ../cmark-gfm/src/*.c | grep -v main\.c); do \
		emcc $(EFLAGS) -g -c $(INCLUDES) $$FILE -o build_emcc/$$(basename $$FILE).bc; \
		done
	for FILE in ../cmark-gfm/extensions/*.c; do \
		emcc $(EFLAGS) -g -c $(INCLUDES) $$FILE -o build_emcc/$$(basename $$FILE).bc; \
		done
	emcc $(EFLAGS) -g -c $(INCLUDES) ../main.c -o build_emcc/main.c.bc

cmark_debug.js: build_emcc/main.c.bc Makefile
	emcc $(EFLAGS) $(EXTRA_FLAGS) -g4 --source-map-base / -s ASSERTIONS=1 $(INCLUDES) build_emcc/*.bc -o $@

cmark.js: build_emcc/main.c.bc Makefile
	emcc $(EFLAGS) $(EXTRA_FLAGS) $(INCLUDES) build_emcc/*.bc -o $@
	rm -f cmark.wasm.gz
	gzip cmark.wasm
