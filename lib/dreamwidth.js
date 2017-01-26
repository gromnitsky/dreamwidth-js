'use strict';

let crypto = require('crypto')
let fs = require('fs')
let xdg = require('xdg-basedir')

let xmlrpc = require('xmlrpc')
let serializeMethodCall = require('xmlrpc/lib/serializer').serializeMethodCall
let mkdirp = require('mkdirp')

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
	this.debug = false

	this.client = xmlrpc.createSecureClient({
	    host: this.xmlrpc_opt.host,
	    port: this.xmlrpc_opt.port,
	    path: '/interface/xmlrpc'
	})
    }

    method_call(name, params) {
	return new Promise( (resolve, reject) => {
	    if (this.debug) {
		resolve(serializeMethodCall(name, params))
		return
	    }

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

    _auth_params() {
	return {
	    username: this.user,
	    auth_method: 'challenge',
	    auth_challenge: this.login_token.auth_challenge,
	    auth_response: this.login_token.auth_response
	}
    }

    entry_post(subject, date, tags, html, opt) {
	let p = {
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
		opt_backdated: !!opt.opt_backdated,
		opt_preformatted: true,
		taglist: tags || ''
	    }
	}
	let params = Object.assign(this._auth_params(), p)
	return this.method_call('LJ.XMLRPC.postevent', [params])
    }

    login_test() {
	return this.method_call('LJ.XMLRPC.login', [this._auth_params()])
    }

    session() {
	let params = Object.assign(this._auth_params(), {
	    expiration: 'short'
	})
	return this.method_call('LJ.XMLRPC.sessiongenerate', [params])
    }
}

class Session {
    constructor(dw) {
	if (!xdg.cache) throw new DreamwidthError('cannot determine cache dir')
	this.cache_dir = xdg.cache + '/dreamwidth-js'
	this.cache = this.cache_dir + '/session'
	this.valid_for = 60*60*24*1000 // 1 day
	this.dw = dw
	this.log = () => {}
    }

    save(sid) {
	mkdirp.sync(this.cache_dir, { mode: 0o700 })
	fs.writeFileSync(this.cache, sid, { mode: 0o600 })
    }

    refresh(reason) {
	this.log(`obtaining a new session (${reason})`)
	return this.dw.login().then( () => {
	    return this.dw.session()
	}).then( json => {
	    this.save(json.ljsession)
	    return json.ljsession
	})
    }

    valid() {
	return (Date.now() - fs.statSync(this.cache).mtime) < this.valid_for
    }

    get() {
	return new Promise( (resolve, _reject) => {
	    let r
	    try {
		if (!this.valid())
		    throw new DreamwidthError('session has expired')
		r = fs.readFileSync(this.cache)
	    } catch (err) {
		return resolve(this.refresh(err.message))
	    }
	    resolve(r.toString())
	})
    }
}

exports.Dreamwidth = Dreamwidth
exports.DreamwidthError = DreamwidthError
exports.Session = Session
