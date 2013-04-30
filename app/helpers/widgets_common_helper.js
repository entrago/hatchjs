
exports.__ = function (s) {
    return s;
};

exports._ = require('underscore');

exports.widgetAction = function (s, type) {
    return this.req.pagePage + '/do/' + (type || this.locals.widget.type).replace('/', '/widgets/') + '/' + s;
};

exports.widgetCoreAction = function (s) {
    return [this.req.pagePath, 'do/admin/widget', this.locals.widget.id || 'NOWID', s].join('/');
};
