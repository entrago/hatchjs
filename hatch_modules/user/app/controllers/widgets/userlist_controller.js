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
load('widgets/common');

before(function init(c) {
    var group = this.group;
    var User = c.User;
    var cond = {};

    var page = parseInt(c.req.query.page || 1);
    var pageSize = parseInt(this.widget.settings.pageSize || 10);

    var limit = pageSize;
    var offset = pageSize * (page -1);

    var query = {
        where: cond,
        limit: limit,
        offset: offset,
        order: group.id + ':membership:joinedAt DESC',
        fulltext: c.req.param('query')
    };

    // use the selected user or current user
    var user = c.req.selectedUser || c.req.user;

    // a-z index
    if(c.req.query.letter) {
        cond.lastnameLetter = c.req.query.letter;
    }

    // filter by tags
    if (this.widget.settings.tags) {
        cond.tags = this.widget.settings.tags;
    }

    // build the query condition
    switch(this.widget.settings.displayMode) {
        case 'followers':
            if(user) {
                User.getFollowersOf(user.id, function(err, ids) {
                    cond.id = ids;
                    runQuery(cond);
                });

                return;
            }
            break;
        case 'following':
            if(user) {
                cond.id = user.ifollow;
            }
            break;
        case 'members':
            // standard: get the list of users for this group
            cond.membershipGroupId = c.req.group.id;
    }

    runQuery(cond);

    function runQuery(cond) {
        c.locals.profileFields = c.locals._.filter(group.profileFields(), function(field) { return field.privacy == 'public'; });

        // check for invalid query condition
        if(Object.keys(cond).length === 0 || (typeof cond.id != 'undefined' && (cond.id == null || cond.id.length == 0))) {
            c.locals.letter = c.req.query.letter;
            c.locals.users = [];
            c.locals.pagination = { page: 1, size: pageSize, count: 0 };

            return c.next();
        }

        User.all(query, function (err, users) {
            // get whether the current user is following each one
            users.forEach(function(user) { user.isFollowed = locals._.find(c.req.user && c.req.user.ifollow || [], function(id) { return id == user.id; }); });

            c.locals.letter = c.req.query.letter;
            c.locals.pagination = { page: page, size: pageSize, count: users.countBeforeLimit };
            c.locals.users = users;
            c.locals.req = c.req;

            c.next();
        });
    }
});

