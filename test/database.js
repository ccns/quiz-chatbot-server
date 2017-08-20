
var assert = require('assert')
var database = require('../lib/database')

var Question = database.Question
var question = new Question(
    'problem', ['a','b','c','d'], 3, 0, '2017-08-17', 'gholk', 'test', 'ok'
)


void function testQuestion() {
    assert.deepEqual(question, {
	question: 'problem',
	option: ['a', 'b', 'c', 'd'],
	answer: 3,
	id: 0,
	time: '2017-08-17',
	author: 'gholk',
	category: 'test',
	hint: 'ok'
    })

    assert.equal(question.verify(3), true)
    for (var i=0; i<3; i++) assert.equal(question.verify(i), false)
}()

var User = database.User
var name = 'gholk'
var length = 100
var user = new User(name, length)

void function testUser() {
    assert.deepEqual(user, {
	name: name,
	questionStatus: new Array(length).fill(0),
	point: 0
    })

    for (var i=0; i<length; i++) {
	assert.strictEqual(user.alreadyAnswer(i), false)
	user.answer(i, Boolean(i%2))
	assert.strictEqual(user.alreadyAnswer(i), true)
	assert.equal(user.point, Math.ceil(i/2))
    }
    assert.deepEqual(
	user.questionStatus,
	new Array(length).fill(0).map((x, i) => (i%2) + 1)
    )
}()

var db = new database.Database()

void function testDatabase() {
    assert.ok(db.questionBase instanceof Array)
    assert.ok(db.userBase instanceof Map)

    assert.equal(db.log.name, 'bound ')
    assert.equal(db.error.name, 'bound ')

    assert.ok(db.getUser(name) == undefined)
    var dbUser = db.addUser(name)
    assert.ok(dbUser instanceof User)
    assert.ok(dbUser.name == name)
    assert.ok(db.getUser(name) == dbUser)
    assert.throws(
	() => db.addUser(name),
	(userError) => /exist/.test(userError.message)
    )

    assert.ok(db.getQuestion(0) == undefined)
    db.addQuestion(
	'problem', ['a','b','c','d'], 3,
	'2017-08-17', 'gholk', 'test', 'ok'
    )
    var dbQuestion = db.getQuestion(0)
    assert.deepEqual(dbQuestion, question)
    assert.ok(db.answer(name, 0, 3))
}()
