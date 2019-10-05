test-linux: test.c | cmark-gfm/build_linux
	$(CC) -g $< \
		cmark-gfm/build_linux/src/libcmark-gfm.a \
		cmark-gfm/build_linux/extensions/libcmark-gfm-extensions.a \
		-Icmark-gfm/src \
		-Icmark-gfm/build_linux/src \
		-Icmark-gfm/extensions \
		-Icmark-gfm/build_linux/extensions \
		-o $@

test-osx: test.c | cmark-gfm/build_osx
	$(CC) -g $< \
		cmark-gfm/build_osx/src/libcmark-gfm.a \
		cmark-gfm/build_osx/extensions/libcmark-gfm-extensions.a \
		-Icmark-gfm/src \
		-Icmark-gfm/build_osx/src \
		-Icmark-gfm/extensions \
		-Icmark-gfm/build_osx/extensions \
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

test: test.c
	$(CC) $< -o test -lcmark-gfm -lcmark-gfm-extensions

clean:
	rm -f test
