'use strict';

let fs = require('fs')

let xdg = require('xdg-basedir')
let mkdirp = require('mkdirp')

let dw = require('./dreamwidth')

class SessionCache extends dw.Cache {
    constructor(ttl, refresh) {
	super(ttl, refresh)
	if (!xdg.cache)
	    throw new dw.DreamwidthError('cannot determine cache dir')
	this.cache_dir = xdg.cache + '/dreamwidth-js'
	this.cache = this.cache_dir + '/session'
	this.log = () => {}
    }

    _save(obj) {
	mkdirp.sync(this.cache_dir, { mode: 0o700 })
	fs.writeFileSync(this.cache, JSON.stringify(obj), { mode: 0o600 })
    }

    _hit() {
	let r
	try {
	    r = JSON.parse(fs.readFileSync(this.cache))
	} catch (err) {
	    return Promise.reject(err)
	}
	return Promise.resolve(r)
    }
}

module.exports = SessionCache
