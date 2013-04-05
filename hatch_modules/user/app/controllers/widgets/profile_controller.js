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

before(function init(c) {
    var User = c.User;
    var Content = c.Content;
    var group = this.group;
    var locals = this;
    var _ = this._;
    locals.req = c.req;

    locals.user = c.req.selectedUser || c.req.user || new User;
    locals.user.isFollowed = _.find(c.req.user && c.req.user.ifollow || [], function(id) { return id == c.locals.user.id; });
    locals.profileFields = _.filter(group.profileFields(), function(field) { return field.privacy == 'public'; });

    locals.numberOfFriends = (c.req.selectedUser && c.req.selectedUser.ifollow || []).length;

    if(c.req.selectedUser) {
        User.getFollowersOf(c.req.selectedUser.id, function(err, followers) {
            c.locals.numberOfFollowers = followers.length;

            Content.count({ authorId: c.req.selectedUser.id }, function(err, count) {
                locals.numberOfPosts = count;

                c.next();
            })
        });
    } else {
        locals.numberOfFollowers = 0;
        locals.numberOfPosts = 0;

        c.next();
    }
});

