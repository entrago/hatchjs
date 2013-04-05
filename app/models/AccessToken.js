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
var crypto = require('crypto');

module.exports = function (compound, AccessToken) {
    var api = compound.hatch.api;
    var User = compound.models.User;

    /**
     * Load the auth token from the current request object and then load the
     * User attached to this token.
     * 
     * @param  {HttpRequest}   req      - current request
     * @param  {Function}      callback - callback function
     */
    AccessToken.loadFromRequest = function (req, callback) {
        var token = req.headers.token || req.body.token || req.query.token;

        // if there is no token present, just continue
        if (!token) {
            return callback();
        }

        AccessToken.findOne({ where: { token: token }}, function (err, token) {
            if (token) {
                User.find(token.userId, function (err, user) {
                    // validate the token
                    if (!user) {
                        return callback(new Error('User in access token not found'));
                    }
                    if (!token.isValid()) {
                        return callback(new Error('Access token is invalid'));
                    }

                    req.user = user;
                    req.token = token;

                    callback();
                });
            } else {
                callback();
            }
        });
    };

    /**
     * Returns whether this token is still valid for use.
     * 
     * @return {Boolean}
     */
    AccessToken.prototype.isValid = function () {
        return !this.expiryDate || this.expiryDate > new Date();
    };

    /**
     * Generate a new token for the specified user/application and save to the 
     * database and return via callback.
     * 
     * @param  {Number}   userId        - Id of the user
     * @param  {Number}   applicationId - Id of the application
     * @param  {Date}     expiryDate    - expiry date for this token (optional)
     * @param  {Function} callback      - callback function
     */
    AccessToken.generate = function (userId, applicationId, expiryDate, callback) {
        var token = new Token();
        
        token.userId = userId;
        token.applicationId = applicationId;
        token.expiryDate = expiryDate;
        token.token = calcSha('token-' + userId + '-' + new Date().getTime());

        token.save(callback);
    };

    /**
     * Calculate the sha1 of the specified string.
     * 
     * @param  {String} payload - string to hash
     * @return {String}         
     */
    function calcSha(payload) {
        if (!payload) {
            return '';
        }
        if (payload.length === 64) {
            return payload;
        }
        return crypto.createHash('sha256').update(payload).update(api.app.config.passwordSalt || '').digest('hex');
    }
};