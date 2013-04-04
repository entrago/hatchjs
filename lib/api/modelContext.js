'use strict';
var _ = require('underscore');

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
    var c = this.c;
    var self = this;
    var modelName = obj.constructor.modelName;

    console.log('checking "' + permission + '" permission for ' + modelName + ':' + obj.id);

    // always return true for author - usually for content
    if (obj.userId == c.req.user.id || obj.authorId == c.req.user.id) {
        return callback(null, true);
    }

    // always return true for user acting on themself
    if (modelName === 'User' && obj.id == c.req.user.id) {
        return callback(null, true);
    }

    // if object has groupId (e.g. content, tag), defer to group
    if (obj.groupId) {
        c.Group.find(obj.groupId, function (err, group) {
            self.checkPermission(group, permission, callback);
        });

        return;
    }

    // group permissions
    if (modelName === 'Group') {
        var result = c.req.user.hasPermission(obj, permission);
        return callback(null, result);
    }

    // default - return true for view, false for everything else
    return callback(null, permission === 'view');
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
    var self = this;
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

    getApiActionPermission(obj.constructor, methodName, function (err, permission) {
        if (err) {
            return callback(err);
        }

        // check permission vs context
        self.checkPermission(obj, permission.name, function (err, result) {
            if (!result) {
                return callback(new Error('Permission denied for ' + permission.name));
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
        });
    });

    function getApiActionPermission(model, action, callback) {
        if (model.allowedApiActions) {
            var permission = _.find(model.allowedApiActions, function (a) {
                return a === action || a.name === action;
            });

            // no permission at all - return an error
            if (!permission) {
                return callback(new Error('Method ' + methodName + ' not allowed.'));
            }

            // if permission is just a string, default the permission to 'view'
            if (typeof permission === 'string') {
                permission = { name: permission, permission: 'view' };
            }

            return callback(null, permission);
        } else {
            console.log('WARNING: no allowedApiActions whitelist defined for ' +
                obj.constructor);
        }

        // default
        callback(null, { name: 'nonWhitelistAction', action: action });
    }    
};