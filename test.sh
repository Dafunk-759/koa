#! /bin/bash

debug=$2

if [ $debug -eq 1 ]; then
  node inspect node_modules/jest/bin/jest.js --runInBand $1
else
  node_modules/jest/bin/jest.js --forceExit $1
fi