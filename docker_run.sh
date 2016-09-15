#!/bin/bash

docker run \
  -it                      `# interactive tty` \
  --rm                     `# remove when done` \
  --name my-running-script `# container name` \
  -v "$PWD":/usr/src/myapp `# include current directory`  \
  -w /usr/src/myapp        `# run from mount location` \
  -p 8080:8080             `# forward port 8080 to 8080` \
  python:2                 `# use python2 image` \
  ./proxy.py               `# run proxy script`


