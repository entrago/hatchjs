//
// Hatch.js is a CMS and social website building framework built in Node.js 
// Copyright (C) 2013 Inventures Software Ltd
// 
// This file is part of Hatch.js
// 
// Hatch.js is free software: you can redistribute it and/or modify it under the
// terms of the GNU General Public License as published by the Free Software
// Foundation, version 3
// 
// Hatch.js is distributed in the hope that it will be useful, but WITHOUT ANY
// WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
// A PARTICULAR PURPOSE.
// 
// See the GNU General Public License for more details. You should have received
// a copy of the GNU General Public License along with Hatch.js. If not, see
// <http://www.gnu.org/licenses/>.
// 
// Authors: Marcus Greenwood, Anatoliy Chakkaev and others
//

var Content = require('./content');
var _ = require('underscore');
var async = require('async');
var moment = require('moment');

module.exports = ModerationController;

function ModerationController(init) {
    Content.call(this, init);
}

require('util').inherits(ModerationController, Content);

// loads all of the content or comments for this controller
function loadContentOrComments (c, callback) {
    if (c.type === 'comments') {
        var cond = {
            groupId: c.req.group.id,
            hasFlag: true
        };

        var query = c.req.query;
        var limit = parseInt(query.iDisplayLength || query.limit || 10, 10);
        var offset = parseInt(query.iDisplayStart || query.offset || 0, 10);
        var colNames = ['', 'title', 'tagNames', 'createdAt', 'score', ''];
        var search = query.sSearch || c.req.body.search;
        var orderBy = query.iSortCol_0 > 0 ?
            (colNames[query.iSortCol_0] + ' ' + query.sSortDir_0.toUpperCase()) :
            null;
       
        // count the total number of records so that we can show count before filter
        c.Comment.count(cond, function(err, count) {
            if (err) {
                return c.next(err);
            }

            c.Comment.all({
                where: cond,
                order: orderBy,
                offset: offset,
                limit: limit,
                fulltext: search
            }, function(err, comments) {
                comments.count = count;
                callback(comments);
            });
        });
    } else if (c.type === 'content') {
        var cond = {
            groupId: c.req.group.id,
            hasFlag: true
        };

        var query = c.req.query;
        var limit = parseInt(query.iDisplayLength || query.limit || 10, 10);
        var offset = parseInt(query.iDisplayStart || query.offset || 0, 10);
        var colNames = ['', 'title', 'tagNames', 'createdAt', 'score', ''];
        var search = query.sSearch || c.req.body.search;
        var orderBy = query.iSortCol_0 > 0 ?
            (colNames[query.iSortCol_0] + ' ' + query.sSortDir_0.toUpperCase()) :
            null;
       
        // count the total number of records so that we can show count before filter
        c.Content.count(cond, function(err, count) {
            if (err) {
                return c.next(err);
            }

            c.Content.all({
                where: cond,
                order: orderBy,
                offset: offset,
                limit: limit,
                fulltext: search
            }, function(err, posts) {
                posts.count = count;
                callback(posts);
            });
        });
    }
}

/**
 * Show the content or comments moderation index. This displays all of the posts
 * that have been flagged for moderation by users.
 * 
 * @param  {HttpContext} c - http context
 *                       c.type - type: content or comments
 */
ModerationController.prototype.index = function (c) {
    this.pageName = 'moderation-' + c.req.params.type;
    this.type = c.req.query.type || c.req.params.type;
    
    c.render();
};

/**
 * Load the content or comments to display in the moderation table.
 * 
 * @param  {HttpContext} c - http context
 *                       c.type - type: content or comments
 */
ModerationController.prototype.load = function (c) {
    c.type = c.req.query.type;

    loadContentOrComments(c, function(posts) {
        c.send({
            sEcho: c.req.query.sEcho || 1,
            iTotalRecords: posts.count,
            iTotalDisplayRecords: posts.countBeforeLimit || 0,
            aaData: posts
        });
    });
};

/**
 * Return only the IDs for a search query. This is used when a user clicks the
 * 'select all' checkbox so that we can get ALL of the ids of the content rather
 * than just the ids of the content on the current page of results.
 * 
 * @param  {HttpContext} c - http context
 *                       c.type - type: content or comments
 */
ModerationController.prototype.ids = function ids(c) {
    c.req.query.limit = 1000000;
    c.req.query.offset = 0;

    loadContentOrComments(c, function(err, posts) {
        c.send({
            ids: _.pluck(posts, 'id')
        });
    });
};