require('yaml-js');
var express = require('express');
var co = require('compound');
var fs = require('fs');
var path = require('path');

var WidgetAPI = require('./api/widget');
var ImportStreamAPI = require('./api/importStream');
var HooksAPI = require('./api/hooks');
var NotificationAPI = require('./api/notification');
var PageAPI = require('./api/page');
var ErrorsAPI = require('./api/errors');
var ModelContextAPI = require('./api/modelContext');
var UploadAPI = require('./api/upload');
var ThemesAPI = require('./api/themes');

exports.HatchPlatform = HatchPlatform;

function HatchPlatform(app) {
    this.api = {app: app}; // temp stub hatch api
    this.__defineGetter__('app', function () { return app} );
    this.__defineGetter__('compound', function () { return app.compound});
    this.grids = {};
    this.modules = {};

    var gridsDir = app.root + '/app/grids';
    fs.readdirSync(gridsDir).forEach(function (file) {
        this.grids[file.replace(/\.ejs$/, '')] = fs.readFileSync(
            app.root + '/app/grids/' + file
        ).toString().split('\n\n')
    }.bind(this));

    app.__defineGetter__('config', function () { return app.settings });

    this.widget = new WidgetAPI(this);
    this.importStream = new ImportStreamAPI(this);
    this.hooks = new HooksAPI(this);
    this.notification = new NotificationAPI(this);
    this.page = new PageAPI(this);
    this.errors = new ErrorsAPI(this);
    this.modelContext = new ModelContextAPI(this);
    this.upload = new UploadAPI(this);
    this.themes = new ThemesAPI(this);
    this.mediator = express();
};

