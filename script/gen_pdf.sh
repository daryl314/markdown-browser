#!/bin/bash

# check input arguments
if [[ $# -lt 1 ]]; then
  echo "USAGE:"
  echo "  $0 sync_directory"
  echo "  $0 markdown_file [pdf_file]"
  exit 1
fi

# absolute path to script location
LOC=$(cd "$(dirname "$0")"; pwd)

# process a file
if [[ -f $1 ]]; then
  if [[ $# -lt 2 ]]; then
    OUT_FILE=$1.pdf
  else
    OUT_FILE=$2
  fi
  echo "$(basename "$1") --> $(basename "$OUT_FILE")"
  cat "$1" | $LOC/md_to_pandoc.py \
    | pandoc -f markdown -o "$OUT_FILE"

# process a directory
elif [[ -d $1 ]]; then
  echo "Processing directory: $1"
  find $1 -name "*.md" -exec $LOC/$(basename $0) "{}" \;

# otherwise something isn't right
else
  echo "Unrecognized input: $1"
  exit 1
fi
