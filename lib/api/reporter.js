module.exports = ErrorReporter;

function ErrorReporter(hatch) {
    var reporter = this;
    this.hatch = hatch;
    this.compound = hatch.compound;
    this.app = hatch.compound.app;
    this._transports = null;

    process.addListener('uncaughtException', function (e) {
        e.name = e.name || 'uncaughtException';
        console.error(e.stack || e);
        reporter.notify(e, function() {
            if (!process.isMaster) {
                console.log('Quit worker with 1');
                process.exit(1);
            }
        });
    });

};

ErrorReporter.prototype.notify = function notify(err, cb) {
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
    }
};
