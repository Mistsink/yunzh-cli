'use strict';

const path = require('path')

module.exports = formatPath;

/**
 * compatibility linux、mac、win os
 * @param {string} p path
 * @returns path | null
 */
function formatPath(p) {
    if (!p || typeof p !== 'string')
        return
    
    const sep = path.sep
    if (sep === '/')
        return p
    else {
        return p.replace(/\\/g, '/')
    }
}
 