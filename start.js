var http = require('http')
var DatabaseResponse = require('./lib/response').DatabaseResponse
var MixDatabase = require('./lib/file-interface').MixDatabase
var env = process.env

var config = {
    userJson: 'user.json',
    questionJson: 'question.json',
    saveInterval: 60 * 60 * 1000
}

var database = new MixDatabase(
    config.userJson,
    config.questionJson,
    config.saveInterval
)
DatabaseResponse.setDatabase(database)

database.init().then(function () {
    var server = http.createServer(function onRequest(request, response) {
	var dbResponse = new DatabaseResponse(request, response)
	dbResponse.execute()
    })
    server.listen(
	env.NODE_PORT || 3000,
	env.NODE_IP || 'localhost'
    )
})

