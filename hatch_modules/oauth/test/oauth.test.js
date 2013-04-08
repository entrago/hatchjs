var app, compound, User, OAuthClient, oauth;
var request = require('supertest')
var async = require('async');
var ejs = require('ejs');

describe('OAuth', function() {
    var code;

    before(function (done) {
        app = require('../../../')();
        compound = app.compound;
        compound.on('ready', function () {
            compound.seed(__dirname + '/seed', done);
        });
    });

    it('should test a valid apiKey', function (done) {
        request(app)
            .get('/do/oauth/authorize?key=testKey')
            .end(function (err, res) {
                res.statusCode.should.equal(302);
                done();
            });
    });

    it('should test an invalid apiKey', function (done) {
        request(app)
            .get('/do/oauth/authorize?key=testWrong')
            .end(function (err, res) {
                eval(res.body).message.should.equal('Invalid API Key');
                done();
            });
    });

    it('should test granting an OAuthCode', function (done) {
        request(app)
            .post('/do/oauth/grant')
            .send({
                key: 'testKey',
                state: 'testState',
                username: 'test',
                password: 'test'
            })
            .end(function (err, res) {
                res.statusCode.should.equal(200);
                code = eval(res.body).code;
                code.length.should.equal(256);
                done();
            });
    });

    it('should exchange an OAuthCode for an AccessToken', function (done) {
        request(app)
            .post('/do/oauth/exchange')
            .send({
                key: 'testKey',
                secret: 'testSecret',
                code: code
            })
            .end(function (err, res) {
                var token = eval(res.body).token;
                token.length.should.equal(256);
                done();
            });
    });
});