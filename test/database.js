
var assert = require('assert')
var database = require('../lib/database')

void function testQuestion() {
    var Question = database.Question
    var question = new Question(
	'problem', ['a','b','c','d'], 3, 0, '2017-08-17', 'gholk', 'test', 'ok'
    )

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

void function testUser() {
    var User = database.User
    var name = 'gholk'
    var length = 100
    var user = new User(name, length)

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
