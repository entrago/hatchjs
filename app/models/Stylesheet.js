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

var webrequest = require('request');
var async = require('async');
var fs = require("fs");
var less = require("less");
var finder = require('findit');
var _ = require('underscore');
var csso = require('csso');

module.exports = function (compound, Stylesheet) {

    /**
     * compiles the css from this less stylesheet
     *
     * @param  {Context}  c        [http context]
     * @param  {Function} callback [continuation function]
     */
    Stylesheet.prototype.compile = function (c, callback) {
        var stylesheet = this;
        var Group = c.Group;

        var tree, css;
        var path = __dirname + '/../../public' + compound.app.get('cssDirectory') + "theme-template.less";

        fs.readFile(path, 'utf-8', function (err, str) {
            if (err) { return callback(err) }

            var moduleCss = '';

            /*
            //get the module and widget stylesheets
            compound.hatch.module.getModuleInstancesList().forEach(function(instance) {
                var path = instance.module.root;

                //search for stylesheets
                var results = _.filter(finder.sync(path), function(path) { return path.indexOf('.less') > -1 && path.indexOf('node_modules') == -1; });

                results.forEach(function(path) {
                    var css = fs.readFileSync(path);
                    moduleCss += css + '\n';
                });
            });
            */

            //replace the variables, bootswatch and the module Css
            str = str.replace("@import \"theme-template-variables.less\";", stylesheet.less.variables);
            str = str.replace("@import \"theme-template-bootswatch.less\";", stylesheet.less.bootswatch);
            str = str.replace("@import \"theme-template-modules.less\";", moduleCss);

            //add the custom less onto the end
            str += '\n' + stylesheet.less.custom;

            new(less.Parser)({
                paths: [require('path').dirname(path)],
                optimization: 1
            }).parse(str, function (err, tree) {
                if (err) {
                    callback(err);
                } else {
                    try {
                        css = tree.toCSS({
                            compress: true
                        });

                        //css should be a string
                        if(typeof css == "object") css = css[0];

                        //store in the stylesheet
                        stylesheet.css = css;
                        stylesheet.version ++;
                        stylesheet.lastUpdate = new Date();

                        if(stylesheet.groupId) {
                            Group.find(stylesheet.groupId, function (err, group) {
                                var path = compound.app.get('upload path') + '/' + group.cssVersion + '.css';

                                //save the file
                                fs.writeFile(path, css, function (err) {
                                    group.cssUrl = '/upload/' + group.cssVersion + '.css';
                                    group.save(function (err) {
                                        callback(null);
                                    });
                                });
                            });
                        } else {
                            //success - callback!
                            callback(null);
                        }
                    }
                    catch (err) {
                        callback(err);
                    }
                }
            });
        });
    };

    /**
     * sets some custom rules on this stylesheet
     * 
     * @param {[json]} rules [the rules that are being set]
     */
    Stylesheet.prototype.setRules = function(rules) {
        var css = '';

        for(var selector in rules) {
            for(var rule in rules[selector]) {
                var value = rules[selector][rule];

                //exception for font
                if (selector == "@" && rule == "import") {
                    css = selector + rule + " " + value + ";\n" + css;
                }
                //standard rule
                else css += "\n" + selector + " { " + rule + " : " + value + " }";
            }
        }

        this.less.custom += '\n' + css;
    }

    //define the stylesheet cache
    Stylesheet.cache = {};

    /**
     * Set the theme for this stylesheet
     * 
     * @param {ActionContext} c - current action context.
     * @param {String} name - theme to load.
     * @param {Function} callback - continuation function.
     */
    Stylesheet.prototype.setTheme = function (c, name, callback) {
        var group = c.req.group;
        var stylesheet = this;

        //get the cached version
        if (!Stylesheet.cache[name]) {
            //load the template
            var path = __dirname + '/../../public' + compound.app.get('cssDirectory') + "theme-template.less";
            var theme = compound.hatch.themes.getTheme(name);

            console.log(theme)

            //if no theme found, use the default theme settings
            if (!theme) {
                throw new Error('Theme "' + name + '" not defined!');
            }

            console.log('Stylesheet: setting theme: ' + theme.name);

            var variables = "";
            var bootswatch = "";

            //load the theme data and then process the less
            async.parallel([
                function(callback) {
                    webrequest.get({ uri: theme.variables }, function (err, response, body) {
                        variables = body;
                        callback(err, body);
                    });
                },
                function(callback) {
                    webrequest.get({ uri: theme.bootswatch }, function (err, response, body) {
                        bootswatch = body;
                        callback(err, body);
                    });
                }
            ], function(err, results) {
                if(err) throw new Error(err);

                //save to cache
                Stylesheet.cache[name] = {
                    variables: variables,
                    bootswatch: bootswatch
                };

                done();
            });
        }
        else {
            //call the response function
            var theme = Stylesheet.cache[name];

            variables = theme.variables;
            bootswatch = theme.bootswatch;

            done();
        }

        //when everything is done, compile the stylesheet and save
        function done() {
            stylesheet.less = {};
            stylesheet.less.variables = variables;
            stylesheet.less.bootswatch = bootswatch;
            stylesheet.less.custom = '/* put your custom css here */';

            // compile the stylesheet to a file
            stylesheet.compile(c, function(err) {
                if(err) {
                    console.log(err);
                    throw err;
                }

                stylesheet.version ++;
                stylesheet.lastUpdate = new Date();

                stylesheet.save(function(err) {
                    group.cssVersion = stylesheet.version + '-' + new Date().getTime();
                    group.save(function(err) {
                        callback(err, {
                            version: group.cssVersion,
                            url: group.cssUrl
                        });
                    });
                });
            });
        }
    }
};
