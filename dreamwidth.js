#!/usr/bin/env node
'use strict';

let crypto = require('crypto')

let xmlrpc = require('xmlrpc')
let netrc = require('netrc')

let md5 = function(str) {
    return crypto.createHash('md5').update(str).digest('hex')
}

class DreamwidthError extends Error {
    constructor(msg) {
	super(msg)
	this.message = `Dreamwidth: ${msg}`
	this.name = 'DreamwidthError'
	this.login_token = null
    }
}

class Dreamwidth {
    constructor(user, md5_pass) {
	this.user = user
	this.md5_pass = md5_pass
	// we can override them in tests
	this.xmlrpc_opt = {
	    host: 'www.dreamwidth.org',
	    port: 443
	}

	this.client = xmlrpc.createSecureClient({
	    host: this.xmlrpc_opt.host,
	    port: this.xmlrpc_opt.port,
	    path: '/interface/xmlrpc'
	})
    }

    method_call(name, params) {
	return new Promise( (resolve, reject) => {
	    this.client.methodCall(name, params, (err, val) => {
		if (err) {
		    let e = new DreamwidthError(err.message)
		    e.body = err.body
		    reject(e)
		    return
		}
		resolve(val)
	    })
	})
    }

    auth_response(challenge) {
	return md5(challenge + this.md5_pass)
    }

    // valid for 60 sec
    login() {
	return this.method_call('LJ.XMLRPC.getchallenge', [])
	    .then( val => {
		this.login_token = {
		    auth_challenge: val.challenge,
		    auth_response: this.auth_response(val.challenge)
		}
		return this.login_token
	    })
    }

    entry_post(subject, date = new Date(), tags, html, opt) {
	return this.method_call('LJ.XMLRPC.postevent', [{
	    username: this.user,
	    auth_method: 'challenge',
	    auth_challenge: this.login_token.auth_challenge,
	    auth_response: this.login_token.auth_response,

	    security: opt.security || 'private',
	    lineendings: "unix",
	    subject,
	    event: html,
	    year: date.getFullYear(),
	    mon: date.getMonth() + 1,
	    day: date.getDate(),
	    hour: date.getHours(),
	    min: date.getMinutes(),
	    props: {
		opt_backdated: opt.opt_backdated,
		opt_preformatted: true,
		taglist: tags
	    }
	}])
    }

    login_test() {
	return this.method_call('LJ.XMLRPC.login', [{
	    username: this.user,
	    auth_method: 'challenge',
	    auth_challenge: this.login_token.auth_challenge,
	    auth_response: this.login_token.auth_response,
	}])
    }
}


// Main

let my_netrc = netrc()
let cridentials = my_netrc['dreamwidth.org']

let dw = new Dreamwidth(cridentials.login, cridentials.password)

dw.login().then( () => {
    return dw.login_test()
// }).then( () => {
//     return dw.entry_post('test', new Date(Date.parse('2020-12-31 14:44')),
// 			 'omglol1, omg lol2', "hello\n\n\n\n<b>world</d>", {
// 			     opt_backdated: true
// 			 })
}).then( val => {
    console.log(val)
}).catch( err => {
    if (err instanceof DreamwidthError) {
	console.log(err.message)
	console.log(err.body)
    } else {
	console.log(err)
    }
})
