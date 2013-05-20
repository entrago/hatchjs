var should = require('./');
var app, hatch;
var should = require('should');

describe('Group', function() {

    before(function(done) {
        app = getApp(done);
        hatch = app.compound.hatch;
    });

    it('should load module', function(done) {
        hatch.loadModules(__dirname + '/fixtures/modules');
        should.exist(hatch.modules.simple);
        hatch.modules.simple.compound.on('ready', function() {
            done();
        });
    });

});

