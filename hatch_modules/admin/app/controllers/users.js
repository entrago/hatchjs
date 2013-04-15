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

var Application = require('./application');

module.exports = UsersController;

function UsersController(init) {
    Application.call(this, init);
    init.before(function setup(c) {
        this.sectionName = 'users';
        c.next();
    });
    init.before(findMember, {only: 'edit, update, destroy'});
    init.before(loadTags);
}

require('util').inherits(UsersController, Application);

// Load the user tags for this group to display on the left navigation
function loadTags(c) {
    c.Tag.all({ where: { groupIdByType: c.req.group.id + '-User' }}, function (err, tags) {
        delete tags.countBeforeLimit;
        c.locals.tags = tags;
        c.next();
    });
}

// finds a specific member and sets their membership to this group
function findMember(c) {
    var self = this;
    c.User.find(c.req.params.id, function (err, user) {
        self.member = user;
        self.membership = user.getMembership(c.req.group.id);
        c.next();
    });
}

// loads all/specified members based on the current context
function loadMembers(c, next) {
    var cond = { };

    c.locals.filterBy = c.req.params.filterBy || c.req.query.filterBy || c.req.body.filterBy || 'all';

    switch (c.locals.filterBy) {
        case 'members':
            cond.memberGroupId = c.req.group.id;
            break;
        case 'editors':
            cond.editorGroupId = c.req.group.id;
            break;
        case 'pending':
            cond.pendingGroupId = c.req.group.id;
            break;
        case 'all':
            cond.membershipGroupId = c.req.group.id;
            break;
        default:
            cond.tags = c.locals.filterBy;
            break;
    }

    var limit = parseInt(c.req.query.iDisplayLength || 0, 10);
    var offset = parseInt(c.req.query.iDisplayStart || 0, 10);
    var orderBy = c.req.query.iSortCol_0 > 0 ? (['', 'lastname', 'username', c.req.group.id + ':membership:role', c.req.group.id + ':membership:joinedAt', ''][c.req.query.iSortCol_0] + ' ' + c.req.query.sSortDir_0.toUpperCase()) : c.req.group.id + ':membership:joinedAt DESC';
    var search = c.req.query.sSearch || c.req.body.search;

    var query = {
        where: cond, 
        fulltext: search, 
        order: orderBy, 
        offset: offset, 
        limit: limit
    };

    // first get the total count of all members and then run the
    c.User.count({ membershipGroupId: c.req.group.id }, function (err, count) {
        c.User.all(query, function (err, members) {
            setMemberships(members);

            c.locals.members = members;
            c.locals.allMembersCount = count;

            next();
        });
    });

    function setMemberships(members) {
        members.forEach (function (member) {
            member.membership = member.getMembership(c.req.group.id);
        });
    }
};


