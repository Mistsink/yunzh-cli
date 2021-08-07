'use strict';

const fs = require('fs')
const fse = require('fs-extra')
const inquirer = require('inquirer')
const semver = require('semver')
const path = require('path')
const ejs = require('ejs')

const { homedir } = require('os')

const Command = require('@yunzh-cli-dev/command')
const log = require('@yunzh-cli-dev/log');
const Package = require('@yunzh-cli-dev/package')
const { sleep, newSpinner, execAsync } = require('@yunzh-cli-dev/utils')

const getTemplate = require('./getProjectTemplate');

const TYPE = {
    TYPE_PROJECT: 'project',
    TYPE_COMPONENT: 'component',
    TYPE_TEMPLATE_CUSTOM: 'custom',
    TYPE_TEMPLATE_NORMAL: 'normal'
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
        await this.installTemplate()
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
                return { code: -1 }
        }
        return this.getProjectInfo()
    }




    async getProjectInfo() {
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
        this.template = this.template.filter(temp => temp.tag?.includes(type))
        if (type === TYPE.TYPE_PROJECT)
            info = await this._getProjectInfo()
        else if (type === TYPE.TYPE_COMPONENT)
            info = await this._getComponentInfo()
        else throw new Error('Unvalidated type:', type)



        if (info.projectName) {
            info.className = require('kebab-case')(info.projectName).replace(/^-/, '')
        }

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

    /**
     * 
     * @param {TYPE ONEOF PROJECT and COMPONENT} type oneof 'project' 'component'
     */
    createProjectPrompt(type) {
        const prompt = [{
            type: 'input',
            name: 'projectName',
            default: this.projectName,
            message: `Input the ${type} name`,
            validate(projectName) {
                const done = this.async();
                setTimeout(() => {
                    if (!/^[a-zA-Z]+([_][a-zA-Z][a-zA-Z0-9]*|[-][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(projectName))
                        done(`You need to provide a validate ${type} name`);
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
            message: `Input the ${type} version`,
            validate(version) {
                const done = this.async();
                setTimeout(() => {
                    if (!semver.valid(version))
                        done(`You need to provide a validate ${type} version`);
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
            message: `Select the ${type} template`,
            choices: this.createTemplateChoices()
        }]

        if (type === TYPE.TYPE_COMPONENT) {
            prompt.push({
                type: 'input',
                name: 'componentDescription',
                message: 'Input the component description',
                default: '',
                validate: function (v) {
                    const done = this.async();
                    setTimeout(function () {
                        if (!v) {
                            done('You need to provide component description');
                            return;
                        }
                        done(null, true);
                    }, 0);
                },
            })
        }
        return prompt
    }

    async _getProjectInfo() {
        return await inquirer.prompt(this.createProjectPrompt(TYPE.TYPE_PROJECT))
    }

    async _getComponentInfo() {
        return await inquirer.prompt(this.createProjectPrompt(TYPE.TYPE_COMPONENT))
    }

    createTemplateChoices() {
        return this.template.map(temp => ({
            name: temp.templateName,
            value: temp.npmName
        }))
    }

    async downloadTemplate() {
        const { projectTemplate } = this.projectInfo
        const templateInfo = this.template.find(templ => templ.npmName === projectTemplate)
        this.templateInfo = templateInfo

        const cliHomePath = process.env.CLI_HOME_PATH ? process.env.CLI_HOME_PATH : path.resolve(homedir(), '.yunzh-cli')

        const targetPath = path.resolve(cliHomePath, 'template')
        const storeDir = path.resolve(targetPath, 'node_modules')
        const templatePackage = new Package({
            targetPath,
            storeDir,
            name: templateInfo.npmName,
            version: templateInfo.version
        })

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

        this.templatePackage = templatePackage
        console.log('templatePackage:', templatePackage)
    }

    async installTemplate() {
        if (!this.templateInfo) {
            throw new Error('Template info does not exist.')
        }

        if (!this.templateInfo.type) {
            this.templateInfo.type = TYPE.TYPE_TEMPLATE_NORMAL
        }
        switch (this.templateInfo.type) {
            case TYPE.TYPE_TEMPLATE_NORMAL:
                await this.installNormalTemplate()
                break
            case TYPE.TYPE_TEMPLATE_CUSTOM:
                await this.installCustomTemplate()
                break
            default:
                throw new Error('Unidentified template type: ' + this.templateInfo.type)
        }
    }

    ejsRender(options) {
        console.log('options:', options)
        const dir = process.cwd()
        return new Promise((resolve, reject) => {
            require('glob')('**', {
                cwd: dir,
                dot: true,
                ignore: options.ignore || '',
                nodir: true
            }, (err, files) => {
                if (err) {
                    reject(err)
                }

                Promise.all(files.map(file => {
                    const filePath = path.resolve(dir, file)
                    return new Promise((resolve, reject) => {
                        ejs.renderFile(filePath, this.projectInfo, (err, res) => {
                            if (err) {
                                reject(err)
                            } else {
                                fse.writeFileSync(filePath, res)
                                resolve(res)
                            }
                        })
                    })
                })).then(resolve)
                    .catch(reject)

            })
        })
    }

    async installNormalTemplate() {
        const spinner = newSpinner()
        spinner.start('insatlling template:', this.templateInfo.npmName)
        await sleep()
        const templateCachePath = path.resolve(this.templatePackage.cacheFilePath, 'template')
        const targetPath = process.cwd()
        try {
            await fse.ensureDir(templateCachePath)
            await fse.ensureDir(targetPath)
            await fse.copy(templateCachePath, targetPath)
        }
        catch (e) {
            throw e
        } finally {
            spinner.stop()
        }
        log.info('insatlled template:', this.templateInfo.npmName, "successfully.")
        if (this.templateInfo.installCommand) {
            log.info('install command:', this.templateInfo.installCommand)
        }
        if (this.templateInfo.runCommand) {
            log.info('run command:', this.templateInfo.runCommand)
        }

        const ignore = ['node_modules/*', 'public/*']
        await this.ejsRender({ ignore })

    }

    async installCustomTemplate() {
        if (! await this.templatePackage.exists())
            throw new Error('Custom template package does not exist.')

        const entryFile = await this.templatePackage.getEntryPath()
        if (fs.existsSync(entryFile)) {

            log.notice('Start installing custom template.')
            const templatePath = path.resolve(this.templatePackage.cacheFilePath, 'template')
            const code = `require('${pkgEntryPath}').apply(null, ${JSON.stringify([
                this._cmdVal,
                this._opts,
                this._cmd
            ])})`;

            await execAsync('node', ['-e', code], {
                cwd: process.cwd(),
                stdio: 'inherit',
            })
            log.info('Custom template installed successfully.')
        } else {
            throw new Error('Entry file of custom template does not exist.')
        }

    }

}

function init(projectName, opts, cmd) {
    return new InitCommand(projectName, opts, cmd)
}

module.exports = init
