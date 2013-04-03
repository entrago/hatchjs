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

exports._initialize = function () {
    this.before(consumer);
};

exports.auth = function twitterAuth(c) {
    c.consumer().getOAuthRequestToken(
        function (err, token, secret) {
            if (err) {
                return c.next(err);
            }
            c.req.session.twitterOauthRequestToken = token;
            c.req.session.twitterOauthRequestTokenSecret = secret;
            c.redirect('https://twitter.com/oauth/authorize?oauth_token=' + token);
        }
    );
};

exports.callback = function twitterCallback(c) {
    if(c.req.query.denied) {
        return c.redirect('../../../');
    }

    c.consumer().getOAuthAccessToken(
        c.req.session.twitterOauthRequestToken,
        c.req.session.twitterOauthRequestTokenSecret,
        c.req.query.oauth_verifier,
        function (err, token, secret) {
            if (err) {
                return c.next(err);
            }
            c.req.session.twitterAccess = token;
            c.req.session.twitterSecret = secret;
            c.consumer().get(
                'http://api.twitter.com/1/account/verify_credentials.json',
                token,
                secret,
                function (err, data, response) {
                    if (err) {
                        return c.next(err);
                    }
                    c.event('user-authenticated', {
                        provider: 'twitter',
                        data: data
                    });
                }
            );
        }
    );
};

function consumer(c, next) {
    c.consumer = function consumer() {
        return new oauth.OAuth(
            'https://twitter.com/oauth/request_token',
            'https://twitter.com/oauth/access_token', 
            c.moduleInstance.contract.apiKey,
            c.moduleInstance.contract.secret,
            '1.0A',
            'http://' + c.req.headers.host + c.pathTo('callback'),
            'HMAC-SHA1'
        );
    };
    next();
}
