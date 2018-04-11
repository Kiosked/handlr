const cluster = require("cluster");

const MESSAGE_PREFIX = "handlr:clustermsg:";

const __attachedWorkerListeners = {};
const __attachedNewWorkerListeners = {};

function attachWorkerListener(worker, callback) {
    const index = `s${this.options.serverIndex}:${worker.id}`;
    const listener = message => callback(worker, message);
    __attachedWorkerListeners[index] = [worker, listener];
    worker.on("message", listener);
}

function handleJobRequests() {
    const onWorkerMessage = handleWorkerMessage.bind(this);
    const onNewWorkerListener = worker => {
        attachWorkerListener.call(this, worker, onWorkerMessage);
    };
    if (cluster.isMaster) {
        for (const workerID in cluster.workers) {
            attachWorkerListener.call(this, cluster.workers[workerID], onWorkerMessage);
        }
        cluster.on("fork", onNewWorkerListener);
        __attachedNewWorkerListeners[`s${this.options.serverIndex}`] = onNewWorkerListener;
    }
}

function handleWorkerMessage(worker, message) {
    const { type: msgType, id } = message;
    if (!msgType || msgType.indexOf(MESSAGE_PREFIX) !== 0) {
        // ignore this message as it's not for us
        return;
    }
    const type = msgType.substr(MESSAGE_PREFIX.length);
    switch (type) {

        default:
            worker.send({
                type: "error",
                id,
                error: `Unknown event type: ${type}`
            });
    }
}

function removeAllListeners() {
    const { serverIndex } = this.options;
    for (const workerListenerKey in __attachedWorkerListeners) {
        if (workerListenerKey.indexOf(`s${serverIndex}:`) === 0) {
            const [ worker, listener ] = __attachedWorkerListeners[workerListenerKey];
            try {
                worker.removeListener("message", listener);
            } catch (err) {}
            delete __attachedWorkerListeners[workerListenerKey];
        }
    }
    if (__attachedNewWorkerListeners.hasOwnProperty(`s${serverIndex}`)) {
        try {
            cluster.removeListener("fork", listener);
        } catch (err) {}
        delete __attachedNewWorkerListeners[`s${serverIndex}`];
    }
}

module.exports = {
    MESSAGE_PREFIX,
    handleJobRequests,
    removeAllListeners
};
