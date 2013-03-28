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
module.exports = TagController;

function TagController(init) {
    init.before(findTag);
}

function handleError(c, err) {
    return c.send({
        status: 'error',
        message: err.message
    });
}

function findTag(c) {
    c.Tag.findByName(c.req.params.name, function (err, tag) {
        if (!tag) {
            return handleError(c, new Error('Tag not found'));
        }

        // TODO: authenticate the user and check permissions vs this tag

        c.tag = tag;
        c.next();
    });
}

/**
 * Get all of the items within a tag and returns them from the database.
 *
 * Examples:
 *      http://localhost:3000/do/api/tags/popular/get?offset=20&limit=20
 *
 *      This would return all of the content items tagged with popular and
 *      output them as JSON in the format:
 *
 *      {
 *          status: 'success',
 *          query: {
 *              offset: 20,
 *              limit: 20,
 *              where: {
 *                  tags: 'popular'
 *              },
 *              results: {
 *                  items: [
 *                       {
 *                           id: 101,
 *                           title: 'hello, world'
 *                           ...
 *                       }  
 *                       ... 
 *                  ],
 *                  count: 155
 *              }
 *          }
 *      }
 * 
 * @param  {context} c - http context
 */
TagController.prototype.get = function get(c) {
    var params = {
        offset: c.req.query.offset || 0,
        limit: c.req.query.limit || 10
    };

    c.tag.getResults(params, function (err, results) {
        c.send({
            status: 'success',
            params: params,
            results: results
        });
    });
};

/**
 * Ping a tag to see whether the items contained within have been updated
 * since the specified date:
 *
 * Examples:
 *     http://localhost:3000/do/api/tags/popular/ping?since=2013-04-01
 *
 *     {
 *         status: 'updated'
 *     }
 * 
 * @param  {context} c - http context
 */
TagController.prototype.ping = function ping(c) {
    return c.send({
        status: c.tag.ping(c.req.query.since) ? 'updated' : 'same'
    });
};

/**
 * Subscribe to a tag to receive pingbacks whenever the tag contents change.
 *
 * Examples:
 *     http://localhost:3000/do/api/tags/popular/subscribe?lease=60000&url=
 *         http://mysubscriber.com/do/api/streams/12345678/run
 * 
 * @param  {context} c - http context
 */
TagController.subscribe = function subscribe(c) {
    var url = c.req.query.url;
    var lease = parseInt(c.req.query.lease, 10);

    c.tag.subscribe(url, lease, function (err) {
        if (err) {
            return handleError(c, err);
        }

        return c.send({
            status: 'success',
            message: 'Subscribed to tag'
        });
    });
};

