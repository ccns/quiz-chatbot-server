var url = require('url')

function HttpError(code, message) {
    Error.call(this, message)
    this.code = code
    this.message = message
}
HttpError.prototype = new Error()
HttpError.prototype.constructor = HttpError

function DatabaseResponse(request, response) {
    this.request = request
    this.response = response
    this.url = url.parse(request.url, true) // parse querystring as object
}
DatabaseResponse.setDatabase = function (database) {
    this.prototype.database = database
}
DatabaseResponse.prototype.log = function () {
    arguments[0] = '[route] ' + arguments[0]
    console.log.apply(console, arguments)
}
DatabaseResponse.prototype.error = function () {
    arguments[0] = '[route] ' + arguments[0]
    console.error.apply(console, arguments)
}
DatabaseResponse.prototype.jsonHead = {'Content-Type': 'application/json'}
DatabaseResponse.prototype.writeError = function (httpError) {
    var response = this.response
    this.error('response %d: %s', httpError.code, httpError)
    response.writeHead(httpError.code || 404, this.jsonHead)
    response.write(JSON.stringify({message: String(httpError)}))
    response.end()
}
DatabaseResponse.prototype.execute = function () {
    var request = this.request
    this.log('%s %s', request.method, request.url)
    switch (request.method) {
    case 'GET':
	this.route()
	break
    case 'POST':
	var request = this.request
	this.postData = ''
	request.on('data', function onPostData(segment) {
	    this.postData += segment
	}.bind(this))
	request.on('end', function onPostRead() {
	    this.route()
	    this.log('recieve data: %s', this.postData)
	}.bind(this))
	break
    default:
	this.writeError(new Error(405, 'not allow method'))
	break
    }
}

DatabaseResponse.prototype.route = function () {
    switch (this.url.pathname) {
    case '/':
	this.response.writeHead(200)
	this.response.end()
	break
    case '/question':
	this.responseQuestion()
	break
    case '/user':
	this.responseUser()
	break
    case '/answer':
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
	var postData = JSON.parse(this.postData)
    }
    catch (parseError) {
	parseError.code = 400
	throw parseError
    }

    try {
	var user = this.database.addUser(postData.user)
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
    var json = JSON.parse(this.postData)
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
