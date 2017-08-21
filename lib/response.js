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
    if (!noHttpError.code) noHttpError.code = code
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
    this.error('response %d: %s', httpError.code, httpError)
    this.writeJson(
        {message: String(httpError)},
        httpError.code || 404
    )
}
DatabaseResponse.prototype.writeJson = function (object, code) {
    if (!code) code = 200
    var response = this.response
    response.writeHead(code, this.jsonHead)
    response.write(JSON.stringify(object))
    response.end()
}
DatabaseResponse.prototype.execute = function () {
    var request = this.request
    if (request.headers.host) {
        this.log(
            '%s %s %s %s',
	    request.headers['x-forwarded-for'],
            request.method,
            request.url,
	    // prevent request.headers['user-agent'] undefined
            String(request.headers['user-agent']).slice(0,10)
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
        var methodError = new HttpError(405, 'not allow method')
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
    case '/user-database.json':
        this.responseDatabase()
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
DatabaseResponse.prototype.responseDatabase = function () {
    switch (this.request.method) {
    case 'GET':
        this.log('dump user database')
        var userDatabase = this.database.dumpUser()
        this.writeJson(userDatabase)
        break
    default:
        this.writeError(new HttpError(405, 'not allow method'))
        break
    }
}

DatabaseResponse.prototype.responseUser = function () {
    var user
    try {
        switch (this.request.method) {
        case 'POST':
            user = this.addUser()
            break
        case 'GET':
            var name = this.url.query.user
            if (!name) throw new HttpError(400, 'invalid argument')
            user = this.database.getUser(name)
            if (!user) throw new HttpError(404, 'no such user')
            break
        }
    }
    catch (userError) {
        this.writeError(userError)
        user = null
    }
    if (user) this.writeUser(user)
}
DatabaseResponse.prototype.addUser = function () {
    try {
        var user = this.database.addUser(this.postObject.user)
    }
    catch (addError) {
        throw HttpError.from(addError, 409)
    }
    return user
}

DatabaseResponse.prototype.writeUser = function (user) {
    this.log('response user: %s', user.name)
    this.writeJson(user)
}

DatabaseResponse.prototype.responseQuestion = function () {
    var query = this.url.query
    var question
    try {
        var id = query.id
        if (!isNaN(id)) {
            question = this.database.getQuestion(Number(id))
            if (!question) {
                throw new HttpError(
                    404,
                    'question #' + id + ' does not exist.'
                )
            }
        }
        else if (query.user) {
            question = this.database.getRandomQuestion(query.user)
        }
        else {
            throw new HttpError(400, 'invalid argument!')
        }
    }
    catch (questionError) {
        this.writeError(HttpError.from(questionError, 404))
        question = null
    }
    if (question) this.writeQuestion(question)
}

DatabaseResponse.prototype.writeQuestion = function (question) {
    this.log('response question: %s', question.question.slice(0,15))
    this.writeJson(question)
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
