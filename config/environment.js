module.exports = function (compound) {

    var express = require('express');
    var app = compound.app;
    var hatch = compound.hatch;

    var MemoryStore = express.session.MemoryStore;
    var RedisStore = require('connect-redis')(express);
    var env = app.get('env');
    var isTest = env === 'test';
    var dbConfig = require('./database')[env] || {};

    app.configure(function() {
        var sessionStore = isTest ?
            new MemoryStore :
            new RedisStore({ttl: 86400 * 365, db: dbConfig.session && dbConfig.session.database});

        app.set('jsDirectory', '/javascripts/');
        app.set('cssDirectory', '/stylesheets/');
        app.set('cssEngine', 'stylus');
        app.set('upload path', app.root + '/public/upload');
        app.set('fillMissingTranslations', 'yaml');
        app.set('seeds', app.root + '/db/seeds/');

        // date and time formats
        app.set('dateformat', 'DD/MM/YYYY');
        app.set('timeformat', 'HH:mm:ss');
        app.set('datetimeformat', app.get('dateformat') + ' ' + app.get('timeformat'));

        compound.injectMiddlewareAt(2, hatch.middleware.timeLogger(compound));

        app.use(express.static(app.root + '/public', { maxAge: 86400000 }));
        app.use(express.bodyParser());
        app.use(express.cookieParser('secret'));
        app.use(express.session({
            secret: '~:hatch1#6Platform0*2%',
            store: sessionStore,
            key: 'hatch.sid',
            cookie: { maxAge: 86400000 * 365 }
        }));
        app.use(express.methodOverride());

        app.use(require('express-mobile-agent'));
        app.use(hatch.middleware.rewrite(compound));
        app.use('/do', hatch.mediator);
        app.use(hatch.middleware.hatch(compound));
        app.use(app.router);
        app.use(hatch.middleware.errorHandler(compound));

    });
};
