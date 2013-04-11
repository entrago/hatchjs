
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

var Application = require('./application');

module.exports = StreamsController;

function StreamsController(init) {
    Application.call(this, init);

    init.before(function setup(c) {
        var importStream = c.compound.hatch.importStream;
        this.importers = importStream.getImporters();
        c.next();
    });

    init.before(function loadStream(c) {
        var locals = this;
        c.ImportStream.find(c.params.id, function(err, stream) {
            if (err) {
                return c.next(err);
            }
            if (!stream) {
                return c.next(new Error('404'));
            }
            locals.stream = stream;
        });
    }, {only: ['edit', 'update', 'destroy', 'toggle']});
    init.before(loadTags);
}

function loadTags(c) {
    c.Tag.all({ where: { groupIdByType: c.req.group.id + '-Content' }}, function (err, tags) {
        delete tags.countBeforeLimit;
        c.locals.tags = tags;
        c.next();
    });
}

require('util').inherits(StreamsController, Application);

// Show the import streams
StreamsController.prototype.index = function(c) {
    var ImportStream = c.ImportStream;
    this.pageName = 'manage-streams';

    ImportStream.all({ where: { groupId: c.req.group.id }}, function(err, streams) {
        this.streams = streams;
        c.render();
    }.bind(this));
};

StreamsController.prototype.new = function(c) {
    this.pageName = 'new-stream';
    this.stream = new c.ImportStream;
    c.render();
};

StreamsController.prototype.edit = function(c) {
    var importStream = c.compound.hatch.importStream;
    this.pageName = 'manage-streams';

    c.render();
};

StreamsController.prototype.create = function(c) {
    var ImportStream = c.ImportStream;
    var stream = new ImportStream(c.body);
    stream.groupId = c.req.group.id;
    stream.enabled = true;
    stream.save(function(err, stream) {
        c.send(err ? {
            message: 'Please enter a title and a query',
            status: 'error',
            icon: 'warning-sign'
        } : {
            message: 'Import stream saved successfully',
            status: 'success',
            icon: 'ok'
        });
    });
};

StreamsController.prototype.update = function(c) {
    var ImportStream = c.ImportStream;

    // update stream
    stream.id = c.body.id;
    stream.groupId = c.req.group.id;
    stream.type = c.body.type;
    stream.title = c.body.title;
    stream.query = c.body.query;
    stream.interval = c.body.interval;
    stream.tags = [];

    (c.body.tags || []).forEach(function(tag) {
        stream.tags.push({
            tagId: c.req.group.getTag(tag).id,
            name: tag,
            createdAt: new Date(),
            score: 0
        });
    });

    this.stream.updateAttributes(stream, function (err) {
        c.send(err ? {
            message: 'Please enter a title and a query',
            status: 'error',
            icon: 'warning-sign'
        } : {
            message: 'Import stream saved successfully',
            status: 'success',
            icon: 'ok'
        });
    });
};

// Delete a stream from the group
StreamsController.prototype.destroy = function(c) {
    this.stream.destroy(function() {
        c.send({ redirect: c.pathTo.groupContentStreams(c.req.group) });
    });
};

// Pause or unpause a stream
StreamsController.prototype.toggle = function(c) {
    this.stream.enabled = !this.stream.enabled;
    this.stream.save(function() {
        c.send({ redirect: c.pathTo.groupContentStreams(c.req.group) });
    });
};
