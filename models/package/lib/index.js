'use strict';

const path = require('path')
const pkgDir = require('pkg-dir')
const npminstall = require('npminstall')

const { isObject } = require('@yunzh-cli-dev/utils')
const formatPath = require('@yunzh-cli-dev/format-path')
const { getDefaultRegistry } = require('@yunzh-cli-dev/get-npm-info')


class Package {

    /**
     * 
     * @param {object {
     *  targetPath: string  需要下载的模块的地址
     *  storeDir: string
     *  name: string    ->  package name
     *  version: string ->  package version
     * }} options 
     */
    constructor(options) {
        console.log('new Package')

        if (!options || !isObject(options))
            throw new Error('class Package requried options param[Object]')

        this.targetPath = options.targetPath
        this.storeDir = options.storeDir
        this.pkgName = options.name
        this.pkgVersion = options.version
    }

    /**
     * @returns boolean
     */
    exists() {

    }

    /**
     * install package
     */
    async install() {
        await npminstall({
            root: this.targetPath,
            storeDir: this.storeDir,
            registry: getDefaultRegistry(true),
            pkgs: [
                {name: this.pkgName, version: this.pkgVersion}
            ]
        })

    }


    /**
     * update package
     */
    update() {}


    /**
     * get entry file path
     */
    async getEntryPath() {
        const pkgRootPath = await pkgDir(this.targetPath)
        
        if (!pkgRootPath)   return null

        const pkg = require(path.resolve(pkgRootPath, 'package.json'))

        if (pkg && pkg.main)
            return formatPath(path.resolve(pkgRootPath, pkg.main))
        return null
    }
}


module.exports = Package;
