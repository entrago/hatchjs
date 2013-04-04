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

var crypto = require('crypto');
var mailer = require('nodemailer');
var async = require('async');
var _ = require('underscore');

module.exports = function (compound, User) {
    var api = compound.hatch.api;

    User.validatesPresenceOf('username', {message: 'Please enter a username'});
    User.validatesPresenceOf('email', {message: 'Please enter an email address'});
    User.validatesPresenceOf('password', {message: 'Please enter a password'});
    User.validatesLengthOf('origPassword', {min: 6, allowNull: true});
    User.validatesFormatOf('username', {with: /^[-_\.a-z0-9]+$/i, message: 'Username only can contain latin letters, digits, and -_. characters', allowBlank: true});
    User.validatesFormatOf('email', {with: /^([^@\s]+)@((?:[-a-z0-9]+\.)+[a-z]{2,})$/i, message: 'Invalid email address', allowBlank: true});
    User.validatesUniquenessOf('email', {message: 'This email address is taken'});
    User.validatesUniquenessOf('username', {message: 'This username is taken'});

    User.getter.lastnameLetter = function () { return (this.lastname && this.lastname[0] || '').toLowerCase(); };
    User.getter.displayName = function() { return (this.firstname && this.lastname) ? (this.firstname + ' ' + this.lastname) : this.username; };

    /**
     * gets the text for the fulltext index
     * 
     * @return {[String]}
     */
    User.getter.fulltext = function() {
        return this.firstname + ' ' + this.lastname + ' ' + this.oneLiner;
    };

    /**
     * performs functions before a user is saved to the database
     * - fixes username and email
     * - set the default profile pic
     * - automatically add user to custom user lists with filter set
     * 
     * @param  {Function} done [continuation function]
     */
    User.beforeCreate = User.beforeSave = function (done) {
        // lowercase username and email
        if (this.email) {
            this.email = this.email.toLowerCase();
        }
        if (this.username) {
            this.username = this.username.toLowerCase();
        }

        // set the default profile pic
        if (!this.avatar) {
            this.avatar = '/img/default-profile-pic.png';
        }

        var user = this;
        var Group = compound.models.Group;

        async.forEach(user.membership || [], function(membership, next) {
            // get the group and check all tag filters
            Group.find(membership.groupId, function(err, group) {
                //the group may have been deleted - so check first
                if (!group) {
                    return next();
                }

                var lists = group.getListsForUser(user);

                // add the tags that are not already present
                if (!membership.customListIds) {
                    membership.customListIds = [];
                }

                lists.forEach(function(list) {
                    if (membership.customListIds.indexOf(list.id) == -1) {
                        membership.customListIds.push(list.id);
                    }
                });

                if (lists.length > 0) {
                    group.recalculateMemberListCounts();
                }

                next();
            });
        }, function() {
            done();
        });
    };

    /**
     * notifies this user by either email, top bar notification or both
     * 
     * @param  {[String]}   type   [the name of the notification to send]
     * @param  {[json]}     params [notification parameters]
     * @param  {Function}   cb     [continuation function]
     */
    User.prototype.notify = function notify(type, params, cb) {
        var user = this;
        params = params || {};

        //ignore this email if the user doesn't accept this mail type
        if(!this.canReceiveEmail(type)) {
            console.log(this.username + ' refuses email notification: ' + type);
            return;
        }

        //make sure user is part of the parameters
        if(!params.user) params.user = user;

        //send a notification email and create a notification at the same time
        async.parallel([
            function(done) {
                compound.mailer.send('user/registration', user);
                done();
            },
            function(done) {
                if (compound.hatch.notification.isDefined(type)) {
                    console.log('creating notification entity');
                    compound.hatch.notification.create(type, user, params || [], done);
                }
                else done();
            }
        ], function(err, results) {
            if(cb) cb();
        })
    };

    /**
     * follows the specified user
     * 
     * @param  {[Number]}   id [id of user to follow]
     * @param  {Function}   cb [continuation function]
     */
    User.prototype.followUser = function followUser(id, cb) {
        var u = this;
        var hq = User.schema.adapter;
        var redis = User.schema.adapter.client;

        redis.sadd('l:' + hq.modelName('Follow') + ':' + id, this.id, function (err) {
            if (err) return cb(err);
            u.ifollow = u.ifollow || [];
            u.ifollow.push(id);
            u.save(cb);
        });
    };

    /**
     * unfollows the specified user
     * 
     * @param  {[Number]}   id [id of user to unfollow]
     * @param  {Function}   cb [continuation function]
     */
    User.prototype.unfollowUser = function followUser(id, cb) {
        var u = this;
        var hq = User.schema.adapter;
        var redis = User.schema.adapter.client;

        redis.srem('l:' + hq.modelName('Follow') + ':' + id, this.id, function (err) {
            if (err) return cb(err);
            u.ifollow = u.ifollow || [];
            u.ifollow = _.reject(u.ifollow, function(userId) { return userId == id; });
            u.save(cb);
        });
    };

    /**
     * gets the follows of the specified user
     * 
     * @param  {[Number]}   userId [id of the user to get followers for]
     * @param  {Function}   cb     [continuation function]
     */
    User.getFollowersOf = function getFollowersOf(userId, cb) {
        var hq = User.schema.adapter;
        var redis = User.schema.adapter.client;

        redis.smembers('l:' + hq.modelName('Follow') + ':' + userId, cb);
    };

    /**
     * gets the followers for this user
     * 
     * @param  {Function} cb [continuation function]
     */
    User.prototype.followers = function (cb) {
        var hq = User.schema.adapter;
        var redis = User.schema.adapter.client;

        User.getFollowersOf(this.id, function (err, ids) {
            if (err) return cb(err);
            redis.multi(ids.map(function (id) {
                return ['GET', hq.modelName('User') + ':' + id];
            })).exec(function (err, resp) {
                if (err) return cb(err);
                cb(err, resp.map(function (r) {
                    return new User(JSON.parse(r));
                }));
            });
        });
    };

    /**
     * emits an event which can be subscribed to
     * 
     * @param  {[String]} event [event name]
     * @param  {[type]} a     [description]
     * @param  {[type]} b     [description]
     * @param  {[type]} c     [description]
     */
    User.emit = function (event, a, b, c) {
        console.log('emit', event, 'with', a);
        if (this.events && this.events[event]) {
            console.log('got handler', this.events[event].name);
            this.events[event](a, b, c);
        } else {
            console.log('event', event, 'is not configured');
            console.log(a, b, c);
        }
    };

    /**
     * sets an event handler for this user
     * 
     * @param  {[String]} event   [name of event to subscribe to]
     * @param  {[type]}   handler [event handler function]
     */
    User.on = function (event, handler) {
        if (!this.events) this.events = {};
        this.events[event] = handler;
    };

    /**
     * finds a user if it already exists, otherwise create a new user
     * 
     * @param  {[json]}   data [user data]
     * @param  {Function} done [continuation function]
     */
    User.findOrCreate = function (data, done) {
        var createWith;

        /* LOCAL */
        if (data.provider === 'local') {
            var emaname = data.email.toLowerCase();
            User.findOne({
                where: {
                    email:emaname
                }
            }, function (err, user) {
                if (user) return done(err, user);
                User.findOne({
                    where: {
                        username:emaname
                    }
                }, function (err, user) {
                    if (user) {
                        return done(err, user);
                    }
                    createWith = {
                        username: data.username,
                        email: data.email,
                        password: data.password,
                        type: data.type
                    };
                    create();
                });
            });
        } else {
            User.emit(
                'auth-' + data.provider,
                data.profile,
                function (query, info) {
                    User.findOne({where: query}, function (err, user) {
                        if (user) {
                            if (!user.avatar && info.avatar) {
                                user.avatar = info.avatar;
                                user.save(done.bind(user, err, user));
                            } else {
                                return done(err, user);
                            }
                        } else {
                            if (!info.email) {
                                info.email = 'temp_' + new Date().getTime() + '@temp.com';
                            }
                            if (!info.password) {
                                info.password = 'tempuser';
                            }

                            // register as a temporary user so they have to complete the rest of their profile
                            info.type = 'temporary';

                            createWith = info;
                            create();
                        }
                    });
                }
            );

        }

        function create() {
            if (createWith) {
                console.log('create with name', createWith.username);
                User.createWithUniqueUsername(createWith, done);
            }
        }
    };

    /**
     * creates a user with a unique username - automatically appends 1,2,3,4,5,etc to the end of username 
     * until it finds one which is free
     * 
     * @param  {[json]}   data [user creation data]
     * @param  {Function} done [continuation function]
     * @param  {[type]}   num  [leave this blank]
     */
    User.createWithUniqueUsername = function (data, done, num) {
        var username;
        if (!num) num = 0;
        if (!num) {
            username = data.username;
        } else if (num < 50) {
            username = data.username + num;
        } else {
            username = data.username + Math.random();
        }
        username = username.replace(/[^-_\.a-z0-9A-Z]+/g, '.').toLowerCase();
        User.findOne({
            where: {
                username: username
            }
        }, function (err, u) {
            if (!u) {
                data.username = username;
                data.membership = [];

                User.create(data, done);
            } else {
                User.createWithUniqueUsername(data, done, num + 1);
            }
        });
    };

    /**
     * merges 2 users
     * 
     * @param  {[json]}   data    [first user]
     * @param  {[json]}   newUser [second user]
     * @param  {Function} done    [continuation function]
     */
    User.mergeAccounts = function (data, newUser, done) {
        console.log('merging accounts');
        User.findOne({where: {email: data.email}}, function (err, user) {
            console.log(user ? 'user found' : 'user not found');
            if (user && User.verifyPassword(data.password, user.password)) {
                console.log('user to merge with', user);
                Object.keys(newUser).forEach(function (field) {
                    if (field.match(/Id$/)) {
                        user[field] = user[field] || newUser[field];
                    }
                });
                user.save(function (err, user) {
                    if (newUser.id) {
                        console.log('removing new user');
                        newUser.destroy(done.bind(user, err, user));
                    } else {
                        done(err, user);
                    }
                });
            } else {
                if (user) {
                    newUser.errors = {
                        email:['already taken']
                    };
                    done(new Error('Email already taken'), newUser);
                } else {
                    newUser.email = data.email;
                    newUser.save(done);
                }
            }
        });
    };

    /**
     * Verifies a user's password
     * 
     * @param  {[String]}   password     [password to check]
     * @param  {[String]}   userPassword [password to check against]
     * @return {[Boolean]}  
     */
    User.verifyPassword = function (password, userPassword) {
        if (userPassword === null) return true;

        if (password && calcSha(password) === userPassword || password === userPassword) {
            return true;
        }
        return false;
    };

    User.setter.password = function (pwd) {
        this._password = calcSha(pwd);
    };

    /**
     * validates a user has entered all of the mandatory profile fields for the specified group
     * 
     * @param  {[Group]}   group [group to check profile fields for]
     * @return {[Boolean]}
     */
    User.prototype.validateGroupProfileFields = function(group) {
        var valid = true;
        var user = this;

        group.profileFields().forEach(function(field) {
            if(field.mandatory && !(user.otherFields || [])[field.name]) valid = false;
        });

        return valid;
    };

    /**
     * gets a user who matches the specified invitation code
     * 
     * @param  {[Number]}   groupId        [id of the group]
     * @param  {[String]}   invitationCode [invitation code hash to load invitation for]
     * @param  {Function}   callback       [continuation function]
     */
    User.getByInvitationCode = function(groupId, invitationCode, callback) {
        var cond = {
            'membership:groupId': groupId,
            'membership:invitationCode': invitationCode
        };

        User.all({where: cond}, function(err, users) {
            callback(err, users[0]);
        })
    };

    /**
     * sends a reset password link to this user
     * 
     * @param  {[ActionContext]}   c  [context]
     * @param  {Function}          cb [continuation function]
     */
    User.prototype.resetPassword = function (c, cb) {
        compound.models.ResetPassword.upgrade(this, function (err, rp) {
            this.notify('resetpassword', _.extend({ token: rp.token }, c));
            cb();
        }.bind(this));
    };

    /**
     * Joins the group `group`
     *
     * @param {Group} group - group to join
     * @param {String} code - invitation code
     * @param {Function} cb(err) - callback
    **/
    User.prototype.joinGroup = function joinGroup(group, code, cb) {

        // default status
        var user = this;
        var state = 'pending';
        var requested = true;

        if (!this.membership) {
            this.membership = [];
        }

        // check for existing membership
        var membership = _.find(this.membership, function (membership) {
            return membership.groupId == group.id;
        });

        // group:closed - do not join unless there is an invitation
        if (!membership) {
            // check for the invitation code
            if (code) {
                User.getByInvitationCode(group.id, code, function (err, u) {
                    if (err) {
                        return cb(err);
                    }
                    if (u && u.id != user.id && u.type === 'temporary') {
                        // delete the temp user
                        user.destroy();

                        // transfer the ownership of the invitation
                        state = 'approved';
                        requested = false;
                    }
                });
            }

            // if we weren't able to find an invitation, cancel out
            if (state !== 'approved' && group.joinPermissions === 'closed') {
                return cb();
            }
        }

        // group:free - automatically join
        if (group.joinPermissions === 'free') {
            state = 'approved';
        }

        if (membership) {
            membership.state = state;

            if (membership.state === 'pending') {
                // if there is already an invite - approve
                if (!membership.requested) {
                    state = 'approved';
                } 
                // if there is already a request to join - do nothing
                else {
                    return cb();
                }
            }

            membership.state = state;
            membership.requested = requested;
            membership.joinedAt = new Date();
        } else {
            membership = {
                groupId: group.id,
                role: 'member',
                state: state,
                requested: requested,
                joinedAt: new Date()
            };

            this.membership.push(membership);
        }

        // save and continue
        this.save(cb);
    };

    /**
     * rejects an invitation to join a group
     * 
     * @param  {[ActionContext]}   c  [context]
     * @param  {Function}          cb [continuation function]
     */
    User.prototype.rejectInvitation = function(c, cb) {
        // check for existing membership
        this.membership = _.reject(this.membership, function (membership) {
            return membership.groupId == c.group().id;
        });

        // save and continue
        this.save(cb);
    };

    /**
     * outputs the publicObject representation of this user - automatically removes sensitive information such
     * as email address, password hash etc
     * 
     * @return {[JSON]} JSON representation of user
     */
    User.prototype.toPublicObject = function () {
        var obj = this.toObject();

        delete obj.password;
        delete obj.hasPassword;
        delete obj.emailAddress;
        delete obj.membership;
        delete obj.ifollow;
        delete obj.customListIds;
        delete obj.mailSettings;
        delete obj.fulltext;
        delete obj.type;

        return obj;
    };

    User.prototype.canReceiveEmail = function(type) {
        var setting = (this.mailSettings || {})[type];
        
        if (!setting || setting == 'true') {
            return true;
        } else {
            return setting == true;
        }
    };


    /**
     * checks whether this user has the specified permission
     */
    User.prototype.hasPermission = function(group, permission) {
        var user = this;
        var membership = _.find(this.membership || [], function(membership) {
            return membership.groupId == group.id;
        });

        if(!membership) return false;
        // special case for 'view' permission - only need to be a member
        else if(permission === 'view') return true;

        //owner and editor can do everything
        if(membership.role === 'owner' || membership.role === 'editor') return true;  

        var found = false;
        var parent = (api.permissions.getParent(permission) || {}).name;

        //loop through each custom user list in the group and check for the permission
        _.forEach(group.memberLists || [], function(list) {
            if(user.customListIds && user.customListIds.indexOf(group.id + '-' + list.id) > -1 &&
                api.permissions.match(list.permissions, permission)) found = true;
        });

        return found;
    };



    /**
     * gets the permission for this user within a group
     * 
     * @param  {[Group]} group [group to get permissions for]
     * @return {[list]}        [list of permissions]
     */
    User.prototype.getPermissions = function(group, filter) {
        var user = this;
        var membership = _.find(this.membership || [], function(membership) {
            return membership.groupId == group.id;
        });

        if(!membership) return [];

        //owner and editor can do everything
        if(membership.role === 'owner' || membership.role === 'editor') return ['*'];  

        var permissions = [];

        //loop through each custom user list in the group and check for the permission
        _.forEach(group.memberLists || [], function(list) {
            if(user.customListIds && user.customListIds.indexOf(group.id + '-' + list.id) > -1) {
                _.forEach(list.permissions, function(permission) {
                    if(permissions.indexOf(permission) == -1) {
                        if(!filter || new RegExp(filter).exec(permission)) {
                            permissions.push(permission);
                        }
                    }
                });
            }
        });

        return permissions;
    };


    /**
     * encrypts a password
     * 
     * @param  {[string]} payload [password to encrypyt]
     * @return {[string]}         [encrypted password]
     */
    User.calcSha = function(payload) {
        return calcSha(payload);
    }


    /**
     * calculates a sha1 of the specified string
     * 
     * @param  {[String]} payload
     * @return {[String]}
     */
    function calcSha(payload) {
        if (!payload) return '';
        if (payload.length == 64) return payload;
        return crypto.createHash('sha256').update(payload).update(compound.app.get('passwordSalt') || '').digest('hex');
    }
};
