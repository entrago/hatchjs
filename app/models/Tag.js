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

var async = require('async');

module.exports = function (compound, Tag) {
    'use strict';
    var api = compound.hatch.api;

    Tag.validatesPresenceOf('title', {message: 'Please enter a title'});
    Tag.validatesUniquenessOf('name', {message: 'This tag name is taken'});

    /**
     * Update the compound model for the specified tag to make sure the custom
     * sort order is defined for the specified tag.
     *
     * This is needed before any items that use this tag can be saved so that 
     * the sort orders are correct when they are queried by tag.
     * 
     * @param  {Tag} tag - tag to check for
     */
    Tag.updateModel = function (tag) {
        if (!tag.sortOrder) {
            return;
        }

        var settings = compound.models[tag.type].schema.settings;
        if (!settings.customSort) {
            settings.customSort = {};
        }

        if (!settings.customSort['tags.' + tag.name]) {
            settings.customSort['tags.' + tag.name] = tag.sortOrder;
        }
    };

    /**
     * Updates the compound model for the specified tag to make sure the custom
     * sort order is defined for the specified tag.
     *
     * This is needed before any items that use this tag can be saved so that 
     * the sort orders are correct when they are queried by tag.
     */
    Tag.prototype.updateModel = function () {
        Tag.updateModel(this);
    };

    /**
     * Rebuild the index for this tag. This should be used if the sort order
     * for this tag has been modified.
     */
    Tag.prototype.rebuildIndex = function () {
        Tag.rebuildIndex(this);
    };

    /**
     * Rebuild the index for this tag. This should be used if the sort order
     * for this tag has been modified.
     * 
     * @param  {Tag} tag - tag to rebuild index for
     */
    Tag.rebuildIndex = function (tag) {
        //make sure the custom sort is correct in the schema
        Tag.updateModel(tag);

        //re-save every object
        compound.models[tag.type].all({ where: { tags: tag.name }}, function (err, data) {
            data.forEach(function (data) {
                data.save();
            });
        });
    };

    /**
     * Get the filter function for this tag.
     *
     * A filter function is used to automatically tag objects based on a 
     * javascript. The filter is contained as a string within this.filter
     * property and the signature is always function (obj) { ... }.
     *
     * obj is a database entity of any type which has a 'tags' property.
     *
     * Examples:
     *
     *     // Here we are checking a content entity (obj) to see whether it has 
     *     // more than 5 likes. We are returning true so that the 'popular' 
     *     // tag is added to it's list of tags.
     *     function (obj) {
     *         return obj.likesTotal > 5;
     *     }
     * 
     * @return {Function} - the filter function (if any)
     */
    Tag.prototype.filterFn = function () {
        if (!this.filter) {
            throw new Error('No filter defined');
        }
        return new Function('obj', this.filter);
    };

    /**
     * Get whether an object matches this tag's filter function.
     * 
     * @param  {object}   obj -object to test
     * @return {Boolean}       true or false
     */
    Tag.prototype.matchFilter = function (obj) {
        if (!this.filter) {
            return false;
        }
        return this.filterFn()(obj);
    };

    /**
     * Update the count for this tag by querying the database and caching the 
     * result.
     * 
     * @param  {Function} callback - callback function
     */
    Tag.prototype.updateCount = function (callback) {
        compound.models[this.type].count({ tags: this.name }, function (err, count) {
            this.count = count;
            this.save(callback);
        });
    };

    /**
     * Update the counts for all tags (within a specific group/type - optional).
     *
     * @params {String}   type       - type of tag to update
     * @param  {Number}   groupId    - id of group - optional
     * @param  {Function} callback   - callback function
     */
    Tag.updateCounts = function (type, groupId, callback) {
        var cond = {};
        if (type) {
            cond.type = type;
        }
        if (groupId) {
            cond.groupId = groupId;
        }

        var query = {};
        if (Object.keys(cond).length > 0) {
            query.where = cond;
        }

        Tag.all(query, function (err, tags) {
            async.forEach(tags, function (tag, next) {
                tag.updateCount(next);
            }, function (err, results) {
                if (callback) {
                    callback();
                }
            });
        });
    };

    /**
     * Get all of the matching tags for the specified object by running the
     * tag filter functions (see above) to find matches.
     * 
     * @param  {object}     obj      - object to get matching tags for
     * @param  {Function}   callback - callback function
     */
    Tag.getMatchingTags = function (obj, callback) {
        Tag.all({ where: { type: obj.constructor.modelName }}, function (err, tags) {
            var matchingTags = [];

            tags.forEach(function (tag) {
                // skip group specific tags for other groups
                if (tag.groupId && tag.groupId != obj.groupId) {
                    return;
                }

                if (tag.matchFilter(obj)) {
                    matchingTags.push(tag);
                }
            });

            callback(err, matchingTags);
        });
    };

    /**
     * Apply matching tags to this object by running the
     * tag filter functions to find matches (see above).
     * 
     * @param  {object}     obj      - object to apply matching tags for
     * @param  {Function}   callback - callback function
     */
    Tag.applyMatchingTags = function (obj, callback) {
        Tag.getMatchingTags(obj, function (err, tags) {
            tags.forEach(function (tag) {
                if (!obj.tags[tag.name]) {
                    obj.tags.push(tag.name);
                }
            });

            callback(err, obj);
        });
    };
};
