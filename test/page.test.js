var should = require('./');

var app, compound, Page;
var async = require('async');

describe.only('Page', function() {

    before(function (done) {
        app = getApp(done);
        compound = app.compound;
        Page = compound.models.Page;
    });

    describe('renderHtml', function() {

        it('should render a page with 1 widget', function(done) {

            Page.find(1, function(err, page) {
                console.log(page.path);
                getClient(app).get(page.url).end(function(res) {
                    done();
                });
            });

        });

        it('should render a page with 4 different widgets on it', function() {
        });

    });

});
