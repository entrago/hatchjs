var should = require('./');
var app, compound, Content;

describe('API/search', function() {

    before(function(done) {
        var db = 9;
        var queue = [];
        app = getApp(function() {
            for (var i = 0; i < db; i++) {
                (function(n) {
                    queue.push(function() {
                        client.select(n, function() {
                            client.del('global:word:KRKSHN', function(err, x) {
                                next();
                            });
                        });
                    });
                })(i);
            }
            next();
        });
        compound = app.compound;
        Content = compound.models.Content;
        var client = Content.schema.adapter.client;

        function next() {
            var fn = queue.shift();
            if (fn) {
                fn();
            } else {
                client.select(1, done);
            }
        }
    });

    it('should use another database for search index', function(done) {
        var client = Content.schema.adapter.client;
        var db = 9;
        var queue = [];
        Content.create({title: 'Shiva', text: 'Krishna', createdAt: new Date}, function(err, c) {
            for (var i = 0; i < db; i++) {
                (function(n) {
                    queue.push(function() {
                        checkDb(n);
                    });
                })(i);
            }
            setTimeout(next, 1500);
        });

        function checkDb(num) {
            client.select(num, function() {
                client.exists('global:word:KRKSHN', function(err, x) {
                    x.should.equal(num === 5 ? 1 : 0, 'on database ' + num);
                    next();
                });
            });
        }

        function next() {
            var fn = queue.shift();
            if (fn) {
                fn();
            } else {
                client.select(1, done);
            }
        }
    });

});
