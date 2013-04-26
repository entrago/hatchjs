module.exports = StylesheetController;

function StylesheetController(init) {
    init.before(findStylesheet);
};

function findStylesheet (c) {
    c.Stylesheet.findOne({ groupId: c.req.group.id }, function (err, stylesheet) {
        c.stylesheet = stylesheet;
        c.next();
    });
}

/**
 * Set the 
 * @param  {[type]} c [description]
 * @return {[type]}   [description]
 */
StylesheetController.prototype.setTheme = function (c) {
    c.stylesheet.setTheme(c, c.req.query.name, function (err, params) {
        var url = c.pathFor('stylesheet').css(params.version);
        if (c.app.enabled('static css')) {
            url = params.url;
        }

        c.send({
            status: 'success',
            url: url
        });
    });
}