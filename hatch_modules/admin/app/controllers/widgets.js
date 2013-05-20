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
 * Add a new widget to the current page.
 * 
 * @param  {HttpContext} c - http context
 */
WidgetController.prototype.create = function(c) {
    var page = this.page;
    var type = c.body.addWidget;
    
    var widget = page.widgets.push({
        type: type, 
        settings: {}
    });

    // save the new widget, render and add to the page
    widget.save(function () {
        page.renderWidget(widget, c.req, function (err, html) {
            c.send({
                code: err ? 500 : 200,
                html: html,
                widget: widget,
                error: err
            });
        });
    });
};

/**
 * Render a widget
 * //TODO: move this to core lib
 * 
 * @param  {HttpContext} c - http context
 */
WidgetController.prototype.render = function(c) {
    this.page.renderWidget(this.widget, c.req, function (err, html) {
        c.send(html);
    });
};

/**
 * Update a widget by performing the update action.
 * 
 * @param  {HttpContext} c - http context
 */
WidgetController.prototype.update = function(c) {
    var widgetId = parseInt(c.req.params.id, 10);
    this.page.performWidgetAction(widgetId, c.req, function (err, res) {
        c.send({
            code: err ? 500 : 200,
            res: res,
            error: err
        });
    });
};

/**
 * Set the title of a widget.
 * 
 * @param  {HttpContext} c - http context
 */
WidgetController.prototype.settitle = function(c) {
    var widgetId = parseInt(c.req.params.id, 10);
    this.widget.settings.title = c.req.body.title;
    this.page.save(function () {
        c.send('ok');
    });
};

/**
 * Delete a widget from the page.
 * 
 * @param  {HttpContext} c - http context
 */
WidgetController.prototype.destroy = function(c) {
    var page = this.page;
    page.widgets.remove(parseInt(c.req.param('id'), 10));
    page.save(function() {
        // TODO: normalize widget response [API]
        c.send('ok');
    });
};

/**
 * Show the settings dialog for this widget.
 * 
 * @param  {HttpContext} c - http context
 */
WidgetController.prototype.settings = function(c) {
    this.widgetCore = c.compound.hatch.widget.getWidget(this.widget.type);
    var widget = this.widget;

    this.visibility = [
          { icon: 'mobile-phone', class: 'success', name: 'All devices', value: 'visible-all', description: 'This widget can be viewed on all devices'},
          { icon: 'tablet', class: 'warning', name: 'Tablets', value: 'hidden-phone', description: 'This widget can be viewed on tablets and computers'},
          { icon: 'desktop', class: 'danger', name: 'Computers', value: 'visible-desktop', description: 'This widget can only be viewed on computers'}
        ]; 
    this.visibility.selected = _.find(this.visibility, function(v) { return v.value == (widget.settings && widget.settings.visibility || 'visible-all') });

    this.privacy = [
          { icon: 'globe', class: 'success', name: 'Public', value: 'public', description: 'All users can see this widget'},
          { icon: 'user', class: 'warning', name: 'Members', value: 'members-only', description: 'Only members of this group can see this widget'},
          { icon: 'unlock', class: 'danger', name: 'Private', value: 'private', description: 'Only the group owner and editors can see this widget'},
          { icon: 'lock', class: '', name: 'Signed out', value: 'non-registered', description: 'Only signed out users will see this widget'}
        ];
    this.privacy.selected = _.find(this.privacy, function(p) { return p.value == (widget.settings && widget.settings.privacy || 'public') });

    var settings = this.widgetCore.info.settings;
    if (settings && settings.custom) {
        this.page.widgetAction(this.widget.id, 'settings', null, c.req, function (e, settings) {
            c.send(settings);
        });
    } else {
        this.inlineEditAllowed = this.widget.inlineEditAllowed;
        c.render({layout:false});
    }
};

/**
 * Save widget settings.
 * 
 * @param  {HttpContext} c - http context
 */
WidgetController.prototype.configure = function(c) {
    var settings = this.widget.settings;
    Object.keys(c.body).forEach(function(key) {
        settings[key] = c.body[key];
    });
    this.widget.save(function () {
        // TODO: normalize widget response [API]
        c.send('ok');
    });
};

/**
 * Adjust the contrast of a widget on the page.
 * 
 * @param  {HttpContext} c - http context
 */
WidgetController.prototype.contrast = function(c) {
    var map = { 0: 1, 1: 2, 2: 0 };
    var settings = this.widget.settings;
    settings.contrastMode = map[(settings.contrastMode || 0)];
    this.widget.save(function() {
        // TODO: normalize widget response [API]
        c.send('ok');
    });
};

WidgetController.prototype.__missingAction = function __missingAction(c) {
    this.page.widgetAction(this.widget.id, c.requestedActionName, c.req.body, c.req, function (err, res) {
        c.send({
            code: err ? 500 : 200,
            res: res,
            error: err
        });
    });
};
