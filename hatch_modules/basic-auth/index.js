var compound = require('compound');

module.exports = function (parent) {
    // add middleware
    parent.hatch.hooks.subscribe('page.show', 'basic-auth', require('./middleware/basic-auth').authenticate);
    
    return compound.createServer({root: __dirname});
};