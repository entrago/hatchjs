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
module.exports = StreamsController;
var ApiController = require('./apiController');

function StreamsController(init) {
    //ApiController.call(this, init);
    init.before(findByHash);
}

require('util').inherits(StreamsController, ApiController);

function handleError(c, err) {
    return c.send({
        status: 'error',
        message: err.message
    });
}

function findByHash(c) {
    c.ImportStream.findByHash(c.req.params.hash, function (err, stream) {
        if (!stream) {
            return handleError(c, new Error('Could not find stream'));
        }

        c.stream = stream;
        c.next();
    });
}

/**
 * Ping an import stream and start it running.
 * 
 * @param  {context} c - http context
 */
StreamsController.prototype.run = function (c) {
    c.stream.run();
    c.send({
        status: 'success',
        message: 'Import stream started'
    });
};
