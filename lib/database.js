
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

Question.prototype.verify = function (answer) {
    if (answer == this.answer) return true
    else return false
}

function User(name, questionNumber) {
    this.name = name
    this.questionStatus = new Array(questionNumber).fill(0)
    this.point = 0
}
User.prototype.answer = function (question, answer) {
    if (answer) var answerCode = 2
    else var answerCode = 1

    var unanswer = 0
    var wrong = 1
    var right = 2

    switch (this.questionStatus[question]) {
    case unanswer:
	this.questionStatus[question] = answerCode
	if (answerCode == right) {
	    this.point++
	    return true
	}
	else return false
	break
    case wrong:
    case right:
	return false
	break
    }
}
User.prototype.alreadyAnswer = function (question) {
    if (this.questionStatus[question] == 0) return false
    else return true
}

function Database(questionBase, userBase) {
    this.questionBase = questionBase || []
    this.userBase = userBase || new Map()
}

Database.prototype.log = function () {
    arguments[0] = '[database] ' + arguments[0]
    console.log.apply(console, arguments)
}
Database.prototype.error = function () {
    arguments[0] = '[database] ' + arguments[0]
    console.error.apply(console, arguments)
}

Database.prototype.getUser = function (name) {
    if (this.userBase.has(name)) return this.userBase.get(name)
    else return null
}
Database.prototype.getQuestion = function (index) {
    if (index >= 0 && index < this.questionBase.length) {
	return this.questionBase[index]
    }
    else return null
}

Database.prototype.answer = function (name, id, answer) {
    var user = this.getUser(name)
    if (!user) throw new Error('user ' + name + ' does not exist!')

    var question = this.getQuestion(id)
    if (!user) throw new Error('question #' + index + ' does not exist!')

    var result = question.verify(answer)
    user.answer(id, result)
    return result
}

Database.prototype.addQuestion = function (
    question, option, answer, id, time, author, category, hint
) {
    this.questionBase.push(new Question(
	question, option, answer, id, time, author, category, hint
    ))
    this.log('new question: %s', question.slice(0,20))
}
Database.prototype.addUser = function (name) {
    if (this.getUser(name)) {
	throw new Error('user ' + name + ' already exist!')
    }
    else {
	var user = new User(name, this.questionBase.length)
	this.userBase.set(name, user)
	this.log('add user %s', name)
	return user
    }
    this.log('new user: %s', name)
}

Database.prototype.loadUser = function (userObject) {
    for (var name in userObject) {
	try {
	    var user = this.addUser(name)
	    user.questionStatus = userObject[name].questionStatus
	    user.point = userObject[name].point
	}
	catch (addError) {
	    this.log('cannot add %s: %s', name, addError)
	}
    }
}
Database.prototype.loadQuestion = function (questionList) {
    questionList.forEach(function (questionObject, index) {
	// convert option ABCD to 0123
	var answer = questionObject.answer.charCodeAt(0) - 65
	this.addQuestion(
	    questionObject.question,
	    questionObject.option,
	    answer,
	    index,
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
