'use strict';

const fs = require('fs')
const fse = require('fs-extra')
const inquirer = require('inquirer')
const semver = require('semver')
const path = require('path')

const { homedir } = require('os')

const Command = require('@yunzh-cli-dev/command')
const log = require('@yunzh-cli-dev/log');
const Package = require('@yunzh-cli-dev/package')
const { sleep, newSpinner } = require('@yunzh-cli-dev/utils')

const getTemplate = require('./getProjectTemplate');
const { throws } = require('assert');

const TYPE = {
    TYPE_PROJECT: 'project',
    TYPE_COMPONENT: 'component'
}

class InitCommand extends Command {
    init() {
        this.projectName = this._cmdVal
        this.force = this._opts?.force
    }

    async exec() {
        //  1. prepare
        let projectInfo = await this.prepare()
        if (projectInfo.code < 0) return
        this.projectInfo = projectInfo

        //  2. download template
        await this.downloadTemplate()

        //  3. install template
    }

    async prepare() {
        //  0. determine whether the current template exsit
        const template = await getTemplate()
        if (!template || template.length === 0)
            throw new Error('template is null')
        this.template = template

        //  1. determine whether the current directory is empty
        //  TODO: 可以改为判断目标目录下是否同名的目录
        const localPath = process.cwd()
        if (!this.isCwdEmpty(localPath)) {
            const { isContinue } = !this.force ? await inquirer
                .prompt({
                    type: 'confirm',
                    name: 'isContinue',
                    default: false,
                    message: 'Current directory is not empty. Whether to continue to creat project?'
                }) : { isContinue: true }
            if (isContinue)
                fse.emptyDirSync(localPath)
            else
                //  notify external func to terminate execution
                return {code: -1}
        }
        return this.getInfo()
    }

    async downloadTemplate() {
        const { projectTemplate } = this.projectInfo
        const templateInfo = this.template.find(templ => templ.npmName === projectTemplate)

        const cliHomePath = process.env.CLI_HOME_PATH ? process.env.CLI_HOME_PATH : path.resolve(homedir(), '.yunzh-cli')

        const targetPath = path.resolve(cliHomePath, 'template')
        const storeDir = path.resolve(targetPath, 'node_modules')
        const templatePackage = new Package({
            targetPath,
            storeDir,
            name: templateInfo.npmName,
            version: templateInfo.version
        })

        console.log('templatePackage:', templatePackage)
        if (!await templatePackage.exists()) {
            //  TODO: 添加自定义spinner动画效果（目前与npminstall打印动画冲突）

            // const spinner = newSpinner('yunzh-cli')
            // spinner.start()
            try {
                // await sleep(5000)
                await templatePackage.install()
                log.info('Install successfully!')
            } catch (e) {
                // spinner.fail('Occur error when installing!')
                throw e
            }
            
        } else {
            // const spinner =  newSpinner('zh-cli')
            // spinner.start()
            try {
                await templatePackage.update()
                log.info('Update successfully!')
            } catch (e) {
                throw e
            } finally {
                // spinner.stop()
            }
        }
    }

    async getInfo() {
        const { type } = await inquirer.prompt({
            type: 'list',
            name: 'type',
            message: 'Choice initation type',
            default: TYPE.TYPE_PROJECT,
            choices: [{
                name: 'project',
                value: TYPE.TYPE_PROJECT
            }, {
                name: 'component',
                value: TYPE.TYPE_COMPONENT
            }]
        })
        let info
        if (type === TYPE.TYPE_PROJECT)
            info = await this._getProjectInfo()
        else if (type === TYPE.TYPE_COMPONENT)
            info = await this._getComponentInfo()
        else throw new Error('Unvalidated type:', type)

        return {
            code: 1,
            type,
            ...info
        }
    }

    isCwdEmpty(localPath) {
        let fileList = fs.readdirSync(localPath)
        fileList = fileList.filter(file => !file.startsWith('.') && ['node_modules'].indexOf(file) < 0)
        return fileList.length <= 0
    }

    async _getProjectInfo() {
        return await inquirer.prompt([{
            type: 'input',
            name: 'projectName',
            default: this.projectName,
            message: 'Input the project name',
            validate(projectName) {
                const done = this.async();
                setTimeout(() => {
                    if (!/^[a-zA-Z]+([_][a-zA-Z][a-zA-Z0-9]*|[-][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(projectName))
                        done('You need to provide a validate project name');
                    else
                        done(null, true);
                }, 0);
            },
            filter(projectName) {
                return projectName
            }
        }, {
            type: 'input',
            name: 'version',
            default: '0.0.0',
            message: 'Input the project version',
            validate(version) {
                const done = this.async();
                setTimeout(() => {
                    if (!semver.valid(version))
                        done('You need to provide a validate project version');
                    else
                        done(null, true);
                }, 0);
            },
            filter(version) {
                return !!semver.valid(version) ? semver.valid(version) : version
            }
        }, {
            type: 'list',
            name: 'projectTemplate',
            message: 'Select the project template',
            choices: this.createTemplateChoices()
        }])
    }

    async _getComponentInfo() {
        return {
            componentName: 'componentName',
            componentVersion: '0.0.0'
        }
    }

    createTemplateChoices() {
        return this.template.map(temp => ({
            name: temp.templateName,
            value: temp.npmName
        }))
    }
}

function init(projectName, opts, cmd) {
    return new InitCommand(projectName, opts, cmd)
}

module.exports = init
