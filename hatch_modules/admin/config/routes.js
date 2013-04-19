exports.routes = function (map) {

    map.camelCaseHelperNames = true;
    map.root('pages#index');
    
    map.collection(function (group) {
        group.get('group/:tab?', 'group#show', {as: 'group'});
        group.post('group/save', 'group#save', {as: 'groupSave'});
    });

    map.resources('modules', function (module) {
        module.collection(function (modules) {
            modules.get('marketplace', {as: 'modulesMarketplace'});
        });
        module.get('setup');
        module.get('disable');
        module.get('enable');
    });

    map.namespace(':section', function (section) {
        section.collection(function (tag) {
            tag.resources('tags', function (tag) {
                tag.post(':id/add', 'tags#add', {as: 'addToTag'});
                tag.post(':id/remove', 'tags#remove', {as: 'removeFromTag'});
                tag.get('counts', '#tagCounts');
            });
        });
    });

    map.resources('content', {as: 'content', suffix: 'entry'}, function (item) {
        item.collection(function (items) {
            items.get('filter/:filterBy.:format?', '#index', {as: 'filteredContent' });
            items.del('destroyAll', {as: 'destroySelectedContent'});
            items.get('new/:type', '#new', {as: 'newContentForm'});
            items.get('ids', '#ids', {as: 'contentIds'});
            items.post(':id/unflag', '#clearFlags', {as: 'unflag'});
            items.get('moderation/load', 'moderation#load', {as: 'loadModeration'})
            items.get('moderation/:type.:format?', 'moderation#index', {as: 'moderation'})
            items.get('moderation/ids', 'moderation#ids', {as: 'moderationIds'})
        });
    });

    map.collection(function (moderation) {
        moderation.get('moderation', 'moderation#index');
    });

    map.resources('streams', function (stream) {
        stream.get('toggle');
    });

    map.resources('users', {as: 'community', suffix: 'member'}, function (user) {
        user.collection(function (users) {
            users.get('filter/:filterBy.:format?', '#index', {as: 'filteredUsers' });
            users.post('sendmessageto', '#sendMessageTo', {as: 'sendMessageTo'});
            users.get('sendmessage', '#sendMessageForm', {as: 'sendMessageForm'});
            users.post('sendmessage', '#sendMessage', {as: 'sendMessage'});
            users.get('invite', '#inviteForm', {as: 'inviteForm'});
            users.post('invite', '#sendInvites', {as: 'sendInvites'});
            users.post('removeMembers', '#removeMembers', {as: 'removeMembers'});
            users.post('blacklistMembers', '#blacklistMembers', {as: 'blacklistMembers'});
            users.post('unblacklistMembers', '#unblacklistMembers', {as: 'unblacklistMembers'});
            users.get('ids', '#ids', {as: 'userIds'});
            users.post(':id/resendinvite', '#resendInvite');
            users.post(':id/remove', '#remove');
            users.post(':id/upgrade', '#upgrade');
            users.post(':id/downgrade', '#downgrade');
            users.post(':id/accept', '#accept');
            users.get('profilefields', '#profileFields', {as: 'profileFields'});
            users.get('profilefields/new', '#newProfileField', {as: 'newProfileField'});
            users.get('profilefields/:id/edit', '#editProfileField', {as: 'editProfileField'});
            users.post('profilefields/reorder', '#reorderProfileFields', {as: 'reorderProfileFields'});
            users.post('profilefields/save', '#saveProfileField', {as: 'saveProfileField'});
            users.post('profilefields/:id/delete', '#deleteProfileField', {as: 'deleteProfileField'});
            users.get('export', '#exportForm', {as: 'export'});
            users.post('export', '#export', {as: 'export'});
        });
    });

    map.resources('pages', function (page) {
        page.collection(function (pages) {
            pages.get('new-special', '#newSpecial', {as: 'newSpecial'});
            pages.get('new-special/:type', '#newSpecial', {as: 'newSpecialType'});
            pages.get('specials', '#specials', {as: 'specialPages'});
            pages.get('renderTree', '#renderPageTree', {as: 'renderTree'});
            pages.get('edit/:id', '#edit', {as: 'editPage'});
        });
        page.put('reorder.:format?', 'pages#updateOrder');
    });

    map.post('/page/columns', 'page#updateColumns');

    map.get('/:controller/:action');

    map.resources('widgets', {path: 'widget'});
    map.post('/widget', 'widgets#create');
    map.all('/widget/:pageId/:widgetId/:action', 'widgets');
};
