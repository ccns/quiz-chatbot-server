
var log = require('./log')

function Question(
    question, option, answer, id, time, author, category, hint
) {
    this.question = question
    this.option = option
    this.answer = answer
    this.id = id
    this.time = time
    this.author = author
    this.category = category
    this.hint = hint
}
Question.fromObject = function (object) {
    object.verify = this.prototype.verify
}

Question.prototype.verify = function (answer) {
    if (answer == this.answer) return true
    else return false
}

function User(name, questionNumber, nickname) {
    this.name = name
    if (nickname) this.nickname = nickname
    this.questionStatus = new Array(questionNumber).fill(0)
    this.point = 0
}
User.prototype.answer = function (question, answer) {
    var unanswer = 0
    var wrong = 1
    var right = 2

    if (answer) var answerCode = right
    else var answerCode = wrong

    if (!this.questionStatus[question]) {
	this.questionStatus[question] = answerCode
	if (answerCode == right) {
	    this.point++
	}
    }
}
User.prototype.alreadyAnswer = function (question) {
    if (this.questionStatus[question]) return true
    else return false
}

function Database(questionBase, userBase) {
    this.questionBase = questionBase || []
    this.userBase = userBase || new Map()
}

var databaseLogger = new log.Logger(console, 'database')
Database.prototype.log = databaseLogger.log.bind(databaseLogger)
Database.prototype.error = databaseLogger.error.bind(databaseLogger)

Database.prototype.getUser = function (name) {
    if (this.userBase.has(name)) return this.userBase.get(name)
    else return undefined
}
Database.prototype.getQuestion = function (index) {
    if (index >= 0 && index < this.questionBase.length) {
	return this.questionBase[index]
    }
    else return undefined
}

Database.prototype.answer = function (name, id, answer) {
    var user = this.getUser(name)
    if (!user) throw new Error('user ' + name + ' does not exist!')

    var question = this.getQuestion(id)
    if (!question) throw new Error('question #' + index + ' does not exist!')

    var result = question.verify(answer)
    user.answer(id, result)
    return result
}

Database.prototype.getOrder = function (name) {
    var user = this.getUser(name)
    if (!user) throw new Error('user ' + name + ' does not exist!')

    var point = user.point
    var order = 1
    this.userBase.forEach(function (user) {
	if (user.point > point) order++
    })
    return order
}

Database.prototype.addQuestion = function (
    question, option, answer, time, author, category, hint
) {
    var id = this.questionBase.length
    this.questionBase.push(new Question(
	question, option, answer, id, time, author, category, hint
    ))
    this.log('add question: %s', question.slice(0,20))
}
Database.prototype.addQuestionObject = function (object) {
    this.questionBase.push(Question.fromObject(object))
    this.log('add question object: %s', object.question.slice(0, 20))
}

Database.prototype.addUser = function (name, nickname) {
    if (this.getUser(name)) {
	throw new Error('user ' + name + ' already exist!')
    }
    else {
	var user = new User(name, this.questionBase.length, nickname)
	this.userBase.set(name, user)
	this.log('add user: %s', name)
	return user
    }
}

Database.prototype.loadUser = function (userObject) {
    for (var name in userObject) {
	try {
	    var user = this.addUser(name, userObject[name].nickname)
	    user.questionStatus = userObject[name].questionStatus
	    user.point = userObject[name].point
	}
	catch (addError) {
	    this.log('cannot add %s: %s', name, addError)
	}
    }
}
Database.prototype.loadQuestion = function (questionList) {
    questionList.forEach(function (questionObject) {
	// convert option ABCD to 0123
	var answer = questionObject.answer.charCodeAt(0) - 65
	this.addQuestion(
	    questionObject.question,
	    questionObject.option,
	    answer,
	    questionObject.time,
	    questionObject.author,
	    questionObject.category,
	    questionObject.hint
	)
    }.bind(this))
}
Database.prototype.dumpUser = function () {
    var userObject = {}
    this.userBase.forEach(function (user, name, map) {
	userObject[name] = user
    })
    return userObject
}
Database.prototype.getRandomQuestion = function (name) {
    var user = this.getUser(name)
    if (!user) throw new Error('user does not exist')

    var status = user.questionStatus
    var length = status.length
    var init = Math.floor(Math.random()*length)

    /* start from random index, if already answer 
     * then try next. until try all question, 
     * end up return first unanswer question or init question.
     */
    for (var i=(init+1)%length; i!=init; i=(i+1)%length) {
	if (!user.alreadyAnswer(i)) break
    }
    if (i-1 != init) this.log('skip question #%d to #%d', init, i-1)

    var question = this.getQuestion(i)
    if (!question) throw new Error('question does not exist')
    return question
}
	
exports.Database = Database
exports.Question = Question
exports.User = User
