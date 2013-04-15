var _ = require('underscore');

var Application = module.exports = function Application(init) {
    init.before(function initApp(c) {
        var locals = this;
        this.pageName = c.actionName;
        this.sectionName = c.controllerName;
        this._ = _;
        this.req = c.req;
        this.tabs = c.compound.tabs;
        locals.group = c.req.group;
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

    init.before(loadContentTypes);
    init.before(loadMemberRoles);
};

function loadContentTypes(c) {
    c.locals.contentTypes = c.compound.hatch.contentType.getAll();
    c.locals.editableContentTypes = c.compound.hatch.contentType.getEditable();
    c.next();
}

function loadMemberRoles(c) {
    c.locals.memberRoles = [
        { name: 'members', icon: 'user', filter: 'member' },
        { name: 'editors', icon: 'star', filter: 'editor' },
        { name: 'pending', icon: 'time', filter: 'pending' }
    ];
    c.next();
}