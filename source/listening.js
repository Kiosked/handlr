const assert = require("assert");
const { getSharedChannel } = require("./MessageChannel.js");
const JobHandler = require("./JobHandler.js");
const { dispatch } = require("./dispatching.js");
const { COMM_TYPE_CLUSTER, COMM_TYPE_LOCAL } = require("./symbols.js");

const __removeListenerCallback = {};

function addGlobalListeners(service) {
    const { serverIndex } = service.options;
    const addWorker = message => {
        if (message && message.type && message.hasOwnProperty("serverIndex")) {
            if (message.serverIndex !== serverIndex) {
                // not for us
                return;
            }
            if (message.type === "register") {
                const { jobType, workerID } = message;
                assert(workerID.length > 0, "Worker ID must be provided");
                assert(jobType.length > 0, "Worker job type must be provided");
                const handler = new JobHandler(workerID, jobType, COMM_TYPE_LOCAL);
                handler.dispatcher = (...args) => dispatch(...args);
                service._addHandler(handler);
            } else if (message.type === "deregister") {
                const { workerID } = message;
                assert(workerID.length > 0, "Worker ID must be provided");
                service._removeHandler(workerID);
            } else if (message.type === "accept") {
                const { jobID, workerID } = message;
                assert(workerID.length > 0, "Worker ID must be provided");
                assert(jobID.length > 0, "Job ID type must be provided");
                service._acceptJob(workerID, jobID);
            }
        }
    };
    getSharedChannel().on("message", addWorker);
    __removeListenerCallback[`s${serverIndex}`] = () => {
        getSharedChannel().removeListener("message", addWorker);
    };
}

function removeGlobalListeners(service) {
    const removeCB = __removeListenerCallback[`s${serverIndex}`];
    if (removeCB) {
        removeCB();
    }
    delete __removeListenerCallback[`s${serverIndex}`];
}

module.exports = {
    addGlobalListeners,
    removeGlobalListeners
};