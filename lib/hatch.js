require('yaml-js');
var express = require('express');
var co = require('compound');
var fs = require('fs');
var path = require('path');
var initAPI = require('./api');
var exts = require('./extensions.js');
var middleware = require('./middleware.js');

exports.HatchPlatform = HatchPlatform;

function HatchPlatform(app) {
    var hatch = this;
    hatch.middleware = middleware;
    hatch.mediator = express();
    hatch.__defineGetter__('app', function () { return app} );
    hatch.__defineGetter__('compound', function () { return app.compound});
    hatch.grids = {};
    hatch.modules = {};

    var gridsDir = app.root + '/app/grids';
    fs.readdirSync(gridsDir).forEach(function (file) {
        hatch.grids[file.replace(/\.ejs$/, '')] = fs.readFileSync(
            app.root + '/app/grids/' + file
        ).toString().split('\n\n')
    });

    app.__defineGetter__('config', function () { return app.settings });

    initAPI(hatch);

    app.compound.on('structure', loadCommonStuff);

    if (process.env.NODE_ENV !== 'test') {
        hatch.loadModules(compound.root + '/hatch_modules');
    }

}

HatchPlatform.prototype.registerCoreModel = function(model) {
    this.compound.models[model.modelName] = model;
    Object.keys(this.modules).forEach(function(module) {
        var m = this.modules[module];
        if (m.compound && m.compound.models) {
            m.compound.models[model.modelName] = model;
        }
    }.bind(this));
};

HatchPlatform.prototype.loadModules = function(dir) {
    var hatch = this;
    var compound = hatch.compound;
    var start = Date.now();
    fs.readdirSync(dir).forEach(function (m) {
        var modPath = path.join(dir, m);
        hatch.loadModuleFromPath(m, modPath);
    });
};

HatchPlatform.prototype.loadModuleFromPath = function(m, modPath) {
    var compound = this.compound;
    var hatch = this;
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
        return;
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

    compound.once('models', function() {
        Object.keys(compound.models).forEach(function(m) {
            mod.compound.models[m] = compound.models[m];
        });
    });

    mod.compound.on('structure', loadCommonStuff);

    mod.compound.on('routes', function () {
        if (!mod.compound.injectMiddlewareBefore(mod.router, hatch.middleware.hatch(compound))) {
            mod.use(mod.router);
        }
    });

    mod.compound.on('ready', function() {
        hatch.compound.emit('module', mod);
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
};

// TODO use some common API for adding helpers and controller methods
function loadCommonStuff(structure, compound) {
    if (!structure.helpers.application_helper) {
        structure.helpers.application_helper = {};
    }
    for (var i in exts) {
        structure.helpers.application_helper[i] = exts[i];
        compound.controllerExtensions[i] = exts[i];
    }
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
