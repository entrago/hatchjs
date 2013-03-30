'use strict';

module.exports = function (compound) {
    Object.keys(compound.models).forEach(function (modelName) {
        var model = compound.models[modelName];
        var schema = model.schema.definitions[modelName];
        var redis = model.schema.adapter;

        //add the uri property to each schema
        schema.properties.uri = { type: String, index: true };

        //generate the uri value whenever an object is saved
        var beforeSave = model.beforeSave;
        model.beforeSave = function (done) {
            var obj = this;

            if (obj.uri) {
                next();
            } else if (obj.id) {
                obj.uri = generateUri(obj.id);
                next();
            } else {
                redis.get('id:' + redis.modelName(modelName), function (err, id) {
                    obj.uri = generateUri(parseInt(id || 0, 10) + 1);
                    next();
                });
            }

            function next() {
                if (beforeSave) {
                    beforeSave(done);
                } else {
                    done();
                }
            }
        };

        function generateUri(id) {
            return '/do/api/get/' + modelName + '/' + id;
        }
    });
};