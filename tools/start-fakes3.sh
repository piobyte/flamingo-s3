#!/usr/bin/env bash

ROOT_DIR="/tmp/fakes3"
PORT="4567"

gem install fakes3

# provide s3 root
mkdir -p ${ROOT_DIR}

# start s3
fakes3 -r ${ROOT_DIR} -p ${PORT} &


