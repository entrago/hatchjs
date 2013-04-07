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

'use strict';
var _ = require('underscore');
var ApiController = require('./apiController');

module.exports = UriController;

function UriController(init) {
    ApiController.call(this, init);
    init.before(findObject);
}

require('util').inherits(UriController, ApiController);

function findObject(c) {
    var self = this;
    self.modelContext = c.compound.hatch.modelContext.getNewContext(c);

    // TODO: change case-insensitive model find to compound.getModel when implemented
    self.modelName = _.find(Object.keys(c.compound.models), function (key) {
        return key.toLowerCase() === c.req.params.modelName.toLowerCase();
    });
    var model = c.compound.models[self.modelName];

    if (!model) {
        return c.send({
            status: 'error',
            message: 'Could not find model "' + c.req.params.modelName + '"'
        });
    }

    model.find(c.req.params.id, function (err, obj) {
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

