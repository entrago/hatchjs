module.exports = function(compound) {
    compound.models.RequestTokenError = RequestTokenError;
};

function RequestTokenError(e) {
    if (!(this instanceof RequestTokenError)) return new RequestTokenError(e);

    this.name = 'RequestTokenError';
    this.code = e.statusCode || 500;
    this.context = 'linkedin';
    this.message = e.data;
    this.origin = e;
    Error.call(this, this.message);
};

RequestTokenError.prototype.__proto__ = Error.prototype;
