module.exports = function (compound) {

    var express = require('express');
    var app = compound.app;

    app.configure(function(){
        app.set('jsDirectory', '/javascripts/');
        app.use('/javascripts', express.static(compound.parent.root + '/public/javascripts', { maxAge: 86400000 }));
        app.use(app.router);
    });

};