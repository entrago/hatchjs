module.exports = ApiController;

function ApiController(init) {
    init.before(authenticate);
}

function authenticate (c) {
    if (!c.req.user) {
        return c.send({
            status: 'error',
            message: 'Missing authentication or invalid token'
        });
    }

    c.next();
}