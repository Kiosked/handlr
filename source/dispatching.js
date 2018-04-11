const VError = require("verror");
const { getSharedChannel } = require("./MessageChannel.js");
const {
    COMM_TYPE_CLUSTER,
    COMM_TYPE_LOCAL
} = require("./symbols.js");

function dispatch(jobData, workerID, commType) {
    if (commType === COMM_TYPE_CLUSTER) {
        // todo
    } else if (commType === COMM_TYPE_LOCAL) {
        getSharedChannel().emit("job", {
            workerID,
            data: jobData
        });
    } else {
        throw new VError(`Failed dispatching job: Invalid comm type: ${commType}`);
    }
}

module.exports = {
    dispatch
};
