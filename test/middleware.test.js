// This test written using mocha and should. Run it using `make test` command.

var should = require('./'), app, compound, hatch;

describe('middleware', function() {
    var tester;

    before(function(done) {
        app = getApp(function() {
            compound = app.compound;
            hatch = compound.hatch;
            done();
        });
    });

    function middleware(req, res, next) {
        tester(req);
    }

    function remove() {
        var index;
        app.stack.forEach(function(m, i) {
            if (m.handle === middleware) {
                index = i;
            }
        });
        app.stack.splice(index, 1);
    }

    describe('rewrite', function() {

        before(function() {
            compound.injectMiddlewareAfter('rewriteMiddleware', middleware);
        });

        after(remove);

        it('should not rewrite urls without "/do/"', test('/', function(req) {
            req.pagePath.should.equal('');
            req.url.should.equal('/');
        }));

        it('should rewrite urls with "/do/"', test('/pa/do/simple/users', function(req) {
            req.pagePath.should.equal('/pa');
            req.url.should.equal('/do/simple/users');
        }));

    });

    describe('hatch', function() {

        before(function() {
            compound.injectMiddlewareAfter('hatchMiddleware', middleware);
        });

        after(remove);

        it('should auth user by token', test('/?token=letmein', function(req) {
            should.exist(req.user);
        }));

        it('should not auth user by expired token', test('/?token=expired', function(req) {
            should.not.exist(req.user);
        }));

    });

    function test(url, callback) {
        return function(done) {
            getClient(app).get(url).end(function(err, c) {
                if (err) {
                    console.log(err);
                }
            });
            tester = function(req) {
                callback(req);
                done();
            };
        };
    }

});
