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

before(function init(c) {
    var User = c.User;
    var OAuthClient = c.OAuthClient;
    var group = this.group;
    var locals = this;

    locals.key = c.req.query.key;
    locals.redirectUri = c.req.query.redirectUri;
    locals.state = c.req.query.state;
    locals.scope = c.req.query.scope;
    
    locals.req = c.req;
    locals.user = c.req.selectedUser || c.req.user || null;

    OAuthClient.findByApiKey(c.req.query.key, function (err, client) {
        locals.client = client;
        c.next();
    });
});

load('widgets/common');

action(function show() {
    render({ layout: false });
});