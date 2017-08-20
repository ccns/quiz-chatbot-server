#!/bin/sh

node start.js &
sleep 3s

url=localhost:3000
get_quizbe() {
    file=$1
    query=$2
    curl $url/$file?$query
}
post_quizbe() {
    file=$1
    data="$2"
    curl -d "$data" $url/$file
}

get_quizbe question.json
get_quizbe question.json id=8
get_quizbe question.json user=gholk
get_quizbe question.json user=gholk

post_quizbe user.json user=gholk
post_quizbe user.json user=test-1
post_quizbe answer.json 'user=test-1&id=8&answer=0'
post_quizbe answer.json 'user=gholk&id=8&answer=0'
