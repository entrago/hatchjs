//
// Hatch.js is a CMS and social website building framework built in Node.js 
// Copyright (C) 2013 Inventures Software Ltd
// 
// This file is part of Hatch.js
// 
// Hatch.js is free software: you can redistribute it and/or modify it under the terms of the
// GNU General Public License as published by the Free Software Foundation, version 3
// 
// Hatch.js is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
// without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// 
// See the GNU General Public License for more details. You should have received a copy of the GNU
// General Public License along with Hatch.js. If not, see <http://www.gnu.org/licenses/>.
// 
// Authors: Marcus Greenwood, Anatoliy Chakkaev and others
//

var _ = require("underscore");
var async = require("async");

var Application = require('./application');

module.exports = PagesController;

function PagesController(init) {
    Application.call(this, init);
    init.before(findPage, {only: 'destroy, edit, show, update'});
    init.before(prepareTree, {only: 'index, new, newSpecial, edit'});
}

// find the page by its id
function findPage(c) {
    var locals = this;
    c.Page.find(c.req.params.id || c.req.params.page_id || c.req.body.id, function (err, page) {
        locals.page = page;
        c.next();
    });
}

// prepare the page tree for display
function prepareTree(c) {
    var locals = this;
    this.specials = Object.keys(c.compound.hatch.page.pages).map(function (sp) {
        return c.compound.hatch.page.pages[sp];
    });
    this.templates = [];
    c.req.group.pages(function (err, pages) {
        if (!err) {
            pages.forEach(function (p) {
                if (p.type === 'template') {
                    locals.templates.push(p);
                }
            });
            c.req.pagesTree = c.Page.tree(pages);
        }
        c.next();
    });
}

// Render the page tree to JSON
function renderPageTree (c) {
    var Page = c.Page;
    c.req.group.pages(function (err, pages) {
        // filter page types to standard page types only
        pages = pages.filter(function (page) {
            return [null, '', 'page', 'homepage'].indexOf(page.type) !== -1;
        });

        if (pages) {
            c.locals.pages = Page.tree(pages);
        }
        c.render('_table', { layout: false });
    });
}

/**
 * Show the page sitemap for this group where the administrator can drag pages
 * to re-order and adjust the hierarchy.
 * 
 * @param  {HttpContext} c - http context
 */
PagesController.prototype.index = function(c) {
    this.title = 'Manage pages';
    c.req.session.adminSection = 'pages';
    var Page = c.Page;
    Page.all({where: {groupId: c.req.group.id}}, function(err, pages) {
        // filter page types to standard page types only
        pages = pages.filter(function(page) {
            return page.title && !page.type || page.type === 'page';
        });

        // force reload when back button pressed
        c.res.setHeader('Cache-Control', 'no-cache, no-store');
        c.render({ pages: Page.tree(pages) });
    });
};

/**
 * Render the page tree as a partial.
 * 
 * @param  {HttpContext} c - http context
 */
PagesController.prototype.renderPageTree = function(c) {
    renderPageTree.call(this, c);
};

/**
 * Show the special page list for this group.
 * 
 * @param  {HttpContext} c - http context
 */
PagesController.prototype.specials = function(c) {
    this.pageName = 'specials';
    var Page = c.Page;
    Page.all({where: {groupId: c.req.group.id}}, function(err, pages) {
        // filter page types to special pages only
        pages = pages.filter(function(page) {
            return [null, '', 'page', 'homepage'].indexOf(page.type) == -1;
        });

        // force reload when back button pressed
        c.res.setHeader('Cache-Control', 'no-cache, no-store');
        pages.forEach(function (page) {
            // TODO: uncomment and handle
            // var sp = c.compound.hatch.module.getSpecialPage(page.type);
            // page.icon = sp.icon;
        });
        c.render({pages: pages});
    });
}

/**
 * Show the new page form.
 * 
 * @param  {HttpContext} c - http context
 */
PagesController.prototype.new = function(c) {
    this.pageName = 'new-page';
    this.page = new c.Page;
    c.render('newPage');
};

