'use strict';

const axios = require('axios')

const BASE_URL = process.env.YUNZH_CLI_BASE_URL ? process.env.YUNZH_CLI_BASE_URL : 'http://localhost:7001'

const request = axios.default.create({
    baseURL: BASE_URL,
    timeout: 5000
})

request.interceptors.response.use(res => res.data)

module.exports = request;
