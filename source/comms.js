const cluster = require("cluster");
const { getSharedInstance: getSharedMessageChannel } = require("./MessageChannel.js");
const JobProcessor = require("./JobProcessor.js");
const { MESSAGE_PREFIX } = require("./symbols.js");

const __attachedWorkerListeners = {};
const __attachedNewWorkerListeners = {};
const __attachedMessageChannelListeners = {};

function attachWorkerListener(worker, callback) {
    const index = `s${this.options.serverIndex}:${worker.id}`;
    const listener = message => callback(worker, message);
    __attachedWorkerListeners[index] = [worker, listener];
    worker.on("message", listener);
}

function handleJobMessages() {
    const onWorkerMessage = handleMessage.bind(this);
    const onNewWorkerListener = worker => {
        attachWorkerListener.call(this, worker, onWorkerMessage);
    };
    const onMessageChannelMessage = message => {
        handleMessage.call(
            this,
            {
                // "send" for replies:
                send: reply => getSharedMessageChannel().emit("response", reply),
                // "notification" for new messages to the client
                sendNotification: msg => getSharedMessageChannel().emit("notification", msg)
            },
            message
        );
    };
    if (cluster.isMaster) {
        for (const workerID in cluster.workers) {
            attachWorkerListener.call(this, cluster.workers[workerID], onWorkerMessage);
        }
        cluster.on("fork", onNewWorkerListener);
        __attachedNewWorkerListeners[`s${this.options.serverIndex}`] = onNewWorkerListener;
    }
    getSharedMessageChannel().on("message", onMessageChannelMessage);
    __attachedMessageChannelListeners[`s${this.options.serverIndex}`] = onMessageChannelMessage;
}

function handleMessage(sender, message) {
    const { type: msgType, id } = message;
    if (!msgType || msgType.indexOf(MESSAGE_PREFIX) !== 0) {
        // ignore this message as it's not for us
        return;
    }
    const type = msgType.substr(MESSAGE_PREFIX.length);
    const sendToClient = sender.sendNotification || sender.send;
    switch (type) {
        case "register": {
            const { handlerID, jobType } = message;
            const processor = new JobProcessor(handlerID, jobType);
            processor.dispatcher = jobData => {
                sendToClient({
                    type: "job",
                });
            };
            this.handlers.push(processor);
            break;
        }
        default:
            sendToClient({
                type: "error",
                id,
                error: `Unknown event type: ${type}`
            });
            break;
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
            cluster.removeListener("fork", __attachedNewWorkerListeners[`s${serverIndex}`]);
        } catch (err) {}
        delete __attachedNewWorkerListeners[`s${serverIndex}`];
    }
    if (__attachedMessageChannelListeners.hasOwnProperty(`s${serverIndex}`)) {
        try {
            getSharedMessageChannel().removeListener("message", __attachedMessageChannelListeners[`s${serverIndex}`]);
        } catch (err) {}
        delete __attachedMessageChannelListeners[`s${serverIndex}`];
    }
}

module.exports = {
    MESSAGE_PREFIX,
    handleJobMessages,
    removeAllListeners
};
