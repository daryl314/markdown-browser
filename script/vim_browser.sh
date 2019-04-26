#!/bin/bash

# location of script directory
SCRIPT=$(cd "$(dirname "$0")"; pwd)

# if a file was passed, open it
if [[ $# -ge 1 ]]; then

  # if an anchor was passed, jump to it after opening the file
  if [[ $1 == *#* ]]; then
    FILE=`echo $1 | sed 's/#.*//' | sed 's/ /\\\\ /g'`
    LINK=`echo $1 | sed 's/.*#//'`
    PYTHONPATH=$SCRIPT/pyvim vim -c "so $SCRIPT/renderer.vim" -c "view $FILE" -c "call ScrollToHeadingText('$LINK')"

  # otherwise just open the file
  else
    FILE=`echo $1 | sed 's/ /\\\\ /g'`
    PYTHONPATH=$SCRIPT/pyvim vim -c "so $SCRIPT/renderer.vim" -c "view $FILE"
  fi

# otherwise open root directory
else
  PYTHONPATH=$SCRIPT/pyvim vim -c "so $SCRIPT/renderer.vim" -c "view $SCRIPT/../"
fi

