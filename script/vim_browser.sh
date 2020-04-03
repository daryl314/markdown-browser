#!/bin/bash
set -x

# location of script directory
SCRIPT=$(cd "$(dirname "$0")"; pwd)

# open a file
function open_file() {
    if [[ $# -eq 2 ]]; then
        local ARGS=(-c "call ScrollToHeadingText('$2')" -c 'cmap q qa')
    else
        local ARGS=(-c 'cmap q qa')
    fi
    if echo $1 2>&1 | grep '\.md$' >/dev/null; then
        # markdown file that needs to be fed through conversion tool
        $SCRIPT/MarkdownTool.py "$1" --action JSON \
            | PYTHONPATH=$SCRIPT/pyvim vim -R - -c "so $SCRIPT/renderer.vim" -c 'call ParseJSON()' "${ARGS[@]}"
    else
        # preprocessed json
        PYTHONPATH=$SCRIPT/pyvim vim -c "so $SCRIPT/renderer.vim" -c "view $1" "${ARGS[@]}"
    fi
}

# if a file was passed, open it
if [[ $# -ge 1 ]]; then
    if [[ $1 == *#* ]]; then  # has an anchor
        FILE="$(echo $1 | sed 's/#.*//')"
        LINK="$(echo $1 | sed 's/.*#//')"
        open_file "$FILE" "$LINK"
    else  # no anchor
        open_file "$1"
    fi

# otherwise open root directory
else
    PYTHONPATH=$SCRIPT/pyvim vim -c "so $SCRIPT/renderer.vim" -c "view $SCRIPT/../" -c "cmap q qa"
fi

