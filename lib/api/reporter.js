module.exports = ErrorReporter;

function ErrorReporter(hatch) {
    this.hatch = hatch;
    this.compound = hatch.compound;
    this.app = hatch.compound.app;
    this._transports = null;
};

ErrorReporter.prototype.notify = function notify(err) {
    this.getTransports().forEach(function(tr) {
        tr(err);
    });
};

ErrorReporter.prototype.getTransports = function transport(){
    var rep = this;
    if (this._transports) {
        return this._transports;
    }
    var reporters = this.app.get('errors-reporting') || {};

    this._transports = [];
    Object.keys(reporters).forEach(function(type) {
        if (reporters[type]) {
            tr.push(rep.instantiateTransport(type, reporters[type]));
        }
    });

};

ErrorReporter.prototype.instantiateTransport = function(type, settings) {
    return new ErrorReporter.transport[type](this, settings);
};

ErrorReporter.transport = {
    mail: function(reporter, settings) {
        return function(err) {
            reporter.compound.mailer.send('error/notify', err, settings);
        };
    },
    jabber: function(reporter, settings) {
        throw new Error('not implemented');
    }
};
