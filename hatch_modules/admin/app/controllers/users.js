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
var _ = require('underscore');
var async = require('async');

module.exports = UsersController;

function UsersController(init) {
    Application.call(this, init);
    init.before(function setup(c) {
        this.sectionName = 'users';
        c.next();
    });
    init.before(findMember, {only: 'edit, update, destroy, resendInvite, accept, remove, upgrade, downgrade, resendInvite'});
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
        case 'member':
            cond.memberGroupId = c.req.group.id;
            break;
        case 'editor':
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

    var colNames = ['', 'username', 'tagNames', '', '', ''];

    var limit = parseInt(c.req.query.iDisplayLength || c.req.query.limit || 10, 10);
    var offset = parseInt(c.req.query.iDisplayStart || c.req.query.offset || 0, 10);
    var orderBy = c.req.query.iSortCol_0 > 0 ? (colNames[c.req.query.iSortCol_0] + ' ' + c.req.query.sSortDir_0.toUpperCase()) : 'username';
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

            next(err, members);
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

    loadMembers(c, function(err, users) {
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
    this.member.removeMembership(c.req.group.id, function (err, user) {
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
    c.req.session.selectedUsers = c.req.body.ids || [];

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
    var selectedUsers = JSON.parse(c.req.body.selectedUsers);
    var subject = c.req.body.subject;
    var body = c.req.body.body;

    // validation
    if (!subject || !body) {
        return c.send({
            message: 'Please enter a subject and message',
            status: 'error',
            icon: 'warning-sign'
        });
    }

    // are we sending to ALL users or a selected subset?
    if (selectedUsers.length === 0) {
        c.User.all({ where: { membershipGroupId: c.req.group.id }}, function (err, users) {
            selectedUsers = _.pluck(users, 'id');
            send();
        });
    } else {
        send();
    }

    function send() {
        //sends message to each selected user
        async.forEach(selectedUsers, function(userId, done) {
            //load each user
            c.User.find(userId, function (err, user) {
                //send the message via email
                user.notify('message', { subject: subject, message: body });

                done();
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

/**
 * Show the invite form.
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.inviteForm = function(c) {
    c.render();
};

/**
 * Send invitations to the specified usernames/email addresses.
 * 
 * @param  {HttpContext} c - http context
 */
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

    // loop through each username and wait for completion
    async.forEach(c.body.usernames, function(username, next) {
        // find or create each user from scratch
        var data = {
            type: 'temporary',
            username: username.split('@')[0],
            email: username,
            password: 'temporary'
        };

        var provider = {
            name: 'local',
            idFields: ['username']
        };

        c.User.findOrCreate(provider, data, function(err, user) {
            if (err) {
                next(err);
            }
            user.invite(c.req.group.id, subject, body, next);
        });
    }, done);

    function done(err) {
        c.send({
            message: 'Invites sent to ' + c.body.usernames.length + ' users',
            status: 'success',
            icon: 'ok'
        });
    }
};

/**
 * Show the custom profile fields form.
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.profileFields = function(c) {
    c.locals.profileFields = c.req.group.customProfileFields;
    c.render();
};

/**
 * Show the edit form for the specified custom profile field.
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.newProfileField = UsersController.prototype.editProfileField = function(c) {
    var field = c.req.group.customProfileFields.find(c.req.params.id, 'id');
    if(!field) field = {};

    c.locals.field = field;
    c.render('editProfileField');
};

/**
 * Save a custom profile field to the current group.
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.saveProfileField = function(c) {
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

    c.req.group.saveCustomProfileField(c.req.body, function (err, group) {
        c.send({
            message: 'Profile field saved',
            status: 'success',
            icon: 'ok'
        });
    });
};

/**
 * Re-order the custom profile fields within this group.
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.reorderProfileFields = function(c) {
    var order = 0;
    c.body.ids.forEach(function(id) {
        c.req.group.customProfileFields.find(id, 'id').order = order++;
    });

    c.req.group.save(function() {
        c.send({
            message: 'Profile fields order saved',
            status: 'success',
            icon: 'ok'
        })
    });
}

/**
 * Delete a custom profile field.
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.deleteProfileField = function(c) {
    c.req.group.removeCustomProfileField(c.req.params.id, function (err, group) {
        c.send('ok');
    });
};

/**
 * Show the data export form.
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.exportForm = function(c) {
    c.render();
};

/**
 * Export the entire member list as JSON or CSV.
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.export = function(c) {
    var filename = 'users-' + (new Date().getTime()) + '.' + c.req.body.format;

    c.req.query.limit = 1000000;
    c.req.query.offset = 0;

    loadMembers(c, function(err, users) {
        c.compound.hatch.exportData.export(c, users, filename);
    });
};

