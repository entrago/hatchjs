exports.routes = function (map) {
    map.post('register', 'users#create');
    map.post('update', 'users#update');
    map.get('join', 'users#join');
    map.get('join/:invitationCode?', 'users#join');
    map.post('reject', 'users#rejectInvitation', {as: 'rejectInvitation'});
    map.post('resetpassword', 'users#resetPassword', {as: 'resetPassword'});
    map.post('resetpasswordchange', 'users#resetPasswordChange', {as: 'resetPasswordChange'});
    map.get('hovercard/:id', 'users#hovercard', {as: 'hovercard'});

    map.get('logout', 'session#destroy');
    map.post('login.:format?', 'session#create');

    map.post('follow/:id', 'relationship#follow');
    map.post('unfollow/:id', 'relationship#unfollow');
};
