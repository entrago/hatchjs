
exports.__ = function (s) {
    return s;
};

//exports._ = require('underscore');

exports.widgetAction = function (s, type) {
    console.log('DEPRECATED widgetAction helper, use widgetCoreAction instead');
    return this.req.pagePage + '/do/' + (type || this.locals.widget.type).replace('/', '/widgets/') + '/' + s;
};

exports.widgetCoreAction = function (s) {
    return [this.req.pagePath, 'do/core-widgets/widget', this.locals.widget.id || 'NOWID', s].join('/');
};
