//
// Hatch.js is a CMS and social website building framework built in Node.js 
// Copyright (C) 2013 Inventures Software Ltd
// 
// This file is part of Hatch.js
// 
// Hatch.js is free software: you can redistribute it and/or modify it under the terms of the
// GNU General Public License as published by the Free Software Foundation, version 3
// 
// Hatch.js is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
// without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// 
// See the GNU General Public License for more details. You should have received a copy of the GNU
// General Public License along with Hatch.js. If not, see <http://www.gnu.org/licenses/>.
// 
// Authors: Marcus Greenwood, Anatoliy Chakkaev and others
//

var Application = require('./application');

module.exports = ModulesController;

function ModulesController(init) {
    Application.call(this, init);
    init.before(findModule, {only: ['configure', 'update', 'disable']});
}

require('util').inherits(ModulesController, Application);

// finds a specific module for the context
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

// loads all modules for the application
function loadModules(locals, hatch) {
    locals.modulesAvailable = Object.keys(hatch.modules).map(function (m) {
        return hatch.modules[m];
    });
    locals.modulesEnabled = Object.keys(locals.group.modules).map(function (m) {
        return locals.group.modules[m];
    });
}

/**
 * Show the module list where the administrator can enable or disable modules.
 * 
 * @param  {HttpContext} c - http context
 */
ModulesController.prototype.index = function (c) {
    loadModules(this, c.compound.hatch);
    c.render();
};

/**
 * Enable the specified module so that it is available for this group.
 * 
 * @param  {HttpContext} c - http context
 *                       c.module_id - name of the module to enable
 */
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

/**
 * Update the settings of the specified module.
 * 
 * @param  {HttpContext} c - http context
 *                       c.body - module settings to update
 */
ModulesController.prototype.update = function(c) {
    var mod = this.group.modules.find(c.params.id, 'name');
    mod.contract = c.req.body;
    this.group.save(function() {
        c.send({
            status: 'success',
            icon: 'ok',
            message: 'Module settings updated'
        });
    });
};

/**
 * Disable the specified module so that it is no longer available for this group.
 * 
 * @param  {HttpContext} c - http context
 *                       c.module_id - name of module to disable
 */
ModulesController.prototype.disable = function (c) {
    this.group.modules.remove(this.groupModuleIndex);
    this.group.save(function (err, group) {
        if (!err) {
            c.redirect(c.pathTo.modules);
        }
    });
};

