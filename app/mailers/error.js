
exports.notify = function(err, settings) {
    this.locals.err = err;
    this.send({
        to: settings.email,
        subject: (settings.subject || 'Hatch Error: ') + err.message
    });
};
