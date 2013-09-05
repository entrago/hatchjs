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

var compound = require('compound');

module.exports = function (c) {
    var module = this;

    var User = c.model('user');
    User.defineProperty('twitterId',  { type: String, index: true });
    User.defineProperty('twitterAccessToken',  { type: String });
    User.defineProperty('twitterSecret',  { type: String });

    // module.api.content.registerContentType('twitter', __dirname + '/content/twitter');

    c.hatch.importStream.registerImporter('twitter', 'Twitter', 'twitter', require('./import/twitter')());

    c.on('render', function(viewContext) {
        if (!viewContext.group || !viewContext.group.modules.find('auth-twitter', 'name')) {
            return;
        }
        with (viewContext) {
            return contentFor(
                'login',
                '<li>' + linkToRemote(
                    icon('twitter-sign') + 'Sign in with Twitter',
                    pathFor('auth-twitter').auth({format: 'json'})
                ) + '</li>'
            );
        }
    });

    return compound.createServer({root: __dirname});
};
