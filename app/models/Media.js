//
// Hatch.js is a CMS and social website building framework built in Node.js 
// Copyright (C) 2013 Inventures Software Ltd
// 
// This file is part of Hatch.js
// 
// Hatch.js is free software: you can redistribute it and/or modify it under the terms of the
// GNU General Public License as published by the Free Software Foundation, version 3
// 
// Hatch.js is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
// without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// 
// See the GNU General Public License for more details. You should have received a copy of the GNU
// General Public License along with Hatch.js. If not, see <http://www.gnu.org/licenses/>.
// 
// Authors: Marcus Greenwood, Anatoliy Chakkaev and others
//

module.exports = function (compound, Media) {
    Media.SIZES = ['32x0', '64x0', '128x0', '320x0'];

    var request = require('request');
    var im = require('imagemagick');
    var async = require('async');
    var path = require('path');
    var fs = require('fs');
    var fsTools = require('fs-tools');
    var knox = require('knox');
    var mime = require('mime');

    /**
     * Create a new media object from an HttpRequest. Can either accept request
     * files or req.body/query.file as a URL, in which case we download the file
     * to local storage.
     *
     * If the file is an image, it will be resized to the standard image sizes
     * before creating the media object.
     *
     * If there is a uploadToCDN function defined, this will be called to upload
     * the file to CDN storage before creating the media object.
     * 
     * @param  {[type]}   req      [description]
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    Media.createWithRequest = function (req, callback) {
        var uploadPath = compound.app.get('upload path');

        // check the request files collection or fall back to body/querystring
        if(req.files && req.files.length > 0) {
            var file = req.files[Object.keys(req.files)[0]];
            var filename = file.path;
            var filePath = filename.split('/').slice(0, -1).join('/');

            // move the file to the upload path if it's not already there
            if (uploadPath.indexOf(filePath) === -1) {
                var newFilename = path.join(uploadPath, new Date().getTime() + '-' + filename.split('/').slice(-1)[0]);
                fsTools.move(filename, newFilename, function (err) {
                    handleFile(newFilename);
                });
            } else {
                handleFile(filename);
            }
        } else {
            // download the file to disk before manipulation
            var url = req.body.file || req.query.file;
            var filename = path.join(uploadPath, new Date().getTime() + '-' + url.split('/').slice(-1)[0]);
            request.get(url, function (err, resp, body) {
                handleFile(filename);
            }).pipe(fs.createWriteStream(filename));
        }

        function handleFile(filename) {
            var data = {
                filename: filename,
                authorId: req.user && req.user.id
                groupId: req.group && req.group.id
            };

            // if this is an image, resize to the standard dimensions
            if (Media.isImage(filename)) {
                // but first work out the original image dimension
                im.identify(filename, function(err, features) {
                    data.width = features.width;
                    data.height = features.height;

                    // now resize the image
                    Media.resizeImage(data, function (err, data) {
                        if (err) {
                            return callback(err);
                        } else {
                            upload(data);
                        }
                    });
                });
            } else {
                upload(data);
            }
        }

        function upload(data) {
            // if there is a CDN upload function defined, upload and continue
            if (Media.uploadToCDN) { 
                Media.uploadToCDN(data, function (err, data) {
                    create(data);
                });
            } else {
                // otherwise just set the url to be the upload folder
                data.url = '/upload/' + data.filename.split('/').slice(-1)[0];
                create(data);
            }
        }

        function create(data) {
            Media.create(data, callback);
        }
    };

    /**
     * Work out whether a file is an image file.
     * 
     * @param  {String}  filename - filename to check
     * @return {Boolean}          
     */
    Media.isImage = function (filename) {
        var ext = filename.split('.').slice(-1)[0].toLowerCase();
        var imageExtensions = ['jpg', 'jpeg', 'png', 'gif'];

        return imageExtensions.indexOf(ext) > -1;
    };

    /**
     * Work out whether a file is a video file.
     * 
     * @param  {String}  filename - filename to check
     * @return {Boolean}
     */
    Media.isVideo = function (filename) {
        var ext = filename.split('.').slice(-1)[0].toLowerCase();
        var videoExtensions = ['mp4', 'mov', 'flv', 'ogg', 'webm'];

        return videoExtensions.indexOf(ext) > -1;
    };

    /**
     * Resize an image file to the dimensions in the application config.
     * 
     * @param  {Object}   data     - media or media creation data
     * @param  {Function} callback - callback function
     */
    Media.resizeImage = function (data, callback) {
        data.resized = [];

        // if there are no sizes, continue
        if (!Media.SIZES.length) {
            return callback(null, data);
        }

        async.forEach(Media.SIZES, function (size, done) {
            var width = parseInt(size.split('x')[0]);
            var height = parseInt(size.split('x')[1] || 0);

            var resizeFilename = data.filename.split('.').slice(0, -1).join('.') +
                '_' + size + '.' + data.filename.split('.').slice(-1)[0];

            //resize and upload each file
            im.resize({
                srcPath: data.filename,
                dstPath: resizeFilename,
                width: width,
                height: height
            }, function(err, stdout, stderr){
                if (err) {
                    return done(err);
                } else {
                    im.identify(resizeFilename, function(err, features) {
                        data.resized.push({
                            size: size,
                            width: features.width,
                            height: features.height,
                            filename: resizeFilename.split('/').slice(-1)[0]
                        });
                        done();
                    });
                }
            });
        }, function (err) {
            if (err) {
                return callback(err);
            } else {
                return callback(null, data);
            }
        });
    };

    /**
     * Get the image URL for the specified size. Will retrive the image equal to
     * or greater than the specified size.
     * 
     * @param  {String} size - image size to look for
     * @return {String}      - URL for the resized image
     */
    Media.prototype.getUrl = function (size) {
        if (!this.resized.length) {
            return this.url;
        }

        var width = parseInt(size.split('x')[0]);
        var height = parseInt(size.split('x')[1] || 0);

        // check for larger/equal images
        for (var i=0; i<this.resized.length; i++) {
            var resize = this.resized.items[i];
            if (resize.width >= width && resize.height >= height) {
                return this.url.split('/').slice(0, -1).join('/') + '/' + resize.filename;
            }
        }

        // fallback - return the default image url
        return this.url;
    };

    /**
     * Upload the files for this media object to S3. Replace the Media.uploadToCDN
     * function with this to turn on uploading to S3 for CDN. You also need to
     * set the Media.s3 settings object with your AWS credentials and S3 bucket.
     * See below for required parameters.
     * 
     * @param  {Object}   data     - media creation data
     * @param  {Function} callback - callback function
     */
    Media.uploadToS3 = function (data, callback) {
        var settings = Media.s3;
        var filename = data.filename.split('/').slice(-1)[0];

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
            client.putFile(filename, (settings.path && (settings.path.split('/')[0] + '/') || '/') + filename.split('/').slice(-1)[0], params, function(err, res) {
                if (err) {
                    return callback(err);
                }

                // delete the original file
                fs.unlink(filename);
                done();
            });
        }, function (err) {
            if (err) {
                return callback(err);
            }

            // work out the new url - either a mapped domain or sub-subdomain of amazonaws.com
            if (settings.bucket.split('.').length > 1) {
                data.url = '//' + settings.bucket + '/' + filename;
            } else {
                data.url = bucket + '.s3.amazonaws.com/' + filename;
            }

            return callback(err, data);
        });
    };
};
