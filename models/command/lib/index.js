'use strict';

const semver = require('semver')
const colors = require('colors/safe')
const log = require('@yunzh-cli-dev/log')

const LOWEST_NODE_VERSION = '11.0.0'

class Command {

    constructor(cmdVal, opts, cmd) {

        this._cmdVal = cmdVal
        this._opts = opts
        this._cmd = cmd

        let runner = new Promise((resolve, reject) => {
            let chain = Promise.resolve()
            chain = chain.then(() => this.checkNodeVersion())
            chain = chain.then(() => this.init())
            chain = chain.then(() => this.exec())

            chain.catch(log.error)
        })
    }

    checkNodeVersion() {
        const currentVersion = process.version;
        const lowestVersion = LOWEST_NODE_VERSION;
        if (!semver.gte(currentVersion, lowestVersion)) {
          throw new Error(colors.red(`imooc-cli 需要安装 v${lowestVersion} 以上版本的 Node.js`));
        }
      }
    
      init() {
        throw new Error('implement method init');
      }
    
      exec() {
        throw new Error('implement method exec');
      }
}

module.exports = Command