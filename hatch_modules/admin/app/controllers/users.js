
var Application = require('./application');

module.exports = UsersController;

function UsersController(init) {
    Application.call(this, init);
    init.before(function setup(c) {
        this.sectionName = 'community';
        c.next();
    });
    init.before(findMember, {only: 'edit, update, destroy'});
}

require('util').inherits(UsersController, Application);

//finds a specific member and sets their membership to this group
function findMember(c) {
    var self = this;
    var User = c.model('User');
    User.find(c.req.params.id, function (err, user) {
        self.member = user;
        self.member.membership.forEach(function (m, index) {
            if (m && m.groupId == c.req.group.id) {
                self.membership = m;
                c.membershipId = index;
            }
        });
        c.next();
    });
}

//loads all/specified members based on the current context
function loadMembers(c, next) {
    var User = c.model('User');

    var cond = {
        'membership:groupId': c.req.group.id
    };
    c.locals.filter = c.req.params.filterby || c.req.query.filter || c.req.body.filter || 'all';

    switch (c.locals.filter) {
        case 'members':
            cond['membership:state'] = 'approved';
            cond['membership:role'] = 'member';
            break;
        case 'editors':
            cond['membership:state'] = 'approved';
            cond['membership:role'] = 'editor';
            break;
        case 'pending':
            cond['membership:state'] = 'pending';
            break;
        default:
            var listId = parseInt(c.locals.filter);
            c.locals.listId = listId;
            if(!isNaN(listId)) {
                cond['customListIds'] = c.req.group.id + '-' + listId;
            }
    }

    var limit = parseInt(c.req.query.iDisplayLength || 0, 10);
    var offset = parseInt(c.req.query.iDisplayStart || 0, 10);
    var orderBy = c.req.query.iSortCol_0 > 0 ? (['', 'lastname', 'username', c.req.group.id + ':membership:role', c.req.group.id + ':membership:joinedAt', ''][c.req.query.iSortCol_0] + ' ' + c.req.query.sSortDir_0.toUpperCase()) : c.req.group.id + ':membership:joinedAt DESC';
    var search = c.req.query.sSearch || c.req.body.search;

    User.count({'membership:groupId': c.req.group.id}, function (err, count) {
        //redis full-text search
        if(search) {
            User.all({where: cond, fulltext: search, order: orderBy, offset: offset, limit: limit}, function (err, members) {
                setMemberships(members);

                c.locals.members = members;
                c.locals.allMembersCount = count;

                next();
            });
        }
        //no filter, standard query
        else {
            User.all({where: cond, order: orderBy, limit: limit, offset: offset}, function (err, members) {
                setMemberships(members);

                c.locals.members = members;
                c.locals.allMembersCount = count;

                next();
            });
        }
    });

    //sets the memberships details
    function setMemberships(members) {
        if (members) {
            members.forEach(function (m) {
                m.membership.forEach(function (ms) {
                    if (ms && ms.groupId == c.req.group.id) {
                        //nicely format the join date
                        ms.joinedAt = moment(ms.joinedAt).fromNow();

                        //set the applicable membership
                        m.membership = ms;
                    }
                });

                //a pending/requested member is only ever a member
                if (m.membership.state === 'pending' || m.membership.state === 'requested') {
                    if(m.membership.requested) m.membership.role = 'requested';
                    else m.membership.role = 'pending';
                }

                //localise
                m.membership.roleName = c.__(m.membership.role);
            });
        }
    }
};


/**
 * Display the main user list.
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.index = function (c) {
    this.req.session.adminSection = 'community';
    var c = this;
    var q = c.req.query;

    if (c.req.params.format === 'json') {
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
    }
    //standard response - does not need to load the users. They are loaded after page-load with AJAX/JSON
    else {
        c.locals.filter = c.req.params.filterby || c.req.query.filter || c.req.body.filter || 'all';
        c.locals.listId = isNaN(c.locals.filter) ? null : c.locals.filter;
        c.render('community/index');
    }
};


/**
 * Remove the specified user from the community.
 * 
 * @param  {HttpContext} c - http context
 */
