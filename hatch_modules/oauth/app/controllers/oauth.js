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

'use strict';

module.exports = OAuthController;

function OAuthController(init) {

}

/**
 * Start the OAuth authorization process. Checks the apiKey is valid and then
 * redirects to the login/registration page.
 * 
 * @param  {HttpContext} c - http context
 */
OAuthController.prototype.authorize = function (c) {
    var key = c.req.query.apiKey || c.req.query.key;
    var redirectUri = c.req.query.redirectUri || c.req.query.redirect || '';
    var state = c.req.query.state || '';
    var scope = c.req.query.scope || '';

    c.OAuthClient.findByApiKey(key, function (err, client) {
        if (!client) {
            return c.send({
                status: 'error',
                message: 'Invalid API Key'
            });
        }

        c.redirect(c.specialPagePath('oauth') + '?key=' + key + '&redirectUri=' + redirectUri + '&state=' + state + '&scope=' + scope);
    });
};

/**
 * Grant access to the application from the current logged in user and redirect
 * back to the client application with the OAuthCode and state (if needed).
 * 
 * @param  {HttpContext} c - http context
 */
OAuthController.prototype.grant = function (c) {
    var key = c.req.body.key;
    var redirectUri = c.req.body.redirectUri;
    var state = c.req.body.state;
    var scope = c.req.body.scope;
    var user = c.req.user;
    var expiryDate = null;

    c.OAuthCode.generate(key, user.id, redirectUri, scope, expiryDate, state, function (err, code) {
        if (err) {
            return c.send({
                status: 'error',
                message: err.message
            });
        }

        // redirect to the redirectUri with the newly generated token and state (if needed)
        c.redirect(code.redirectUri + '?code=' + code.code + '&state=' + code.state);
    });
};

/**
 * Exchange an OAuthCode for an AccessToken.
 * 
 * @param  {HttpContext} c - http context
 */
OAuthController.prototype.exchange = function (c) {
    var code = c.req.query.code;
    var key = c.req.query.apiKey || c.req.query.key;
    var secret = c.req.query.apiSecret || c.req.query.secret;

    c.OAuthCode.findByCode(code, function (err, code) {
        if (!code) {
            return c.send({
                status: 'error',
                message: 'Invalid OAuthCode'
            });
        }

        code.exchange(key, secret, function (err, token) {
            if (err) {
                c.send({
                    status: 'error',
                    message: err.message
                });
            } else {
                // send the newly created AccessToken 
                c.send({
                    status: 'success',
                    token: token.token
                });    
            }
        });
    });
};