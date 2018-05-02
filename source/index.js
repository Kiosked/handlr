const JobService = require("./JobService.js");
const { registerHandler } = require("./worker/index.js");
const Persistence = require("./Persistence.js");
const FilePersistence = require("./FilePersistence.js");

function createService(options) {
    return new JobService(options);
}

module.exports = {
    FilePersistence,
    Persistence,
    createService,
    registerHandler
};
