layout('widgets');

before('init env', function (c) {
    var locals = this;
    locals.group = req.group;
    locals.user = req.user;
    locals.data = body.data && JSON.parse(body.data).data;
    locals.inlineEditAllowed = true;
    locals.canEdit = true;

    locals.group.definePage(req.data.pageUrl, c, gotPage);

    function gotPage(err, page) {
        if (err || !page) {
            return send('Widget not found');
        }
        locals.page = page;
        var wc = req.data.templateWidget ? 'templateWidgets' : 'widgets';
        locals.widget = page[wc][req.data.widgetId];
        if (locals.widget) {
            locals.widget.settings = locals.widget.settings || {};
        }
        next();
    }
});

action(function show() {
    render();
});
