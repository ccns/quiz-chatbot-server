
var fs = require('fs')
var db = require('./database')
var Database = db.Database

function readPromise(path) {
    return new Promise(function (resolve, reject) {
	fs.readFile(path, 'utf8', function whenFileRead(readError, file) {
	    if (readError) reject(readError)
	    else resolve(file)
	})
    })
}
function writePromise(path, string) {
    return new Promise(function (fileWrite, fileWriteError) {
	fs.writeFile(path, string, 'utf8', function whenFileWrite(writeError) {
	    if (writeError) fileWriteError(writeError)
	    else fileWrite()
	})
    })
}

function MixDatabase(userJson, questionJson, interval) {
    Database.call(this)
    this.userJson = userJson
    this.questionJson = questionJson
    this.saveInterval = interval
}
MixDatabase.prototype = new Database()
MixDatabase.prototype.constructor = MixDatabase
MixDatabase.prototype.fsLog = function () {
    var time = (new Date()).toLocaleTimeString()
    arguments[0] = time + ' [fs] ' + arguments[0]
    console.log.apply(console, arguments)
}
MixDatabase.prototype.fsError = function () {
    var time = (new Date()).toLocaleTimeString()
    arguments[0] = time + ' [fs] ' + arguments[0]
    console.error.apply(console, arguments)
}

MixDatabase.prototype.loadUserFile = function () {
    return readPromise(this.userJson).then(
	function whenUserRead(userJson) {
	    this.loadUser(JSON.parse(userJson))
	    this.fsLog('load user file done.')
	    return this
	}.bind(this),
	function whenReadError(readError) {
	    this.fsError('read user file error!')
	    this.fsError(readError)
	    return this
	}.bind(this)
    )
}
MixDatabase.prototype.loadQuestionFile = function () {
    return readPromise(this.questionJson).then(
	function whenQuestionRead(questionJson) {
	    this.loadQuestion(JSON.parse(questionJson))
	    this.fsLog('read question done.')
	    return this
	}.bind(this),
	function whenReadError(readError) {
	    this.fsError('read question error!')
	    this.fsError(readError)
	    throw readError
	}.bind(this)
    )
}
MixDatabase.prototype.saveUserFile = function () {
    return writePromise(
	this.userJson,
	JSON.stringify(this.dumpUser())
    )
}

MixDatabase.prototype.init = function () {
    return this.loadQuestionFile()
	.then(function (mix) {return mix.loadUserFile()})
	.then(function (mix) {
	    setTimeout(function autoSaveDatabase() {
		mix.saveUserFile().then(
		    function whenMixSave() {
			mix.fsLog(
			    'save database at %s',
			    new Date().toISOString()
			)
			setTimeout(autoSaveDatabase, mix.saveInterval)
		    },
		    function whenMixSaveError(saveError) {
			mix.fsError(
			    '%s: %s',
			    new Date().toISOString(),
			    saveError
			)
			setTimeout(autoSaveDatabase, mix.saveInterval)
		    }
		)
	    }, mix.saveInterval)
	})
}

exports.MixDatabase = MixDatabase
