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
var async = require('async');

module.exports = TagController;

function TagController(init) {
    Application.call(this, init);
    init.before(loadTags);
    init.before(findTag, {only: 'new,edit,save,delete,add,remove'});
}

function loadTags(c) {
    this.type = this.sectionName = c.params.section;
    this.modelName = c.compound.model(this.type, false).modelName;

    this.pageName = c.actionName + '-tags';

    c.Tag.all({ where: { type: this.modelName }}, function (err, tags) {
        c.locals.tags = tags;
        c.next();
    });
}

function findTag (c) {
    var self = this;
    var id = c.req.params.id || c.req.query.id || c.req.body.id;

    if (id) {
        c.Tag.find(id, function (err, tag) {
            self.tag = c.locals.tag = tag;
            c.next();
        });
    } else {
        self.tag = c.locals.tag = {};
        c.next();
    }
}

/**
 * Show the full list of tags within this section.
 * 
 * @param  {HttpContext} c - http context
 */
TagController.prototype.index = function (c) {
    c.render();
};

/**
 * Show the new/edit form for the specified tag.
 * 
 * @param  {HttpContext} c - http context
 */
TagController.prototype.edit = TagController.prototype.new = function (c) {
    this.defaultFilter = 'filter = function(content) {\n\treturn false; ' +
        '//add your filter criteria here\n};';
    c.render();
};

/**
 * Save changes to a tag.
 * 
 * @param  {HttpContext} c - http context
 */
TagController.prototype.save = function (c) {
    var self = this;

    c.body.groupId = c.req.group.id;
    c.body.type = this.modelName;

    if (self.tag && self.tag.id) {
        self.tag.updateAttributes(c.req.body, done);
    } else {
        c.Tag.create(c.req.body, done);
    }

    function done (err) {
        if (err) {
            return c.send({
                status: 'error',
                error: err,
                message: err.message
            });
        }

        c.send({
            status: 'success'
        });
    }
};

/**
 * Delete a tag from the database.
 * 
 * @param  {HttpContext} c - http context
 */
TagController.prototype.delete = function (c) {
    this.tag.destroy(function (err) {
        c.send({
            status: 'success'
        });
    });
};

/**
 * Add one or more objects to a tag collection.
 * 
 * @param {HttpContext} c - http context
 */
TagController.prototype.add = function (c) {
    var self = this;
    var model = c.models[this.type];

    c.req.body.ids.forEach(function (id) {
        model.find(id, function (err, obj) {
            self.tag.add(obj, function (err, obj) {
                obj.save();
            });
        });
    });

    c.send({
        status: 'success'
    });
};

/**
 * Remove one or more objects from a tag collection.
 * 
 * @param  {HttpContext} c - http context
 */
TagController.prototype.remove = function (c) {
    var self = this;
    var model = c.models[this.type];

    c.req.body.ids.forEach(function (id) {
        model.find(id, function (err, obj) {
            self.tag.remove(obj, function (err, obj) {
                obj.save();
            });
        });
    });

    c.send({
        status: 'success'
    });
};
