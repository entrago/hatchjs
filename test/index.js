module.exports = require('should');
var semicov = require('semicov');

process.env.NODE_ENV = 'test';

var express = require('express');

if (!process.env.TRAVIS) {
    if (typeof __cov === 'undefined') {
        process.on('exit', function () {
            semicov.report();
        });
    }

    semicov.init('lib', 'Hatch.js Core');
}

global.getApp = function() {
    var app = require('../')();

    app.compound.on('ready', function () {
        app.enable('quiet');
    });

    return app;
};
