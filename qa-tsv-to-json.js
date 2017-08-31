
var db = require('./lib/database')
var Question = db.Question

function StreamReader(stream) {
    this.data = ''
    this.stream = stream
}

StreamReader.prototype.read = function () {
    this.stream.on('data', this._readDataSegement.bind(this))
    return new Promise(function (resolve) {
        this.stream.on('end', function () {
            resolve(this)
        }.bind(this))
    }.bind(this))
}

StreamReader.prototype._readDataSegement = function (segement) {
    this.data += segement
}

var stdinReader = new StreamReader(process.stdin)

function parseTsvToJson(tsvText) {
    var questionArray = tsvText
        .trim()
        .split(/\n/g)
        .map((row) => row.trim().split(/\t/g))
        .map(rowArrayToQuestion)

    return JSON.stringify(questionArray)
    
    function rowArrayToQuestion(row) {
        return new Question(
            row[3],
            row.slice(4,8),
            (String(row[8]).charCodeAt(0) - 65)%4, // from ABCD to 0123
            null, // id should only use in db
            row[0],
            row[1],
            row[2],
            row[9]
        )
    }
}

stdinReader.read().then(function (stdinReader) {
    console.log(parseTsvToJson(stdinReader.data))
})
