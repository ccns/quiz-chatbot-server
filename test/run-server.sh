#!/bin/sh

quiz_server=localhost:3000

node start.js &
sleep 3s

get() {
    url="$1"
    curl "$url"
}

post_querystring() {
    querystring="$1"
    url="$2"
    curl -d "$querystring" "$url"
}

post_json() {
    json_file="$1"
    url="$2"
    curl -H 'Content-Type: application/json' -d @"$json_file" "$url"
}

post_json question-database.json $quiz_server/question-database.json
post_querystring \
    'user=1000&nickname=gholk&platform=curl' \
    $quiz_server/user.json
