const VError = require("verror");
const { getSharedChannel } = require("./MessageChannel.js");
const { CLUSTER_MESSAGE_PREFIX, COMM_TYPE_CLUSTER, COMM_TYPE_LOCAL } = require("./symbols.js");

function dispatch(job, payload, workerID, commType, clusterWorkerID) {
    if (commType === COMM_TYPE_CLUSTER) {
        cluster.emit(`${CLUSTER_MESSAGE_PREFIX}job`, {
            job,
            payload,
            workerID
        });
    } else if (commType === COMM_TYPE_LOCAL) {
        getSharedChannel().emit("job", {
            job,
            payload,
            workerID
        });
    } else {
        throw new VError(`Failed dispatching job: Invalid comm type: ${commType}`);
    }
}

module.exports = {
    dispatch
};
