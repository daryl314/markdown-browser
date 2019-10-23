UNAME=$(shell uname)
INCLUDES= -Icmark-gfm/src -Icmark-gfm/build_$(UNAME)/src -Icmark-gfm/extensions -Icmark-gfm/build_$(UNAME)/extensions
BUILD=cmark-gfm/build_$(UNAME)
LIBS=$(BUILD)/src/libcmark-gfm.a $(BUILD)/extensions/libcmark-gfm-extensions.a 
ifeq ($(UNAME), Darwin)
	LIBEXT=dylib
else
	LIBEXT=so
endif

all: gfm-$(UNAME) gfm.$(LIBEXT)

.PHONY: clean

gfm.$(LIBEXT): main.c | $(LIBS)
	$(CC) -g -fPIC -shared $< $(INCLUDES) $(LIBS) -o $@

gfm-$(UNAME): main.c | $(LIBS)
	$(CC) -g $< $(INCLUDES) $(LIBS) -o $@

cmark-gfm/build_$(UNAME)/src/libcmark-gfm.a: | cmark-gfm/build_$(UNAME) cmark-gfm
	cd cmark-gfm/build_$(UNAME) && cmake -DCMAKE_BUILD_TYPE=Debug .. && make

cmark-gfm:
	git clone https://github.com/github/cmark-gfm.git 
	cd cmark-gfm/ && git checkout 0.29.0.gfm.0

cmark-gfm/build_$(UNAME): | cmark-gfm
	mkdir -p $@

cmarkgfm.py:
	PYTHONPATH=~/Personal/utilities/python python -m pytools.bin.DwarfToCtypes gfm.so --outfile=cmarkgfm.py

clean:
	rm -rf gfm-Darwin.dSYM
	rm -f gfm-* gfm.*
	rm -rf cmark-gfm
