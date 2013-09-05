var Application = require('./application');

module.exports = AuditController;

function AuditController(init) {
    Application.call(this, init);
}

AuditController.prototype.index = function(c) {
    var audit = c.compound.hatch.audit;
    var eventTypes = ['facebook-login', 'facebook-auth-failure'];
    audit.eventsBreakdown(c.req.group.id, eventTypes, function(err, breakdown) {
        c.locals.breakdown = breakdown;
        c.render();
    });
};

AuditController.prototype.show = function(c) {
    c.Event.all({where: {type: c.req.group.id + '-' + c.req.param('id')}, order: 'id DESC'}, function(err, events) {
        c.locals.events = events;
        c.render();
    });
};
