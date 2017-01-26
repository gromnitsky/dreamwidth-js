'use strict';

let path = require('path')

let netrc = require('netrc')

let dw = require('./dreamwidth')
exports.meta = require('../package.json')

exports.perrx = function(msg) {
    let name = path.basename(process.argv[1]).replace(/^dreamwidth-js-/, '')
    console.error(`${name}: ${msg}`)
}

exports.errx = function(msg) {
    exports.perrx(msg)
    process.exit(1)
}

exports.cridentials_export = function(file) {
    let my_netrc = netrc(file)
    let r = my_netrc['dreamwidth.org'] || exports.errx('edit .netrc')
    process.env.dw_login = r.login
    process.env.dw_password = r.password
}

exports.abort = function(err) {
    if (err instanceof dw.DreamwidthError) {
	exports.perrx(err.message)
	exports.perrx(err.body)
    } else {
	exports.perrx(err)
    }
    process.exit(1)
}
