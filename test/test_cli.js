#!/opt/bin/mocha --ui=tdd
'use strict';

let assert = require('assert')
let spawn = require('child_process').spawnSync
let fs = require('fs')

function read(file) { return fs.readFileSync(__dirname + '/data/' + file) }
process.chdir(__dirname)

suite('cli', function() {
    test('front-matter: invalid prop name', function() {
	let r = spawn('../dreamwidth-js-entry-post-md',
		      [], {input: read('front-matter.invalid-prop.md')})
	assert(/unknown option/.test(r.stderr.toString()))
	assert(r.status !== 0)
    })

    test('front-matter: invalid prop value', function() {
	let r = spawn('../dreamwidth-js-entry-post-md',
		      [], {input: read('front-matter.invalid-prop-value.md')})
	assert(/YAMLException/.test(r.stderr.toString()))
	assert(r.status !== 0)
    })
})
