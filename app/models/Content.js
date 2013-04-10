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

module.exports = function (compound, Content) {
    var api = compound.hatch.api;
    var User = compound.models.User;
    var Page = compound.models.Page;

    var Group = compound.models.Group;
    var redis = Content.schema.adapter;
    var _ = require('underscore');
    var moment = require('moment');
    var chrono = require('chrono-node');
    var async = require('async');

    Content.validatesPresenceOf('createdAt', 'title', 'text');

    // register the functions which can be called from the REST api
    Content.allowedApiActions = ['like', 'vote', 'doesLike', 'doesDislike'];


    /**
     * gets the popularity score for this content
     * 
     * @return {Number} 
     */
    Content.getter.score = function() {
        return Math.min(Math.floor(((this.likes || []).length + (this.comments || []).length) / 2), 5);
    };

    Content.setter.createdAt = function(value) {
        value = value || '';
        if (value && value.toString().match(/now|immediately/i)) {
            this._createdAt = new Date();
        } else {
            this._createdAt = new Date(value);
            if (isNaN(this._createdAt.valueOf())) {
                this._createdAt = chrono.parseDate(value);
            }
        }
    };

    /**
     * gets the timestamp for this content
     * 
     * @return {[Number]}
     */
    Content.getter.timestamp = function() {
        if  (!this.createdAt || typeof this.createdAt === 'string' || !this.createdAt.getTime) {
            return 0;
        } else {
            return this.createdAt.getTime();
        }
    };

    /**
     * gets the text for the fulltext index
     * 
     * @return {[String]}
     */
    Content.getter.fulltext = function() {
        return [
            this.title,
            this.text,
            JSON.stringify(this.tags)
        ].join(' ');
    };

    /**
     * gets the total likes - total dislikes
     * 
     * @return {[Number]} 
     */
    Content.getter.likesTotal = function() {
        return (this.likes || []).length - (this.dislikes || []).length;
    };

    /**
     * gets the nicely formatted time for this post
     * 
     * @return {[String]} 
     */
    Content.prototype.timeSince = function() {
        var d = moment(this.createdAt);
        return d && d.fromNow() || 'invalid date';
    };

    /**
     * before content is saved, make sure all automatic tag filters are applied
     * 
     * @param  {Function} done [continuation function]
     */
    Content.beforeCreate = Content.beforeSave = function (done) {
        var content = this;

        if (!this.createdAt) {
            this.createdAt = new Date();
        }

        this.updatedAt = new Date();

        //get the group and check all tag filters
        Group.find(content.groupId, function(err, group) {
            if(!group) return done();
            
            var tags = group.getTagsForContent(content);
            if(!content.tags) content.tags = [];

            //add the tags that are not already present
            tags.forEach(function(tag) {
                if(!_.find(content.tags, function(t) { return t.tagId == tag.id; })) {
                    content.tags.push({
                        tagId: tag.id,
                        name: tag.name,
                        createdAt: new Date(),
                        score: 0
                    });
                }
            });

            //generate url
            content.generateUrl(group, done);
        });
    };

    /**
     * creates the url for this content if it is not already set
     * 
     * @param  {[Group]}  group
     * @param  {Function} done  [continuation function]
     */
    Content.prototype.generateUrl = function(group, done) {
        var content = this;

        if (!content.url) {
            var slug = slugify(content.title || (content.createdAt || new Date(0)).getTime().toString());
            content.url = (group.homepage.url + '/' + slug).replace('//', '/');

            //check for duplicate pages and content in parallel
            async.parallel([
                function(callback) {
                    Content.all({where: { url: content.url}}, function(err, posts) {
                        callback(null, posts);
                    });
                },
                function(callback) {
                    Page.all({where: { url: content.url}}, function(err, pages) {
                        callback(null, pages);
                    });
                }
            ], function(err, results) {
                if (results[0].length > 0 || results[1].length > 0) {
                    content.url += '-' + (content.createdAt || new Date(0)).getTime();
                }

                console.log("Content URL set to: " + content.url);

                done();
            })
        }
        else done();

        function slugify(text) {
            text = text.toLowerCase();
            text = text.replace(/[^-a-zA-Z0-9\s]+/ig, '');
            text = text.replace(/-/gi, "_");
            text = text.replace(/\s/gi, "-");
            return text;
        }
    };

    /**
     * votes on an option in the poll
     * 
     * @param  {[Number]} userId   [id of voting user]
     * @param  {[Number]} optionId [id of option to vote for]
     */
    Content.prototype.vote = function(userId, optionId) {
        //first remove any existing vote for this user
        this.poll.options.forEach(function(option) {
            if(option.userIds.indexOf(userId) > -1) {
                option.votes --;
                option.userIds = _.reject(option.userIds, function(id) { return id == userId; });
            }
        });

        //now add the vote
        var option = _.find(this.poll.options, function(option) { return option.id == optionId; });

        option.userIds.push(userId);
        option.votes ++;

        //now recalculate total and all percentages
        this.poll.total = total = _.pluck(this.poll.options, 'votes').reduce(function(a, b) { return a + b; });

        this.poll.options.forEach(function(option) {
            option.percentage = parseInt(100 * option.votes / total);
        });
    };

    /**
     * populates all of the user objects for the specified content list
     * 
     * @param  {[list]}   list     [list of content to populate]
     * @param  {Function} callback [continuation function]
     */
    Content.populateUsers = function(list, callback) {
        var userIds = [];

        //if the list is not a list, make it a list
        if(!list.length && list.id) list = [list];

        list.forEach(function(post) {
            if(userIds.indexOf(post.authorId) == -1) userIds.push(post.authorId);

            (post.likes || []).forEach(function(like) {
                if(userIds.indexOf(like.userId) == -1) userIds.push(like.userId);
            });

            (post.comments || []).forEach(function(comment) {
                if(userIds.indexOf(comment.userId) == -1) userIds.push(comment.userId);
            });
        });

        if(userIds.length == 0) return callback();

        function findUser(users, id) {
            return _.find(users, function(user) { return user.id == id; });
        }

        //load all of the users
        User.all({ where: {id: userIds }}, function(err, users) {
            list.forEach(function(post) {
                post.author = findUser(users, post.authorId);

                (post.likes || []).forEach(function(like) {
                    like.user = findUser(users, like.userId);
                });

                (post.comments || []).forEach(function(comment) {
                    comment.user = findUser(users, comment.userId);
                });
            });

            callback();
        });
    };

    /**
     * gets the default permalink url
     * 
     * @return {[String]} 
     */
    Content.prototype.permalink = function () {
        var sp = api.module.getSpecialPageByContentType(this.type);
        if (!sp) {
            // throw new Error('Content type ' + this.type + ' is not supported');
            console.log('Content type ' + this.type + ' is not supported');
            return '';
        }
        var url = sp.path(this.group, {id: this.id});
        return url;
    };

    /**
     * add content item to newsfeed for all group members and author's followers (and author)
     * 
     * @param  {Function} done [continuation function]
     */
    Content.afterCreate = function (done) {
        return done();

        // 1. send notifications to websockets
        api.socket.send(this.groupId, 'content:created', {
            id: this.id,
            authorId: this.authorId,
            type: this.type,
            tags: this.tags,
            category: this.category
        });

        // 3. populate feeds
        var content = this;
        var userIds = [content.authorId];
        var wait= 1;

        // all users from the group
        if (content.privacy === 'public') {
            wait += 1;
            User.all({where: {'membership:groupId': content.groupId}}, function (err, users) {
                users.forEach(function (u) {
                    if (u.id == content.authorId) return;
                    if (userIds.indexOf(u.id) === -1) {
                        userIds.push(u.id);
                    }
                });
                ok();
            });
        }

        // all followers of author
        if (content.authorId && User.getFollowersOf) {
            wait += 1;
            User.getFollowersOf(content.authorId, function (err, ids) {
                ids.forEach(function (id) {
                    if (userIds.indexOf(id) === -1) {
                        userIds.push(id);
                    }
                });
                ok();
            });
        }

        //calculate replies for this post's parent async
        if(content.replyToId) {
            Content.find(content.replyToId, function(err, parent) {
                if(parent) {
                    parent.recalculateReplies(function() {
                        parent.save();
                    });
                }
            });
        }

        ok();

        function ok() {
            if (--wait === 0) {
                var cmd = [];
                userIds.forEach(function (id) {
                    cmd.push([ 'LPUSH', 'list:UserNewsFeed:' + id, content.id ]);
                    cmd.push([ 'SADD', 'set:UserNewsFeed:' + id, content.id]);
                });
                if (cmd.length) {
                    redis.multi(cmd, function (err) {
                        if (err) console.log(err);
                        done()
                    });
                } else {
                    done();
                }
            }
        }
    };

    /**
     * cleans up anything related to this post after it is deleted
     * 
     * @param  {Function} done [continuation function]
     */
    Content.afterDestroy = function(done) {
        var content = this;

        //calculate replies for this post's parent async
        if(content.replyToId) {
            Content.find(content.replyToId, function(err, parent) {
                if(parent) {
                    parent.recalculateReplies(function() {
                        parent.save();
                    });
                }
            });
        }

        done();
    }

    /**
     * gets the news feed for the specified user
     * 
     * @param  {[params]}   params 
     * @param  {Function}   callback [continuation function]
     */
    User.prototype.feed = function (params, callback) {
        redis.lrange(['list:UserNewsFeed:' + this.id, 0, 100], function (err, ids) {
            if (err) return callback(err);

            var cmd = ids.map(function (id) {
                return [ 'GET', redis.modelName('Content') + ':' + id ];
            });
            if (cmd.length) {
                redis.multi(cmd, function (err, responses) {
                    callback(err, responses.map(function (json) {
                        return new Content(JSON.parse(json));
                    }));
                });
            } else {
                callback(err, []);
            }
        });
    };

    /**
     * registers a page view for this content and saves
     */
    Content.prototype.registerView = function() {
        this.views ++;
        this.save();
    };

    /**
     * works out whether the specified user likes this post
     * 
     * @param  {[User]} user [user to check]
     * @return {[Boolean]}
     */
    Content.prototype.doesLike = function(user) {
        if(!user) return false;
        var id = user.id || user;
        return this.likes.find(function(r) { return r.userId == id });
    };

    /**
     * works out whether the specified user dislikes this post
     * 
     * @param  {[User]} user [user to check]
     * @return {[Boolean]}
     */
    Content.prototype.doesDislike = function(user) {
        if(!user) return false;
        var id = user.id || user;
        return this.dislikes.find(function(r) { return r.userId == id });
    };

    /**
     * calculates the total number of replies to this post
     * 
     * @param  {Function} callback [continuation function]
     */
    Content.prototype.recalculateReplies = function(callback) {
        var content = this;
        Content.all({ where: { replyToId: this.id }}, function(err, posts) {
            content.repliesTotal = posts.length;
            callback();
        });
    };

    Content.prototype.createdAtNice = function() {
        var post = this;
        var diff = new Date() - post.createdAt;
        var oneHour = 1000 * 60 * 60;

        if (diff < oneHour / 2) {
            return moment(post.createdAt).fromNow();
        } else if (diff < oneHour * 12) {
            return moment(post.createdAt).format('ddd [' + 'at' + '] HH:mm');
        } else {
            return moment(post.createdAt).format('ddd DD MMM YYYY');
        }

    };
};

