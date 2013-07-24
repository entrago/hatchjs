exports.registration = function(user) {
    this.locals.user = user;
    this.send({
        to: user.email,
        subject: 'Welcome to Hatch'
    });
};

exports.resetpassword = function(user, compound) {
    this.locals.user = user;
    this.locals.resetPasswordUrl = 'http://localhost:3000/reset-password';
    this.send({
        to: user.email
    }, console.log);
};
