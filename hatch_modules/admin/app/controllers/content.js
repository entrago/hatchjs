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

var Application = require('./application');
var _ = require('underscore');
var async = require('async');
var moment = require('moment');

module.exports = ContentController;

function ContentController(init) {
    Application.call(this, init);
    init.before(loadTags);
}

require('util').inherits(ContentController, Application);

// Load the content tags for this group to display on the left navigation
function loadTags(c) {
    c.Tag.all({ where: { groupIdByType: c.req.group.id + '-Content' }}, function (err, tags) {
        delete tags.countBeforeLimit;
        c.locals.tags = tags;
        c.next();
    });
}

// Render a content type input form which is defined in the contentType API
function renderInputForm(c, next) {
    var type = c.locals.post.type;
    var contentType = c.compound.hatch.contentType.getContentType(type);

    c.locals.datetimeformat = c.app.get('datetimeformat');

    c.prepareViewContext();
    c.renderView('content/edit/' + contentType.name, function (err, html) {
        if (err) {
            html = err;
        }

        c.locals.editForm = html;
        next();
    });
}

/**
 * Show the content list for this group.
 * 
 * @param  {HttpContext} c - http context
 */
ContentController.prototype.index = function index(c) {
    c.req.session.adminSection = 'content';
    this.filter = c.req.query.filter || c.req.params.filter;
    var suffix = 'string' === typeof this.filter ? '-' + this.filter : '';
    this.pageName = 'content' + suffix;

    c.respondTo(function(format) {
        format.html(function() {
            c.render();
        });
        format.json(function() {
            loadContent(c, function(posts) {
                c.send({
                    sEcho: c.req.query.sEcho || 1,
                    iTotalRecords: posts.count,
                    iTotalDisplayRecords: posts.countBeforeLimit || 0,
                    aaData: posts
                });
            });
        });
    });
};

/**
 * Return only the IDs for a search query. This is used when a user clicks the
 * 'select all' checkbox so that we can get ALL of the ids of the content rather
 * than just the ids of the content on the current page of results.
 * 
 * @param  {HttpContext} c - http context
 */
ContentController.prototype.ids = function ids(c) {
    this.filter = c.req.query.filter || c.req.params.filter;
    var suffix = 'string' === typeof this.filter ? '-' + this.filter : '';
    this.pageName = 'content' + suffix;

    c.req.query.limit = 1000000;
    c.req.query.offset = 0;

    loadContent(c, function(posts) {
        c.send({
            ids: _.pluck(posts, 'id')
        });
    });
};

/**
 * Show the new content input form.
 * 
 * @param  {HttpContext} c - http context
 */
ContentController.prototype.new = function(c) {
    this.post = new c.Content();
    this.post.type = c.req.params.type;

    renderInputForm(c, function () {
        c.render();
    });
};

/**
 * Show the edit content input form.
 * 
 * @param  {HttpContext} c - http context
 */
ContentController.prototype.edit = function edit(c) {
    c.Content.find(c.params.id, function(err, post) {
        c.locals.post = post;
        
        renderInputForm(c, function () {
            c.render();
        });
    });
};

/**
 * Create a new content record with the data from the form body.
 * 
 * @param  {HttpContext} c - http context
 */
ContentController.prototype.create = function create(c) {
    var group = this.group;
    var data = c.body.Content || c.req.body;

    // set the constructor
    data.constructor = c.Content;

    // set the groupId and authorId for the new post
    data.groupId = group.id;
    data.authorId = c.req.user.id;

    // if there is no date, set to now. otherwise parse with moment to fix format
    if (!data.createdAt) {
        data.createdAt = new Date();
    } else {
        data.createdAt = moment(data.createdAt, c.app.get('datetimeformat')).toDate();
    }

    data.updatedAt = new Date();

    // assign tags to the new object and then save after that
    c.Tag.assignTagsForObject(data, c.req.body.Content_tags, function () {
        c.Content.create(data, function(err, content) {
            if (err) {
                var HelperSet = c.compound.helpers.HelperSet;
                var helpers = new HelperSet(c);

                c.send({
                    code: 500,
                    errors: content.errors,
                    html: helpers.errorMessagesFor(content)
                });
            } else {
                group.recalculateTagContentCounts(c);
                c.send({
                    code: 200,
                    html: c.t('models.Content.messages.saved')
                });
            }
        });
    });
};

