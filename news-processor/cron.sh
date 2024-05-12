#!/bin/bash
export PATH=/Users/mr.o/.yarn/bin:/Users/mr.o/.config/yarn/global/node_modules/.bin:/Users/mr.o/.serverless/bin:/Applications/ora/client/instantclient_18_1::/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/Library/Apple/usr/bin:/usr/local/share/dotnet:~/.dotnet/tools:/Library/Frameworks/Mono.framework/Versions/Current/Commands

# This run every hour, do not delete
cd /Users/mr.o/Datascience/news-analyser/news-processor
npm install
tsc eltiempo-summariser.ts
node eltiempo-summariser.js