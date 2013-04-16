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

var reds = require('reds');
var KILL_SEARCH_TIMEOUT = process.env.NODE_ENV === 'test' ? 100 : 30000;

module.exports = SearchAPI;

/**
 * API for fulltext search
 *
 * provides common programming interface for any fulltext search engine:
 * - reds
 * - sphinx
 * - clucene
 * - xapian
 */
function SearchAPI(hatch, adapterName) {
    var search = this;
    this.hatch = hatch;
    this.search = getSearchAdapter(adapterName);
    this._searches = {};

    hatch.compound.on('ready', function() {
        hatch.compound.orm._schemas[0].fulltextSearch = search;
    });
};

/**
 * Add content to search index - build both global and namespaced indexes
 *
 * @param {String} groupId - namespace
 * @param {Number} id - identifier of record
 * @param {Text} content - text data to build index
 */
SearchAPI.prototype.add = function (groupId, id, content) {
    if (!content) return;
    try {
        this.search.index(content, id);
        if (groupId) {
            this.searchFor(groupId).index(content, id);
        }
    } catch(e) {
    }
};

/**
 * Update index for id/content globally and within groupId
 *
 * @param {String} groupId - namespace
 * @param {Number} id - identifier of record
 * @param {Text} content - text data to build index
 */
SearchAPI.prototype.update = function (groupId, id, content) {
    var search = this;
    search.remove(groupId, id, function () {
        search.add(groupId, id, content);
    });
};

/**
 * Remove data from index
 *
 * @param {String} groupId - namespace
 * @param {Number} id - identifier of record
 * @param {Function} callback
 */
SearchAPI.prototype.remove = function (groupId, id, cb) {
    this.search.remove(id, function () {
        if (groupId) {
            this.searchFor(groupId).remove(id, cb);
        }
    }.bind(this));
};

/**
 * Query global index
 *
 * @param {Function} callback(err, ids)
 */
SearchAPI.prototype.query = function (query, cb) {
    this.search.query(query || '').end(cb);
};

/**
 * Query namespaced index
 *
 * @param {String} ns
 * @param {String} query
 * @param {Function} callback(err, ids)
 */
SearchAPI.prototype.queryNS = function (ns, query, cb) {
    this.searchFor(ns).query(query || '').end(cb);
};

/**
 * Return search object for specific namespace
 *
 * @param {String} groupId
 *
 * @api private
 */
SearchAPI.prototype.searchFor = function searchFor(groupId) {
    if (!this._searches[groupId]) {
        this._searches[groupId] = getSearchAdapter('reds', groupId);
        // kill by timeout
        // this._searches[groupId].timeout = setTimeout(function () {
            // if (this._searches[groupId]) {
                // delete this._searches[groupId];
            // }
        // }.bind(this), KILL_SEARCH_TIMEOUT);
    }
    return this._searches[groupId];
};

SearchAPI.prototype.quit = function quit(cb) {
    this.search.client.quit(cb);
};

function getSearchAdapter(type, id) {
    return reds.createSearch(id || 'global');
}

