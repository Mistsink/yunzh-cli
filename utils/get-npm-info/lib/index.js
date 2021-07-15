const axios = require('axios')
const urlJoin = require('url-join')
const semver = require('semver')


function getNpmInfo(npmName, registry = getDefaultRegistry()) {
    if (!npmName) return null

    const npmInfoUrl = urlJoin(registry, npmName)
    return axios.get(npmInfoUrl).then(res => res.status === 200 ? res : null)
}


function getDefaultRegistry() {
    const isOrigin = false
    return isOrigin ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org'
}


async function getNpmVersions(npmName, registry) {
    const { data } = await getNpmInfo(npmName, registry)
    if (data) {
        return Object.keys(data.versions)
    } else {
        return []
    }
}


function getSemverVersions(baseVersion, versions) {
    return versions.filter(version => semver.satisfies(version, `^${baseVersion}`))
        .sort((a, b) => semver.gt(b, a))
}

async function getNpmSemverVersion(npmName, baseVersion, registry = getDefaultRegistry()) {
    const versions = await getNpmVersions(npmName, registry)
    const newVersions = getSemverVersions(baseVersion, versions)
    if (newVersions && newVersions.length > 0) {
        return newVersions[0]
    }
    return null
}

module.exports = {
    getNpmInfo,
    getNpmVersions,
    getNpmSemverVersion
}