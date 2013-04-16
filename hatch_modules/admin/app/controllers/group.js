
var Application = require('./application');

module.exports = GroupController;

function GroupController(init) {
    Application.call(this, init);
    init.before(function setup(c) {
        this.sectionName = 'group';
        c.next();
    });
}

require('util').inherits(GroupController, Application);

GroupController.prototype.show = function (c) {
    c.render();
};
