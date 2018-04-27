const assert = require("assert");
const cluster = require("cluster");
const { getSharedChannel } = require("./MessageChannel.js");
const JobHandler = require("./JobHandler.js");
const { dispatch } = require("./dispatching.js");
const { CLUSTER_MESSAGE_PROP, COMM_TYPE_CLUSTER, COMM_TYPE_LOCAL } = require("./symbols.js");

const __removeListenerCallback = {};

function addClusterListeners(handler) {
    const workers = [];
    const addWorkerListener = worker => {
        workers.push(worker);
        const handleWorkerMessage = msg => {
            if (typeof msg === "object" && msg[CLUSTER_MESSAGE_PROP] === true) {
                handler(msg, worker.id);
            }
        };
        worker.on("message", handleWorkerMessage);
        worker.on("disconnect", () => {
            worker.removeListener("message", handleWorkerMessage);
            workers.splice(workers.indexOf(worker), 1);
        });
    };
    cluster.on("fork", addWorkerListener);
    return () => {
        workers.forEach(worker => {
            worker.removeAllListeners();
        });
        workers.splice(0, workers.length);
        cluster.removeListener("fork", addWorkerListener);
    };
}

function addGlobalListeners(service) {
    const { serverIndex } = service.options;
    const handleMessage = (message, clusterWorkerID = null) => {
        if (message && message.type && message.hasOwnProperty("serverIndex")) {
            if (message.serverIndex !== serverIndex) {
                // not for us
                return;
            }
            switch (message.type) {
                case "register": {
                    const { jobType, workerID } = message;
                    assert(workerID.length > 0, "Worker ID must be provided");
                    assert(jobType.length > 0, "Worker job type must be provided");
                    const handler = new JobHandler(
                        workerID,
                        jobType,
                        clusterWorkerID === null ? COMM_TYPE_LOCAL : COMM_TYPE_CLUSTER
                    );
                    handler.clusterWorkerID = clusterWorkerID;
                    handler.dispatcher = (...args) => dispatch(...args);
                    service._addHandler(handler);
                    break;
                }
                case "deregister": {
                    const { workerID } = message;
                    assert(workerID.length > 0, "Worker ID must be provided");
                    service._removeHandler(workerID);
                    break;
                }
                case "accept": {
                    const { jobID, workerID } = message;
                    assert(workerID.length > 0, "Worker ID must be provided");
                    assert(jobID.length > 0, "Job ID type must be provided");
                    service._acceptJob(workerID, jobID);
                    break;
                }
                case "jobCompleted": {
                    const { workerID, jobID, result } = message;
                    assert(workerID.length > 0, "Worker ID must be provided");
                    assert(jobID.length > 0, "Job ID type must be provided");
                    const handler = service._getHandler(workerID);
                    assert(handler, "Job handler for completed job must be registered");
                    handler.completeJob(jobID, result);
                    break;
                }
                case "jobFailed": {
                    const { workerID, jobID, error } = message;
                    assert(workerID.length > 0, "Worker ID must be provided");
                    assert(jobID.length > 0, "Job ID type must be provided");
                    const handler = service._getHandler(workerID);
                    assert(handler, "Job handler for failed job must be registered");
                    handler.failJob(jobID, error);
                    break;
                }
                case "jobProgress": {
                    const { workerID, jobID, progress, progressMax } = message;
                    assert(workerID.length > 0, "Worker ID must be provided");
                    assert(jobID.length > 0, "Job ID type must be provided");
                    assert(typeof progress === "number", "Progress must be a number");
                    assert(typeof progressMax === "number", "Progress maximum must be a number");
                    const handler = service._getHandler(workerID);
                    assert(handler, "Job handler for failed job must be registered");
                    handler.updateJobProgress(jobID, progress, progressMax);
                    break;
                }
                default:
                    throw new Error(`Failed handling message: Unknown type: ${message.type}`);
            }
        }
    };
    getSharedChannel().on("message", handleMessage);
    // const handleClusterMessage = msg => {
    //     if (typeof msg === "object" && msg[CLUSTER_MESSAGE_PROP] === true) {
    //         handleMessage(msg);
    //     }
    // };
    // cluster.on("message", handleClusterMessage);
    const removeClusterListeners = addClusterListeners(handleMessage);
    __removeListenerCallback[`s${serverIndex}`] = () => {
        getSharedChannel().removeListener("message", handleMessage);
        // cluster.removeListener("message", handleClusterMessage);
        removeClusterListeners();
    };
}

function removeGlobalListeners(service) {
    const { serverIndex } = service.options;
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
