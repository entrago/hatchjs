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
    var mime = require('mime');
    var _ = require('underscore');

    /**
     * Create a new media object with a URL of a file on the web. The file will
     * be downloaded to disk before a new media object is created.
     * 
     * @param  {String}   url      - URL of the original file
     * @param  {Object}   params   - additional creation params
     * @param  {Function} callback - callback function
     */
    Media.createWithUrl = function (url, params, callback) {
        var uploadPath = compound.app.get('upload path');
        var filename = path.join(uploadPath, new Date().getTime() + '-' + url.split('/').slice(-1)[0]);

        request.get(url, function (err, resp, body) {
            Media.createWithFilename(filename, params, callback);
        }).pipe(fs.createWriteStream(filename));
    };

    /**
     * Create a new media object from an HttpRequest files collection.
     * 
     * @param  {Object}   files    - http request files collection
     * @param  {Object}   params   - additional creation params
     * @param  {Function} callback - callback function
     */
    Media.createWithFiles = function (files, params, callback) {
        var uploadPath = compound.app.get('upload path');
        var file = files[Object.keys(files)[0]];
        var filename = file.name;
        var filePath = file.path.split('/').slice(0, -1).join('/');

        // move the file to the upload path if it's not already there
        if (uploadPath.indexOf(filePath) === -1) {
            var newFilename = path.join(uploadPath, new Date().getTime() + '-' + filename.split('/').slice(-1)[0]);
            fsTools.move(file.path, newFilename, function (err) {
                Media.createWithFilename(newFilename, params, callback);
            });
        } else {
            Media.createWithFilename(filename, params, callback);
        }
    };

    /**
     * Create a new media object from a filename. 
     *
     * If the file is an image, it will be resized to the standard image sizes
     * before creating the media object.
     *
     * If there is a uploadToCDN function defined, this will be called to upload
     * the file to CDN storage before creating the media object.
     * 
     * @param  {String}   filename - filename of the file to create with
     * @param  {Object}   params   - additional creation params
     * @param  {Function} callback - callback function
     */
    Media.createWithFilename = function (filename, params, callback) {
        var data = {
            filename: filename
        };

        data = _.extend(data, params);

        // if this is an image, resize to the standard dimensions
        if (Media.isImage(filename)) {
            // but first work out the original image dimension
            im.identify(filename, function (err, features) {
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
            }, function (err, stdout, stderr) {
                if (err) {
                    return done(err);
                } else {
                    im.identify(resizeFilename, function (err, features) {
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
        var i;

        if (!this.resized.length) {
            return this.url;
        }

        var width = parseInt(size.split('x')[0]);
        var height = parseInt(size.split('x')[1] || 0);

        // check for larger/equal images
        for (i=0; i < this.resized.length; i++) {
            var resize = this.resized.items[i];
            if (resize.width >= width && resize.height >= height) {
                return this.url.split('/').slice(0, -1).join('/') + '/' + resize.filename;
            }
        }

        // fallback - return the default image url
        return this.url;
    };

    
};
