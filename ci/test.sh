#!/bin/sh

set -e

yarn install --no-progress
yarn preversion
yarn build
