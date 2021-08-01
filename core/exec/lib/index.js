'use strict';

const path = require('path')

const Package = require('@yunzh-cli-dev/package');
const log = require('@yunzh-cli-dev/log');
const { exec: spawn } = require('@yunzh-cli-dev/utils')

const CONFIG = {
    // init: 'foo',
    init: '@yunzh-cli-dev/init',
    version: ''
}
const CACHE_PATH = 'dependencies'

async function exec(projectName, opts, cmd) {
    //  target path -> module path
    const cliHomePath = process.env.CLI_HOME_PATH
    log.verbose('cliHomePath:', cliHomePath)

    let targetPath = process.env.CLI_TARGET_PATH
    let pkg
    const cmdName = cmd.name()
    const pkgName = CONFIG[cmdName]
    const packageVersion = CONFIG['version']

    if (!targetPath) {
        targetPath = path.resolve(cliHomePath, CACHE_PATH)
        let storeDir = path.resolve(targetPath, 'node_modules')
        log.verbose('targetPath:', targetPath)

        //  get module -> create package
        pkg = new Package({
            targetPath: targetPath,
            storeDir: storeDir,
            name: pkgName,
            version: packageVersion
        })

        if (pkg.exists()) {
            //  update
            await pkg.update()
                .catch(console.log)
        } else {
            //  install
            await pkg.install()
                .catch(console.log)
        }

    } else {
        //  get module -> create package
        pkg = new Package({
            targetPath,
            name: pkgName,
            version: 'latest'
        })
    }

    const pkgEntryPath = await pkg.getEntryPath()

    if (!pkgEntryPath) {
        return
    }

    const o = Object.create(null)
    Object.keys(cmd).forEach(key => {
        if (cmd.hasOwnProperty(key) && !key.startsWith('_') && key != 'parent')
            o[key] = cmd[key]
    })

    const code = `require('${pkgEntryPath}').apply(null, ${JSON.stringify([
        projectName,
        opts,
        o
    ])})`;
    const child = spawn('node', ['-e', code], {
        cwd: process.cwd(),
        stdio: 'inherit',
    });
    child.on('error', e => {
        log.error(e.message);
        process.exit(1);
    });
    child.on('exit', e => {
        log.verbose('command execute successfully:' + e);
        process.exit(e);
    });
}

module.exports = exec