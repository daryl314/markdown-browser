#!/bin/bash

docker run \
  -it \
  --rm \
  --name en-sync \
  -v "$PWD":/root/app \
  -w /root/app \
  node:7 \
  node node-sync.js $@
