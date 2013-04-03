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

function consumer(c, next) {
    c.callbackURL = 'http://' + c.req.headers.host + c.pathTo('callback');
    c.consumer = function consumer() {
        return new oauth.OAuth(
            'https://api.linkedin.com/uas/oauth/requestToken',
            'https://api.linkedin.com/uas/oauth/accessToken',
            c.moduleInstance.contract.apiKey,
            c.moduleInstance.contract.secret,
            '1.0',
            c.callbackURL,
            'HMAC-SHA1'
        );
    };
    next();
}

exports.auth = function linkedinAuth(c) {
    c.consumer().getOAuthRequestToken({
            oauth_callback: c.callbackURL,
            scope: 'r_fullprofile r_emailaddress'
        },
        function (err, token, secret) {
            if (err) {
                return c.next(err);
            }
            c.req.session.linkedinOauthRequestToken = token;
            c.req.session.linkedinOauthRequestTokenSecret = secret;
            c.redirect('https://www.linkedin.com/uas/oauth/authenticate?oauth_token=' + token);
        }
    );
};

exports.callback = function linkedinCallback(c) {
    var profile = [
        'id',
        'first-name',
        'last-name',
        'public-profile-url',
        'picture-url',
        'num-connections',
        'location:(name,country:(code))',
        'phone-numbers',
        'site-standard-profile-request:(url)',
    ];
    c.consumer().getOAuthAccessToken(
        c.req.session.linkedinOauthRequestToken,
        c.req.session.linkedinOauthRequestTokenSecret,
        c.req.query.oauth_verifier,
        function (err, token, secret) {
            if (err) {
                return c.next(err);
            }
            c.req.session.linkedinAccess = token;
            c.req.session.linkedinSecret = secret;
            c.consumer().get(
                'http://api.linkedin.com/v1/people/~:(' + profile + ')?format=json',
                token,
                secret,
                function (err, data) {
                    if (err) {
                        return c.next(err);
                    }
                    c.event('user-authenticated', {
                        provider: 'linkedin',
                        data: data
                    });
                }
            );
        }
    );
};

