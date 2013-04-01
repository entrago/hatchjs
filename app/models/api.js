module.exports = function (compound) {
    'use strict';

    // define the Api type
    var Api = compound.models.Api = function () {

    };

    /**
     * Perform a method call on the specified db model entity.
     * 
     * @param  {Object}   obj        - the object to perform method call on
     * @param  {String}   methodName - name of the method to execute
     * @param  {Object}   params     - the parameters of the method call
     * @param  {Function} callback   - callback function
     */
    Api.prototype.perform = function (obj, methodName, params, callback) {
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
        if (obj.constructor.allowedApiActions) {
            if (!~obj.constructor.allowedApiActions.indexOf(methodName)) {
                return callback(new Error('Method ' + methodName + ' not allowed.'));
            }
        } else {
            console.log('WARNING: no allowedApiActions whitelist defined for ' +
                obj.constructor);
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
};