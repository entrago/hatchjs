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

/**
 * Perform a method call on the specified db model entity.
 * 
 * @param  {Object}   obj        - the object to perform method call on
 * @param  {String}   methodName - name of the method to execute
 * @param  {Object}   params     - the parameters of the method call
 * @param  {Function} callback   - callback function
 */
exports.perform = function (obj, methodName, params, callback) {
    var hasCallback = false;
    var result;

    // create the callback
    var next = params.next = params.callback = params.done = function (err, output) {
        if (output) {
            result = output;
        }

        callback(err, result);
    };

    var func = obj[methodName];
    var pattern = /function[^(]*\(([^)]*)\)/;

    // check that the function actually exists
    if (!func) {
        return callback(new Error('Method ' + methodName + ' not found'));
    }

    // check the whitelist for functions that can be run via the API
    if (obj.constructor.apiWhitelist) {
        if (obj.constructor.apiWhitelist.indexOf(methodName) === -1) {
            return callback(new Error('Method ' + methodName + ' not allowed.'));
        }
    }

    // convert named parameters into function arguments
    var args = func.toString().match(pattern)[1].split(/,\s*/);
    var methodArgs = [];

    args.forEach(function (arg) {
        // check to see if there is a callback argument
        if (['next', 'callback', 'done'].indexOf(arg) > -1) {
            hasCallback = true;
        }
        methodArgs.push(params[arg]);
    });

    try {
        result = func.call(obj, methodArgs);
    } catch (err) {
        return next(err);
    }

    // if there is no callback, call next to send result to browser
    if (!hasCallback) {
        return next();
    }
};