/**
 * Update an existing content record with the data from the form body.
 * 
 * @param  {HttpContext} c - http context
 */
ContentController.prototype.update = function update(c) {
    var Content = c.Content;
    var id = c.params.id;
    var group = c.req.group;
    var data = c.body.Content;

    // parse the date format with moment
    data.createdAt = moment(data.createdAt, c.app.get('datetimeformat')).toDate();
    data.updatedAt = new Date();

    Content.find(id, function(err, post) {
        c.Tag.assignTagsForObject(post, c.req.body.Content_tags, function () {
            delete data.tags;

            // update the keys manually
            Object.keys(data).forEach(function(key) {
                post[key] = data[key];
            });

            post.save(function (err, content) {
                if (err) {
                    var HelperSet = c.compound.helpers.HelperSet;
                    var helpers = new HelperSet(c);
                    c.send({
                        code: 500,
                        errors: content.errors || err,
                        html: helpers.errorMessagesFor(content)
                    });
                } else {               
                    c.send({
                        code: 200,
                        html: c.t('post.saved')
                    });
                }
            });
        });
    });
};

/**
 * Delete a single content record.
 * 
 * @param  {HttpContext} c - http context
 */
ContentController.prototype.destroy = function(c) {
    var group = c.req.group;

    c.Content.find(c.params.id, function(err, content) {
        content.destroy(function(err) {
            // finally, update the group tag counts
            c.Tag.updateCountsForObject(content);
            c.send('ok');
        });
    });
};

/**
 * Delete multiple content records.
 * 
 * @param  {HttpContext} c - http context
 */
ContentController.prototype.destroyAll = function(c) {
    var Content = c.Content;
    var group = c.req.group;
    var selectedContent = c.body.selectedContent || [];
    var count = 0;

    deleteSelectedContent(selectedContent);

    function deleteSelectedContent(selectedContent) {
        async.forEach(selectedContent, function(id, next) {
            Content.find(id, function(err, content) {
                if (!content) {
                    return next();
                }

                content.destroy(function(err) {
                    count++;
                    next();
                });
            });
        }, function() {
            // finally, update the group tag counts
            c.locals.tags.forEach(function (tag) {
                tag.updateCount();
            });

            c.send({
                message: count + ' posts deleted',
                status: 'success',
                icon: 'ok'
            });
        });
    }
};

// Load content based on the current filter/critera
function loadContent(c, cb) {
    return makeQuery(makeCond(c), cb);

    function makeCond(c) {
        var cond = {
            groupId: c.req.group.id
        };

        var filter = c.req.query.filter || c.req.body.filter;

        if (typeof filter === 'string' && filter.indexOf("[native code]") === -1) {
            // filter by tag
            if (!isNaN(parseInt(filter, 10))) {
                cond['tags'] = filter;
            }
            // filter by content type
            else {
                cond.type = filter;
            }
        }
        return cond;
    }

    function makeQuery(cond, cb) {
        var query = c.req.query;
        var limit = parseInt(query.iDisplayLength || query.limit || 0, 10);
        var offset = parseInt(query.iDisplayStart || query.offset || 0, 10);
        var colNames = ['', 'title', 'tagString', 'createdAt', 'score', ''];
        var search = query.sSearch || c.req.body.search;
        var orderBy = query.iSortCol_0 > 0 ?
            (colNames[query.iSortCol_0] + ' ' + query.sSortDir_0.toUpperCase()) :
            'createdAt DESC';
       
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
                cb(posts);
            });
        });
    }
}
