var path = require('path');
var _ = require('underscore');

exports.moduleEnabled = function (moduleName) {
    if (!this.locals.group) return false;
    var found = this.locals.group.modules.find(moduleName, 'name');
    return found;
};

exports.moduleConfigured = function (moduleName) {
    var module = this.moduleEnabled(moduleName);
    var info = this.compound.hatch.modules[moduleName].info;
    if (!info.settings || !info.settings.fields) {
        return true;
    }
    var valid = true;
    Object.keys(info.settings.fields).forEach(function(f) {
        if (info.settings.fields[f].required && !module.contract[f]) {
            valid = false;
        }
    });
    return valid;
};

/**
 * Renders a Google JSON location object to a nice simple short address
 *
 * @param {Location} location
 * @returns {String} 'Marylebone, London'
 */
exports.renderLocation = function renderLocation(location) {
    if (!location || !location.address_components) {
        return location;
    }
    return location.address_components[2].short_name + ', ' + location.address_components[3].short_name;
};

exports.pathFor = function(m) {
    var module = this.compound.hatch.modules[m];
    if (module) {
        return module.compound.map.clone(this.context.req.pagePath);
    } else {
        return {};
    }
};

exports.specialPagePath = function (type, params) {
    var sp = this.compound.hatch.page.get(type);
    if (!sp) return '';
    return sp.path(this.req.group, params);
};

/**
 * Strip HTML from the specified HTML and return text
 *
 * @param {String} html - html to strip.
 * @param {Number} maxLength - limit to this many characters.
 *
 * @returns {String} - text without html ended with '...' if length was > maxLength
 */
exports.stripHtml = function stripHtml(html, maxLength) {
    var text = (html || '').replace(/(<([^>]+)>)/ig, ' ');
    if(maxLength && maxLength > 0) {
        if(text.length > maxLength) {
            text = text.substring(0, maxLength);
            if(text.lastIndexOf(' ') > -1) text = text.substring(0, text.lastIndexOf(' '));
            text += '...';
        }
    }

    return text.replace(/^\s+|\s+$/g, '');
};

/**
 * Render some content to the page with the specified view (optional).
 * 
 * @param  {Content} post         - content item to render
 * @param  {String}  overrideView - override the default view
 * @return {String}               - HTML code for rendered content
 */
exports.renderContent = function renderContent(post, overrideView) {
    var contentType = this.compound.hatch.contentType;
    var view = overrideView || 'view';
    var viewPath = contentType.getContentType(post.type)[view];
    var viewContext = _.extend(this.viewContext, { post: post });
    var html = '';

    if (!viewPath) {
        return view + ' template not defined for ' + post.type;
    }

    this.res.render(viewPath, viewContext, function (err, result) {
        if (err) {
            html = err;
        } else {
            html = result;
        }
    });

    return html;
};
