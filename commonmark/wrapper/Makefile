INCLUDES= -Icmark-gfm/src -Icmark-gfm/build_linux/src -Icmark-gfm/extensions -Icmark-gfm/build_linux/extensions

test-linux: test.c | cmark-gfm/build_linux
	$(CC) -g $< $(INCLUDES) \
		cmark-gfm/build_linux/src/libcmark-gfm.a \
		cmark-gfm/build_linux/extensions/libcmark-gfm-extensions.a \
		-o $@

test-osx: test.c | cmark-gfm/build_osx
	$(CC) -g $< $(INCLUDES) \
		cmark-gfm/build_osx/src/libcmark-gfm.a \
		cmark-gfm/build_osx/extensions/libcmark-gfm-extensions.a \
		-o $@

cmark-gfm:
	git clone https://github.com/github/cmark-gfm.git 
	cd cmark-gfm/ && git checkout 0.29.0.gfm.0

cmark-gfm/build_linux: | cmark-gfm
	mkdir $@
	cd $@ && cmake -DCMAKE_BUILD_TYPE=Debug .. && make

cmark-gfm/build_osx: | cmark-gfm
	mkdir $@
	cd $@ && cmake -DCMAKE_BUILD_TYPE=Debug .. && make

clean:
	rm -f test-linux test-osx
