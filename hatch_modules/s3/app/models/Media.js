//
// Hatch.js is a CMS and social website building framework built in Node.js 
// Copyright (C) 2013 Inventures Software Ltd
// 
// This file is part of Hatch.js
// 
// Hatch.js is free software: you can redistribute it and/or modify it under the terms of the
// GNU Affero General Public License as published by the Free Software Foundation, version 3
// 
// Hatch.js is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
// without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// 
// See the GNU Affero General Public License for more details. You should have received a copy of the GNU
// General Public License along with Hatch.js. If not, see <http://www.gnu.org/licenses/>.
// 
// Authors: Marcus Greenwood, Anatoliy Chakkaev and others
//

module.exports = function (compound, Media) {
    var knox = require('knox');
    var mime = require('mime');
    var async = require('async');
    var fs = require('fs');


    Media.s3 = compound.app.get('s3');

    // if we didn't find any settings, return here
    if (!Media.s3) {
        return;
    }


    /**
     * Upload the files for this media object to S3. Replace the Media.uploadToCDN
     * function with this to turn on uploading to S3 for CDN. You also need to
     * set the Media.s3 settings object with your AWS credentials and S3 bucket.
     * See below for required parameters.
     * 
     * @param  {Object}   data           - media creation data
     * @param  {Object}   uploadParams   - additional params (optional)
     * @param  {Function} callback       - callback function
     */
    Media.uploadToS3 = function (data, uploadParams, callback) {
        var settings = Media.s3;
        var filename = data.filename.split('/').slice(-1)[0];
        var path = (settings.path && (settings.path.split('/')[0] + '/') || '') + (uploadParams.path ? (uploadParams.path + '/') : '');

        var client = knox.createClient({
            key: settings.key, 
            secret: settings.secret, 
            bucket: settings.bucket, 
            region: settings.region || 'eu-west-1'
        });

        var params = { 
            'x-amz-acl': 'public-read', 
            'cache-control': 'public,max-age=31536000', 
            'Content-Type': mime.lookup(data.filename) 
        };

        var files = data.resized.map(function (resize) {
            return data.filename.split('/').slice(0, -1).join('/') + '/' + resize.filename;
        });
        files.push(data.filename);

        async.forEach(files, function (filename, done) {
            console.log('s3 uploading: ' + filename);
            client.putFile(filename, path + filename.split('/').slice(-1)[0], params, function(err, res) {
                if (err) {
                    return callback(err);
                }
                console.log('s3 uploaded: ' + filename);
                
                // delete the original file
                fs.unlink(filename);
                
                if (!data.saveBeforeUpload) {
                    done();
                }
            });

            if (data.saveBeforeUpload) {
                done();
            }
        }, function (err) {
            if (err) {
                return callback(err);
            }

            // work out the new url - either a mapped domain or sub-subdomain of amazonaws.com
            if (settings.cdn) {
                data.url = '//' + settings.cdn + '/' + path + filename;
            } else if (settings.bucket.split('.').length > 1) {
                data.url = '//' + settings.bucket + '/' + path + filename;
            } else {
                data.url = '//' + settings.bucket + '.s3.amazonaws.com/' + path + filename;
            }

            return callback(err, data);
        });
    };

    Media.uploadToCDN = Media.uploadToS3;

};
