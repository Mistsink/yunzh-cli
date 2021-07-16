'use strict';

const path = require('path')

const Package = require('@yunzh-cli-dev/package');
const log = require('@yunzh-cli-dev/log')

const CONFIG = {
    init: 'foo',
    // init: '@yunzh-cli-dev/init',
}
const CACHE_PATH = 'dependencies'

async function exec(projectName, opts, cmd) {
    //  target path -> module path
    const homePath = process.env.CLI_HOME_PATH
    log.verbose('homePath:', homePath)

    let targetPath = process.env.CLI_TARGET_PATH
    let pkg
    const cmdName = cmd.name()
    const pkgName = CONFIG[cmdName]

    if (!targetPath) {
        targetPath = path.resolve(homePath, CACHE_PATH)
        let storeDir = path.resolve(targetPath, 'node_modules')
        log.verbose('targetPath:', targetPath)

        //  get module -> create package
        pkg = new Package({
            targetPath: targetPath,
            storeDir: storeDir,
            name: pkgName,
            version: ''
        })

        if (pkg.exists()) {
            //  update
        } else {
            //  install
            await pkg.install()
                .catch(log.error)
        }

    } else {
        log.verbose('targetPath:', targetPath)
        //  get module -> create package
        pkg = new Package({
            targetPath: targetPath,
            name: pkgName,
            version: 'latest'
        })
    }



    console.log(pkg)
    const pkgEntryPath = await pkg.getEntryPath()
    require(pkgEntryPath)
    //  interface package -> getMainFile update installs
}

module.exports = exec