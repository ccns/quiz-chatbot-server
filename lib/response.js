var url = require('url')
var querystring = require('querystring')
var fs = require('fs')
var log = require('./log')
var readmeFile = 'README.md'

function PostReader(request) {
    this.request = request
    this.postData = ''
}
PostReader.prototype.readSegment = function (segment) {
    this.postData += segment
}
PostReader.prototype.read = function () {
    return new Promise(function (resolve) {
        this.request.on('data', this.readSegment.bind(this))
        this.request.on('end', function () {
            resolve(this)
        }.bind(this))
    }.bind(this))
}
PostReader.prototype.parse = function () {
    try {
        if (this.request.headers['content-type'].match('js')) {
            this.postObject = JSON.parse(this.postData)
        }
        else this.postObject = querystring.parse(this.postData)
    }
    catch (parseError) {
        this.parseError = parseError
    }
}
PostReader.prototype.execute = function () {
    return this.read().then(function (reader) {
        reader.parse()
        return reader
    })
}

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
    'Access-Control-Allow-Origin': '*',
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
DatabaseResponse.prototype.writeOk = function () {
    var response = this.response
    response.writeHead(200)
    response.end()
}

DatabaseResponse.prototype.execute = function () {
    var request = this.request
    // healthy test usually has empty headers['host'].
    if (request.headers['host']) {
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
        this.writeOk()
        break
    case 'GET':
        this.route()
        break
    case 'POST':
        var postReader = new PostReader(request)
        postReader.execute().then(function (postReader) {
            this.log('recieve data: %s', postReader.postData)
            if (postReader.postObject) {
                this.postObject = postReader.postObject
                this.route()
            }
            else this.writeError(HttpError.from(postReader.parseError, 400))
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
    case '/info.json':
        this.responseInfo()
        break
    case '/user-database.json':
    case '/question-database.json':
        this.responseDatabase()
        break
    case '/healthy':
        this.writeOk()
    default:
        this.writeError(new HttpError(404, 'file not found'))
        break
    }
}
DatabaseResponse.prototype.responseDatabase = function () {
    switch (this.request.method) {
    case 'GET':
        var database
        this.log('dump database')
        if (this.url.pathname.match(/^\/user/)) {
            database = this.database.dumpUser()
        }
        else if (this.url.pathname.match(/^\/question/)) {
            database = this.database.questionBase
        }
        this.writeJson(database)
        break
    case 'POST':
        this.log('load database')
        if (this.url.pathname.match(/^\/user/)) {
            this.database.loadUser(this.postObject)
            this.writeOk()
        }
        else if (this.url.pathname.match(/^\/question/)) {
            try {
                this.database.loadQuestion(this.postObject)
            }
            catch (questionError) {
                this.writeError(new HttpError(400, 'questions must be array'))
            }
            this.writeOk()
        }
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

    if (user) {
        if (this.request.method == 'GET') {
            user = extentOrder(this.database, user)
        }
        this.writeUser(user)
    }

    function extentOrder(database, user) {
        var newObject = Object.assign({}, user)
        newObject.order = database.getOrder(user.name)
        newObject.total = database.getUserNumber()
        return newObject
    }
}

DatabaseResponse.prototype.addUser = function () {
    var postObject = this.postObject
    try {
        var user = this.database.addUser(
            postObject.user,
            postObject.nickname,
            postObject.platform
        )
    }
    catch (addError) {
        throw HttpError.from(addError, 409)
    }
    return user
}

DatabaseResponse.prototype.writeUser = function (user) {
    this.log('response user: %s', user.nickname || user.name)
    //user.order = this.database.getOrder(user.name) // add order
    this.writeJson(user)
}

DatabaseResponse.prototype.responseQuestion = function () {
    var query = this.url.query
    new Promise((responseQuestion, reject) => {
        var id = query.id
        var user = query.user
        if (id || typeof id == 'number') {
            var question = this.database.getQuestion(id)
            if (!question) {
                reject(new HttpError(
                    404, 'question #' + id + ' does not exist.'
                ))
            }
            else responseQuestion(question)
        }
        else if (user) {
            responseQuestion(this.database.getRandomQuestion(user))
        }
        else reject(new HttpError(400, 'invalid argument!'))
    }).then(
        (question) => {
            this.writeQuestion(question)
        },
        (questionError) => {
            this.writeError(HttpError.from(questionError, 404))
        }
    )
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
        this.writeJson(result)
    }
    catch (answerError) {
        answerError.code = 404
        this.writeError(answerError)
    }
}

exports.DatabaseResponse = DatabaseResponse
