#!/opt/bin/mocha --ui=tdd

'use strict';

let assert = require('assert')
let nock = require('nock')
let xml = require('xmlrpc/lib/serializer')

let dw = require('../lib/dreamwidth')

let nock_challenge = function(str) {
    nock('https://www.dreamwidth.org')
	.post('/interface/xmlrpc',
	      xml.serializeMethodCall('LJ.XMLRPC.getchallenge', []))
	.reply(200, xml.serializeMethodResponse({
	    challenge: str
	}))
}

suite('lib', function() {
    setup(function() {
	this.jrn = new dw.Dreamwidth('bob', 'password')
//	this.jrn.log = console.error
	this.jrn.login.ttl = 60*1000

	this.xml = new dw.Dreamwidth('bob', 'password')
	this.xml.method_call = function(name, params) {
	    let str = new String(xml.serializeMethodCall(name, params))
	    str.challenge = '123'
	    str.auth_challenge = '123'
	    str.auth_response = '456'
	    return Promise.resolve(str)
	}
    })

    test('login', function(done) {
	nock_challenge('first')
	this.jrn.auth_params().then( val => {
	    assert.equal(val.auth_challenge, 'first')

	    // again!
	    nock_challenge('second')
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

    test('entry_post', function(done) {
	let date = new Date()
	this.xml.entry_post('title', date, '1, 2', 'text').then( req => {
	    req = req.toString()
	    nock_challenge('123')
	    nock('https://www.dreamwidth.org')
		.post('/interface/xmlrpc', req)
		.reply(200, xml.serializeMethodResponse({
		    url: 'https://bob.dreamwidth.org/44474.html',
		    itemid: 173,
		    anum: 186
		}))

	    this.jrn.entry_post('title', date, '1, 2', 'text').then( val => {
		assert.equal(val.url, 'https://bob.dreamwidth.org/44474.html')
		done()
	    })
	})
    })

})
