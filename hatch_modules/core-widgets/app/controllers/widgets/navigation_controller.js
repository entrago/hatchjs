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
load('widgets/common');

var _ = require('underscore');

before(function init() {
    var pages;
    var locals = this;
    var current = this.page;

    switch (this.widget.settings.display) {
        case 'current':
        pages = _.filter(locals.group.pagesCache, function(page) {
            return page.parentId == current.parentId;
        });
        break;
        case 'current+below':
        pages = _.filter(locals.group.pagesCache, function(page) {
            return page.parentId == current.id || page.parentId == current.parentId;
        });
        break;
        case 'below':
        pages = _.filter(locals.group.pagesCache, function(page) {
            return page.parentId == current.id;
        });
        break;
        case 'all':
        default:
        pages = locals.group.pagesCache;
        break;
    }

    // filter out special pages
    pages = _.filter(pages, function(page) {
        return page && [null, '', 'page', 'home'].indexOf(page.type) > -1;
    });

    // reduce the level by that of the lowest level page
    var lowest = _.sortBy(pages, function(page) {
        return -page.level;
    }).pop();

    if (lowest) {
        pages = pages.map(function(page) {
            var page = _.clone(page);
            page.level -= lowest.level;
            return page;
        });
    }

    this.pages = pages;

    next();
});
