const VError = require("verror");
const cluster = require("cluster");
const { getSharedChannel } = require("./MessageChannel.js");
const { CLUSTER_MESSAGE_PROP, COMM_TYPE_CLUSTER, COMM_TYPE_LOCAL } = require("./symbols.js");

function dispatch(job, payload, workerID, commType, clusterWorkerID) {
    if (commType === COMM_TYPE_CLUSTER) {
        const worker = cluster.workers[clusterWorkerID];
        worker.send({
            [CLUSTER_MESSAGE_PROP]: true,
            type: "job",
            job,
            payload,
            workerID
        });
    } else if (commType === COMM_TYPE_LOCAL) {
        getSharedChannel().emit("job", {
            type: "job",
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