UsersController.prototype.remove = function(c) {
    var User = c.model('User');
    User.find(c.params.id, function (err, user) {
        //remove this user's membership for this group
        if(c.params.listId) {
            user.customListIds = _.reject(user.customListIds, function(id) {
                return id == c.req.group.id + '-' + c.params.listId;
            });
        }
        else {
            user.membership = _.reject(user.membership, function(membership) {
                return membership.groupId == c.req.group.id;
            });
        }

        //save the user to the database
        user.save(function() {
            recalcMemberLists(c);

            c.send({ action: "remove", id: user.id });
        });
    });
};

//removes multiple members from the community
exports.removeMembers = function(c) {
    var User = c.model('User');

    var selectedUsers = c.req.body.selectedUsers || [];
    var unselectedUsers = c.req.body.unselectedUsers || [];
    var listId = c.req.body.filter || c.params.listId;

    //generate the list of users to remove
    if(selectedUsers.indexOf("all") > -1) {
        //inverse the list
        selectedUsers = [];

        //load all of the selected users based on the filter
        var filter = c.req.body.filter;

        //load all of the users based on the filter
        loadMembers(c, function() {
            //add all of the users that are NOT in the unselectedUsers list to the selectedUsers list
            c.locals.members.forEach(function(user) {
                if(unselectedUsers.indexOf(user.id.toString()) == -1) selectedUsers.push(user.id);
            });

            //now we have our final list, remove the users
            removeUsers();
        });
    }
    //just remove the selected users
    else removeUsers();

    //function to remove an array of users from the community
    function removeUsers() {
        var count = 0;

        //remove each of the members
        async.forEach(selectedUsers, function(userId, callback) {

            //load each user
            User.find(userId, function (err, user) {
                if(listId != null) {
                    user.customListIds = _.reject(user.customListIds, function(id) {
                        return id == c.req.group.id + '-' + listId;
                    });

                    count++;
                }
                else {
                    //remove this user's membership for this group
                    user.membership = _.reject(user.membership, function(membership) {
                        if(membership.groupId == c.req.group.id) {
                            //if this user in the owner, skip over
                            if(membership.role == 'owner' && isNaN(listId)) return false;
                            else {
                                count ++;
                                return true;
                            }
                        }
                    });
                }

                //save the user to the database
                user.save(function() {
                    callback();
                });
            });
        }, function() {
            recalcMemberLists(c);

            c.send({
                message: count + ' user' + (count != 1 ? 's':'') + ' removed from ' + (isNaN(listId) ? 'community':'list'),
                status: 'success',
                icon: 'ok'
            });
        });
    }
}

//upgrades a member to an editor
exports.upgrade = function(c) {
    var User = c.model('User');
    User.find(c.params.id, function (err, user) {
        //find this user's membership for this group
        var membership = _.find(user.membership, function(membership) {
            return membership.groupId == c.req.group.id;
        });

        membership.role = "editor";

        //save the user to the database
        user.save(function() {
            //TODO: send an email notification to the newly appointed editor

            c.send({ action: "upgrade", id: user.id });
        });
    });
};

//upgrades a member to an editor
exports.downgrade = function(c) {
    var User = c.model('User');
    User.find(c.params.id, function (err, user) {
        //find this user's membership for this group
        var membership = _.find(user.membership, function(membership) {
            return membership.groupId == c.req.group.id;
        });

        membership.role = "member";

        //save the user to the database
        user.save(function() {
            c.send({ action: "upgrade", id: user.id });
        });
    });
};


//accepts a requested user
exports.accept = function(c) {
    var User = c.model('User');
    User.find(c.params.id, function (err, user) {
        //find this user's membership for this group
        var membership = _.find(user.membership, function(membership) {
            return membership.groupId == c.req.group.id;
        });

        membership.state = "approved";

        //save the user to the database
        user.save(function() {
            c.send({ action: "approved", id: user.id });
        });
    });
};

