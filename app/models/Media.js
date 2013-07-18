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

    var Content = compound.models.Content;
    var request = require('request');
    var im = require('imagemagick');
    var async = require('async');
    var path = require('path');
    var fs = require('fs');
    var fsTools = require('fs-tools');
    var mime = require('mime');
    var _ = require('underscore');

    Media.SIZES = ['64', '128', '320', '640'];

    /**
     * Before a media item is created, make sure the type is set.
     * 
     * @param  {Function} next - continuation function
     * @param  {Object}   data - data to create with
     */
    Media.beforeCreate = function (next, data) {
        if (!data.type) {
            if (Media.isVideo(data.url)) {
                data.type = 'video';
            } else if (Media.isImage(data.url)) {
                data.type = 'image';
            } else if (Media.isDocument(data.url)) {
                data.type = 'doc';
            } else {
                data.type = 'file';
            }
        }

        next();
    };

    /**
     * After a media item is updated, make sure to update the content records in
     * which it is referenced as an attachment.
     * 
     * @param  {Function} next - continuation function
     * @param  {Object    data - data to save 
     */
    Media.afterSave = function (next, data) {
        this.updateContent(next);
    };

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
        var filename = path.join(uploadPath, new Date().getTime() + '-' + slugify(url.split('/').slice(-1)[0]));

        // videos we just create directly with the url
        if (Media.isVideo(filename)) {
            var data = { url: url };
            data = _.extend(data, params);

            // if we have a video encoder, run now
            if (Media.encodeVideo && !params.skipEncode) {
                Media.encodeVideo(data, {}, function (err, data) {
                    Media.create(data, callback);
                });
            } else {
                Media.create(data, callback);
            }
        } 
        // other files we download first and then re-upload 
        else {
            request.get(url, function (err, resp, body) {
                Media.createWithFilename(filename, params, callback);
            }).pipe(fs.createWriteStream(filename));
        }
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
        var filename = slugify(file.name);
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
                Media.resizeImage(data, params.size, function (err, data) {
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
                Media.uploadToCDN(data, params, function (err, data) {
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
        var videoExtensions = ['mp4', 'mov', 'flv', 'ogg', 'webm', 'm3u8'];

        return videoExtensions.indexOf(ext) > -1;
    };

    /**
     * Work out whether a file is a document.
     * 
     * @param  {String}  filename - filename to check
     * @return {Boolean}          
     */
    Media.isDocument = function (filename) {
        var ext = filename.split('.').slice(-1)[0].toLowerCase();
        var docExtensions = ['pdf', 'doc', 'docx', 'rtf'];

        return docExtensions.indexOf(ext) > -1;
    };

     /**
     * Work out whether a file is a stream.
     *
     * @param  {String}  filename - filename to check
     * @return {Boolean}
     */
    Media.isStream = function (filename) {
        var ext = filename.split('.').slice(-1)[0].toLowerCase();
        var streamExtensions = ['m3u8'];

        return streamExtensions.indexOf(ext) > -1;
    };

    /**
     * Resize an image file to the dimensions in the application config.
     * 
     * @param  {Object}   data     - media or media creation data
     * @param  {Function} callback - callback function
     */
    Media.resizeImage = function (data, defaultSize, callback) {
        data.resized = [];

        // if we have a default size, crop the original image to same location
        if (defaultSize && defaultSize.indexOf('x') > -1) {
            var width = parseInt(defaultSize.split('x')[0]);
            var height = parseInt(defaultSize.split('x')[1] || 0);

            im.crop({
                srcPath: data.filename,
                dstPath: data.filename,
                width: width,
                height: height
            }, function (err, stdout, stderr) {
                run();
            });
        } else {
            run();
        }

        function run() {
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
        }
    };

    /**
     * Get the media URL for the specified size. Will retrive the media equal to
     * or greater than the specified size.
     * 
     * @param  {String} size - media size to look for
     * @return {String}      - URL for the resized media
     */
    Media.prototype.getUrl = function (size) {
        var i;

        if (!this.resized || !this.resized.length || this.resized === undefined) {
            return this.url;
        }

        var width = parseInt(size.split('x')[0]);
        var height = parseInt(size.split('x')[1] || 0);
        var sortedResized;

        if(Array.isArray(this.resized)) {
            sortedResized = _.sortBy(this.resized, 'width');   
        } else {
            if(Array.isArray(this.resized.items)) {
                sortedResized = _.sortBy(this.resized.items, 'width');    
            } else {
                return this.url;
            }
        }

        

        if (width > 0 || height > 0) {
            // check for larger/equal media
            for (i=0; i < sortedResized.length; i++) {
                var resize = sortedResized.items && sortedResized.items[i] || sortedResized[i];
                if (resize.width >= width && resize.height >= height) {
                    if (resize.url) {
                        return resize.url;
                    } else {
                        return this.url.split('/').slice(0, -1).join('/') + '/' + resize.filename;
                    }
                }
            }
        }

        // fallback - return the default media url
        return this.url;
    };

    /**
     * Get the media URL for the specified size. Will retrive the media equal to
     * or greater than the specified size.
     *
     * @param  {Object} media - media object to get url for
     * @param  {String} size  - media size to look for
     * @return {String}       - URL for the resized media
     */
    Media.getUrl = function (media, size) {
        return Media.prototype.getUrl.apply(media, [size]);
    };

    /**
     * Assign multiple media items to a content post.
     * 
     * @param  {Array}    ids      - array of media ids
     * @param  {Content}  post     - content item
     * @param  {Function} callback - callback function
     */
    Media.assignToContentMulti = function (ids, post, callback) {
        if (!ids || ids.length === 0) {
            return callback(null, post);
        }

        // if we have full media json strings instead of ids, parse them to get ids
        if (typeof ids[0] === 'string') {
            ids = _.map(ids, function (json) {
                return JSON.parse(json).id || json;
            });
        }

        Media.all({ where: { id: { inq: ids }}}, function (err, items) {
            items.forEach(function (media) {
                media.assignToContent(post);
            });

            callback(err, post);
        });
    };

    /**
     * Assign this media item to a content entry.
     * 
     * @param  {Content} post - post to add this media to as an attachment
     */
    Media.prototype.assignToContent = function (post) {
        var self = this;

        if (!self.contentIds) {
            self.contentIds = [];
        }

        // add a record of the content to this media item
        if (self.contentIds.indexOf(post.id) === -1) {
            self.contentIds.push(post.id);
        }

        if (!post.attachments) {
            post.attachments = [];
        }

        // insert the media item in the same position it already was 
        // or just add to the end of the array
        var index = post.attachments.indexOf(_.findWhere(post.attachments, { id: self.id }));

        if (index > -1) {
            post.attachments[index] = self.toObject();
        } else {
            post.attachments.push(self.toObject());
        }
    };

    /**
     * Update all content records that this media item is already attached to.
     * 
     * @param  {Function} callback - callback function
     */
    Media.prototype.updateContent = function (callback) {
        var self = this;

        async.forEach(self.contentIds || [], function (id, done) {
            Content.find(id, function (err, post) {
                self.assignToContent(post);
                post.save(done);
            });
        }, function (err) {
            if (callback) {
                callback(err);
            }
        })
    };

    /**
     * Get the local filename for a media object so that we can do local
     * operations on the file.
     * 
     * @param  {Media}    media    - media object
     * @param  {Function} callback - callback function
     */
    Media.getLocalFilename = function (media, callback) {
        if (media.url.indexOf('/upload') === 0) {
            callback(null, path.join(compound.app.get('upload path'), media.url.replace('/upload', '')));
        } else {
            // download the file to local disk and return the filename
            var filename = compound.app.get('upload path') + '/tmp-' + new Date().getTime() + media.url.split('/').slice(-1)[0];
            request.get(url, function (err, resp, body) {
                callback(err, filename);
            }).pipe(fs.createWriteStream(filename));
        }
    };

    function slugify(text) {
        text = text.toLowerCase();
        text = text.replace(/[^-a-zA-Z0-9\.\s]+/ig, '');
        text = text.replace(/-/gi, "_");
        text = text.replace(/\s/gi, "-");
        return text;
    }
};
