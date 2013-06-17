exports.routes = function (map) {
    map.post('add', 'upload#upload', {as: 'add'});
    map.get('add', 'upload#upload', {as: 'add'});
};