//accepts a requested user
exports.resendInvite = function(c) {
    var User = c.model('User');
    User.find(c.params.id, function (err, user) {
        //find this user's membership for this group
        var membership = _.find(user.membership, function(membership) {
            return membership.groupId == c.req.group.id;
        });

        //resend invite email notification
        user.notify('invite', _.extend({ invitationCode: membership.invitationCode }, c));

        //update the date joined
        membership.joinedAt = new Date;

        //save the user to the database
        user.save(function() {
            c.send({ action: "resendinvite", id: user.id });
        });
    });
};

//shows the member lists
exports.memberLists = function(c) {
    //TODO: preload the first X users for each list so that we can show avatars

    c.render('community/memberlists');
};

//deletes a member list
exports.deleteMemberList = function(c) {
    var group = c.group();
    delete group.memberLists[c.params.id];
    group.save(function() { c.redirect(c.pathTo.memberLists()); })

    //TODO: delete all of the user membership labels associated with this list
};

//edits a member list
exports.editMemberList = function(c) {
    c.locals.defaultFilter = 'filter = function(user) {\n\treturn false; //add your filter criteria here\n};';
    c.locals.list = _.find(c.group().memberLists || [], function(list) {
        return list && list.id == c.params.id;
    });
    c.locals.permissions = c.api.permissions;

    c.locals.renderPermissions = function(permission) {
        var list = c.locals.list || {};
        var html = '<li><label class="checkbox"><input type="checkbox" name="permission-' + permission.name + '" ' + (list && list.permissions && list.permissions.indexOf(permission.name) > -1 ? 'checked="checked"':'') + ' /> ' + permission.title + '</label>';

        if((permission.permissions || []).length > 0) {
            html += '<ul class="">';
            permission.permissions.forEach(function(permission) {
                html += c.locals.renderPermissions(permission);
            });
            html += '</ul>';
        }
        
        html += '</li>';
        return html;
    };

    c.render('community/editlist');
};

//shows how many users match this filter
exports.memberListFilterCount = function(c) {
    var group = c.group();
    var list = group.memberLists[c.params.id];
    if(!list) list = {};

    if(c.body.filter) list.filter = c.body.filter;

    //count the number of users matched
    group.getListFilterResults(list, function(users) {
        c.send(users.length.toString());
    });
};

//updates a member list
exports.updateMemberList = function(c) {
    var group = c.group();

    //validation
    if(!c.req.body.title) {
        return c.send({
            message: 'Please enter a list title',
            status: 'error',
            icon: 'warning-sign'
        });
    }

    var list = _.find(group.memberLists || [], function(list) {
        return list && list.id.toString() === c.req.body.id.toString();
    });

    if(!list) {
        if(!group.memberLists) group.memberLists = [];
        list = { id: group.memberLists.length, memberCount: 0 };

        group.memberLists.push(list);
    }

    //update list attributes
    list.title = c.req.body.title;
    list.description = c.req.body.description;
    list.filter = c.body.filterEnabled ? c.body.filter : null;
    list.permissions = [];

    Object.keys(c.req.body).forEach(function(key) {
        if(key.indexOf('permission-') == 0) {
            list.permissions.push(key.substring(key.indexOf('-') +1));
        }
    });

    //save the group
    group.save(function() {
        //add the existing users async
        if(c.body.filterExisting) {
            var listId = group.id + '-' + list.id;

            group.getListFilterResults(list, function(users) {
                async.forEach(users, function(user, next) {
                    //get the membership
                    if(!user.customListIds) user.customListIds = [];

                    if(user.customListIds.indexOf(listId) == -1) {
                        user.customListIds.push(listId);
                        user.save(next);
                    }
                    else {
                        next();
                    }
                }, function() {
                    //recalc membership list counts
                    recalcMemberLists(c);
                });
            });
        }

        c.send({
            message: 'Member list saved',
            status: 'success',
            icon: 'ok'
        });
    });
};

