exports.routes = function (map) {
    'use strict';

    map.camelCaseHelperNames = true;
    map.root('content#index', { as: 'index' });

    map.collection(function (group) {
        group.get('group/:tab?', 'group#settings', { as: 'group' });
        group.post('group/save/.:format?', 'group#save', { as: 'groupSave' });
        group.get('group/module/:id/setup', 'group#setupModule', { as: 'setupModule' });
    });

    map.resources('modules', function (module) {
        module.collection(function (modules) {
            modules.get('marketplace', { as: 'modulesMarketplace' });
        });
        module.get('disable');
        module.get('enable');
    });

    map.namespace(':section', function (section) {
        section.collection(function (tag) {
            tag.resources('tags', function (tag) {
                tag.post(':id/add', 'tags#add', { as: 'addToTag' });
                tag.post(':id/remove', 'tags#remove', { as: 'removeFromTag' });
                tag.get('counts', '#tagCounts');
            });
        });
    });

    map.resources('content', { as: 'content', suffix: 'entry' }, function (item) {
        item.collection(function (items) {
            items.get('filter/:filterBy.:format?', '#index', { as: 'filteredContent' });
            items.del('destroyAll', { as: 'destroySelectedContent' });
            items.get('new/:type', '#new', { as: 'newContentForm'});
            items.get('ids', '#ids', { as: 'contentIds' });
            items.post(':id/unflag', '#clearFlags', { as: 'unflag' });
            items.get('moderation/load', 'moderation#load', { as: 'loadModeration' });
            items.get('moderation/:type.:format?', 'moderation#index', { as: 'moderation' });
            items.get('moderation/ids', 'moderation#ids', { as: 'moderationIds' });
            items.del('moderation/comment/:commentId', 'moderation#destroyComment', { as: 'destroyComment' });
        });
    });

    map.collection(function (moderation) {
        moderation.get('moderation', 'moderation#index');
    });

    map.resources('streams', function (stream) {
        stream.post('toggle', 'streams#toggle', {as: 'toggleStream'});
    });

    map.resources('users', {as: 'community', suffix: 'member'}, function (user) {
        user.collection(function (users) {
            users.get('filter/:filterBy.:format?', '#index', { as: 'filteredUsers' });
            users.post('sendmessageto', '#sendMessageTo', { as: 'sendMessageTo' });
            users.get('sendmessage', '#sendMessageForm', {as: 'sendMessageForm' });
            users.post('sendmessage.:format?', '#sendMessage', { as: 'sendMessage' });
            users.get('invite', '#inviteForm', { as: 'inviteForm' });
            users.post('invite.:format?', '#sendInvites', { as: 'sendInvites' });
            users.post('removeMembers', '#removeMembers', { as: 'removeMembers' });
            users.post('blacklistMembers', '#blacklistMembers', { as: 'blacklistMembers' });
            users.post('unblacklistMembers', '#unblacklistMembers', { as: 'unblacklistMembers' });
            users.get('ids', '#ids', { as: 'userIds' });
            users.post(':id/resendinvite', '#resendInvite');
            users.post(':id/remove', '#remove');
            users.post(':id/destroy', '#destroy');
            users.post(':id/upgrade', '#upgrade');
            users.post(':id/downgrade', '#downgrade');
            users.post(':id/accept', '#accept');
            users.get('profilefields', '#profileFields', { as: 'profileFields' });
            users.get('profilefields/new', '#newProfileField', { as: 'newProfileField' });
            users.get('profilefields/:id/edit', '#editProfileField', { as: 'editProfileField' });
            users.post('profilefields/reorder', '#reorderProfileFields', { as: 'reorderProfileFields' });
            users.post('profilefields/save.:format?', '#saveProfileField', { as: 'saveProfileField' });
            users.post('profilefields/:id/delete', '#deleteProfileField', { as: 'deleteProfileField' });
            users.get('export', '#exportForm', { as: 'export' });
            users.post('export', '#export', { as: 'export' });
        });
    });

    map.resources('pages', function (page) {
        page.collection(function (pages) {
            pages.get('new-special', '#newSpecial', { as: 'newSpecial' });
            pages.get('new-special/:type', '#newSpecial', { as: 'newSpecialType' });
            pages.get('specials', '#specials', { as: 'specialPages' });
            pages.get('renderTree', '#renderPageTree', { as: 'renderTree' });
            pages.get('edit/:id', '#edit', { as: 'editPage' });
        });
        page.put('reorder.:format?', 'pages#updateOrder');
        page.del('destroy', 'pages#destroy', { as: 'deletePage' });
    });

    map.resources('events');

    map.post('/page/columns', 'page#updateColumns');
    map.post('/page/grid', 'page#updateGrid');
    map.post('/page/image', 'page#image');
    map.post('/page/link', 'page#link');
    map.post('/page/editconsole', 'page#editconsole', { as: 'editconsole' });

    map.post('/stylesheet/theme', 'stylesheet#setTheme');
    map.post('/stylesheet/setrules', 'stylesheet#setRules');
    map.post('/stylesheet/setless', 'stylesheet#setLess');

    map.get('/:controller/:action');

};
