UNAME=$(shell uname)
INCLUDES= -I../cmark-gfm/src -I../cmark-gfm/build_$(UNAME)/src -I../cmark-gfm/extensions -I../cmark-gfm/build_$(UNAME)/extensions
EFLAGS=-O3 -s WASM=1 -s ASSERTIONS=1

.PHONY: clean

all: cmark.js

clean:
	rm -rf build_emcc main.c.bc cmark.js cmark.wasm cmark.wasm.map

build_emcc/inlines.c.bc: ../cmark-gfm/src ../cmark-gfm/extensions Makefile
	mkdir -p build_emcc
	for FILE in $$(ls ../cmark-gfm/src/*.c | grep -v main\.c); do \
		emcc $(EFLAGS) -g -c $(INCLUDES) $$FILE -o build_emcc/$$(basename $$FILE).bc; \
		done
	for FILE in ../cmark-gfm/extensions/*.c; do \
		emcc $(EFLAGS) -g -c $(INCLUDES) $$FILE -o build_emcc/$$(basename $$FILE).bc; \
		done

main.c.bc: ../main.c Makefile
	emcc $(EFLAGS) -g -c $(INCLUDES) $< -o main.c.bc

cmark.js: build_emcc/inlines.c.bc main.c.bc Makefile
	emcc $(EFLAGS) -g4 \
		--source-map-base / \
		-s "EXTRA_EXPORTED_RUNTIME_METHODS=['cwrap']" \
		-s EXPORTED_FUNCTIONS='["_md_to_html"]' \
		$(INCLUDES) build_emcc/*.bc main.c.bc -o $@
