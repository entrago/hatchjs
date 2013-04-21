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

var _ = require('underscore');
var Application = require('./application');

module.exports = GroupController;

function GroupController(init) {
    Application.call(this, init);
    init.before(function setup(c) {
        this.sectionName = 'group';
        c.next();
    });
    init.before(loadModules);
}

function loadModules(c) {
    c.locals.modulesEnabled = [];

    Object.keys(c.req.group.modules.items).forEach(function (m) {
        var inst = c.req.group.modules.items[m];
        inst.module = c.compound.hatch.modules[inst.name];
        c.locals.modulesEnabled.push(inst);
    });

    c.next();
}

require('util').inherits(GroupController, Application);

/**
 * Show the group settings form.
 * 
 * @param  {HttpContext} c - http context
 */
GroupController.prototype.show = function (c) {
    c.locals.tab = c.req.params.tab || 'settings';
    c.locals.pageName = 'group-'  + c.locals.tab;
    c.locals.group = c.req.group;
    c.render();
};

/**
 * Save group settings for this group.
 * 
 * @param  {HttpContext} c - http context
 */
GroupController.prototype.save = function(c) {
    var group = c.req.group;

    if(c.body.url) {
        group.updateUrl(c.body.url, function(err) {
            if(err) return c.error({ message: err.toString() });

            //make sure to redirect to the new url
            c.send({ redirect: group.homepage.url });
        });
    }
    else {
        group.updateAttributes(c.req.body, function (err, group) {
            if (err) {
                return c.send({
                    message: 'Error saving settings',
                    status: 'error',
                    icon: 'remove-sign'
                });
            }
            
            c.send({
                message: 'Group settings saved',
                status: 'success',
                icon: 'ok'
            });
        });
    }
};

/**
 * Show the module settings screen.
 * 
 * @param  {HttpContext} c - http context
 */
GroupController.prototype.setupModule = function(c) {
    var moduleName = c.params.id;
    this.pageName = 'module-' + moduleName;

    this.inst = this.group.modules.find(moduleName, 'name');
    this.inst.module = c.compound.hatch.modules[moduleName];

    c.render();
};