#!/bin/bash
cd /home/kavia/workspace/code-generation/typemaster-103546-5689c3c9/type_master_web_app
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

