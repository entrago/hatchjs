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

var _ = require('underscore');
var googleImages = require('google-images');
var google = require('google');

var Application = require('./application');

module.exports = PageController;

function PageController(init) {
    Application.call(this, init);
    init.before(findPage);
}

// finds the page that we are performing the action on
function findPage (c) {
    c.req.group.definePage(c.req.pagePath, c, function (err, page) {
        c.req.page = page;
        c.next();
    });
}

require('util').inherits(PageController, Application);

/**
 * Show the edit console for this page.
 * 
 * @param  {HttpContext} c - http context
 */
PageController.prototype.editconsole = function editConsole(c) {
    c.req.widgets = [];
    var groupModulesIndex = {};
    var tab = c.req.query.tab || '';

    c.req.group.modules.forEach(function (m) {
        if (m) groupModulesIndex[m.name] = m;
    });

    c.compound.hatch.widget.getWidgets().forEach(function (w) {
        if (groupModulesIndex[w.module]) {
            c.req.widgets.push({
                name: w.name,
                module: w.module,
                info: w.widget.info
            });
        }
    });

    c.req.grids = [];
    var hatch = c.app.parent.parent.compound.hatch;
    Object.keys(hatch.grids).forEach(function (name) {
        c.req.grids.push({
            name: name,
            html: hatch.grids[name][0],
            preview: hatch.grids[name][1]
        });
    });

    //load the template pages and then render
    var Page = c.Page;

    Page.all({ where: { groupId: c.req.group.id, type: 'template' }}, function (err, templates) {
        c.templates = templates;
        // c.locals.themes = c.api.themes.getThemes();
        c.render('editconsole' + tab, { layout : false, req: c.req, templates: templates, themes: [] });
    });

};

/**
 * Update the grid for this page.
 * 
 * @param  {HttpContext} c - http context
 */
PageController.prototype.updateGrid = function(c) {
    var Page = c.Page;
    var page = c.req.page;
    var ctx = this;
    var oldTemplateId = page.templateId;

    page.templateId = c.body.grid == null ? c.body.templateId : 0;
    page.grid = c.body.grid;

    var grid = c.compound.hatch.layout.getLayoutGrid(c.body.grid || '02-two-columns');

    if (typeof page.columns === 'string') {
        page.columns = JSON.parse(page.columns);
    }

    page.columns.forEach(function (col) {
        col.size = false;
    });

    //if we are modifying a page which doesn't yet exist in the database (default special page), use the createPage function instead of save
    if (!page.id) {
        page.save = function(done) {
            Page.createPage(page, done);
        }
    }

    //save the page and re-render the column contents
    page.save(function (err, newPage) {
        if(err) throw err;
        page = newPage;

        if(page.templateId) {
            Page.find(page.templateId, function(err, template) {
                page.mergeTemplate(template);
                render();
            });
        }
        else if(oldTemplateId) {
            //if we're switching from a template to no template, copy the widgets from the template header onto the page
            Page.find(oldTemplateId, function(err, template) {
                page.reload(function(err, reloadedPage) {
                    page = reloadedPage;

                    var header = template.columns[0];
                    delete page.columns[0].fromTemplate;

                    if(_.filter(page.widgets, function(widget) { return widget && page.columns[0].widgets.indexOf(widget.id) > -1; })) {
                        template.widgets.forEach(function(widget) {
                            if(header.widgets.indexOf(widget.id) == -1) return;

                            widget.id = page.widgets.length;
                            page.widgets.push(widget);
                            page.columns[0].widgets.push(widget.id);
                        });
                    }

                    page.save(function(err) {
                        render();
                    });
                });
            });
        }
        else render();
    });

    function render() {
        Page.find(page.id, function(err, page) {
            page.render(grid.html, ctx, function (html) {
                ctx.send({html: html});
            });        
        });
    }
};

/**
 * Update the column widths for this page.
 * 
 * @param  {HttpContext} c - http context
 */
PageController.prototype.updateColumns = function(c) {
    c.req.page.columns = JSON.parse(c.body.widgets);
    c.req.page.save(function (err) {
        c.send('ok');
    });
};

/**
 * Show the richtext insert image dialog.
 * 
 * @param  {HttpContext} c - http context
 */
PageController.prototype.image = function(c) {
    c.Media.all({ where: { userId: c.req.user.id, type: 'image'}}, function(err, images) {
        c.locals.images = images;
        c.render('image', { layout: false });
    });
};

/**
 * Search for images on google to add to the media library.
 * 
 * @param  {HttpContext} c - http context
 */
PageController.prototype.imageSearch = function(c) {
    googleImages.search(c.req.body.query, function(err, images) {
        c.send(images);
    });
};

/**
 * Show the richtext insert link dialog.
 * 
 * @param  {HttpContext} c - http context
 */
PageController.prototype.link = function(c) {
    c.render('link', { layout: false });
};

/**
 * Search google for links to insert.
 * 
 * @param  {HttpContext} c 
 */
PageController.prototype.linkSearch = function(c) {
    google(c.req.body.query, function(err, next, links) {
        c.send(links);
    });
};
