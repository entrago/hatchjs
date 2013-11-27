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

module.exports = FacebookAuthController;

var oauth = require('oauth');

function FacebookAuthController(init) {
    init.before(function initFacebook(c) {
        var gm = c.req.group.modules.find('auth-facebook', 'name');
        if (!gm) {
            return c.next(new Error('The auth-facebook module is not enable in this group'));
        }
        var contract = gm.contract;
        this.consumer = function consumer() {
            return new oauth.OAuth2(
                contract.apiKey,
                contract.secret,
                'https://graph.facebook.com'
            );
        };
        this.redirectUri = 'http://' + c.req.headers.host + c.pathTo.callback + '/';

        if (c.compound.app.get('facebookAuthUri')) {
            this.redirectUri = c.compound.app.get('facebookAuthUri') + '/' + (c.req.params.domain || c.req.headers.host);
        }

        c.next();
    });
};

FacebookAuthController.prototype.auth = function facebookAuth(c) {
    var scope = c.req.group.getSetting('auth-facebook.scope') || 'email';
    with (c) {
        var url = this.consumer().getAuthorizeUrl({
            redirect_uri : this.redirectUri,
            scope: scope,
            display: 'page'
        });

        redirect(url);
    }
};

FacebookAuthController.prototype.callback = function facebookCallback(c) {
    if (c.req.params.domain && c.req.params.domain !== c.req.headers.host) {
        console.log('Forwarding to domain-specific Facebook auth URL');
        return c.redirect('//' + c.req.params.domain + c.pathTo.callback + '?code=' + c.req.query.code);
    }

    var consumer = this.consumer;
    with (c) {
        if (req.param('error') === 'access_denied') {
            console.log('Access denied redirecting to //' + req.group.url);
            return res.redirect('//' + req.group.url);
        }
        var redirectUri = this.redirectUri;
        consumer().getOAuthAccessToken(req.param('code'), { redirect_uri: redirectUri }, function (err, token) {
            if (err) {
                console.log(err);
                compound.hatch.audit.track(req.group.id, 'facebook-auth-failure', {
                    stage: 'access-token',
                    url: req.url,
                    query: req.query,
                    redirectUri: redirectUri,
                    error: err,
                    headers: req.headers,
                    code: req.param('code')
                });
                return next(err);
            }

            req.session.facebookAccess = token;
            consumer().getProtectedResource(
                'https://graph.facebook.com/me',
                token,
                function (err, profile, response) {
                    if (err) {
                        compound.hatch.audit.track(req.group.id, 'facebook-auth-failure', {
                            stage: 'user-information',
                            url: req.url,
                            headers: req.headers,
                            error: err
                        });
                        next(err);
                    } else {
                        profile = JSON.parse(profile);

                        var data = {
                            username: profile.first_name + profile.last_name,
                            displayName: profile.name,
                            email: profile.email,
                            facebookId: profile.id,
                            facebookAccessToken: token
                        };

                        var provider = {
                            name: 'facebook',
                            idFields: ['facebookId', 'email']
                        };

                        compound.hatch.audit.track(req.group.id, 'facebook-login', {
                            stage: 'user-information',
                            url: req.url,
                            facebookId: profile.id
                        });

                        c.User.authenticate(provider, data, c);
                    }
                }
            );
        });
    }
};
