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

module.exports = ThemesAPI;

var _ = require('underscore');
var themes = [];
var defaultTheme = null;

//default to bootswatch.com
var defaults = {
    "title": "[default]",
    "thumbnail" : "http://bootswatch.com/[default]/thumbnail.png",
    "variables" : "http://bootswatch.com/[default]/variables.less",
    "bootswatch" : "http://bootswatch.com/[default]/bootswatch.less"
};

/**
 * register ThemesAPI
 */
function ThemesAPI(hatch) {
    this.hatch = hatch;
};

/**
 * registers the theme defaults
 * 
 * @param  {[type]} newDefaults [description]
 * @return {[type]}             [description]
 */
ThemesAPI.prototype.registerDefaults = function(newDefaults) {
    defaults = newDefaults;
};

/**
 * registers a new theme
 * 
 * @param  {[json]} theme [theme to register]
 */
ThemesAPI.prototype.registerTheme = function(theme) {
    //register default properties
    ['variables', 'bootswatch', 'thumbnail', 'title'].forEach(function(prop) {
        if(!theme[prop]) theme[prop] = defaults[prop].replace('[default]', theme.name);
    });
    
    //add the theme to the list
    themes.push(theme);
};

ThemesAPI.prototype.registerDefaultTheme = function(name) {
    defaultTheme = name;
};

/**
 * gets all of the themes
 * @return {[json]} [all themes]
 */
ThemesAPI.prototype.getThemes = function() {
    return themes;
};

/**
 * gets a theme by its name
 * 
 * @param  {[string]} name [name of the theme]
 * @return {[json]}        [theme]
 */
ThemesAPI.prototype.getTheme = function(name) {
    //should we use the default theme
    if (!name || name === 'default') {
        name = defaultTheme;
    }

    var theme = _.find(themes, function(theme) { return theme.name == name; });
    return theme;
};
