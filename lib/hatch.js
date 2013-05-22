require('yaml-js');
var express = require('express');
var co = require('compound');
var fs = require('fs');
var path = require('path');
var initAPI = require('./api');
var exts = require('./extensions.js');
var middleware = require('./middleware.js');
var HatchModule = require('./module.js');

exports.HatchPlatform = HatchPlatform;

/**
 * Hatch platform class
 *
 * @param {ExpressApplication}
 * @constructor
 */
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

    app.compound.on('structure', loadCommonHelpers);
    app.compound.on('module', function(mod) {
        loadCommonHelpers(mod.compound.structure, mod.compound);
    });

    if (process.env.NODE_ENV !== 'test') {
        hatch.loadModules(app.compound.root + '/hatch_modules');
    }

    app.compound.on('models', function() {
        Object.keys(app.compound.models).forEach(function(m) {
            hatch.registerCoreModel(app.compound.models[m]);
        });
    });
}

/**
 * Publish model on root app and all modules
 *
 * @param {ModelConstructor} model - model constructor with `modelName`.
 */
HatchPlatform.prototype.registerCoreModel = function(model) {
    var hatch = this;
    hatch.compound.models[model.modelName] = model;
    Object.keys(hatch.modules).forEach(function(module) {
        var m = hatch.modules[module];
        if (m.compound && m.compound.models) {
            m.compound.models[model.modelName] = model;
        }
    });
};

/**
 * Load modules from directory
 *
 * @param {String} dir - path to directory.
 */
HatchPlatform.prototype.loadModules = function(dir) {
    var hatch = this;
    var compound = hatch.compound;
    var start = Date.now();
    fs.readdirSync(dir).forEach(function(m) {
        var modPath = path.join(dir, m);
        hatch.loadModule(m, modPath);
    });
};

/**
 * Load module from path/name
 *
 * @param {String} m - name of module.
 * @param {String} modPath - module name or path.
 */
HatchPlatform.prototype.loadModule = function(m, modPath) {
    var mod = new HatchModule(this, require(modPath));
    if (mod) {
        m = mod.info.name = mod.info.name || m;
        this.modules[m] = mod;
    }

    if (mod.app) {
        this.mediator.use('/' + m, mod.app);
    }

};

function loadCommonHelpers(structure, compound) {
    if (!structure.helpers.application_helper) {
        structure.helpers.application_helper = {};
    }
    for (var i in exts) {
        structure.helpers.application_helper[i] = exts[i];
        compound.controllerExtensions[i] = exts[i];
    }
}
