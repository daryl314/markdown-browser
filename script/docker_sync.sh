#!/bin/bash

# check input arguments
if [[ $# -lt 2 ]]; then
    echo "USAGE: $0 <token> <output_location>"
    exit 1
else
    EVERNOTE_TOKEN=$1
    SYNC_LOCATION=$(cd $2 >/dev/null ; pwd)
fi

# base repository location
BASELOC=$(cd "$(dirname "$0")" ; pwd)/..

# docker container tag
TAG=markdown-browser
DF=$BASELOC/script/Dockerfile

# return true if an image needs to be updated
function stale_container() {
    if docker images | grep $1 >/dev/null; then
        local IMAGE_DATE=$(docker inspect -f '{{ .Created }}' $1 | head -c 19)
        local DOCKERFILE_DATE=$(date -r $2 +"%Y-%m-%dT%H:%M:%S" | head -c 19)
        [[ $DOCKERFILE_DATE > $IMAGE_DATE ]]
    else
        return 0
    fi
}

# build image if necessary
if stale_container $TAG $DF; then
    docker build -t $TAG - <$DF
fi

# launch container
function launch() {
  docker run -it --rm \
      -v "$BASELOC":/root/app:ro \
      -v $SYNC_LOCATION:/root/app/syncData:rw \
      -w /root/app/script \
      $TAG \
      $@
}
if [[ $# -lt 3 ]]; then
  launch ./node-sync.js $EVERNOTE_TOKEN /root/app/syncData
  launch ./node-render.js /root/app/syncData
  launch ./gen_pdf.sh /root/app/syncData
else # debug with ./docker_sync.sh xxx yyy /bin/bash
  launch $3
fi
