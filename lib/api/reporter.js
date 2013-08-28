var util = require('util');

module.exports = ErrorReporter;

function ErrorReporter(hatch) {
    var reporter = this;
    this.hatch = hatch;
    this.compound = hatch.compound;
    this.app = hatch.compound.app;
    this._transports = null;

    process.addListener('uncaughtException', function (e) {
        function cb() {
            if (!process.isMaster) {
                process.exit(1);
            }
        }

        if (e && typeof e === 'object') {
            e.name = e.name || 'uncaughtException';
        }

        if (e instanceof Error) {
            console.error(e.stack || e);
            reporter.notify(e, cb);
        } else {
            var info = util.inspect(e);
            console.error(e);
            reporter.notify(info, cb);
        }
    });
}

ErrorReporter.prototype.notify = function notify(err, cb) {
    if (err.code === 404) {
        return cb();
    }
    var wait = 0;
    this.getTransports().forEach(function(tr) {
        wait += 1;
        tr(err, next);
    });
    if (wait === 0) {
        cb();
    }

    function next(err) {
        console.log(arguments);
        if (err) {
            console.log(err.stack);
        }
        if (--wait === 0) {
            cb();
        }
    }
};

ErrorReporter.prototype.getTransports = function transport(){
    var rep = this;
    if (this._transports) {
        return this._transports;
    }
    var reporters = this.app.get('errors-reporting') || {};

    var tr = this._transports = [];
    Object.keys(reporters).forEach(function(type) {
        if (reporters[type]) {
            tr.push(rep.instantiateTransport(type, reporters[type]));
        }
    });

    return this._transports;

};

ErrorReporter.prototype.instantiateTransport = function(type, settings) {
    return new ErrorReporter.transport[type](this, settings);
};

ErrorReporter.transport = {
    mail: function(reporter, settings) {
        return function(err, cb) {
            reporter.compound.mailer.send('error/notify', err, settings, cb);
        };
    },
    jabber: function(reporter, settings) {
        throw new Error('not implemented');
    },
    sentry: function(reporter, settings) {
        var raven = require('raven');
        var client = new raven.Client(settings.url);
        return function (err, cb) {
            client.captureError(err, cb);
        }
    }
};
