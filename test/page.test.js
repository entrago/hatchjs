var should = require('./');

var app, compound, Page;
var async = require('async');

describe('Page', function() {

    before(function (done) {
        app = getApp(done);
        compound = app.compound;
        Page = compound.models.Page;
    });

    it('should render a page with 4 different widgets on it');

});
