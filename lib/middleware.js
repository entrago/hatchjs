var path = require('path');
var async = require('async');

exports.rewrite = function(compound) {
    return function rewriteMiddleware(req, res, next) {
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

        // load user, page and group in parallel to take advantage of MULTI
        async.parallel([
            function (done) {
                authenticate(compound, req, done);
            },
            function (done) {
                loadPage(compound, req, done);
            },
            function (done) {
                loadGroup(compound, req, done);
            }
        ], function (err) {
            if (err) {
                return next(err);
            }
            req.member = req.group && req.user && req.user.memberships &&
                req.user.memberships.find(req.group.id, 'groupId');
            if (req.user && req.group) {
                req.user.hasPermission(req.group, 'edit', function (err, result) {
                    req.user.canEdit = result;
                    next();
                });
            } else {
                next();
            }
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

function loadPage(compound, req, next) {
    var url = path.join(req.headers.host, req.path || '');
    url = url.split('/do/')[0].split('?')[0];
    url = url.replace(/\/$/, "");

    compound.models.Page.findOne({ where: { url: url }}, function (err, page) {
        req.page = page;
        next();
    });
}

function loadGroup(compound, req, next) {
    if (req.group) {
        return next();
    }

    var Group = compound.models.Group;
    var Content = compound.models.Content;
    var groupId = req.query.groupId;

    if (groupId) {
        Group.find(groupId, gotGroup);
    } else {
        var url = path.join(req.headers.host, req.path || '');
        url = url.split('/do/')[0].split('?')[0];
        url = url.replace(/\/$/, "");

        Group.findByUrl(url, function (err, group, post) {
            if (group) {
                return gotGroup(err, group);
            } else if (post) {
                req.post = post;

                Group.find(post.groupId, function (err, group) {
                    // adjust the request url to match the content type
                    req.url = '/' + path.join(group.homepage.url.replace(req.headers.host, ''), post.type);
                    return gotGroup(err, group);
                });
            } else {
                Group.all({limit: 1}, function (err, groups) {
                    // if there are no groups, allow fall through to the setup middleware
                    if (groups.length === 0) {
                        return next();
                    } else {
                        return next(new compound.hatch.errors.NotFound(req, 'Group not found'));
                    }
                });
            }
        });
    }

    function gotGroup(err, group) {
        if(err) {
            return next(err);
        }
        req.group = group;
        return next();
    }
}

exports.errorHandler = function(compound) {
    return errorHandler;
    function errorHandler(err, req, res, next) {
        var code = err.code || 500;
        compound.log(err.stack);
        res.status(code);
        if (req.params && req.params.format === 'json') {
            res.send({error: err});
            return;
        }

        var found = req.group && req.group.pagesCache.find(code.toString(), 'type');
        if (found) {
            compound.models.Page.find(found.id, function (e, p) {
                req.page = p;
                compound.controllerBridge.callControllerAction(
                    'page',
                    'render', req, res, next
                );
            });
        } else {
            var view = compound.structure.views['common/errors/' + code];
            if (!view) {
                view = compound.structure.views['common/errors/500'];
            }
            if (compound.app.get('show errors')) {
                res.locals.err = err;
            } else {
                res.locals.err = null;
            }
            res.render(view);
        }
    }
};

exports.timeLogger = function(compound) {
    return timeLogger;
    function timeLogger(req, res, next) {
        req.startedAt = Date.now();
        next();
    }
};
