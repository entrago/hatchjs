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

var oauth = require('oauth');

module.exports = FacebookAuthController;

function FacebookAuthController(init) {
    init.before(function initFacebook(c) {
        var contract = c.req.group.modules.find('auth-facebook', 'name').contract;
        this.consumer = function consumer() {
            return new oauth.OAuth2(
                contract.apiKey,
                contract.secret,
                'https://graph.facebook.com'
            );
        };
        this.redirectUri = 'http://' + c.req.headers.host + c.pathTo.callback;
        c.next();
    });
};

FacebookAuthController.prototype.auth = function facebookAuth(c) {
    with (c) {
        var url= this.consumer().getAuthorizeUrl({
            redirect_uri : this.redirectUri,
            scope: 'email',
            display: 'page'
        });

        redirect(url);
    }
};

FacebookAuthController.prototype.callback = function facebookCallback(c) {
    with (c) {
        this.consumer().getOAuthAccessToken(req.query.code, {redirect_uri: redirectUri}, function (err, token) {
            if (err) {
                return next(err);
            }

            req.session.facebookAccess = token;
            this.consumer().getProtectedResource(
                'https://graph.facebook.com/me',
                token,
                function (err, data, response) {
                    if (err) {
                        next(err);
                    } else {
                        event('user-authenticated', {
                            provider: 'facebook',
                            data: data
                        });
                    }
                }
            );
        });
    }
};
