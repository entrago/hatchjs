module.exports = StylesheetController;

function StylesheetController(init) {
    init.before(findStylesheet);
};

// finds the stylesheet for the current group
function findStylesheet (c) {
    c.Stylesheet.findOne({ groupId: c.req.group.id }, function (err, stylesheet) {
        c.stylesheet = stylesheet;
        c.next();
    });
}

// sends a response to the browser based on the stylesheet model response
function sendResponse (c, err, params) {
    var static = c.app.enabled('static css');
    var url = static ? params.url : c.pathFor('stylesheet').css(params.version);
    
    c.send({
        status: 'success',
        url: url
    });
}

/**
 * Load the current stylesheet and return as JSON.
 * 
 * @param  {HttpRequest} c - http context
 */
StylesheetController.prototype.load = function (c) {
    c.send({
        stylesheet: c.stylesheet
    });
};

/**
 * Set the theme.
 * 
 * @param  {HttpContext} c - http context
 */
StylesheetController.prototype.setTheme = function (c) {
    c.stylesheet.setTheme(c, c.req.query.name, function (err, params) {
        sendResponse(c, err, params);
    });
};

/**
 * Set the LESS code for the stylesheet.
 * 
 * @param {HttpContext} c - http context
 */
StylesheetController.prototype.setLess = function (c) {
    c.stylesheet.setLess(c, c.req.body.less, function (err, params) {
        sendResponse(c, err, params);
    });
};

/**
 * Set one or more CSS rules for the stylesheet.
 * 
 * @param {HttpContext} c - http context
 */
StylesheetController.prototype.setRules = function (c) {
    c.stylesheet.setRules(c, c.req.body.rules, function (err, params) {
        sendResponse(c, err, params);
    });
};
