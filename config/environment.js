module.exports = function (compound) {

    var express = require('express');
    var app = compound.app;
    var hatch = require(app.root + '/lib/hatch');

    app.configure(function(){
        app.set('jsDirectory', '/javascripts/');
        app.set('cssDirectory', '/stylesheets/');
        app.set('cssEngine', 'stylus');
        app.set('upload path', app.root + '/public/upload');

        // TODO move render speed hook to proper place
        app.stack.unshift({route: '', handle: function timeLogger(req, res, next) {
            req.startedAt = Date.now();
            next();
        }});

        app.use(express.static(app.root + '/public', { maxAge: 86400000 }));
        app.use(express.bodyParser());
        app.use(express.cookieParser('secret'));
        app.use(express.session({secret: 'secret'}));
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
