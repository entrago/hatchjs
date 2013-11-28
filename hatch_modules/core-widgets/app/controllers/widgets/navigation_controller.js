//
// Hatch.js is a CMS and social website building framework built in Node.js
// Copyright (C) 2013 Inventures Software Ltd
//
// This file is part of Hatch.js
//
// Hatch.js is free software: you can redistribute it and/or modify it under the terms of the
// GNU Affero General Public License as published by the Free Software Foundation, version 3
//
// Hatch.js is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
// without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
//
// See the GNU Affero General Public License for more details. You should have received a copy of the GNU
// General Public License along with Hatch.js. If not, see <http://www.gnu.org/licenses/>.
//
// Authors: Marcus Greenwood, Anatoliy Chakkaev and others
//
load('widgets/common');

before(function init() {
    var pages;
    var locals = this;
    var current = this.page;

    var pagesCache = locals.group.pagesCache || [];
    var special = [null, '', 'page', 'home'];

    switch (this.widget.settings.display) {
        case 'current':
            pages = pagesCache.filter(function (page) {
                return page.parentId === current.parentId;
            });

            break;

        case 'current+below':
            pages = pagesCache.filter(function (page) {
                return page.parentId === current.id || page.parentId === current.parentId;
            });

            break;

        case 'below':
            pages = pagesCache.filter(function (page) {
                return page.parentId === current.id;
            });

            break;

        case 'all':
        default:
            pages = pagesCache;
            break;
    }

    // filter out special pages
    pages = pages.filter(function(page) {
        return page && special.indexOf(page.type) !== -1;
    });

    // reduce the level by that of the lowest level page
    var lowest = pages[0] && pages[0].level;

    for (var i = 1, len = pages.length; i < len; i++) {
        if (pages[i].level < lowest.level) {
            lowest = pages[i];
        }
    }

    if (lowest) {
        pages = pages.map(function(page) {
            // Create a shallow copy of the page.
            var cloned = {};

            Object.keys(page).forEach(function (key) {
                cloned[key] = page[key];
            })

            cloned.level -= lowest.level;

            return cloned;
        });
    }

    this.pages = pages;

    next();
});
