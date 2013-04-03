
var _ = require('underscore');
var Application = require('./application');

module.exports = ModulesController;

function ModulesController(init) {
    Application.call(this, init);
    init.before(findModule, {only: ['configure', 'update', 'disable']});
}

require('util').inherits(ModulesController, Application);

ModulesController.prototype.index = function (c) {
    loadModules(this, c.compound.hatch);
    c.render();
};

function findModule(c) {
    var locals = this;
    this.group.modules.forEach(function (m, i) {
        if (m &&  (
            m.name === c.req.params.module_id ||
            m.name === c.req.params.id
        )) {
            locals.groupModule = m;
            locals.groupModuleIndex = m.id;
            locals.module = m;
        }
    });
    c.next();
}

ModulesController.prototype.marketplace = function() {
    this.render('marketplace');
};

function loadModules(locals, hatch) {
    locals.modulesAvailable = Object.keys(hatch.modules).map(function (m) {
        return hatch.modules[m];
    });
    locals.modulesEnabled = Object.keys(locals.group.modules).map(function (m) {
        return locals.group.modules[m];
    });
}

ModulesController.prototype.enable = function enable(c) {
    var locals = this;
    var group = this.group;
    var groupModule = {
        name: c.params.module_id,
        contract: {}
    };

    group.modules.push(groupModule);
    group.save(function () {
        c.redirect(c.pathTo.modules);
    });
};

ModulesController.prototype.setup = function(c) {
    var moduleName = c.params.module_id;
    this.inst = this.group.modules.find(moduleName, 'name');

    console.log(this.group.modules.items);

    if (!this.inst) {
        return c.next('Module ' + moduleName + ' not found');
    }

    this.inst.module = c.compound.hatch.modules[c.params.module_id];

    c.render();
};

ModulesController.prototype.update = function(c) {
    var mod = this.group.modules.find(c.params.id, 'name');
    mod.contract = c.req.body;
    this.group.save(function() {
        c.redirect(c.pathTo.modules);
    });
};

ModulesController.prototype.disable = function (c) {
    this.group.modules.remove(this.groupModuleIndex);
    this.group.save(function (err, group) {
        if (!err) {
            c.redirect(c.pathTo.modules);
        }
    });
};

