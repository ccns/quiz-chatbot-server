var url = require('url')
var querystring = require('querystring')
var fs = require('fs')
var log = require('./log')
var readmeFile = 'README.md'

function HttpError(code, message) {
    Error.call(this, message)
    this.code = code
    this.message = message
}
HttpError.prototype = new Error()
HttpError.prototype.constructor = HttpError
HttpError.from = function (noHttpError, code) {
    noHttpError.code = code
    return noHttpError
}

function DatabaseResponse(request, response) {
    this.request = request
    this.response = response
    this.url = url.parse(request.url, true) // parse querystring as object
}
DatabaseResponse.setDatabase = function (database) {
    this.prototype.database = database
}

var drLogger = new log.Logger(console, 'router')
DatabaseResponse.prototype.log = drLogger.log.bind(drLogger)
DatabaseResponse.prototype.error = drLogger.error.bind(drLogger)

DatabaseResponse.prototype.jsonHead = {
    'Content-Type': 'application/json; charset=utf-8'
}
DatabaseResponse.prototype.textHead = {
    'Content-Type': 'text/plain; charset=utf-8'
}
DatabaseResponse.prototype.writeError = function (httpError) {
    var response = this.response
    this.error('response %d: %s', httpError.code, httpError)
    response.writeHead(httpError.code || 404, this.jsonHead)
    response.write(JSON.stringify({message: String(httpError)}))
    response.end()
}

DatabaseResponse.prototype.execute = function () {
    var request = this.request
    if (request.headers['user-agent']) {
	this.log(
	    '%s %s %s',
	    request.method,
	    request.url,
	    request.headers['user-agent'].slice(0,20)
	)
    }
    switch (request.method) {
    case 'HEAD':
    case 'GET':
	this.route()
	break
    case 'POST':
	this.postData = ''
	request.on('data', function onPostData(segment) {
	    this.postData += segment
	}.bind(this))
	request.on('end', function onPostRead() {
	    try {
		if (request.headers['content-type'].match('js')) {
		    this.postObject = JSON.parse(this.postData)
		}
		else this.postObject = querystring.parse(this.postData.trim())
	    }
	    catch (parseError) {
		this.writeError(HttpError.from(parseError, 400))
		this.postObject = null
	    }
	    if (this.postObject) {
		this.log('recieve data: %s', this.postData)
		this.route()
	    }
	}.bind(this))
	break
    default:
	var methodError = new Error('not allow method')
	methodError.code = 405
	this.writeError(methodError)
	break
    }
}

DatabaseResponse.prototype.route = function () {
    switch (this.url.pathname) {
    case '/':
	this.response.writeHead(200, this.textHead)
	fs.createReadStream(readmeFile).pipe(this.response)
	break
    case '/question':
    case '/question.json':
	this.responseQuestion()
	break
    case '/user':
    case '/user.json':
	this.responseUser()
	break
    case '/answer':
    case '/answer.json':
	this.responseAnswer()
	break
    case '/healthy':
	var response = this.response
	response.writeHead(200)
	response.end()
    default:
	this.writeError(new HttpError(404, 'file not found'))
	break
    }
}
DatabaseResponse.prototype.responseUser = function () {
    try {
	switch (this.request.method) {
	case 'POST':
	    var user = this.addUser()
	    break
	case 'GET':
	    var name = this.url.query.user
	    if (!name) throw new HttpError(400, 'invalid argument')
	    var user = this.database.getUser(name)
	    if (!user) throw new HttpError(404, 'no such user')
	    break
	}

	this.writeUser(user)
    }
    catch (userError) {
	this.writeError(userError)
    }
}
DatabaseResponse.prototype.addUser = function () {
    try {
	var user = this.database.addUser(this.postObject.user)
    }
    catch (addError) {
	addError.code = 409
	throw addError
    }
    return user
}

DatabaseResponse.prototype.writeUser = function (user) {
    this.log('response user: %s', user.name)
    var response = this.response
    response.writeHead(200, this.jsonHead)
    response.write(JSON.stringify(user))
    response.end()
}

DatabaseResponse.prototype.responseQuestion = function () {
    var query = this.url.query
    try {
	var question
	if (!isNaN(query.id)) {
	    question = this.database.getQuestion(Number(query.id))
	    if (!question) {
		throw new HttpError(
		    404,
		    'question #' + query.id + ' does not exist.'
		)
	    }
	}
	else if (query.user) {
	    question = this.database.getRandomQuestion(query.user)
	}
	else {
	    throw new HttpError(400, 'invalid argument!')
	}
	
	this.writeQuestion(question)
    }
    catch (questionError) {
	if (!questionError.code) questionError.code = 404
	this.writeError(questionError)
    }
}

DatabaseResponse.prototype.writeQuestion = function (question) {
    this.log('response question: %s', question.question.slice(0,15))
    var response = this.response
    response.writeHead(200, this.jsonHead)
    response.write(JSON.stringify(question))
    response.end()
}

DatabaseResponse.prototype.responseAnswer = function () {
    var json = this.postObject
    try {
	var result = this.database.answer(json.user, json.id, json.answer)
	var response = this.response
	response.writeHead(200, this.jsonHead)
	response.write(String(result))
	response.end()
    }
    catch (answerError) {
	answerError.code = 404
	this.writeError(answerError)
    }
}

exports.DatabaseResponse = DatabaseResponse
