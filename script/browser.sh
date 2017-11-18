#!/bin/bash

# location of script directory
SCRIPT=`dirname $0`

# if a file was passed, open it
if [[ $# -ge 1 ]]; then

  # if an anchor was passed, jump to it after opening the file
  if [[ $1 == *#* ]]; then
    FILE=`echo $1 | sed 's/#.*//' | sed 's/ /\\\\ /g'`
    LINK=`echo $1 | sed 's/.*#//'`
    PYTHONPATH=$SCRIPT vim -c "so $SCRIPT/renderer.vim" -c "view $FILE" -c "call HeadingSearch('$LINK')"

  # otherwise just open the file
  else
    FILE=`echo $1 | sed 's/ /\\\\ /g'`
    PYTHONPATH=$SCRIPT vim -c "so $SCRIPT/renderer.vim" -c "view $FILE"
  fi

# otherwise open root directory
else
  PYTHONPATH=$SCRIPT vim -c "so $SCRIPT/renderer.vim" -c "view $SCRIPT/../"
fi

