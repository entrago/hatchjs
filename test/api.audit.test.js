var should = require('./'), app, Event, audit;
var async = require('async');

describe.only('api/audit', function() {

    before(function(done) {
        app = getApp(function() {
            Event = app.compound.models.Event;
            audit = app.compound.hatch.audit;
            Event.destroyAll(done);
        });
    });

    it('should track event', function(done) {
        audit.track('event', {foo: 'bar'}, function() {
            done();
        });
    });

    it('should retrieve events by particular type', function(done) {
        Event.all({where: {type: 'event'}}, function(err, events) {
            done();
        });
    });

    it('should retrieve events for particular day', function(done) {
        Event.all({where: {day: 'event-' + Math.floor(Date.now() / 86400000)}}, function(err, events) {
            console.log(events);
            done();
        });
    });

});
