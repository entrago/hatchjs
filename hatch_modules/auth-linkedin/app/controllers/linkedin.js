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

module.exports = LinkedinAuthController;

var oauth = require('oauth');

function LinkedinAuthController(init) {
    init.before(function initLinkedin(c) {
        var gm = c.req.group.modules.find('auth-linkedin', 'name');
        if (!gm) {
            return c.next(new Error('The auth-linkedin module is not enable in this group'));
        }
        var contract = gm.contract;
        var locals = this;
        locals.callbackURL = 'http://' + c.req.headers.host + c.pathTo.callback;
        locals.consumer = function consumer() {
            return new oauth.OAuth(
                'https://api.linkedin.com/uas/oauth/requestToken',
                'https://api.linkedin.com/uas/oauth/accessToken',
                contract.apiKey,
                contract.secret,
                '1.0',
                locals.callbackURL,
                'HMAC-SHA1'
            );
        };
        c.next();
    });
}

LinkedinAuthController.prototype.auth = function (c) {
    this.consumer().getOAuthRequestToken({
            oauth_callback: c.callbackURL,
            scope: 'r_fullprofile r_emailaddress'
        },
        function (err, token, secret) {
            if (err) {
                return c.next(new c.RequestTokenError(err));
            }
            c.req.session.linkedinOauthRequestToken = token;
            c.req.session.linkedinOauthRequestTokenSecret = secret;
            c.redirect('https://www.linkedin.com/uas/oauth/authenticate?oauth_token=' + token);
        }
    );
};

LinkedinAuthController.prototype.callback = function (c) {
    var consumer = this.consumer;
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
    consumer().getOAuthAccessToken(
        c.req.session.linkedinOauthRequestToken,
        c.req.session.linkedinOauthRequestTokenSecret,
        c.req.query.oauth_verifier,
        function (err, token, secret) {
            if (err) {
                return c.next(err);
            }
            c.req.session.linkedinAccess = token;
            c.req.session.linkedinSecret = secret;
            consumer().get(
                'http://api.linkedin.com/v1/people/~:(' + profile + ')?format=json',
                token,
                secret,
                function (err, profile) {
                    if (err) {
                        return c.next(err);
                    }

                    profile = JSON.parse(profile);

                    var displayName = [profile.firstName, profile.lastName].join(' ');
                    var data = {
                        username: displayName,
                        name: displayName,
                        avatar: profile.pictureUrl,
                        linkedinId: profile.id
                    };

                    var provider = {
                        name: 'linkedin',
                        idFields: ['linkedinId']
                    };

                    c.User.authenticate(provider, data, c);
                }
            );
        }
    );
};
