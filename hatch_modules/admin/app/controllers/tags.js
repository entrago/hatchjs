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
var _ = require('underscore');

module.exports = TagController;

function TagController(init) {
    Application.call(this, init);
    init.before(loadTags);
    init.before(findTag, {only: 'new,edit,update,destroy,add,remove'});
}

// gets the name of the active model
function getModelName(path) {
    var hash = {
        users: 'User',
        content: 'Content'
    };
    return hash[path];
}

// loads the tags for the active model
function loadTags(c) {
    this.type = this.sectionName = c.params.section;
    this.modelName = getModelName(this.sectionName);

    this.pageName = c.actionName + '-tags';

    c.Tag.all({ where: { groupIdByType: c.req.group.id + '-' + this.modelName }}, function (err, tags) {
        tags.forEach(function (tag) {
            tag.sortOrder = tag.sortOrder &&
            _.find(getSortOrders(c.params.section), function (sortOrder) {
                return sortOrder.value === tag.sortOrder;
            }).name;
        });

        c.locals.tags = tags;
        c.next();
    });
}

// find the tag to edit
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

// gets the sort orders for the active model
function getSortOrders (type) {
    switch(type) {
        case 'content':
            return [
                { name: 'ID', value: 'id DESC' },
                { name: 'Date', value: 'createdAt DESC' },
                { name: 'Popularity', value: 'score DESC' },
                { name: 'Comments', value: 'commentsTotal DESC' },
                { name: 'Likes', value: 'likesTotal DESC' }
            ];
        
        case 'users':
            return [
                { name: 'ID', value: 'id DESC' },
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
    c.locals.sortOrders = getSortOrders(this.type);
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

    // create the recursive renderPermissions function
    c.locals.renderPermissions = function(permission) {
        var tag = c.locals.tag;
        var html = '<li><label class="checkbox"><input type="checkbox" name="permission-' + 
            permission.name + '" ' + 
            (tag.permissions && tag.permissions.find(permission.name, 'id') ? 'checked="checked"':'') + 
            ' /> ' + permission.title + '</label>';

        if((permission.permissions || []).length > 0) {
            html += '<ul class="">';
            permission.permissions.forEach(function(permission) {
                html += c.locals.renderPermissions(permission);
            });
            html += '</ul>';
        }
        
        html += '</li>';
        return html;
    };

    c.locals.permissions = c.compound.hatch.permissions;
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
    c.body.count = c.body.count || 0;

    // fix the permissions in req.body
    c.body.permissions = [];

    Object.keys(c.req.body).forEach(function(key) {
        if(key.indexOf('permission-') == 0) {
            c.body.permissions.push(key.substring(key.indexOf('-') +1));
        }
    });

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
