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

module.exports = function (compound, Like) {
    var Content = compound.models.Content;

    // validation
    Like.validatesPresenceOf('contentId', 'userId');

    /**
     * Set the date automatically if we don't have one.
     * 
     * @param  {Function} next - callback function
     */
    Like.beforeSave = function (next) {
        if (!this.createdAt) {
            this.createdAt = new Date();
        }
        next();
    };

    /**
     * After a like is saved, update the parent content item.
     * 
     * @param  {Function} next - callback function
     */
    Like.afterSave = function (next) {
        Content.updateLikes(this.contentId, next);
    };

    /**
     * After a like is deleted, update the parent content item.
     * 
     * @param  {Function} next - callback function
     */
    Like.afterDestroy = function (next) {
        Content.updateLikes(this.contentId, next);
    };
};