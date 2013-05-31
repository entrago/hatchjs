var path = require('path');

exports.rewrite = function(compound) {
    return rewriteMiddleware;
    function rewriteMiddleware(req, res, next) {
        // console.log(req.method, req.url);
        var url = req.url.split('?')[0];
        var urlParts = url.split('/do/');
        if (urlParts.length > 1) {
            req.pagePath = urlParts[0].replace(/\/$/, '');
            req.moduleName = urlParts[1].split('/')[0];

            loadGroup(compound, req, function () {
                res.locals.group = req.group;
                req.url = '/do/' + urlParts[1];

                return next();
            });
        } else {
            req.pagePath = url.replace(/\/$/, '');
            next();
        }
    }
};

exports.hatch = function(compound) {
    var Group, User;
    var hatch = compound.hatch;

    return function hatchMiddleware(req, res, next) {
        User = compound.models.User;
        Group = compound.models.Group;

        authenticate(compound, req, function(err) {
            if (err) {
                return next(err);
            }
            loadGroup(compound, req, function() {
                if (err) {
                    return next(err);
                }
                req.member = req.group && req.user && req.user.memberships &&
                    req.user.memberships.find(req.group.id, 'groupId');
                if (req.user) {
                    req.user.hasPermission(req.group, 'edit', function (err, result) {
                        req.user.canEdit = result;
                        next();
                    });
                } else {
                    next();
                }
            });
        });

    }

};

function authenticate(compound, req, next) {
    if (req.user) {
        return next();
    }

    var AccessToken = compound.models.AccessToken;
    var User = compound.models.User;

    // authenticate via access token
    var token = req.headers.token || req.body.token || req.query.token;
    if (token) {
        AccessToken.loadUser(token, function(err, user) {
            if (err) {
                return next(err);
            }
            req.user = user;
            next();
        });
    } else if (req.session && req.session.userId) {
        User.find(req.session.userId, function(err, user) {
            if (err) {
                return next(err);
            }
            req.user = user;
            next();
        });
    } else {
        next();
    }

}

function loadGroup(compound, req, next) {
    if (req.group) {
        console.log('already got group');
        return next();
    }

    var Group = compound.models.Group;
    var groupId = req.query.groupId;
    
    if (groupId) {
        Group.find(groupId, gotGroup);
    } else {
        var url = path.join(req.headers.host, req.path || '');
        url = url.split('/do/')[0].split('?')[0];
        url = url.replace(/\/$/, "");
        Group.findOne({where: { pageUrls: url }}, gotGroup);
    }

    function gotGroup(err, group) {
        if (err) {
            return next(err);
        }
        if (!group) {
            return next(new compound.hatch.errors.NotFound(req, 'Group not found'));
        }
        if (req.query.groupId) {
            req.group = group;
            return next();
        }
        var url = req.pagePath;
        req.group = group;
        return next();

        //req.group = group.match(url);
        if (!(req.group instanceof Group)) {
            Group.find(req.group.id, function (err, group) {
                req.group = group;
                next();
            });
        } else {
            next();
        }
    }
}

exports.errorHandler = function(compound) {
    return function errorHandler(err, req, res, next) {
        res.status(err.code || 500);
        if (req.params && req.params.format === 'json') {
            return res.send({
                code: err.code,
                error: err
            });
        }
        if (err.code == 404) {
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
            if (compound.app.get('show errors')) {
                res.locals.err = err;
            }
            res.render(compound.structure.views['common/500']);
        }
    };
};

exports.timeLogger = function(compound) {
    return function timeLogger(req, res, next) {
        req.startedAt = Date.now();
        next();
    };
};
