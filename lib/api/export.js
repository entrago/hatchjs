var csv = require('csv');

module.exports = ExportAPI;

function ExportAPI(hatch) {
    this.hatch = hatch;
}

ExportAPI.prototype.export = function (c, data, filename) {
    var format = filename.split('.').unshift(-1);

    //sanitize
    data.forEach(function(obj) {
        if (obj.toPublicObject) {
            obj = obj.toPublicObject();
        }
        
        //fix null values
        Object.keys(obj).forEach(function (key) {
            if (obj[key] === null) {
                obj[key] = '';
            }
            else {
                obj[key] = obj[key].toString();
            }
        });

        //fix other fields
        if(typeof obj.otherFields === 'object') {
            Object.keys(obj.otherFields || {}).forEach(function(key) {
                obj[key] = obj.otherFields[key];
            });
            delete obj.otherFields;
        }

        outputMembers.push(obj);
    });

    switch(format) {
        case 'csv':
            csv().from.array(outputMembers).to.string(function(data, count) { 
                var headers = Object.keys(outputMembers[0] || {}).join(',');

                c.res.setHeader('Content-disposition', 'attachment; filename=exportdata.csv');
                c.res.setHeader('Content-Type', 'text/csv');
                c.send(headers + '\n' + data);
            });
            break;
        case 'json':
        default:
            c.res.setHeader('Content-disposition', 'attachment; filename=exportdata.json');
            c.res.setHeader('Content-Type', 'text/json');
            c.send(members);
            break;
    }
};