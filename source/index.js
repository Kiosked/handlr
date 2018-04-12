const JobService = require("./JobService.js");
const { registerHandler } = require("./worker/index.js");

function createService(options) {
    return new JobService(options);
}

module.exports = {
    createService,
    registerHandler
};
