#!/usr/bin/awk -f
BEGIN {
    FS = "\t"
}

function double_quote(string) {
    gsub("\"", "\\\"", string)
    return "\"" string "\""
}

function print_key_value(key, value) {
    printf "%s:%s,", double_quote(key), double_quote(value)
}

function print_array(option_array) {
    print "["
    for (option in option_array) {
        print double_quote(option_array[option]) ","
    }
    print "]"
}

{
    print "{"
    print_key_value("time", $1)
    print_key_value("author", $2)
    print_key_value("category",$3)
    print_key_value("question",$4)
    print_key_value("answer",$9)
    print_key_value("hint",$10)
    for (i=0; i<=3; i++) {
        option_array[i] = $(i+5)
    }
    print double_quote("option") ":"
    print_array(option_array)
    print "},"
}
