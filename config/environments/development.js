var express = require('express');

module.exports = function (compound) {
    var app = compound.app;

    app.configure('development', function () {
        app.enable('log actions');
        app.enable('env info');
        app.enable('watch');
        app.enable('static css');
        app.use(require('express').errorHandler({ dumpExceptions: true, showStack: true }));
    });
};
