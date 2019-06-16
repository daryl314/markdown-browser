#!/bin/bash

docker run -it --rm \
        -v "$PWD":/root:rw \
        -v $HOME/Personal/utilities/python/pytools:/pytools:ro \
        buildpack-deps:18.04 /bin/bash -c '
    apt-get update && apt-get install -y python-pyelftools python-networkx python-psutil cmake
    cd /tmp
    git clone https://github.com/github/cmark-gfm.git
    cd cmark-gfm/
    git checkout 0.29.0.gfm.0 
    mkdir build
    cd build
    cmake -DCMAKE_BUILD_TYPE=Debug ..
    make
    make test
    cd /root
    cp /tmp/cmark-gfm/build/src/libcmark-gfm.so .
    cp /tmp/cmark-gfm/build/extensions/libcmark-gfm-extensions.so .
    export PYTHONPATH=/
    export LD_LIBRARY_PATH=$(pwd)
    python -m pytools.bin.DwarfToCtypes libcmark-gfm.so --novariables
    python -m pytools.bin.DwarfToCtypes libcmark-gfm-extensions.so --novariables
    objdump -g /tmp/cmark-gfm/build/src/libcmark-gfm.so > libcmark-gfm.dwarf
    objdump -g /tmp/cmark-gfm/build/extensions/libcmark-gfm-extensions.so > libcmark-gfm-extensions.dwarf
'
