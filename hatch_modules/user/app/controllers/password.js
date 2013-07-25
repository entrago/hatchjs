
module.exports = PasswordController;

function PasswordController() {}

PasswordController.prototype.request = function resetPassword(c) {
    var User = c.User;

    //get the user to send the password reset link to
    User.findOne({where: {email: c.body.email}}, function (err, user) {
        if (user) {
            sendResetLink(user);
        } else {
            User.findOne({where: {username: c.body.email}}, function (err, user) {
                if (user) {
                    sendResetLink(user);
                } else {
                    c.error({ message: "Username or email address not found."});
                }
            });
        }
    });

    function sendResetLink(user) {
        user.resetPassword(c, function () {
            c.send({
                status: 'success',
                icon: 'info-sign',
                message: 'A reset password link has been sent to your registered email address.'
            });
        });
    }
};

PasswordController.prototype.change = function(c) {
    var ResetPassword = c.ResetPassword;

    ResetPassword.auth(c.req.body.token, function (err, user) {
        if(err) return c.error({ message: err.message });

        if (c.body.password) {
            user.updateAttribute('password', c.req.body.password, function (err) {
                c.send({
                    status: 'success',
                    icon: 'info-sign',
                    message: 'Your password has been successfully reset. You may now login.'
                });
            });
        } else {
            c.send({status: 'error', message: "Please enter a valid password"});
        }
    });
};
