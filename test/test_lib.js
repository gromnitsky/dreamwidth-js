#!/opt/bin/mocha --ui=tdd

'use strict';

let assert = require('assert')
let nock = require('nock')
let xml = require('xmlrpc/lib/serializer')

let dw = require('../lib/dreamwidth')

suite('lib', function() {
    setup(function() {
	this.jrn = new dw.Dreamwidth('bob', 'password')
//	this.jrn.log = console.error
	this.jrn.login.ttl = 60*1000
    })

    test('login', function(done) {
	let mock = function(challenge) {
	    nock('https://www.dreamwidth.org')
		.post('/interface/xmlrpc',
		      xml.serializeMethodCall('LJ.XMLRPC.getchallenge', []))
		.reply(200, xml.serializeMethodResponse({
		    challenge
		}))
	}

	mock('first')
	this.jrn.auth_params().then( val => {
	    assert.equal(val.auth_challenge, 'first')

	    // again!
	    mock('second')
	    return this.jrn.auth_params()
	}).then( val => {
	    // the result should be cached
	    assert.equal(val.auth_challenge, 'first')

	    // & again!
	    this.jrn.login.ttl = 1 // millisecond
	    return this.jrn.auth_params()
	}).then( val => {
	    // a new request
	    assert.equal(val.auth_challenge, 'second')
	    done()
	})
    })

})
