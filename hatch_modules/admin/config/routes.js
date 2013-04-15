exports.routes = function (map) {

    map.camelCaseHelperNames = true;
    map.root('pages#index');
    
    map.resources('groups');

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
            items.get('filter/:filter.:format?', '#index', {as: 'filteredContent' });
            items.del('destroyAll', {as: 'destroySelectedContent'});
            items.get('new/:type', '#new', {as: 'newContentForm'});
            items.get('ids', '#ids', {as: 'contentIds'});
        });
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
            users.get('ids', '#ids', {as: 'userIds'});
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
