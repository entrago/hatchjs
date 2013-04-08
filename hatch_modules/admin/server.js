//#!/usr/bin/env node

/**
 * Server module exports method which returns new instance of application
 * server
 *
 * @param {Compound} parent - railway/express parent webserver
 * @returns CompoundJS powered express webserver
 */
var app = module.exports = function getServerInstance(parent) {
    app = require('compound').createServer({root: __dirname});
    app.compound.tabs = [
        { name: 'community', url: 'community', rank: 10 },
        { name: 'content',   url: 'content',   rank: 20 },
        { name: 'pages',     url: 'pages',     rank: 30 },
        { name: 'group',     url: 'group',          rank: 40 },
        { name: 'modules',   url: 'modules',   rank: 50 }
    ];

    parent.hatch.themes.registerTheme({ 
        title: 'Admin', 
        name: 'admin',
        variables: 'http://localhost:3000/stylesheets/admin/variables.less',
        bootswatch: 'http://localhost:3000/stylesheets/admin/bootswatch.less'
    });

    return app;
};

if (!module.parent) {
    var port = process.env.PORT || 3000;
    var host = process.env.HOST || '0.0.0.0';

    var server = app();
    server.listen(port, host, function () {
        console.log(
            'Compound server listening on %s:%d within %s environment',
            host, port, server.set('env')
        );
    });
}