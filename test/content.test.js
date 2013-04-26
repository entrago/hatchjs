var app, compound, Content;

describe('Content', function() {

    before(function (done) {
        app = require('../')();
        compound = app.compound;
        compound.on('ready', function () {
            Content = compound.models.Content;
            Content.destroyAll(done);
            Group = compound.models.Group;
        });
    });

    it.only('should create content with a URI', function (done) {
        Group.all({ limit: 1}, function (err, groups) {
            Content.create({
                createdAt: new Date,
                title: 'Hello',
                text: 'World',
                likes: Array(4),
                groupId: groups[0].id
            }, function(err, content) {
                content.uri.indexOf('/do/api/content').should.be.equal(0);
                content.url.indexOf('example.com/').should.be.equal(0);
                done();
            });
        });
    });

    it('should create content with some score', function (done) {
        Content.create({
            createdAt: new Date,
            title: 'Hello',
            text: 'World',
            likes: Array(4)
        }, function(err, content) {
            Content.all(function(err, c) {
                c.length.should.equal(1);
                c[0].score.should.equal(2);
                done();
            });
        });
    });

    it('should like a post', function (done) {
        Content.create({
            createdAt: new Date,
            title: 'Hello',
            text: 'World'
        }, function(err, post) {
            if (err) {
                throw err;
            }

            post.like({ username: 'test_user', id: 1 }, function (err, post) {
                post.likesTotal.should.equal(1);
                post.likes.length.should.equal(1);
                post.doesLike({ id: 1 }).should.be.ok;
                done();
            });
        });
    });

    it('should flag a comment', function (done) {
        Content.create({
            createdAt: new Date,
            title: 'Hello',
            text: 'World'
        }, function(err, content) {
            content.flag({ username: 'test_user', id: 1 }, function (err, content) {
                content.flags.length.should.equal(1);
                content.hasFlag.should.be.ok;
                done();
            });
        });
    });
    
});
