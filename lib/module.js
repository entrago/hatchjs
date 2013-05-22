module.exports = HatchModule;

var fs = require('fs');
var path = require('path');

/**
 * Hatch module class.
 *
 * @param {HatchPlatform} hatch - hatch platform.
 * @param {Function} mod - module initializer.
 * @constructor
 */
function HatchModule(hatch, mod) {
    var module = this;

    this.hatch = hatch;

    if ('function' === typeof mod) {
        this.app = mod(hatch.compound);
        this.compound = this.app.compound;
    } else {
        return;
    }

    var compound = module.compound;
    var app = module.app;

    compound.parent = hatch.compound;
    compound.hatch = hatch;

    module.loadConfig();
    module.registerHooks();
    module.registerWidgets();

    compound.injectMiddlewareBefore(app.router, hatch.middleware.hatch(compound));

    if (compound) {
        this.path = compound.root;
        compound.on('ready', function() {
            hatch.compound.emit('module', module);
        });
    } else {
        hatch.compound.emit('module', module);
    }

}

/**
 * Register hooks for module. Called on initialization of module.
 */
HatchModule.prototype.registerHooks = function registerHooks() {
    if (!this.compound) {
        return;
    }
    this.compound.on('before controller', function(ctl, act, req, res, next) {
        if (req.pagePath !== req.url) {
            ctl.pathTo = ctl.path_to = mod.compound.map.clone(req.pagePath);
        }
    });
};

/**
 * Initialize widgets listed in ./config/widgets.yml
 */
HatchModule.prototype.registerWidgets = function registerWidgets() {
    if (!fs.existsSync(this.path + '/config/widgets.yml')) {
        return;
    }

    var mod = this;
    var ws = require(this.path + '/config/widgets.yml')[0];
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
};

/**
 * Initialize special pages located in ./app/pages
 */
HatchModule.prototype.loadPages = function loadPages() {
    var pagesPath = this.path + '/app/pages/';
    if (!fs.existsSync(pagesPath)) {
        return;
    }
    fs.readdirSync(pagesPath).forEach(function (file) {
        var name = file.replace(/\.(js|coffee)$/, '');
        compound.hatch.page.register(name, require(pagesPath + file));
    });
}

/**
 * Load config from ./config/module.yml
 */
HatchModule.prototype.loadConfig = function loadConfig() {
    var mod = this;
    var confPath = this.path + '/config/module.yml';

    if (fs.existsSync(confPath)) {
        try {
            mod.info = require(confPath)[0];
        } catch (e) {}
    }

    if (!mod.info) {
        mod.info = {};
    }
};
