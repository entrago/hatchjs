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

/**
 * authenticates the current request
 * 
 * @param  {[context]}   c      [http context]
 * @param  {[params]}    params [hook params]
 * @param  {Function}    next   [continuation function]
 */
exports.authenticate = function(c, params, next) {
    var req = c.req;
    var res = c.res;

    var auth = req.headers['authorization'];
    var module = c.req.group.getModule('basic-auth');

    if(c.req.url.indexOf('/do/') > -1) {
        return next();
    }

    if(!module.contract.username || !module.contract.password) {
        return next();
    }

    if(!auth) {     
        // No Authorization header was passed in so it's the first time the browser hit us
        // Sending a 401 will require authentication, we need to send the 'WWW-Authenticate' to tell them the sort of authentication to use
        // Basic auth is quite literally the easiest and least secure, it simply gives back  base64( username + ":" + password ) from the browser
        res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');

        res.end('Authentication required');
    } else {
        var tmp = auth.split(' ');   // Split on a space, the original auth looks like  "Basic Y2hhcmxlczoxMjM0NQ==" and we need the 2nd part

        var buf = new Buffer(tmp[1], 'base64'); // create a buffer and tell it the data coming in is base64
        var plain_auth = buf.toString();        // read it back out as a string

        // At this point plain_auth = "username:password"
        var creds = plain_auth.split(':');      // split on a ':'

        var username = creds[0];
        var password = creds[1];

        //check auth vs module settings
        if((username == module.contract.username) && (password == module.contract.password)) {
            return next();
        } else {
            res.statusCode = 401; // Force them to retry authentication
            res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
            res.end('Access denied');
        }
    }
};