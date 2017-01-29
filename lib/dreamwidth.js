'use strict';

let crypto = require('crypto')

let xmlrpc = require('xmlrpc')

let meta = require('../package.json')


let md5 = function(str) {
    return crypto.createHash('md5').update(str).digest('hex')
}

let user_agent = function() {
    return `${meta.name}/${meta.version} (${process.platform}; ${process.arch}) node/${process.versions.node}`
}

class DreamwidthError extends Error {
    constructor(msg) {
	super(msg)
	this.message = `Dreamwidth: ${msg}`
	this.name = 'DreamwidthError'
	this.login_token = null
    }
}

class Cache {
    // refresh is a callback, that is called when a cache becomes stale
    constructor(ttl, refresh) {
	this.ttl = ttl
	this.data = null
	this.refresh = refresh
    }

    valid(val) {
	return (Date.now() - val.timestamp) < this.ttl
    }

    set(obj) {
	this.data = {
	    timestamp: Date.now(),
	    data: obj
	}
	if (this._save) this._save(this.data)
    }

    _hit() {
	return Promise.resolve(this.data || {})
    }

    get() {
	return this._hit().then( val => {
	    if (!this.valid(val))
		throw new DreamwidthError('the cache has expired')
	    return val.data
	}).catch( err => {
	    return this.refresh(err).then( val => {
		this.set(val)
		return val
	    })
	})
    }
}

class Dreamwidth {
    constructor(user, md5_pass) {
	this.user = user
	this.md5_pass = md5_pass
	this.xmlrpc_opt = {
	    host: 'www.dreamwidth.org',
	    port: 443
	}
	this.log = () => {}

	this.client = xmlrpc.createSecureClient({
	    host: this.xmlrpc_opt.host,
	    port: this.xmlrpc_opt.port,
	    path: '/interface/xmlrpc',
	    headers: {
		'User-Agent': user_agent()
	    }
	})

	this.login = new Cache(60*1000, reason => {
	    this.log(`new login (${reason.message})`)
	    return this.method_call('LJ.XMLRPC.getchallenge', [])
		.then( val => {
		    return {
			auth_challenge: val.challenge,
			auth_response: md5(val.challenge + this.md5_pass)
		    }
	    })
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

    auth_params() {
	return this.login.get().then( val => {
	    return {
		username: this.user,
		auth_method: 'challenge',
		auth_challenge: val.auth_challenge,
		auth_response: val.auth_response,

		clientversion: user_agent()
	    }
	})
    }

    method_call_auth(name, params) {
	return this.auth_params().then( auth => {
	    // merge auth params w/ the current method params
	    return this.method_call(name, [Object.assign(auth, params)])
	})
    }

    entry_post(subject, date, tags, html, opt = {}) {
	return this.method_call_auth('LJ.XMLRPC.postevent', {
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
	})
    }

    login_test() {
	return this.method_call_auth('LJ.XMLRPC.login', {})
    }

    session() {
	return this.method_call_auth('LJ.XMLRPC.sessiongenerate', {
	    expiration: 'short'
	})
    }
}

exports.Dreamwidth = Dreamwidth
exports.DreamwidthError = DreamwidthError
exports.Cache = Cache
