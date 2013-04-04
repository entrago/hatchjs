exports.routes = function (map) {
    map.get('join', 'users#join');
    map.post('register', 'users#create');
    map.del('logout', 'session#destroy');
    map.post('login.:format?', 'session#create');
    map.get('reset-password', 'users#resetPassword', {as: 'resetPassword'});
};
