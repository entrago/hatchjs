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

module.exports = ContentTypeAPI;

function ContentTypeAPI(hatch) {
    this.hatch = hatch;
    this.registry = {};
}

/**
 * Register a new content type.
 * 
 * @param  {String} name   - name of content type
 * @param  {Object} params - constructor params
 */
ContentTypeAPI.prototype.registerContentType = function (name, params) {
    if (typeof params === 'string') {
        params = {
            view: params
        };
    }

    if (!contentType.name) {
        contentType.name = name;
    }

    this.registry[name] = contentType;
};

/**
 * Get the contentTemplate for the specified content type.
 * 
 * @param  {String} name - content type name
 * @return {String}      - content type view template path
 */
ContentTypeAPI.prototype.getContentTemplate = function (name) {
    return this.registry[name].view;
};

/**
 * Get a content type definition.
 * 
 * @param  {String} name - content type name
 * @return {Object}      - content type definition
 */
ContentTypeAPI.prototype.getContentType = function (name) {
    return this.registry[name];
};

/**
 * Get the edit form for a content type.
 * 
 * @param  {String} name - content type name
 * @return {String}      - edit form view location
 */
ContentTypeAPI.prototype.getEditForm = function (name) {
    return (this.registry[name] || {}).editForm;
};

/**
 * Get all of the editable content type.
 * 
 * @return {Array} - list of editable content types
 */
ContentTypeAPI.prototype.getEditable = function () {
    return _.filter(this.registry, function (contentType) { 
        return contentType.editForm != null; 
    });
};
