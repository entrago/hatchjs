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

var async = require('async');
var ejs = require('ejs');
var path = require('path');
var request = require('request');
var qs = require('querystring');
var http = require('http');
var _ = require('underscore');

module.exports = function (compound, Page) {
    var api = compound.hatch.api;

    Page.validatesPresenceOf('title', {message: 'Please enter a title'});
    Page.validatesUniquenessOf('url');

    // register the functions which can be called from the REST api
    Page.allowedApiActions = [
        'getUrlName', 
        'toMinimalObject', 
        { name: 'save', permission: 'save' }
    ];

    /**
     * gets the last part of the url of this page after the last '/'
     * 
     * @return {[String]} 
     */
    Page.prototype.getUrlName = function(page) {
        if(!page) page = this;

        var regex = /(\/[^\:^\/]+)/ig;
        if(!page.url || page.url.search(regex) === -1) {
            return '';
        } else {
            var matches = page.url.match(regex);
            return page.url.substring(page.url.lastIndexOf(matches[matches.length -1]) +1);
        }
    };

    /**
     * updates the parent group after this page has been saved to the database
     * 
     * @param  {Function} next [continuation function]
     */
    Page.afterSave = function(next) {
        //after we save a template, make sure to update the group so that the template cache is updated
        if(this.type !== 'page') {
            Page.updateGroup(this.groupId);
        }

        next();
    };

    Page.grids = compound.hatch.grids;

    /**
     * creates a new page and saves to the database
     * 
     * @param  {[json]}   data [page data to create with]
     * @param  {Function} done [continuation function]
     */
    Page.createPage = function (data, done) {
        if (!data.url && data.title) {
            data.url = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }

        //fix the data.url for the page and save
        fixPageUrl(data, function(err, data) {
            if(err) {
                var page = new Page(data);
                page.errors = {parent: ['page not found']};

                return done(err, page);
            }
            return Page.create(data, function(err, page) {
                Page.updateGroup(page.groupId);
                done(err, page);
            });
        });
    };

    /**
     * updates a page and saves to the database
     * 
     * @param  {[json]}   data [page update data]
     * @param  {Function} done [continuation function]
     */
    Page.prototype.update = function (data, done) {
        var self = this;
        var oldUrl = self.url;

        //if we have no parentId - this is the homepage - skip the url fixing code because the url cannot be changed from here
        if(!self.parentId) {
            self.updateAttributes(data, function(err) {
                done(err, self);
            });
            return;
        }

        //if a url was not specified, automatically generate it from the title
        if (!data.url) {
            data.url = this.url.replace(/\/$/g, '').replace(/[^\/]+$/, data.title);
        }

        //if url was not changed, exit this function
        if (!data.url || this.url === data.url) {
            Page.updateGroup(self.groupId);
            return this.updateAttributes(data, done);
        }

        //fix the data.url for the page and save
        fixPageUrl(data, function(err, data) {
            if(err) return done(err);
            self.updateAttributes(data, function (err, page) {
                if (err) return done(err, page);

                //update child page urls accordingly
                cascadingUpdate(page, function () {
                    Page.updateGroup(self.groupId);
                    done(null, page);
                });
            });
        });

        /**
         * updates child page urls based on changes made to this page's url
         * 
         * @param  {[type]}   root [the root page being updated]
         * @param  {Function} done [continuation function]
         */
        function cascadingUpdate(root, done) {
            Page.all({where: {groupId: root.groupId}}, function (err, pages) {
                var subtree = Page.tree(pages, root.id);
                var wait = subtree.length;
                if (wait === 0) return done();
                subtree.forEach(function (page) {
                    page.updateAttribute('url', page.url.replace(oldUrl, root.url), ok);
                });

                function ok() {
                    if (--wait === 0) done();
                }
            });
        }
    };

    /**
     * fixes the page url in the data used to create or update a page
     * 
     * @param  {[json]}   data [data containing the page information we want to save]
     * @param  {Function} next [continuation function]
     */
    function fixPageUrl(data, done) {
        //if the parent page is explicitly defined
        if(data.parentId) {
            Page.find(data.parentId, function(err, parent) {
                if (err) {
                    return done(err);
                }
                if (!parent) {
                    return done(new Error('Target parent page not found'));
                }
                if (parent.url.indexOf(currentUrl + '/') === 0) {
                    return done(new Error('Could not move page to his child'));
                }

                //adjust the url
                if((data.url || '').search(/(\/[^\:^\/]+)/ig) == -1) {
                    if(data.customUrl === 'false') data.url = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    data.url = (parent.url + '/' + data.url).replace('//', '/');
                    newUrl = data.url;
                }

                data.parentId = parent.id;
                data.groupId = parent.groupId;

                done(null, data);
            });
        }  
        //parent page is implied from url
        else if(data.url.indexOf('/') > -1) {
            var parentUrl = data.url.replace(Page.prototype.getUrlName(data), '');
            
            if (parentUrl[parentUrl.length -1] == '/') parentUrl = parentUrl.substring(0, parentUrl.length -1);
            // if (parentUrl.indexOf('/') === -1) parentUrl += '/';

            var currentUrl = this.url;

            Page.all({where: {url: parentUrl}}, function (err, parent) {
                if (err) {
                    return done(err);
                }
                parent = parent[0];
                if (!parent) {
                    console.log('parent page not found');
                    return done(new Error('Target parent page not found'));
                }
                if (parent.url.indexOf(currentUrl + '/') === 0) {
                    return done(new Error('Could not move page to his child'));
                }

                data.parentId = parent.id;
                data.groupId = parent.groupId;

                done(null, data);
            });
        } 
        //parent page not defined - fix?
        else {
            //special page - always set parent to homepage
            if(data.type != 'page') {
                compound.models.Group.find(data.groupId, function(err, group) {
                    data.parentId = group.homepage.id;
                    data.url = path.join(group.homepage.url, data.url);

                    done(null, data);
                });

                return;
            }
        }
    }

    /**
     * Delete a page
     * 
     * @param  {Function} done [continuation function]
     */
    Page.prototype.destroyPage = function (done) {
        var baseURL = this.url.replace(/[^\/]+$/, '');
        var page = this;
        Page.all({where: {parentId: this.id}}, function (err, pages) {
            var wait = pages.length + 1;
            pages.forEach(function (page) {
                if(page.url == null) {
                    ok();
                    return;
                };
                page.update({
                    url: baseURL + page.url.split('/').pop()
                }, function () {
                    ok();
                });
            });

            ok();

            function ok() {
                if (--wait === 0) fine();
            }
        });

        function fine() {
            page.destroy(function() {
                Page.updateGroup(page.groupId);
                done();
            });
        }
    };

    Page.prototype.renderHtml = function (req, callback) {
        var result = {}, self = this;

        async.forEach(self.widgets.items, function (widget, next) {
            self.renderWidgetDirect(widget, req, function (err, html) {
                if (!result[widget.id]) {
                    if (err) {
                        console.log(err);
                        result[widget.id] = err;
                    } else {
                        result[widget.id] = html;
                    }
                    next();
                }
            });
        }, done);

        function done() {
            var cols = [], sizes = [];
            self.columns.forEach(function (col) {
                var html = '';
                col.widgets.forEach(function (widgetId) {
                    html += result[widgetId];
                });
                cols.push(html);
                sizes.push(col.size);
            });

            var grid = req.agent && req.agent.mobile ? ('m.' + self.grid) : self.grid;
            var gridHtml = Page.grids[grid || self.grid || '02-two-columns'] || [''];

            // log the total render time
            console.log('RENDER [' + (new Date() - req.startedAt) + 'ms]');
            console.log('---------------');

            callback(null, ejs.render(gridHtml[0], {
                column: cols,
                size: sizes,
                filename: grid + (self.templateId || ''),
                cache: true
            }));
        }
    };

    Page.prototype.renderWidgetDirect = function (widget, req, cb) {
        var moduleName = widget.type.split('/')[0];
        var widgetName = 'widgets/' + widget.type.split('/').slice(1).join('/');

        return renderWidgetAction(req, moduleName, widgetName, widget, 'show', function (err, body) {
            cb(err, body);
        });
    };

    Page.prototype.renderWidget = function (widget, req, cb) {
        this.widgetAction(widget, 'show', null, req, cb);
    };

    Page.prototype.performWidgetAction = function(widgetId, req, cb) {
        this.widgetAction(widgetId, req.body.perform, req.body['with'], req, cb);
    };

    Page.prototype.widgetAction = function(widgetId, action, params, req, cb) {
        var widget;
        if (typeof widgetId === 'object' && widgetId.id) {
            widget = widgetId;
            widgetId = widget.id;
        } else {
            widget = this.widgets[widgetId];
        }
        if (!widget) {
            return cb(new Error('Widget id=' + widgetId + ' not found'));
        }
        if (!widget.type) {
            return cb(new Error('Widget has no type specified'));
        }

        var querystring = qs.stringify(req.query);
        if (querystring) querystring = '?' + querystring;

        var apiDomain = this.url.match(/^[^\/]+/)[0];
        apiDomain = 'localhost:3000';
        var url = [
            //'http://' + apiDomain,
            req.pagePath.replace(/^\/|\/$/g, ''),
            'do',
            widget.type.replace('/', '/widgets/'),
            action + querystring].filter(Boolean).join('/');

        var data = {
            data: params,
            widgetId: widgetId,
            templateWidget: !!widget.templateWidget
        };
        
        inAppRequest(req, url, { data: data }, function(err, res) {
            cb(err, res);
        });

    };

    function renderWidgetAction(parent, moduleName, widgetName, widget, action, callback) {
        var module = compound.hatch.modules[moduleName];
        var req = {};

        // create a new 'request' from scratch and copy over all of the required properties from the parent request
        ['user', 'group', 'page', 'post', 'cookies', 'session', 'compound', 'method', 'app', 'pagePath', 'locals', 'agent']
            .forEach(function (key) {
            req.__defineGetter__(key, function () { 
                return parent[key]; 
            });
        });

        // copy the param function
        req.param = parent.param;

        req.params = {};
        req.query = {};
        req.body = {};
        req.body.data = {
            widgetId: widget.id,
            templateWidget: false
        }

        var res = new http.ServerResponse({method: 'NOTHEAD'});

        res.controllerName = widgetName.split('/')[0];
        res.compound = module && module.compound;
        res.req = req;
        res.context = {
            req: req,
            res: res,
            inAction: true
        };
        res.render = function (file, viewContext, next) { 
            compound.app.render(file, viewContext, next || callback); 
        };

        module && module.compound.controllerBridge.callControllerAction(widgetName, action, req, res, callback);
    }

    function inAppRequest(parent, url, data, callback) {
        var req = new http.IncomingMessage;
        var res = new http.ServerResponse({method: 'NOTHEAD'});

        res.end = function(body) {
            callback(null, body);
        };

        // set the entities associated with this request from the parent so that
        // they don't have to be loaded again by ID
        req.user = parent.user;
        req.group = parent.group;
        req.page = parent.page;
        req.post = parent.post;

        // TODO: we need to set the cookies and session so that they can be 
        // accessed and set (if required) from each widget. This doesn't seem
        // to be working but I cannot understand why
        //req.cookies = parent.cookies;
        //req.session = parent.session;

        req.body = data;
        req.method = 'POST';
        req.connection = {};
        req.url      = '/' + url;
        req.headers  = { 
            host: parent.headers.host,
            'user-agent': parent.headers['user-agent']
        };

        compound.app.handle(req, res);
    }

    Page.prototype.pathname = function (req) {
        return this.url.replace(req.group.homepage.url, '').replace(/^\/|\/$/g, '');
    };

    /**
     * updates a group by recalculation the pages cache data
     * 
     * @param  {[Number]} groupId [id of group to update]
     */
    Page.updateGroup = function (groupId, next) {
        var Group = compound.models.Group;
        Group.find(groupId, function (err, group) {
            if(!group) {
                if(next) next();
                return;
            }
            Page.all({where: {groupId: groupId}}, function (err, pages) {
                group.pagesCache = [];
                pages.forEach(function (page) {
                    group.pagesCache.push(page.toMinimalObject());
                    if (group.homepage && group.homepage.id == page.id) {
                        group.homepage = page.toMinimalObject();
                    }
                });
                group.pagesCache = Page.tree(group.pagesCache);
                group.save();

                if(next) next();
            });
        });
    };

    /**
     * Merges a template with the current page
     * 
     * @param  {[Page]} template [template to merge]
     */
    Page.prototype.mergeTemplate = function (template) {
        var page = this;

        template.widgets.forEach(function (w) {
            w.notEditable = true;
            w.templateWidget = true;
        });

        template.columns.forEach(function (col, i) {
            if (col.widgets && col.widgets.length) {
                col.fromTemplate = true;
                page.columns[i] = col;
            } else {
                page.columns[i] = page.columns[i] || {widgets: []};
                page.columns[i].size = col.size;
            }
        });

        page.templateWidgets = template.widgets;
        page.grid = template.grid;
    };

    /**
     * returns the minimal object for this page for use in group.pagesCache
     * 
     * @return {[Page]} 
     */
    Page.prototype.toMinimalObject = function () {
        var obj = {
            id: this.id,
            title: this.title,
            url: this.url,
            order: this.order,
            level: this.level,
            parentId: this.parentId,
            type: this.type,
            hideFromNavigation: this.hideFromNavigation
        };
        if (obj.type === 'template') {
            obj.columns = this.columns;
            obj.widgets = this.widgets;
            obj.grid = this.grid;
        }
        return obj;
    };

    /**
     * builds the page hierarchy tree for navigation display
     * 
     * @param  {[list]} collection [list of pages]
     * @param  {[Page]} root       [root of the group pages tree]
     * @return {[list]}            [the re-arranged list]
     */
    Page.tree = function (collection, root) {
        var result = [];
        var index = {};
        collection.forEach(function (page) {
            var id = page.parentId || 'root';
            index[id] = index[id] || [];
            index[id].push(page);
        });
        walk(root || 'root');
        return result;

        function walk(id, level) {
            level = level || 0;
            if (!index[id]) return;
            index[id].sort(function (pageA, pageB) {
                return pageA.order > pageB.order ? 1 : -1;
            });
            index[id].forEach(function (page) {
                page.level = level;
                result.push(page);
                if (page.id !== id) {
                    walk(page.id, level + 1);
                }
            });
        }
    };

};

