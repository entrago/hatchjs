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

'use strict';

exports.routes = function (map) {
    map.get('/tags/:name', 'tags#get');
    map.get('/tags/:name/get', 'tags#get');
    map.get('/tags/:name/ping', 'tags#ping');
    map.get('/tags/:name/subscribe', 'tags#subscribe');

    map.get('/streams/:hash/run', 'streams#run');

    map.get('/:modelName/:id', 'uri#get');
    map.post('/:modelName/:id/:action', 'uri#perform');
};