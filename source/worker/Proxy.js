const cluster = require("cluster");
const EventEmitter = require("eventemitter3");
const { getSharedChannel } = require("./MessageChannel.js");

class Proxy extends EventEmitter {
    constructor(workerID) {
        super();
        this._workerID = workerID;
        this.__handleMessage = this._handleMessage.bind(this);
        if (cluster.isWorker) {
            // todo
        } else {
            getSharedChannel().on("job", this.__handleMessage);
        }
    }

    get workerID() {
        return this._workerID;
    }

    shutdown() {
        this._deregister();
        if (cluster.isWorker) {
            // todo
        } else {
            getSharedChannel().removeListener("job", this.__handleMessage);
        }
    }

    _acceptJob(job) {
        getSharedChannel().emit("message", {
            type: "accept",
            workerID: this.workerID,
            jobID: job.id
        });
    }

    _deregister() {
        if (cluster.isWorker) {
            // todo
        } else {
            getSharedChannel().emit("message", {
                type: "deregister",
                workerID: this.workerID
            });
        }
    }

    _handleNewJob(msg) {
        if (msg && msg.workerID && msg.workerID === this.workerID) {
            const { data } = msg;
            this._acceptJob(data);
            this.emit("job", data);
        }
    }

    _register(jobType) {
        if (cluster.isWorker) {
            // todo
        } else {
            getSharedChannel().emit("message", {
                type: "register",
                jobType,
                workerID: this.workerID
            });
        }
    }
}

module.exports = Proxy;
