var should = require('./');
var supertest = require('supertest');

describe('WidgetsController', function() {
    var app, request, User;

    before(function(done) {
        app = should.getApp(done);
        request = supertest(app);
    });

    it('should require admin user for creating widget', function(done) {
        post('/do/core-widgets/widget', {
            addWidget: 'any/thing',
        }, function(err, res) {
            res.statusCode.should.equal(403);
            done();
        });
    });

    it('should add widget to page', function(done) {
        post('/do/core-widgets/widget', {
            token: 'daddyhome',
            addWidget: 'core-widgets/static',
        }, function(err, res) {
            res.statusCode.should.equal(200);
            done();
        });
    });

    function post(url, data, cb) {
        return request.post(url)
        .set('Host','example.com')
        .set('User-Agent','mocha')
        .send(data)
        .end(cb);
    }
});