/**
 * Display the main user list or loads the main user list in JSON format.
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.index = function (c) {
    this.req.session.adminSection = 'community';
    var suffix = 'string' === typeof c.req.params.filterBy ? '-' + c.req.params.filterBy : '';
    this.pageName = 'users' + suffix;

    c.respondTo(function(format) {
        format.html(function() {
            c.locals.filterBy = c.req.params.filterBy || c.req.query.filterBy || c.req.body.filterBy || 'all';
            c.render();
        });
        format.json(function() {
            //load all members and display
            loadMembers(c, function() {
                //json response
                c.send({
                    sEcho: c.req.query.sEcho || 1,
                    iTotalRecords: c.locals.allMembersCount,
                    iTotalDisplayRecords: c.locals.members.countBeforeLimit || 0,
                    aaData: c.locals.members
                });
            });
        }); 
    });
};

/**
 * Return only the IDs for a search query. This is used when a user clicks the
 * 'select all' checkbox so that we can get ALL of the ids of the users rather
 * than just the ids of the users on the current page of results.
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.ids = function ids(c) {
    this.filterBy = c.req.query.filterBy || c.req.params.filterBy;

    c.req.query.limit = 1000000;
    c.req.query.offset = 0;

    loadUsers(c, function(users) {
        c.send({
            ids: _.pluck(users, 'id')
        });
    });
};


/**
 * Remove the specified user from the community.
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.remove = function(c) {
    this.user.removeMembership(c.req.group.id, function (err, user) {
        c.send('ok');
    });
};

/**
 * Remove multiple selected members from the community.
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.removeMembers = function(c) {
    var selectedUsers = c.req.body.selectedUsers || [];

    var count = 0;

    //remove each of the members
    async.forEach(selectedUsers, function(userId, done) {
        //load each user
        c.User.find(userId, function (err, user) {
            user.removeMembership(c.req.group.id, done);   
        }, function() {
            c.send({
                message: count + ' user' + (count != 1 ? 's':'') + ' removed from community',
                status: 'success',
                icon: 'ok'
            });
        });
    });
};

/**
 * Upgrade the selected member to an editor. 
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.upgrade = function(c) {
    this.member.setMembershipRole(c.req.group.id, 'editor', function (err, user) {
        c.send('ok');
    });
};

/**
 * Downgrade the selected editor to a member.
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.downgrade = function(c) {
    this.member.setMembership(c.req.group.id, 'member', function (err, user) {
        c.send('ok');
    });
};

/**
 * Accept the selected pending member's join request.
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.accept = function(c) {
    this.member.setMembershipStatus(c.req.group.id, 'accepted', function (err, user) {
        c.send('ok');
    });
};

/**
 * Resend an invitation to the selected member.
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.resendInvite = function(c) {
    var membership = this.member.getMembership(c.req.group.id);
    this.member.notify('invite', _.extend({ invitationCode: membership.invitationCode }, c));
    c.send('ok');
};

/**
 * Redirect to the send message form for the selected members (or entire community).
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.sendMessageTo = function(c) {
    //set the selectedUsers in the session so that it can be used after the redirect
    c.req.session.selectedUsers = c.req.body.selectedUsers || [];

    c.send({
        redirect: c.pathTo.sendMessage()
    });
};

/**
 * Show the send message form for the selected members (or entire community).
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.sendMessageForm = function(c) {
    c.locals.selectedUsers = c.req.session.selectedUsers || [];
    delete c.req.session.selectedUsers;
    c.render();
};

/**
 * Send a message to selected members.
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.sendMessage = function(c) {
    var selectedUsers = JSON.parse(c.req.body.selectedUsers || '["all"]');
    var subject = c.req.body.subject;
    var body = c.req.body.body;

    //validation
    if (!subject || !body) {
        c.send({
            message: 'Please enter a subject and message',
            status: 'error',
            icon: 'warning-sign'
        });

        return;
    }

    function sendMessages() {
        console.log('sending messages to ' + selectedUsers.length + ' users');

        //sends message to each selected user
        async.forEach(selectedUsers, function(userId, callback) {
            //load each user
            C.User.find(userId, function (err, user) {
                //send the message via email
                user.notify('message', { subject: subject, message: body });

                callback();
            });
        }, function() {
            c.send({
                message: 'Message sent to ' + selectedUsers.length + ' users',
                status: 'success',
                icon: 'ok'
            });
        });
    }
};

//shows the invite form
UsersController.prototype.inviteForm = function(c) {
    c.render();
};

//sends invites
UsersController.prototype.sendInvites = function(c) {
    var subject = c.req.body.subject;
    var body = c.req.body.body;

    //validation
    if(!c.req.body.usernames) {
        return c.send({
            message: 'Please enter some usernames or emails',
            status: 'error',
            icon: 'warning-sign'
        });
    }
    if(!subject || !body) {
        return c.send({
            message: 'Please enter a subject and message',
            status: 'error',
            icon: 'warning-sign'
        });
    }

    async.forEach(c.body.usernames, function(username, next) {
        var data = {
            provider: 'local',
            type: 'temporary',
            username: username,
            email: username,
            password: 'temporary'
        };

        var invitationCode = randomstring.generate(8);

        //find or create each user from scratch
        User.findOrCreate(data, function(err, user) {
            //add to the community
            var membership = _.find(user.membership, function(m) {
                return m.groupId == group.id;
            });

            //if there is an existing membership, approve it
            if(membership && membership.state == 'requested') {
                membership.state = 'approved';

                //TODO: send an approval email to the new member

            }
            //otherwise, create a request
            else if(!membership) {
                membership = {
                    groupId: group.id,
                    role: 'member',
                    state: 'pending',
                    requested: false,
                    invitationCode: invitationCode,
                    joinedAt: new Date()
                };

                //save the user and don't wait for a response
                user.membership.push(membership);
                user.save(function() {
                    //send the invite email
                    user.notify('invite', _.extend({ invitationCode: invitationCode }, c));
                });
            }

            next();
        });
    }, done);

    function done() {
        c.send({
            message: 'Invites sent to ' + c.body.usernames.length + ' users',
            status: 'success',
            icon: 'ok'
        });
    }
};

//shows the profile fields form
exports.profileFields = function(c) {
    c.locals.profileFields = c.req.group.profileFields();
    c.render('community/profilefields');
};

//edits a profile field
exports.editProfileField = function(c) {
    var field = _.find(c.group().profileFields() || [], function(field) {
        return field.id == c.params.id;
    });

    if(!field) field = {};

    c.locals.field = field;
    c.render('community/editprofilefield');
};

//saves a profile field to the database
exports.saveProfileField = function(c) {
    var group = c.group();
    var field = c.req.body;

    //field name
    c.req.body.name = c.req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    //validation
    if(!c.req.body.name) {
        return c.send({
            message: 'Please enter a field name',
            status: 'error',
            icon: 'warning-sign'
        });
    }

    if(!group.customProfileFields) group.customProfileFields = [];

    if(field.id) group.customProfileFields[field.id] = field;
    else {
        field.id = group.customProfileFields.length;
        field.order = group.customProfileFields.length;
        group.customProfileFields.push(field);
    }

    group.save(function() {
        c.send({
            message: 'Profile field saved',
            status: 'success',
            icon: 'ok'
        });
    });
};

//re-orders the profile fields
exports.reorderProfileFields = function(c) {
    var group = c.group();
    var order = 0;
    c.body.ids.forEach(function(id) {
        group.customProfileFields[id].order = order++;
    });

    group.save(function() {
        c.send({
            message: 'Profile fields order saved',
            status: 'success',
            icon: 'ok'
        })
    });
}

//deletes a profile field
exports.deleteProfileField = function(c) {
    var group = c.group();
    delete group.customProfileFields[c.params.id];

    group.save(function() {
        c.send('ok');
    });
};

//shows the profile fields form
exports.exportForm = function(c) {
    c.render('community/exportform');
};

//exports members
exports.export = function(c) {
    var format = c.req.query.format;

    loadMembers(c, function() {
        var members = c.locals.members;
        var outputMembers = [];

        //sanitize
        members.forEach(function(member) {
            var obj = member.toPublicObject();
            
            //fix null values
            Object.keys(obj).forEach(function(key) {
                if(obj[key] === null) obj[key] = '';
                else obj[key] = obj[key].toString();
            });

            //fix other fields
            if(typeof obj.otherFields === 'object') {
                Object.keys(obj.otherFields || {}).forEach(function(key) {
                    obj[key] = obj.otherFields[key];
                });
                delete obj.otherFields;
            }

            outputMembers.push(obj);
        });

        switch(format) {
            case 'csv':
                csv().from.array(outputMembers).to.string(function(data, count) { 
                    var headers = Object.keys(outputMembers[0] || {}).join(',');

                    c.res.setHeader('Content-disposition', 'attachment; filename=exportdata.csv');
                    c.res.setHeader('Content-Type', 'text/csv');
                    c.send(headers + '\n' + data);
                });
                break;
            case 'json':
            default:
                c.res.setHeader('Content-disposition', 'attachment; filename=exportdata.json');
                c.res.setHeader('Content-Type', 'text/json');
                c.send(members);
                break;
        }
    });
};

//shows the community user import screen
exports.importForm = function(c) {
    c.render('community/import');
};

//imports user data from a csv file
exports.importData = function(c) {
    var User = c.model('User');
    var group = c.req.group;
    var filename = path.join(c.api.app.config.paths.upload, c.req.query.url.split('/').pop());
    var header = null;

    //load the csv file and loop through each row
    csv().from.stream(fs.createReadStream(filename)).transform(function(data) {
        if(!header) {
            header = data;
        } else {
            //map data to a user
            var user = {
                membership: [{
                    groupId: group.id,
                    role: 'member',
                    joinedAt: new Date(),
                    state: 'approved'
                }],
                password: '_import_',
                otherFields: {}
            };

            //populate all of the fields
            for(var i=0; i<header.length; i++) {
                var key = header[i].replace(/^\s+/, '').replace(/\s+$/, '');
                var val = data[i].replace(/^\s+/, '').replace(/\s+$/, '');

                if(key == 'joinedAt') {
                    user.membership[0].joinedAt = new Date(val);
                } else if(key.indexOf('otherFields.') > -1) {
                    user.otherFields[key.replace('otherFields.', '')] = val;
                } else if(key == 'otherFields') {
                    try {
                        if(typeof val == 'string') val = JSON.parse(val);
                        user[key] = val;
                    } catch(ex) {
                        console.log(ex);
                    }
                } else {
                    user[key] = val;
                }
            }

            //don't upload users without a username
            if(!user.username) {
                return;
            }

            //don't error on blank email addresses
            if(!user.email) {
                user.email = 'import-' + (new Date().getTime()) + '@hatchjs.com';
            }

            //sanitize username
            user.username = slugify(user.username);

            //check for an existing user
            User.all({ where: { username: user.username }}, function(err, users) {
                if(users[0]) {
                    //don't update passwords or memberships
                    delete user.password;
                    delete user.membership;

                    users[0].updateAttributes(user, function() { });

                    console.log(JSON.stringify(users[0]));
                } else {
                    if(!user.avatar) user.avatar = '/img/default-profile-pic.png';
                    User.create(user, function(err, user) {
                        if(err) console.log(user.errors);
                    });            
                }
            });
        }

        //save the group to register the extra users
        group.recalculateMemberListCounts();
    });

    //send a response
    c.send('ok');

    function slugify(text) {
        text = text.toLowerCase();
        text = text.replace(/[^-a-zA-Z0-9\s]+/ig, '');
        text = text.replace(/-/gi, "_");
        text = text.replace(/\s/gi, "-");
        return text;
    }
};