//
// Hatch.js is a CMS and social website building framework built in Node.js 
// Copyright (C) 2013 Inventures Software Ltd
// 
// This file is part of Hatch.js
// 
// Hatch.js is free software: you can redistribute it and/or modify it under
// the terms of the GNU Affero General Public License as published by the Free
// Software Foundation, version 3
// 
// Hatch.js is distributed in the hope that it will be useful, but WITHOUT ANY
// WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE.
// 
// See the GNU Affero General Public License for more details. You should have
// received a copy of the GNU General Public License along with Hatch.js. If
// not, see <http://www.gnu.org/licenses/>.
// 
// Authors: Marcus Greenwood, Anatoliy Chakkaev and others
//

var oauth = require('oauth');

module.exports = TwitterAuthController;

function TwitterAuthController(init) {
    init.before(consumer);
}

TwitterAuthController.prototype.auth = function twitterAuth(c) {
    c.consumer().getOAuthRequestToken(
        function (err, token, secret) {
            if (err) {
                console.log(err);
                return c.next(new c.RequestTokenError(err));
            }
            c.req.session.twitterOauthRequestToken = token;
            c.req.session.twitterOauthRequestTokenSecret = secret;
            c.redirect('https://twitter.com/oauth/authorize?oauth_token=' + token);
        }
    );
};

TwitterAuthController.prototype.callback = function twitterCallback(c) {
    if (c.req.param('denied')) {
        return c.redirect('/');
    }

    c.consumer().getOAuthAccessToken(
        c.req.session.twitterOauthRequestToken,
        c.req.session.twitterOauthRequestTokenSecret,
        c.req.param('oauth_verifier'),
        function (err, token, secret) {
            if (err) {
                console.log(err);
                        
                return c.sendError({
                    message: 'Could not verify with Twitter',
                    error: err
                });
            }
            c.req.session.twitterAccess = token;
            c.req.session.twitterSecret = secret;
            c.consumer().get(
                'https://api.twitter.com/1.1/account/verify_credentials.json',
                token,
                secret,
                function (err, profile, response) {
                    if (err) {
                        console.log(err);
                        
                        return c.sendError({
                            message: 'Could not authenticate with Twitter',
                            error: err
                        });
                    }

                    var profile = JSON.parse(profile);
                    var data = {
                        username: profile.screen_name,
                        name: profile.name || profile.screen_name,
                        avatar: profile.profile_image_url,
                        twitterId: profile.id,
                        twitterAccessToken: token,
                        twitterSecret: secret
                    };

                    var provider = {
                        name: 'twitter',
                        idFields: ['twitterId']
                    };

                    c.User.authenticate(provider, data, c);
                }
            );
        }
    );
};

function consumer(c) {
    var gm = c.req.group.modules.find('auth-twitter', 'name');
    if (!gm) {
        return c.next(new Error('The auth-twitter module is not enable in this group'));
    }
    var contract = gm.contract;
    c.consumer = function consumer() {
        return new oauth.OAuth(
            'https://twitter.com/oauth/request_token',
            'https://twitter.com/oauth/access_token', 
            contract.apiKey,
            contract.secret,
            '1.0A',
            'http://' + c.req.headers.host + c.pathTo.callback,
            'HMAC-SHA1'
        );
    };
    c.next();
}
