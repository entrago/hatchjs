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

var path = require('path');

module.exports = function (compound, Group) {

    var Page = compound.models.Page;
    var User = compound.models.User;
    var Content = compound.models.Content;
    var _ = require('underscore');
    var async = require('async');

    Group.hasMany(Page, {as: 'pages', foreignKey: 'groupId'});

    Group.getter.path = function () {
        return this._url.replace(/[^\/]+/, '');
    };

    Group.prototype.match = function (path) {
        if (this.subgroups) {
            var l = this.subgroups.length, i;
            for (i = 0; i < l; i += 1) {
                if (path.indexOf(this.subgroups[i].path) === 0) {
                    return this.subgroups[i];
                }
            }
        }
        return this;
    };

    /**
     * Find page by it's relative path
     *
     * @param {String} pathname - relative page path with no domain or group
     * path, it could not start with '/'. for root page it just blank string.
     *
     * @returns Object or Page
     */
    Group.prototype.matchPage = function (pathname) {
        var group = this;
        var fullPagePath = path.join(this.url.match(/^[^\/]+/)[0], pathname);
        fullPagePath = fullPagePath.replace(/\/$/, '').split('?')[0];
        var found = null;
        this.pagesCache.forEach(function (page) {
            // match regular page
            if (page.type === 'page' || !page.type) {
                if (page.url === fullPagePath) {
                    found = page;
                }
            }
            // match special page
            else {
                var sp = compound.hatch.page.get(page.type);
                if (sp && sp.matchRoute) {
                    var p = sp.matchRoute(group, pathname);
                    if (p) {
                        found = page;
                    }
                }
            }
        });

        if (!found) {
            var special = compound.hatch.page.match(this, pathname);
            var page = special[0];
            var params = special[1];
            if (page && page.defaultPage) {
                found = group.pages.build(page.defaultPage);
                found.url = fullPagePath;
                found.type = special.type;
                found.grid = found.grid || '02-two-columns';
                found.handler = page.handler;
                found.specialPageParams = params;
            }
        }

        return found;
    };

    Group.prototype.definePage = function definePage(url, c, cb) {
        var group = this;
        var path = url.split('?')[0];
        var page = this.matchPage(path);

        // special page out of this group (sp.defaultPage)
        if (page && page.type !== 'page' && !page.id) {
            if (page.handler) {
                return page.handler(c, gotPage.bind(this, null, page));
            }
        }

        if (!page) {
            cb(null, null);
        } else if (page.id) {
            Page.find(page.id, gotPage);
        } else {
            gotPage(null, page);
        }

        function gotPage(err, page) {

            if (page && page.templateId) {
                var found = group.getCachedPage(page.templateId);

                if (found) {
                    page.mergeTemplate(new Page(found));
                    return cb(err, page);
                }
            }

            cb(err, page);
        }

    }

    Group.prototype.getCachedPage = function getCachedPage(id) {
        var found;
        this.pagesCache.forEach(function (p) {
            if (p.id == id) {
                found = p;
            }
        });
        return found;
    };

    /**
     * clones a group and saves the new one to the database
     * 
     * @param  {[params]}   params [clone parameters]
     * @param  {Function}   cb     [continuation function]
     */
    Group.prototype.clone = function (params, cb) {
        var oldGroup = this;
        var newUrl = params.url;
        var newName = params.name;

        if (!newUrl || !newName) {
            return cb(new Error('Name and URL required'));
        }

        var g = oldGroup.toObject();
        var oldUrl = g.homepage.url;
        delete g.id;
        // quick fix homepage
        // TODO: move to juggling
        var hp = {};
        for (var i in g.homepage) hp[i] = g.homepage[i];
        g.homepage = hp;
        g.url = newUrl;
        g.homepage.url = newUrl;
        g.pagesCache = [];
        g.name = newName;

        // remove slash from the end of group url
        newUrl = newUrl.replace(/\/$/, '');

        var pages, group;

        Page.findOne({where: { url: newUrl }}, function (err, p) {
            if (p) {
                return cb(new Error('URL already taken'));
            }
            createGroup();
        });

        function createGroup() {
            Group.create(g, function (err, gg) {
                if (!oldGroup.subgroups) oldGroup.subgroups = [];
                oldGroup.subgroups.push({path: gg.path});
                oldGroup.save(function() {

                    group = gg;
                    oldGroup.pages(function (err, ps) {
                        if (ps.length === 0) {
                            return cb(null, group);
                        }
                        pages = Page.tree(ps).map(function (page) {
                            var p = page.toObject();
                            p.url = p.url.replace(oldUrl, newUrl + '/');
                            p.groupId = group.id;
                            return p;
                        });
                        createHomepage(
                            createTemplates.bind(null, createPages)
                        );
                    });
                });
            });
        }

        function createHomepage(done) {
            console.log('createHomepage', pages);
            pages.forEach(function (p) {
                if (p.url === newUrl + '/') {
                    p.url = newUrl;
                    var oldId = p.id;
                    delete p.id;
                    Page.create(p, function (err, page) {
                        console.log('dasda');
                        group.homepage.id = page.id;
                        group.save(done);
                        pages.forEach(function (p) {
                            if (p.parentId === oldId) {
                                p.parentId = page.id;
                            }
                        });
                    });
                }
            });
        }

        function createTemplates(done) {
            console.log('createTemplates');
            var wait = 1;
            pages.forEach(function (p) {
                if (p.type === 'template') {
                    var oldTemplateId = p.id;
                    delete p.id;
                    delete p.parentId;
                    wait += 1;
                    Page.create(p, function (err, page) {
                        pages.forEach(function (p) {
                            if (p.templateId === oldTemplateId) {
                                p.templateId = page.id;
                            }
                        });
                        ok();
                    });
                }
            });

            ok();

            function ok() {
                if (--wait === 0) done();
            }

        }

        function createPages() {
            console.log('createPages');
            var p = pages.shift();
            if (!p) {
                Page.updateGroup(group.id);
                return cb(null, group);
            }
            var oldId = p.id;
            delete p.id;
            Page.create(p, function (err, page) {
                pages.forEach(function (p) {
                    if (p.parentId == oldId) {
                        p.parentId = page.id;
                    }
                });
                createPages();
            });
        }
    };

    // TODO: deprecate
    Group.prototype.handle = function groupEventHandler(name, env, done) {
        // group can handle some events
        // depending on special pages added to group
        // we need to iterate through special pages
        var sph, pageId;
        this.pagesCache.forEach(function (page) {
            if (!page.type || page.type === 'page') {
                return;
            }
            var sp = env.api.module.getSpecialPage(page.type);
            if (sp.respondTo === name) {
                sph = sp;
                pageId = page.id;
            }
        });
        // checking wich pages responds to that events
        // if appropriated page was found
        if (sph) {
            Page.find(pageId, function (err, page) {
                env.req.page = page;
                env.next = function() { 
                    env.res.send(env.res.html);
                };

                // run page's special handler
                if (sph.handler) {
                    console.log('got special page for that event', name);
                    sph.handler(env, function () {
                        console.log(env.req.page.toObject());
                        // and then pass controll to admin/page#show (using pubsub->page)
                        env.api.pubsub.emit('page', env);
                    });
                } else {
                    env.api.pubsub.emit('page', env);
                }
            });
        } else {
            done(false);
        }
    };

    // TODO: replace profile fields with []
    Group.prototype.profileFields = function() {
        if(!this.customProfileFields) return [];

        var fields = _.filter(this.customProfileFields, function(field) {
            return field != null;
        });
        fields = _.sortBy(fields, function(field) {
            return field.order;
        });

        return fields;
    };

    //gets a tag record for this group - or creates one if doesn't already exist
    Group.prototype.getTag = function(name) {
        if(!this.tags) this.tags = [];
        var tag = _.find(this.tags, function(tag) { return tag && tag.name == name });

        if(!tag) {
            tag = {
                id: this.tags.length,
                name: name,
                contentCount: 0,
                filter: null
            }

            //add to the tags list
            this.tags.push(tag);

            //save and forget
            this.save();
        }

        return tag;
    };

    /**
     * Recalculate all tag content counts for this group
     */
    Group.prototype.recalculateTagContentCounts = function() {
        var group = this;

        return; // TODO: rewrite tags logic without nested indexes

        async.forEach(group.tags || [], function(tag, next) {
            if(!tag) next();

            var cond = {
                groupId: group.id,
                'tags:tagId': tag.id
            };

            Content.count(cond, function(err, count) {
                tag.contentCount = count;
                next();
            });
        }, function() {
            // sort tags in descending order
            group.tags = _.sortBy(group.tags, function(tag) {
                return -tag.contentCount;
            });

            // save and forget
            group.save();
        });
    };

    /**
     * gets all of the tags for the specified content based on their automatic filter
     * 
     * @param  {[Content]} content
     * @return {[list]}    
     */
    Group.prototype.getTagsForContent = function(content) {
        var matchedTags = [];

        (this.tags || []).forEach(function(tag) {
            if(!tag) return;
            if(tag.filter) {
                var fn = eval(tag.filter);
                try {
                    if(fn(content)) {
                        matchedTags.push(tag);
                    }
                }
                catch(exception) {
                    console.log("Exception matching content for tag: " + tag.name + " = " + exception);
                }
            }
        });

        return matchedTags;
    };

    /**
     * gets all of the content that matches the specified tag's filter
     * 
     * @param  {[String]} tag      [tag to get content for]
     * @param  {Function} callback [continuation function]
     */
    Group.prototype.getContentForTag = function(tag, callback) {
        var fn = eval(tag.filter);

        Content.all({ groupId: this.id }, function(err, posts) {
            var matches = [];

            posts.forEach(function(post) {
                if(fn(post)) matches.push(post);
            });

            callback(matches);
        });
    };

    /**
     * deletes a tag
     * 
     * @param  {[Number]}   id   [specified tag id]
     * @param  {Function}   next [continuation function]
     */
    Group.prototype.deleteTag = function(id, next) {
        var group = this;

        //delete the tag from all content
        Content.all({ groupId: group.id, 'tags:tagId': id }, function(err, posts) {
            posts.forEach(function(post) {
                post.tags = _.reject(post.tags, function(tag) { return tag.tagId == id; });

                //save and forget
                post.save();
            });
        });

        //remove the tag
        this.tags = _.filter(this.tags, function(tag) { return tag && tag.id != id; });
        group.save(next);
    };

    /**
     * gets all of the custom user lists for the specified user based on list filter criteria
     * 
     * @param  {[User]} user [user to check for]
     * @return {[list]}      [list of lists]
     */
    Group.prototype.getListsForUser = function(user) {
        var matchedLists = [];

        (this.memberLists || []).forEach(function(list) {
            if(!list) return;
            if(list.filter) {
                var fn = eval(list.filter);
                try {
                    if(fn(user)) {
                        matchedLists.push(list);
                    }
                }
                catch(exception) {
                    //don't throw an error if we have an exception because this is from user generated code
                    console.log("Exception matching user for list: " + list.name + " = " + exception);
                }
            }
        });

        return matchedLists;
    };

    /**
     * gets the number of users matched by the specified list's filter
     * 
     * @param  {[list]}   list     [custom user list]
     * @param  {Function} callback [continuation function]
     */
    Group.prototype.getListFilterResults = function(list, callback) {
        var fn = eval(list.filter);
        var cond = {
            'membership:groupId': this.id,
            'membership:state': 'approved'
        };

        User.all({where: cond}, function(err, users) {
            var matches = [];

            users.forEach(function(user) {
                try {
                    if(fn(user)) matches.push(user);
                }
                catch(exception) {
                    //don't error here
                }
            });

            callback(matches);
        });
    };

    /**
     * recalculates all tag member list counts
     */
    Group.prototype.recalculateMemberListCounts = function(done) {
        var group = this;

        async.forEach(group.memberLists || [], function(list, next) {
            if(!list) next();

            var cond = {
                'membership:groupId': group.id,
                'customListIds': group.id + '-' + list.id
            };

            User.count(cond, function(err, count) {
                list.memberCount = count;
                next();
            });
        }, function(err) {
            if(err) throw err;

            //save and forget
            group.save(done);
        });
    };

    /**
     * creates a new group from a blank template
     * 
     * @param  {[params]}   params [group creation parameters]
     * @param  {Function}   done   [continuation function]
     */
    Group.createFromScratch = function (params, done) {
        params.modules = params.modules || [
            { name: 'user', contract: { google: true, local: true }},
            { name: 'admin'},
            { name: 'core'},
            { name: 'stylesheet' },
            { name: 'core-widgets' },
            { name: 'content' }
        ];
        Page.findOne({where: {url: params.url}}, function (err, p) {
            if (p) return done(new Error('Group exists'));
            Group.create(params, function (e, g) {
                if (e) return done(e);
                g.pages.create({
                    url: params.url,
                    title: params.name
                }, function (err, page) {
                    g.homepage = page.toMinimalObject();
                    g.save(function (err, g) {
                        Page.updateGroup(g.id);
                        addAdminUser(g.id, params.url.split('/')[0]);
                        setTimeout(done.bind(null, err, g), 500);
                    });
                });
            });
        });

        function addAdminUser(groupId, host) {
            User.create({
                email: 'admin@' + host,
                username: 'admin-' + host,
                password: 'secr3t',
                membership: [{groupId: groupId, role: 'owner', state: 'approved'}]
            }, function (err, user) {
            });
        }
    };

    /**
     * updates the URL for this group
     * 
     * @param  {[String]} url [new URL]
     */
    Group.prototype.updateUrl = function(url, next) {
        var group = this;
        var oldUrl = group.homepage.url;

        //fix the url
        if(url.indexOf('http') > -1) url = url.substring(url.indexOf('//') + 2);
        if(url.lastIndexOf('/') != url.length) url += '/';
        
        //validate the new url
        Page.all({ where: { url: url }}, function(err, pages) {
            if(pages.length > 0) return next(new Error('Sorry, the URL "' + url + '" is being used by another group.'));

            //get the pages for the group
            Page.all({ where: { groupId: group.id }}, function(err, pages) {
                //loop through each page and update the url for each
                async.forEach(pages, function(page, next) {
                    console.log('replace ' + oldUrl + ' with ' + url + ' for: ' + page.url);

                    page.url = page.url.replace(oldUrl, url);
                    page.url = page.url.replace('//', '/');

                    if (page.url.indexOf('/') == -1) {
                        page.url += '/';
                    } else if (page.url.split('/') > 2 &&
                    page.url.lastIndexOf('/') == page.url.length -1) {
                        page.url = page.url.substring(0, page.url.length -1);
                    }

                    console.log('new url = ' + page.url);

                    page.save(next);
                }), function(err, results) {
                    Page.updateGroup(group.id, function() {
                        return next(err);
                    });
                };
            });
        });
    };

    /**
     * gets a module for this group
     * 
     * @param  {[String]} name [module name]
     * @return {[ModuleInstance]}      [module]
     */
    Group.prototype.getModule = function(name) {
        return _.find(this.modules, function(module) {
            return module && module.name == name;
        });
    };
};

