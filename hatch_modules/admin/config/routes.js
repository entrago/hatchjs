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

    map.resources('content', {as: 'content', suffix: 'entry'}, function (item) {
        item.collection(function (items) {
            items.get('filter/:filter.:format?', '#index', {as: 'filteredContent' });
            items.del('destroyAll', {as: 'destroySelectedContent'});
        });
    });

    map.namespace(':section/tag', function (section) {
        section.get('list', 'tag#index', {as: 'listTags'});
        section.get('edit', 'tag#edit', {as: 'editTag'});
        section.get('new', 'tag#edit', {as: 'newTag'});
        section.put('save', 'tag#save', {as: 'saveTag'});
        section.post('delete', 'tags#delete', {as: 'deleteTag'});
        section.post('add', 'tag#add', {as: 'addToTag'});
        section.post('remove', 'tag#remove', {as: 'removeFromTag'});
    });

    map.resources('streams', function (stream) {
        stream.get('toggle');
    });

    map.resources('users', {as: 'community', suffix: 'member'});

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
