//
// Hatch.js is a CMS and social website building framework built in Node.js 
// Copyright (C) 2013 Inventures Software Ltd
// 
// This file is part of Hatch.js
// 
// Hatch.js is free software: you can redistribute it and/or modify it under the terms of the
// GNU Affero General Public License as published by the Free Software Foundation, version 3
// 
// Hatch.js is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
// without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// 
// See the GNU Affero General Public License for more details. You should have received a copy of the GNU
// General Public License along with Hatch.js. If not, see <http://www.gnu.org/licenses/>.
// 
// Authors: Marcus Greenwood, Anatoliy Chakkaev and others
//

'use strict';
var _ = require('underscore');
var ApiController = require('./apiController');
var dox = require('dox');
var fs = require('fs');
var _ = require('underscore');

module.exports = UriController;

function UriController(init) {
    ApiController.call(this, init);
    init.before(getModel);
    init.before(findObject, {only: 'get,perform'}); 
}

require('util').inherits(UriController, ApiController);

function getModel(c) {
    this.modelName = _.find(Object.keys(c.compound.models), function (key) {
        return key.toLowerCase() === c.req.params.modelName.toLowerCase();
    });
    this.model = c.compound.models[this.modelName];
    c.next();
}

function findObject(c) {
    var self = this;
    self.modelContext = c.compound.hatch.modelContext.getNewContext(c);

    if (!self.model) {
        return c.send({
            status: 'error',
            message: 'Could not find model "' + c.req.params.modelName + '"'
        });
    }

    self.model.find(c.req.params.id, function (err, obj) {
        if (!obj) {
            return c.send({
                status: 'error',
                message: self.modelName + ' not found'
            });
        }

        // check view permission on this object
        self.modelContext.checkPermission(obj, 'view', function (err, result) {
            if (!result) {
                return c.send({
                    status: 'error',
                    message: 'permission denied'
                });       
            }

            self.obj = obj;
            c.next();
        });
    });
}

/**
 * Get an object from the database and return as JSON.
 * 
 * @param  {context} c - http context
 */
UriController.prototype.get = function get(c) {
    return c.send((this.obj.toPublicObject && this.obj.toPublicObject()) || this.obj);
};

/**
 * Perform an action on an object from the database and returns the result.
 *
 * Examples:
 *     POST http://localhost:3000/do/api/content/1/like?user=1
 * 
 * @param  {context} c - http context containing parameters
 */
UriController.prototype.perform = function perform(c) {
    var self = this;
    var body = c.req.body;
    
    // perform the method call via the HatchAPI model
    self.modelContext.perform(self.obj, c.req.params.action, body, function (err, result) {
        if (err) {
            return c.send({
                status: 'error',
                message: err.message
            });
        }

        return c.send({
            status: 'success',
            message: c.req.params.action + ' executed',
            result: result,
            object: self.obj
        });
    });
};


UriController.prototype.docs = function (c) {
    var self = this;

    // read the model file
    fs.readFile(c.compound.parent.root + '/app/models/' + self.modelName + '.js', 'utf8', function (err, str) {
        var results = [];
        var comments = dox.parseComments(str);
        
        (self.model.allowedApiActions || []).forEach(function (key) {
            var comment = _.find(comments, function (c) { return c.ctx.name === key; });
            if (comment) {
                results.push(comment);
            }
        }); 

        c.locals.req = c.req;
        c.locals.modelName = self.modelName;
        c.locals.functions = results;
        c.render({ layout: false });
    });
};