//adds a set of users to the specified member list
exports.addToMemberList = function(c) {
    var User = c.model('User');

    var listId = c.req.group.id + '-' + c.params.id;
    var count = 0;
    var selectedUsers = c.req.body.selectedUsers || [];
    var unselectedUsers = c.req.body.unselectedUsers || [];

    //generate the list of users to remove
    if(selectedUsers.indexOf("all") > -1) {
        //inverse the list
        selectedUsers = [];

        //load all of the selected users based on the filter
        var filter = c.req.body.filter;

        //load all of the users based on the filter
        loadMembers(c, function() {
            //add all of the users that are NOT in the unselectedUsers list to the selectedUsers list
            c.locals.members.forEach(function(user) {
                if(unselectedUsers.indexOf(user.id.toString()) == -1) selectedUsers.push(user.id);
            });

            //now we have our final list, remove the users
            setMemberships();
        });
    }
    else setMemberships();

    //sets the memberships for each user
    function setMemberships() {
        async.forEach(selectedUsers, function(id, next) {
            User.find(id, function(err, user) {
                if(!user.customListIds) user.customListIds = [];

                if(user.customListIds.indexOf(listId) == -1) {
                    count++;
                    user.customListIds.push(listId);
                    user.save(next);
                }
                else {
                    next();
                }
            });
        }, done);
    }

    //saves the custom user list count and returns
    function done() {
        var group = c.group();
        var list = _.find(group.memberLists, function(list) {
            return list && list.id == listId;
        });

        //save the group
        group.recalculateMemberListCounts(function() {
            c.send({
                message: count + ' users added to list',
                status: 'success',
                icon: 'ok'
            });
        });
    }
};

//shows the send message form with the specified users
exports.sendMessageTo = function(c) {
    var selectedUsers = c.req.body.selectedUsers || [];
    var unselectedUsers = c.req.body.unselectedUsers || [];

    //generate the list of users to remove
    if(selectedUsers.indexOf("all") > -1) {
        //inverse the list
        selectedUsers = [];

        //load all of the selected users based on the filter
        var filter = c.req.body.filter;

        //load all of the users based on the filter
        loadMembers(c, function() {
            //add all of the users that are NOT in the unselectedUsers list to the selectedUsers list
            c.locals.members.forEach(function(user) {
                if(unselectedUsers.indexOf(user.id.toString()) == -1) selectedUsers.push(user.id);
            });

            //now we have our final list, remove the users
            doRedirect();
        });
    }
    //just remove the selected users
    else doRedirect();

    function doRedirect() {
        //set the selectedUsers in the session so that it can be used after the redirect
        c.req.session.selectedUsers = selectedUsers;

        c.send({
            redirect: c.pathTo.sendMessage()
        });
    }
}

//show the send message form
exports.sendMessageForm = function(c) {
    c.locals.selectedUsers = c.req.session.selectedUsers || [];
    delete c.req.session.selectedUsers;
    c.render('community/sendmessage');
}

//sends a message
exports.sendMessage = function(c) {
    var User = c.model('User');
    var selectedUsers = JSON.parse(c.req.body.selectedUsers || '["all"]');
    var subject = c.req.body.subject;
    var body = c.req.body.body;

    //validation
    if(!subject || !body) {
        c.send({
            message: 'Please enter a subject and message',
            status: 'error',
            icon: 'warning-sign'
        });

        return;
    }

    //if we are sending to all, load the list of users from the database
    if(selectedUsers.indexOf("all") > -1 || selectedUsers.length == 0) {
        selectedUsers = [];
        loadMembers(c, function() {
            c.locals.members.forEach(function(user) {
                 selectedUsers.push(user.id);
            });

            sendMessages();
        });
    }
    else {
        sendMessages();
    }

    function sendMessages() {
        console.log('sending messages to ' + selectedUsers.length + ' users');

        //sends message to each selected user
        async.forEach(selectedUsers, function(userId, callback) {
            //load each user
            User.find(userId, function (err, user) {
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
exports.inviteForm = function(c) {
    c.render('community/inviteform');
}

//sends invites
exports.sendInvites = function(c) {
    var User = c.model('User');
    var group = c.group();
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