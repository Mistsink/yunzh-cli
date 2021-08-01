const request = require('@yunzh-cli-dev/request')

module.exports = function() {
    return request({
      url: '/project/template',
    });
  };
  