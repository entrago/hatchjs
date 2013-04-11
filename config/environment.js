module.exports = function (compound) {

    var express = require('express');
    var app = compound.app;
    var hatch = require(app.root + '/lib/hatch');

    var MemoryStore = express.session.MemoryStore;
    var RedisStore = require('connect-redis')(express);
    var isTest = app.set('env') === 'test';
    var sessionStore = isTest ?
        new MemoryStore :
        new RedisStore({ttl: 86400 * 365});

    app.configure(function(){
        app.set('jsDirectory', '/javascripts/');
        app.set('cssDirectory', '/stylesheets/');
        app.set('cssEngine', 'stylus');
        app.set('upload path', app.root + '/public/upload');

        // date and time formats
        app.set('dateformat', 'DD/MM/YYYY');
        app.set('timeformat', 'HH:mm:ss');
        app.set('datetimeformat', app.get('dateformat') + ' ' + app.get('timeformat'));

        // TODO move render speed hook to proper place
        compound.injectMiddlewareAt(2, function timeLogger(req, res, next) {
            req.startedAt = Date.now();
            next();
        });

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
        app.use(hatch.rewrite(compound));
        app.use('/do', hatch.modules(compound));
        app.use(hatch.middleware(compound));
        app.use(app.router);
        app.use(function (err, req, res, next) {
            if (err.message == '404') {
                if (req.group) {
                    var found;
                    req.group.pagesCache.forEach(function (p) {
                        if (p.type === '404') found = p;
                    });
                    if (found) {
                        app.compound.models.Page.find(found.id, function (e, p) {
                            req.page = p;
                            compound.controllerBridge.callControllerAction(
                                'page',
                                'render', req, res, next
                            );
                        });
                        return;
                    }
                }
                res.render(compound.structure.views['common/404']);
            } else {
                console.log(err.stack);
                res.render(compound.structure.views['common/500']);
            }
        });
    });

};
