//
// Hatch.js is a CMS and social website building framework built in Node.js 
// Copyright (C) 2013 Inventures Software Ltd
// 
// This file is part of Hatch.js
// 
// Hatch.js is free software: you can redistribute it and/or modify it under
// the terms of the GNU General Public License as published by the Free
// Software Foundation, version 3
// 
// Hatch.js is distributed in the hope that it will be useful, but WITHOUT ANY
// WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE.
// 
// See the GNU General Public License for more details. You should have
// received a copy of the GNU General Public License along with Hatch.js. If
// not, see <http://www.gnu.org/licenses/>.
// 
// Authors: Marcus Greenwood, Anatoliy Chakkaev and others
//

var _ = require('underscore');

module.exports = WidgetController;

function WidgetController(init) {
    init.before(findPageAndWidget);
}

// finds the page that we are performing the action on
function findPageAndWidget(c) {
    var self = this;
    var widgetId = c.req.query.widgetId || c.req.params.widgetId;
    c.req.group.definePage(c.req.pagePath, c, function (err, page) {
        self.page = c.req.page = page;
        c.canEdit = c.req.user && c.req.user.adminOf(c.req.group);
        if (widgetId) {
            self.widget = page.widgets[widgetId];
            if (!self.widget.settings) self.widget.settings = {};
        }
        c.next();
    });
}

/**
 * Wildcard handler for widget actions.
 * 
 * @param  {HttpContext} c - http context
 */
WidgetController.prototype.__missingAction = function __missingAction(c) {
    this.page.widgetAction(this.widget.id, c.requestedActionName, c.req.body, c.req, function (err, res) {
        if (typeof res === 'string') {
            c.send(res);
        } else {
            c.send({
                code: err ? 500 : 200,
                res: res,
                error: err
            });
        }
    });
};
