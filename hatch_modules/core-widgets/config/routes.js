exports.routes = function (map) {
    // wildcard to catch all other widget actions
    map.post('/widget/:widgetId/:action', 'widgets');
    map.put('/widget/:widgetId/:action', 'widgets');
    map.get('/widget/:widgetId/:action', 'widgets');
};
