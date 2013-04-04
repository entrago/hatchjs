'use strict';

module.exports = ModelContext;

function ModelContext(hatch) {
    this.hatch = hatch;
}

/**
 * Get a new model context which authenticates and allows methods to be
 * performed on db entity objects.
 * 
 * @param  {context} c - http context
 * @return {ModelContextInstance}
 */
ModelContext.prototype.getNewContext = function (c) {
    return new ModelContextInstance(c);
};

function ModelContextInstance(c) {
    this.c = c;
}

/**
 * Check to see whether the current user has permission to act upon the specified
 * db entity object.
 *
 * Examples:
 *     context.checkPermission(post, 'update', function (err, result) {
 *         ...
 *     });
 * 
 * @param  {Object}   obj         - db entity object
 * @param  {String}   permission  - permission - view, update, delete
 * @param  {Function} callback    - callback function
 */
ModelContextInstance.prototype.checkPermission = function (obj, permission, callback) {
    //TODO: build this method
    return callback(null, true);
};

/**
 * Perform a method call on the specified db model entity. Automatically 
 * maps named paramters into function arguments by looking at the method
 * signature on the object and checks vs allowedApiActions whitelist to
 * see if the method you are trying to call is allowed via the API.
 *
 * Examples:
 *     api.perform(page, 'like', { user: 1 }, function (err, result) {
 *         ...
 *     });
 * 
 * @param  {Object}   obj        - the object to perform method call on
 * @param  {String}   methodName - name of the method to execute
 * @param  {Object}   params     - the parameters of the method call
 * @param  {Function} callback   - callback function
 */
ModelContextInstance.prototype.perform = function (obj, methodName, params, callback) {
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