HatchPlatform.prototype.loadModules = function(dir) {
    var hatch = this;
    var compound = hatch.compound;
    console.log('Loading modules from', dir.replace(compound.root, '.'));
    var start = Date.now();
    fs.readdirSync(dir).forEach(function (m) {
        var modPath = path.join(dir, m);
        var mod = require(modPath)(compound) || {};
        var confPath = modPath + '/config/module.yml';
        if (fs.existsSync(confPath)) {
            try {
                mod.info = require(confPath)[0];
            } catch (e) {}
        }
        if (!mod.info) {
            mod.info = {
                name: m
            };
        } else {
            mod.info.name = mod.info.name || m;
        }
        if (!mod || !mod.compound || mod.compound.parent) {
            hatch.modules[m] = mod;
            return end('::' + m);
        }
        mod.compound.on('before controller', function(ctl, act, req, res, next) {
            if (req.pagePath !== req.url) {
                ctl.pathTo = ctl.path_to = mod.compound.map.clone(req.pagePath);
            }
        });

        mod.compound.name = m;
        mod.compound.parent = compound;
        mod.compound.hatch = hatch;
        hatch.modules[m] = mod;
        mod.compound.models = mod.models = compound.models;

        mod.compound.on('structure', loadCommonStuff);

        mod.compound.on('routes', function () {
            if (!mod.compound.injectMiddlewareBefore(mod.router,
                exports.middleware(compound))) {
                    mod.use(mod.router);
                }
        });

        hatch.mediator.use('/' + m, mod);

        if (fs.existsSync(modPath + '/config/widgets.yml')) {
            var ws = require(modPath + '/config/widgets.yml')[0];
            if (ws) {
                Object.keys(ws).forEach(function (w) {

                    hatch.widget.register(m, w, {info: ws[w]});
                });
            }

            mod.compound.on('routes', function (map) {
                map.namespace('widgets', function (widgets) {
                    widgets.post(':controller/:action');
                    widgets.post('*', function notFound(req, res) {
                        res.send('Widget for ' + req.url + ' not found');
                    });
                });
            });

            mod.compound.on('structure', function (structure) {
                Object.keys(structure.controllers).forEach(function (name) {
                    if (name.match(/widgets\/.*?_controller/) &&
                        name !== 'widgets/common_controller' &&
                        !structure.controllers[name].match(/load\(['"]widgets\/common['"]\)/)) {
                        structure.controllers[name] = 'load(\'widgets/common\');\n' + structure.controllers[name];

                    }
                });
                structure.controllers['widgets/common_controller'] = compound.structure.controllers['widgets_common_controller'];
                structure.views['layouts/widgets_layout'] = compound.structure.views['layouts/widgets_layout'];
                if (structure.helpers['application_helper']) {
                    var source = compound.structure.helpers['widgets_common_helper'];
                    var destination = structure.helpers['application_helper'];
                    Object.keys(source).forEach(function (helperName) {
                        destination[helperName] = source[helperName];
                    });
                } else {
                    structure.helpers['application_helper'] = compound.structure.helpers['widgets_common_helper'];
                }
            });

        }

        var pagesPath = modPath + '/app/pages/';
        if (fs.existsSync(pagesPath)) {
            fs.readdirSync(pagesPath).forEach(function (file) {
                var name = file.replace(/\.(js|coffee)$/, '');
                compound.hatch.page.register(name, require(pagesPath + file));
            });
        }
        end(m);
    });

    function end(name) {
        console.log('  -', name, 'loaded in', Date.now() - start + 'ms');
        start = Date.now();
    }
};

exports.modules = function (compound) {

    compound.controllerExtensions.moduleEnabled = function (moduleName) {
        if (!this.locals.group) return false;
        var found = false;
        this.locals.group.modules.forEach(function (m) {
            if (m.name === moduleName) {
                found = true;
            }
        });
        return found;
    };

    /**
     * Renders a Google JSON location object to a nice simple short address
     *
     * @param {Location} location
     * @returns {String} 'Marylebone, London'
     */
    compound.controllerExtensions.renderLocation = function renderLocation(location) {
        if (!location || !location.address_components) {
            return location;
        }
        return location.address_components[2].short_name + ', ' + location.address_components[3].short_name;
    };

    compound.controllerExtensions.pathFor = function (m) {
        var module = compound.hatch.modules[m];
        if (module) {
            return module.compound.map.clone(this.context.req.pagePath);
        } else {
            return {};
        }
    };

    compound.controllerExtensions.specialPagePath = function (type, params) {
        var sp = compound.hatch.page.get(type);
        if (!sp) return '';
        return sp.path(this.req.group, params);
    };

    compound.on('structure', loadCommonStuff);

    compound.hatch.loadModules(compound.root + '/hatch_modules');

    return compound.hatch.mediator;
};


// TODO use some common API for adding helpers and controller methods
function loadCommonStuff(structure, compound) {
    var exts = compound.controllerExtensions;
    if (!structure.helpers.application_helper) {
        structure.helpers.application_helper = {};
    }
    structure.helpers.application_helper.pathFor = exts.pathFor;
    structure.helpers.application_helper.specialPagePath = exts.specialPagePath;
    structure.helpers.application_helper.moduleEnabled = exts.moduleEnabled;
    structure.helpers.application_helper.renderLocation = exts.renderLocation;
    structure.helpers.application_helper.stripHtml = stripHtml;
}

/**
 * Strip HTML from the specified HTML and return text
 *
 * @param {String} html - html to strip.
 * @param {Number} maxLength - limit to this many characters.
 *
 * @returns {String} - text without html ended with '...' if length was > maxLength
 */
function stripHtml(html, maxLength) {
    var text = (html || '').replace(/(<([^>]+)>)/ig, ' ');
    if(maxLength && maxLength > 0) {
        if(text.length > maxLength) {
            text = text.substring(0, maxLength);
            if(text.lastIndexOf(' ') > -1) text = text.substring(0, text.lastIndexOf(' '));
            text += '...';
        }
    }
    return text.replace(/^\s+|\s+$/g, '');
};

exports.rewrite = function (compound) {
    return function rewriteMiddleware(req, res, next) {
        var url = req.url.split('?')[0];
        var urlParts = url.split('/do/');
        if (urlParts.length > 1) {
            req.pagePath = urlParts[0].replace(/\/$/, '');

            loadGroup(compound, req, function () {
                res.locals.group = req.group;
                req.url = '/do/' + urlParts[1];

                next();
            })
        }
        else {
            req.pagePath = url.replace(/\/$/, '');
            next();
        }
    };
}

exports.middleware = function (compound) {
    var Group, User;
    var hatch = compound.hatch;

    return function hatchMiddleware(req, res, next) {
        User = compound.models.User;
        Group = compound.models.Group;

        if (req.method === 'POST' && req.body.token) {
            loadEnvForAPI(req, res, next);
            return;
        }
        console.log('Hatch middleware');

        authenticate(compound, req, function(err) {
            if (err) {
                return next(err);
            }
            loadGroup(compound, req, function() {
                if (err) {
                    return next(err);
                }
                req.member = req.group && req.user && req.user.membership &&
                    req.user.membership.find(req.group.id, 'groupId');
                if (req.user) {
                    req.user.canEdit = req.member && req.member.canEdit;
                }
                next();
            });
        });

    }

    function loadEnvForAPI(req, res, next) {
        var data = JSON.parse(req.body.data);
        req.user = req.user || new User(data.user);
        req.data = data;

        Group.find(data.groupId, function (err, group) {
            if (err || !group) {
                return gotPage(err || Error('404'));
            }
            req.group = group;
            next();
        });
    }
};

function authenticate(compound, req, next) {
    var AccessToken = compound.models.AccessToken;
    var User = compound.models.User;

    // authenticate via access token
    AccessToken.loadFromRequest(req, function () {
        if (req.user) next();
        if (req.session && req.session.userId) {
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
    });

}

function loadGroup(compound, req, next) {
    if (req.group) return next();
    var Group = compound.models.Group;
    var groupId = req.query.groupId;
    if (groupId) {
        Group.find(groupId, gotGroup);
    } else {
        Group.findOne({where: { url: req.headers.host}}, gotGroup);
    }

    function gotGroup(err, group) {
        if (err) {
            return next(err);
        }
        if (!group) {
            return next(new Error('404'));
        }
        if (req.query.groupId) {
            req.group = group;
            return next();
        }
        var url = req.pagePath;
        req.group = group.match(url);
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

co.controllers.widgetsCommonController = function () {
    return WidgetsCommonController;

    function WidgetsCommonController(init) {
        init.layout('widgets');

        init.before('init env', function (c) {
            if (c.params.action !== 'settings' && !c.body.token &&
            c.body.token !== 'test') {
                return next(403, 'Unauthorized');
            }
            this.inlineEditAllowed = true;
            var data = JSON.parse(c.body.data);
            this.page = new c.Page(c.data.page);
            this.widget = this.page.widgets[data.widgetId];
            this.user = c.req.user || new c.User(data.user);
            this.data = data.data;
            this.canEdit = true;
            c.next();
        });
    }
};
