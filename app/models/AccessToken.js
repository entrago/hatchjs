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

module.exports = function (compound, AccessToken) {
    var User = compound.models.User;

    /**
     * Load the auth token from the current request object and then load the
     * User attached to this token.
     * 
     * @param  {String} token - string representing access token.
     * @param  {Function} callback - called with (err, user).
     */
    AccessToken.loadUser = function (token, callback) {

        // if there is no token present, just continue
        if (!token) {
            throw new Error('No access token given');
        }

        AccessToken.findOne({where: {token: token }}, function (err, token) {
            if (token) {
                User.find(token.userId, function (err, user) {
                    if (err) {
                        return callback(err);
                    }
                    // validate the token
                    if (!user) {
                        return callback(new Error('User in access token not found'));
                    }
                    if (!token.isTokenValid()) {
                        return callback(new Error('Access token is invalid'));
                    }

                    callback(null, user);
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
    AccessToken.prototype.isTokenValid = function () {
        return !this.expiryDate || this.expiryDate > new Date();
    };

    /**
     * Generate a new token for the specified user/client and save to the 
     * database and return via callback.
     *
     * @param  {Number}   userId        - Id of the user
     * @param  {Number}   clientId      - Id of the client application
     * @param  {Object}   scope         - scope of access
     * @param  {Date}     expiryDate    - expiry date for this token (optional)
     * @param  {Function} callback      - callback function
     */
    AccessToken.generateToken = function (userId, clientId, scope, expiryDate, callback) {
        var token = new AccessToken();
        
        token.userId = userId;
        token.clientId = clientId;
        token.scope = JSON.parse(scope || '{}');
        token.expiryDate = expiryDate;
        token.token = compound.hatch.crypto.generateRandomString(256);

        token.save(callback);
    };
};
