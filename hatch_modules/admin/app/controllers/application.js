var _ = require('underscore');

var Application = module.exports = function Application(init) {
    init.before(function initApp(c) {
        var locals = this;
        this.pageName = c.actionName;
        this.sectionName = c.controllerName;
        this._ = _;
        this.req = c.req;
        this.tabs = c.compound.tabs;

        function loadGroupTags() {
            if (c.controllerName.match(/content|tags|streams/)) {
                var tags = (c.req.group.tags || []).slice(0, 5);
                var filter = c.req.query.filter || c.req.params.filter;
                tags = _.filter(tags, function(tag) {
                    return tag && tag.contentCount > 0;
                });
                if (typeof filter != 'undefined' && filter && !_.find(tags, function(t) {
                    return t && t.id == filter;
                })) {
                    tags.push(_.find(c.req.group.tags || [], function(t) {
                        return t && t.id == filter;
                    }));
                }
                locals.tags = tags;
            }
        }

        locals.group = c.req.group;
        loadGroupTags();
        if (c.req.query.pageId && isNaN(parseInt(c.req.query.pageId, 10))) {
            var url = c.req.query.pageId.replace(/^.*?\//, '/');
            c.req.group.definePage(url, c, function(err, page) {
                c.req.page = page;
                c.next();
            });
        } else if (c.req.query.pageId) {
            c.Page.find(c.req.query.pageId, function (err, page) {
                c.req.page = page;
                c.next();
            });
        } else {
            c.next();
        }
    });
};
