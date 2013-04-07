Group.seed ->
    id: 1
    url: '127.0.0.1:3456'
    path: ''
    name: 'Dev Group'
    subgroups: [{"path":"/extranet","id":2}]
    pagesCache: [{"id":1,"title":"Dev Group","url":"example.com","order":null,"level":0,"parentId":null,"type":null,"hideFromNavigation":null}]
    homepage: {"id":"1","title":"Dev Group","url":"example.com","order":null,"parentId":null,"type":null,"hideFromNavigation":null}
    modules: [{"name":"user","contract":{"google":true,"local":true}},
      {"name":"admin"},{"name":"core"},{"name":"stylesheet"},
      {"name":"core-widgets"},{"name":"content"},{"name":"api"},{"name":"oauth"}]

Group.seed ->
    id: 2
    url: '127.0.0.1:3456/extranet'
    path: '/extranet'
    name: 'Extranet'
    subgroups: null
    pagesCache: [{"id":2,"title":"Extranet","url":"example.com/extranet","order":null,"level":0,"parentId":null,"type":null,"hideFromNavigation":null}]
    homepage: {"id":5,"title":"Extranet","url":"example.com/extranet","order":null,"parentId":null,"type":null,"hideFromNavigation":null}
    modules: [{"name":"user","contract":{"google":true,"local":true}},
      {"name":"admin"},{"name":"core"},{"name":"stylesheet"},
      {"name":"core-widgets"},{"name":"content"},{"name":"api"},{"name":"oauth"}]
