'use strict';
module.exports = UriController;

function UriController(init) {
    
}

UriController.prototype.get = function get(c) {
    var model = c[c.req.params.modelName];
    model.find(c.req.params.id, function (err, obj) {
        c.send(obj);
    });
};