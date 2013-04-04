var fs = require('fs');

action(function show() {
    header('Content-Type', 'text/css; charset=UTF-8');
    header('Cache-Control', 'public, max-age=' + (31557600000));

    send(fs.readFileSync(app.parent.parent.root + '/public/stylesheets/theme-cerulean.css'));
});

