
module.exports = PasswordController;

/**
 * This controller provides API methods for password management: requesting
 * token for changing password without authentication, changing password usign
 * that token
 */
function PasswordController() {}

/**
 * Request OTP token (one-time-password) for changing password without
 * authentication. Requires email to be sent as POST param.
 *
 * @param email - email or username of user to lookup.
 */
PasswordController.prototype.request = function resetPassword(c) {
    c.User.findByUsername(c.body.email, function(err, user) {
        if (err || !user) {
            return c.sendError(err || new Error('User not found'));
        }
        user.resetPassword(c, function () {
            c.send({
                status: 'success',
                icon: 'info-sign',
                message: 'A reset password link has been sent to your registered email address.'
            });
        });
    });
};

/**
 * Change password using OTP.
 *
 * @param password - new password.
 * @param token - OTP to lookup user.
 */
PasswordController.prototype.change = function(c) {
    c.ResetPassword.findOne({ where: { token: c.body.token || c.body.resetToken }}, function (err, reset) {
        reset.changePassword(c.body.token || c.body.resetToken, c.body.password, function(err) {
            if (err) {
                c.sendError(err);
            } else {
                c.send({
                    status: 'success',
                    icon: 'info-sign',
                    message: 'Your password has been successfully reset. You may now login.'
                });
            }
        });
    });
};