/**
 * Show the new special page form.
 * 
 * @param  {HttpContext} c - http context
 */
PagesController.prototype.newSpecial = function(c) {
    this.type = c.req.params.type;
    this.page = new c.Page;
    this.pageName = 'new-special' + (this.type ? '-' + this.type : '');
    c.render('newspecial');
};

/**
 * Create a new page.
 * 
 * @param  {HttpContext} c - http context
 */
PagesController.prototype.create = function(c) {
    var locals = this;

    // TODO: this should come from some kind of JSON/YML template
    var Page = c.Page;
    c.body.groupId = c.req.group.id;
    c.body.grid = '02-two-columns';
    c.body.columns = [{widgets: [1, 2]}];
    c.body.type = c.body.type || 'page';

    // add the group header and navigation by default
    c.body.widgets = [
        {type: 'core-widgets/group-header', id: 1},
        {type: 'core-widgets/mainmenu', id: 2}
    ];

    //c.Tag.assignTagsForObject(c.req.body, c.req.body.tags, function () {
        Page.createPage(c.body, function (err, page) {
            if (err) {
                c.next(err);
            } else {
                if (page.type && page.type !== 'page') {
                    c.redirect(c.pathTo.specialPages);
                } else {
                    c.redirect(c.pathTo.pages);
                }
            }
        });
    //});

    function reorderPages(callback) {
        Page.all({where: {groupId: c.req.group.id}}, function(err, pages) {
            async.forEach(pages, function(page, next) {
                if (page.order >= c.body.order) {
                    page.order++;
                    page.save(next);
                } else {
                    next();
                }
            }, callback);
        });
    }
};

/**
 * Delete a page from this group.
 * 
 * @param  {HttpContext} c - http context
 */
PagesController.prototype.destroy = function(c) {
    this.page.destroyPage(function() {
        c.send('ok');
    });
};

/**
 * Show the edit form for the specified page.
 * 
 * @param  {HttpContext} c - http context
 */
PagesController.prototype.edit = function(c) {
    c.render('editPage');
};

/**
 * Update a page.
 * 
 * @param  {HttpContext} c - http context
 */
PagesController.prototype.update = function(c) {
    var Page = c.Page;
    var page = this.page;

    this.page = page;
    c.body.groupId = c.req.group.id;

    c.flash('info', c.t('models.Page.messages.saved'));
    delete c.body.undefined;

    //c.Tag.assignTagsForObject(page, c.req.body.tags, function () {
        page.update(c.body, function(err, page) {
            if (err) {
                return c.next(new Error(err.message));
            }

            if ([null, '', 'page', 'homepage'].indexOf(c.locals.page.type) != -1) {
                c.send({ redirect: c.pathTo.pages() });
            } else {
                c.send({ redirect: c.pathTo.specialPages() });
            }
        });
    //});
};

/**
 * Update the order and hierarchy of the pages within this group.
 * 
 * @param  {HttpContext} c - http context
 */
PagesController.prototype.updateOrder = function(c) {
    // find and update the page that was dragged
    c.Page.find(c.params.page_id, function(err, page) {
        delete c.body.authencity_token;
        page.update(c.body, function(err, page) {
            // update the order of all pages in the group
            c.Page.all({where: {groupId: c.req.group.id}}, function(err, pages) {
                if (err || !pages) return;

                // filter page types to standard page types only
                pages = pages.filter(function(page) {
                    return [null, '', 'page', 'homepage'].indexOf(page.type) != -1;
                });

                var wait = pages.length;
                if (wait === 0) {
                    return done();
                }
                var ind = {};
                pages.forEach(function(page) {
                    ind[page.id] = page;
                });
                c.body.order.forEach(function(id, i) {
                    if (isNaN(id)) {
                        ok();
                    } else {
                        var page = ind[id];
                        //page.updateAttribute('order', i, ok);
                        page.order = i;
                        page.save(ok);
                    }
                });
                delete c.body.order;

                function ok() {
                    if (--wait === 0) done();
                }
            });
        });
    });

    function done() {
        if (c.params.format === 'json') {
            renderPageTree(c);
        }
    }
}
