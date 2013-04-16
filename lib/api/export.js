var csv = require('csv');

module.exports = ExportAPI;

function ExportAPI(hatch) {
    this.hatch = hatch;
}

/**
 * Export some data as a file download to the browser.
 * 
 * @param  {HttpContext} c        - http context
 * @param  {Array}       data     - array containing the entity objects we want to export
 * @param  {String}      filename - filename for download file
 */
ExportAPI.prototype.export = function (c, data, filename) {
    var format = filename.split('.').slice(-1).toString().toLowerCase();
    var output = [];

    data.forEach(function(obj) {
        if (obj.toPublicObject) {
            obj = obj.toPublicObject();
        }
        
        // sanitize the data for CSV output - replace null values with ''
        if (format === 'csv') {
            // fix null values
            Object.keys(obj).forEach(function (key) {
                if (obj[key] === null) {
                    obj[key] = '';
                }
                else if(obj[key]) {
                    obj[key] = obj[key].toString();
                }
            });
        }

        output.push(obj);
    });

    switch(format) {
        case 'csv':
            csv().from.array(output).to.string(function (data, count) { 
                var headers = Object.keys(output[0] || {}).join(',');

                c.res.setHeader('Content-disposition', 'attachment; filename=' + filename);
                c.res.setHeader('Content-Type', 'text/csv');
                c.send(headers + '\n' + data);
            });
            break;
        case 'json':
        default:
            c.res.setHeader('Content-disposition', 'attachment; filename=' + filename);
            c.res.setHeader('Content-Type', 'text/json');
            c.send(output);
            break;
    }
};