module.exports = UsersController;

function UsersController() {}

UsersController.prototype.create = function(c) {
    var User = c.User;
    var user = new User();

    user.username = c.body.username;
    user.email = c.body.email;
    user.password = c.body.password;
    user.hasPassword = c.body.hasPassword;

    //validation
    if (c.body.terms !== 'accepted') {
        return c.send({ message: 'Please accept the terms and conditions'});
    }

    //check for any more required custom fields
    if(!user.validateGroupProfileFields(c.req.group)) {
        user.type = 'temporary';
    }

    c.compound.hatch.hooks.hook(c, 'User.beforeRegister', { user: user }, function() {
        //save to database and continue
        user.save(function(err, user) {
            if (err) {
                c.send({ message: user.errors });
            } else {
                //get the newly created user
                User.all({where: { username: user.username }}, function (err, users) {
                    var user = users[0];

                    c.compound.hatch.hooks.hook(c, 'User.afterRegister', { user: user }, function() {
                        // authenticate user
                        c.req.session.userId = user.id;
                        
                        if (user.type === 'temporary') {
                            c.send({ redirect: c.specialPagePath('register') + '?redirect=' + c.pathTo.join() });
                        } else {
                            user.notify('registered');
                            c.send({ redirect: c.pathTo.join() });
                        }
                    });
                });
            }
        });
    })
};

UsersController.prototype.join = function (c) {
    if (c.params.invitationCode && !c.req.user) {
        c.req.session.invitationCode = c.params.invitationCode;
    }
    if (!c.req.user) {
        return c.redirect(c.req.group.path + '#register');
    }
    var invitationCode = c.req.params.invitationCode || c.req.body.invitationCode || c.req.session.invitationCode;

    c.req.user.joinGroup(c.req.group, invitationCode, function () {
        //redirect
        c.redirect(c.req.group.path);
    });
}
