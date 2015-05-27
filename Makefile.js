#!/usr/bin/env node
/* global target, echo, find, exit, exec */

require('shelljs/make');

var partialRight = require('lodash/function/partialRight'),
    endsWith = require('lodash/string/endsWith'),
    ary = require('lodash/function/ary'),
    some = require('lodash/collection/some');

function ends(val) { return ary(partialRight(endsWith, val), 1); }

var NODE_MODULES = './node_modules/',
    MAKEFILE = './Makefile.js',
    ESLINT = NODE_MODULES + 'eslint/bin/eslint.js',
    JS_FILES = find('src/').filter(ends('.js'))
        .concat('index.js')
        .join(' ');
    //TEST_FILES = find('test/').filter(ends('.js')).join(' ');

target.all = function () {
    target.test();
};

target.lint = function () {
    if(some([
        exec(ESLINT + ' ' + MAKEFILE).code,
        exec(ESLINT + ' ' + JS_FILES).code
        //exec(ESLINT + ' ' + TEST_FILES).code
    ])) {
        exit(1);
    }
};

target.test = function () {
    target.lint();
    //
    //echo('Generating coverage');
    //lastReturn = nodeCLI.exec(ISTANBUL, 'cover', MOCHA, '-- -b -R tap -c', TEST_FILES);
    //if (lastReturn.code !== 0) { errors++; }
    //
    //echo('Checking coverage');
    //lastReturn = nodeCLI.exec(ISTANBUL, 'check-coverage', '--statement 99 --branch 98 --function 99 --lines 99');
    //if (lastReturn.code !== 0) { errors++; }
    //if (errors) { exit(1); }
};
