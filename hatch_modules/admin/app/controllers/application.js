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

var Application = module.exports = function Application(init) {

    init.before(function requireUser(c) {
        this.admin = c.req.user && c.req.user.adminOf(c.req.group);
        if (this.admin) {
            c.next();
        } else {
            c.next(new Error('403'));
        }
    });

    init.before(function initApp(c) {
        var locals = this;
        this.pageName = c.actionName;
        this.sectionName = c.controllerName;
        this._ = _;
        this.req = c.req;
        this.tabs = c.compound.tabs;
        locals.group = c.req.group;
        if (c.req.query.pageId && isNaN(parseInt(c.req.query.pageId, 10))) {
            var url = c.req.query.pageId.replace(/^.*?\//, '/');
            c.req.group.definePage(url, c, function(err, page) {
                c.req.page = page;
                c.next();
            });
        } else if (c.req.query.pageId) {
            c.Page.find(c.req.query.pageId, function (err, page) {
                c.req.page = page;
                c.next();
            });
        } else {
            c.next();
        }
    });

    init.before(loadContentTypes);
    init.before(loadMemberRoles);
};

// load all of the different content types that have been defined in the app
function loadContentTypes(c) {
    c.locals.contentTypes = c.compound.hatch.contentType.getAll();
    c.locals.editableContentTypes = c.compound.hatch.contentType.getEditable();
    c.next();
}

// setup the default member roles for the app
function loadMemberRoles(c) {
    c.locals.memberRoles = [
        { name: 'members', icon: 'user', filter: 'member' },
        { name: 'editors', icon: 'star', filter: 'editor' },
        { name: 'pending', icon: 'time', filter: 'pending' },
        { name: 'blacklisted', icon: 'flag', filter: 'blacklisted' }
    ];
    c.next();
}
