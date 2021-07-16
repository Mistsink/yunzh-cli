'use strict';


function init(projectName, opts, cmd) {
    console.log('init')
    console.log(projectName)
    console.log(opts)
    console.log(process.env.CLI_TARGET_PATH)
}

module.exports = init
