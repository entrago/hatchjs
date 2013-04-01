'use strict';
var _ = require('underscore');

module.exports = UriController;

function UriController(init) {
    init.before(findObject);
}

function findObject(c) {
    //case-insensitive model find
    c.modelName = _.find(Object.keys(c.compound.models), function (key) {
        return key.toLowerCase() === c.req.params.modelName.toLowerCase();
    });
    var model = c.compound.models[c.modelName];

    model.find(c.req.params.id, function (err, obj) {
        if (!obj) {
            return c.send({
                status: 'error',
                message: c.modelName + ' not found'
            });
        }

        c.obj = obj;
        c.next();
    });
}

/**
 * Get an object from the database and return as JSON.
 * 
 * @param  {context} c - http context
 */
UriController.prototype.get = function get(c) {
    c.send((c.obj.toPublicObject && c.obj.toPublicObject()) || c.obj);
};

/**
 * Perform an action on an object from the database and returns the result.
 *
 * Examples:
 *     POST http://localhost:3000/do/api/content/1/like?user=1
 * 
 * @param  {context} c - http context containing parameters
 */
UriController.prototype.perform = function perform(c) {
    var body = c.req.body;
    var callback = false;
    var result;

    //create the callback
    var next = body.next = body.callback = body.done = function (err, output) {
        if (err) {
            return c.send({
                status: 'error',
                error: err
            });
        }

        if (output) {
            result = output;
        }

        c.send({
            status: 'success',
            message: c.req.params.action + ' executed',
            result: result,
            object: c.obj
        });
    };

    var func = c.obj[c.req.params.action];
    var pattern = /function[^(]*\(([^)]*)\)/;

    //check that the function actually exists
    if (!func) {
        return c.send({
            status: 'error',
            message: 'Method ' + c.req.params.action + ' not found'
        });
    }

    //convert named parameters into function arguments
    var args = func.toString().match(pattern)[1].split(/,\s*/);
    var params = [];

    args.forEach(function (arg) {
        //check to see if there is a callback argument
        if (['next', 'callback', 'done'].indexOf(arg) > -1) {
            callback = true;
        }
        params.push(body[arg]);
    });

    try {
        result = func.call(c.obj, params);
    } catch (err) {
        return callback(err);
    }

    //if there is no callback, call next to send result to browser
    if (!callback) {
        return next();
    }
};

