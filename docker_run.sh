#!/bin/bash

docker run \
  -it                      `# interactive tty` \
  --rm                     `# remove when done` \
  --name my-running-script `# container name` \
  -v "$PWD":/usr/src/myapp `# include current directory`  \
  -w /usr/src/myapp        `# run from mount location` \
  -p 127.0.0.1:8080:8080   `# forward port 8080 to 8080 (localhost only)` \
  python:2                 `# use python2 image` \
  ./proxy.py               `# run proxy script`


