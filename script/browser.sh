#!/bin/bash

SCRIPT=`dirname $0`

if [[ $# -ge 1 ]]; then
  FILE=$1
else
  #FILE=$SCRIPT/../index.html
  FILE=$SCRIPT/../
fi

echo "Opening file: $FILE"
PYTHONPATH=$SCRIPT vim -c "so $SCRIPT/renderer.vim" -c "view $FILE"
