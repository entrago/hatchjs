exports.registration = function(user) {
    this.locals.user = user;
    this.send({
        to: user.email,
        subject: 'Welcome to Hatch'
    });
};
