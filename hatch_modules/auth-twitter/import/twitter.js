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

var ntwitter = require('ntwitter');
var _ = require('underscore');

module.exports = function() {
    return function(stream, callback) {
        //setup the twitter api
        twitter = new ntwitter();

        //run the query
        twitter.search(stream.query, {}, function(err, data) {
            if(err) {
                console.log(err);
                callback(err);
            }

            var posts = [];

            if(data && data.results) {
                data.results.forEach(function(tweet) {
                    var content = {
                        groupId: stream.groupId,
                        url: 'twitter.com/' + tweet.from_user + '/status/' + tweet.id_str,
                        text: tweet.text,
                        createdAt: new Date(tweet.created_at),
                        importData: tweet,
                        type: 'twitter',
                        imported: true,
                        tags: stream.tags
                    };

                    posts.push(content);
                });
            }

            callback(null, posts);
        });
    };
}