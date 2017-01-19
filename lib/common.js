'use strict';

let path = require('path')
let netrc = require('netrc')

let dw = require('./dreamwidth')

let perrx = function(msg) {
    let name = path.basename(process.argv[1]).replace(/^dreamwidth-js-/, '')
    console.error(`${name}: ${msg}`)
}

exports.errx = function(msg) {
    perrx(msg)
    process.exit(1)
}

exports.cridentials = function(file) {
    let my_netrc = netrc(file)
    return my_netrc['dreamwidth.org'] || exports.errx('edit .netrc')
}

exports.err_abort = function(err) {
    if (err instanceof dw.DreamwidthError) {
	perrx(err.message)
	perrx(err.body)
    } else {
	perrx(err)
    }
    process.exit(1)
}
