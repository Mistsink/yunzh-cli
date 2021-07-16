module.exports = core

const semver = require('semver')
const colors = require('colors')
const pathExists = require('path-exists').sync
const path = require('path')
const commander = require('commander')


const log = require('@yunzh-cli-dev/log')
const init = require('@yunzh-cli-dev/init')
const exec = require('@yunzh-cli-dev/exec')


//  require 支持 js(读取module.exports)、json(进行JSON.parse)、node(c++的插件)、any-orther(当作js)
const pkg = require('../package.json')      
const { LOWEST_NODE_VERSION, DEFAULT_CLI_HOME } = require('./const')


let userHome
const program = new commander.Command()


async function core(argv) {
    try {
        await prepare()

        registrerCommand()
    } catch (e) {
        log.error(e)
    }
}

async function prepare() {
    checkPkgVersion()
    checkNodeVersion()
    checkRoot()
    await checkUserHome()
    checkEnv()
    await checkGlobalUpdate()
}


function registrerCommand() {
    program
        .name(Object.keys(pkg.bin)[0])
        .usage('<command> [options]')
        .version(pkg.version)
        .option('-d, --debug', 'debug mode', false)
        .option('-tp, --targetPath <targetPath>', 'specified local debug file path', '')

    program.on('option:targetPath', targetPath => {
        process.env.CLI_TARGET_PATH = targetPath
    })

    program.on('option:debug', () => {
        process.env.LOG_LEVEL = 'verbose'
        log.level = process.env.LOG_LEVEL
    })

    // unregistered command fault-tolerance
    program.on('command:*', cmd => {
        log.error(`unresolvable command: ${cmd}`)
    })

    program
        .command('init [projectName]')  //  必需要有 [] 才能捕获到参数值
        .option('-f, --force', 'f orce to create project with specified name')
        .action(exec)

    program.parse(process.argv)

    // 这里的args等属性需要在 parse 之后才会赋值
    if (program.args && !program.args.length)
        program.outputHelp()
}


//  全局更新 npm 包
async function checkGlobalUpdate() {
    const curVersion = pkg.version
    const npmName = pkg.name

    const { getNpmSemverVersion } = require('@yunzh-cli-dev/get-npm-info')
    const lastVersion = await getNpmSemverVersion(npmName, curVersion)
    if (lastVersion && semver.gt(lastVersion, curVersion)) {
        log.warn(colors.yellow(`please update ${npmName}, current version: ${curVersion}, the lastest version: ${lastVersion}
        you can command: npm i -g ${npmName}`))
    }
}

function checkEnv() {
    const dotenv = require('dotenv')
    const dotEnvPath = path.resolve(userHome, '.env')
    if (pathExists(dotEnvPath)) {
        dotenv.config({
            path: dotEnvPath
        })
    }
    createDefaultConfig()
}

function createDefaultConfig() {
    const cliConfig = {
        home: userHome
    }
    if (process.env.CLI_HOME_PATH) {
        cliConfig.cliHome = path.join(cliConfig.home, process.env.CLI_HOME)
    } else {
        cliConfig.cliHome = path.join(cliConfig.home, DEFAULT_CLI_HOME)
    }
    process.env.CLI_HOME_PATH = cliConfig.cliHome

    config = cliConfig
}

async function checkUserHome() {
    await import('home-or-tmp').then(
        homeOrTmp => {
            if (!homeOrTmp.default || !pathExists(homeOrTmp.default)) {
                throw new Error(colors.red('current user main directory not exists!'))
            }
            userHome = homeOrTmp.default
        }
    )
}

function checkRoot() {
    import('root-check').then( 
        rootCheck => 
            rootCheck.default()
        )
}

function checkPkgVersion() {
    log.info('pkg version', pkg.version)
}

function checkNodeVersion() {
    const curVersion = process.version
    const lowestVersion = LOWEST_NODE_VERSION

    if (!semver.gte(curVersion, lowestVersion)) {
        throw new Error(colors.red('yunzh-cli require lowest version for node:', lowestVersion))
    }
}