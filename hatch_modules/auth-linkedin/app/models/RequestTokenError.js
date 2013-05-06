module.exports = function(compound) {
    compound.models.LinkedinRequestTokenError = LinkedinRequestTokenError;
};

function LinkedinRequestTokenError(e) {
    if (!(this instanceof LinkedinRequestTokenError)) return new LinkedinRequestTokenError(e);

    this.name = 'LinkedinRequestTokenError';
    this.code = e.statusCode || 500;
    this.message = e.data;
    this.origin = e;
    Error.call(this, this.message);
};

LinkedinRequestTokenError.prototype.__proto__ = Error.prototype;
