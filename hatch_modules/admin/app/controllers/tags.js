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
    init.before(findTag, {only: 'new,edit,update,destroy,add,remove'});
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

function getSortOrders (type) {
    switch(type) {
        case 'content':
            return [
                { name: 'Date', value: 'createdAt DESC' },
                { name: 'Popularity', value: 'score DESC' },
                { name: 'Comments', value: 'commentsTotal DESC' },
                { name: 'Likes', value: 'likesTotal DESC' }
            ];
        
        case 'user':
            return [
                { name: 'Username', value: 'username ASC' },
                { name: 'Last name', value: 'lastname ASC' },
                { name: 'First name', value: 'firstname ASC' },
                { name: 'Date registered', value: 'createdAt DESC' }
            ];
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
 * Render the tag counts for this section.
 * 
 * @param  {HttpContext} c - http context
 */
TagController.prototype.tagCounts = function (c) {
    c.send({
        tags: c.locals.tags
    });
};

/**
 * Show the new/edit form for the specified tag.
 * 
 * @param  {HttpContext} c - http context
 */
TagController.prototype.edit = TagController.prototype.new = function (c) {
    this.defaultFilter = 'filter = function(content) {\n\treturn false; ' +
        '//add your filter criteria here\n};';

    c.locals.sortOrders = getSortOrders(this.type);
    c.render();
};

/**
 * Save changes to a tag.
 * 
 * @param  {HttpContext} c - http context
 */
TagController.prototype.update = TagController.prototype.create = function (c) {
    var self = this;

    c.body.groupId = c.req.group.id;
    c.body.type = this.modelName;
    c.body.filter = c.body.filterEnabled && c.body.filter;

    if (self.tag && self.tag.id) {
        self.tag.updateAttributes(c.req.body, done);
    } else {
        c.Tag.create(c.req.body, done);
    }

    function done (err, tag) {
        if (err) {
            return c.send({
                status: 'error',
                error: err,
                message: err.message
            });
        }

        if (c.body.filterExisting) {

        }

        c.send({
            status: 'success',
            message: 'Tag saved'
        });
    }
};

/**
 * Delete a tag from the database.
 * 
 * @param  {HttpContext} c - http context
 */
TagController.prototype.destroy = function (c) {
    this.tag.destroy(function (err) {
        c.send({
            status: 'success',
            redirect: c.pathTo.tags(c.locals.type)
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
    var model = c[this.modelName];

    c.req.body.ids.forEach(function (id) {
        model.find(id, function (err, obj) {
            self.tag.add(obj, function (err) {
                console.log(obj)
                obj.save();
            });
        });
    });

    c.send({
        status: 'success',
        message: 'Tag added'
    });
};

/**
 * Remove one or more objects from a tag collection.
 * 
 * @param  {HttpContext} c - http context
 */
TagController.prototype.remove = function (c) {
    var self = this;
    var model = c[this.modelName];

    c.req.body.ids.forEach(function (id) {
        model.find(id, function (err, obj) {
            self.tag.remove(obj, function (err) {
                obj.save();
            });
        });
    });

    c.send({
        status: 'success',
        message: 'Tag removed'
    });
};
