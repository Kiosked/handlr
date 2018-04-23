const cluster = require("cluster");
const EventEmitter = require("eventemitter3");
const isError = require("is-error");
const { getSharedChannel } = require("../MessageChannel.js");
const log = require("../log.js");

class Proxy extends EventEmitter {
    constructor(workerID, serverIndex) {
        super();
        this._workerID = workerID;
        this._serverIndex = serverIndex;
        this.__handleNewJob = this._handleNewJob.bind(this);
        if (cluster.isWorker) {
            // todo
        } else {
            getSharedChannel().on("job", this.__handleNewJob);
        }
    }

    get serverIndex() {
        return this._serverIndex;
    }

    get workerID() {
        return this._workerID;
    }

    failJob(job, err) {
        log.worker.error(`Job execution failed for job: ${job.id} (${job.type})`);
        log.worker.error(`Job ${job.id} failed with error`, err);
    }

    resolveJob(job, results) {
        log.worker.success(`Job was successfully completed: ${job.id} (${job.type})`);
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
            serverIndex: this.serverIndex,
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
                serverIndex: this.serverIndex,
                workerID: this.workerID
            });
        }
    }

    _handleNewJob(msg) {
        if (msg && msg.workerID && msg.workerID === this.workerID) {
            const { job } = msg;
            this._acceptJob(job);
            this.emit("job", job);
        }
    }

    _register(jobType) {
        if (cluster.isWorker) {
            // todo
        } else {
            getSharedChannel().emit("message", {
                type: "register",
                jobType,
                serverIndex: this.serverIndex,
                workerID: this.workerID
            });
        }
    }
}

module.exports = Proxy;
