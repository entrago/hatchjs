exports.routes = function (map) {
    map.camelCaseHelperNames = true;

    map.root('pages#index');
    
    map.resources('groups');

    map.resources('modules', function (module) {
        module.collection(function (modules) {
            modules.get('marketplace', {as: 'modulesMarketplace'});
        });
        module.get('disable');
        module.get('enable');
    });
    map.resources('content', {as: 'content', suffix: 'entry'}, function (item) {
        item.collection(function (items) {
            items.get('filter/:filter.:format?', '#index', {as: 'filteredGroupContent' });
            items.del('destroyAll', {as: 'destroySelectedGroupContent'});
        });
    });
    map.resources('tags', function (tag) {
        tag.get('count');
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

    map.resources('widgets', {path: 'widget'});
    map.get('/:controller/:action');

    map.post('/widget', 'widgets#create');
    map.all('/widget/:pageId/:widgetId/:action', 'widgets');


    function middleware (req, res, next) {
        console.log('middleware');

        if(req.query.pageId) {
            compound.Page.find(c.req.query.pageId, function (err, page) {
                console.log('loaded page ' + page.url);
                compound.page = page;
                next();
            });
        } 
        else {
            next();
        }
    };
};
