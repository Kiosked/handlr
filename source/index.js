const JobService = require("./JobService.js");
const { registerHandler } = require("./worker/index.js");
const { patchConsole } = require("./console.js");

patchConsole();

function createService(options) {
    return new JobService(options);
}

module.exports = {
    createService,
    registerHandler
};
