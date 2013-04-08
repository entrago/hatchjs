User.seed ->
    id: 1001
    username: 'test'
    password: 'test'
    email: 'test@test.com'

Group.seed ->
    id: 1001
    title: 'OAuth test group'
    url: '127.0.0.1:3456'
    homepage:
        id: 1001
        url: '/'
        title: 'OAuth test homepage'

Page.seed ->
    id: 1001
    groupId: 1001
    title: 'OAuth test homepage'

OAuthClient.seed ->
    id: 1001
    name: 'test'
    apiKey: 'testKey'
    apiSecret: 'testSecret'
    redirectUri: 'http://localhost:3000'