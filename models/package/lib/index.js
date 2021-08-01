'use strict';

const path = require('path')
const pkgDir = require('pkg-dir')
const npminstall = require('npminstall')
const fse = require('fs-extra')
const pathExists = require('path-exists')

const { isObject } = require('@yunzh-cli-dev/utils')
const formatPath = require('@yunzh-cli-dev/format-path')
const { getDefaultRegistry, getNpmLatestVersion } = require('@yunzh-cli-dev/get-npm-info');
const { throws } = require('assert');
const { Console } = require('console');


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

    if (!options || !isObject(options))
      throw new Error('class Package requried options param[Object]')

    this.targetPath = options.targetPath
    this.storeDir = options.storeDir
    this.pkgName = options.name
    this.pkgVersion = options.version
    this.cacheFilePathPrefix = this.pkgName.replace('/', '_')
  }

  async prepare() {
    if (this.storeDir && ! await pathExists(this.storeDir)) {
      fse.mkdirpSync(this.storeDir);
    }
    if (this.pkgVersion === 'latest') {
      this.pkgVersion = await getNpmLatestVersion(this.pkgName);
    }
  }

  get cacheFilePath() {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.pkgVersion}@${this.pkgName}`);
  }

  getSpecificCacheFilePath(pkgVersion) {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${pkgVersion}@${this.pkgName}`);
  }

  /**
   * @returns boolean
   */
  async exists() {
    if (this.storeDir) {
      await this.prepare();
      return await pathExists(this.cacheFilePath);
    } else {
      return await pathExists(this.targetPath);
    }
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
        { name: this.pkgName, version: this.pkgVersion }
      ]
    }).catch(console.log)
  }


  /**
   * update package
   */
  async update() {
    await this.prepare();
    const latestPackageVersion = await getNpmLatestVersion(this.pkgName);
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion);
    if (!await pathExists(latestFilePath)) {
      await npminstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [{
          name: this.pkgName,
          version: latestPackageVersion,
        }],
      });
      this.pkgVersion = latestPackageVersion;
    } else {
      this.pkgVersion = latestPackageVersion;
    }
  }


  /**
   * get entry file path
   */
  async getEntryPath() {
    if (! await pathExists(this.targetPath)){
      throw new Error('targetPath do not exists:' +  this.targetPath)
    }

    const pkgRootPath = await pkgDir(this.targetPath)

    if (!pkgRootPath) return null

    const pkg = require(path.resolve(pkgRootPath, 'package.json'))

    if (pkg && pkg.main)
      return formatPath(path.resolve(pkgRootPath, pkg.main))
    return null
  }
}


module.exports = Package;
