const cluster = require("cluster");
const EventEmitter = require("eventemitter3");
const isError = require("is-error");
const serialiseError = require("serialize-error");
const { getSharedChannel } = require("../MessageChannel.js");
const log = require("../log.js");
const { clone } = require("../data.js");
const { CLUSTER_MESSAGE_PROP } = require("../symbols.js");

class Proxy extends EventEmitter {
    constructor(workerID, serverIndex) {
        super();
        this._workerID = workerID;
        this._serverIndex = serverIndex;
        this.__handleNewJob = this._handleNewJob.bind(this);
        if (cluster.isWorker) {
            process.on("message", this.__handleNewJob);
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

    sendMessage(data) {
        const emit = cluster.isWorker
            ? () => process.send(data)
            : getSharedChannel().emit("message", data);
        emit();
    }

    failJob(job, err) {
        log.worker.error(`Job execution failed for job: ${job.id} (${job.type})`);
        log.worker.error(`Job ${job.id} failed with error`, err);
        this.sendMessage({
            [CLUSTER_MESSAGE_PROP]: true,
            type: "jobFailed",
            serverIndex: this.serverIndex,
            workerID: this.workerID,
            jobID: job.id,
            error: serialiseError(err)
        });
    }

    resolveJob(job, jobResult) {
        log.worker.success(`Job was successfully completed: ${job.id} (${job.type})`);
        const result =
            typeof jobResult !== "object" || jobResult === null ? { result: jobResult } : jobResult;
        this.sendMessage({
            [CLUSTER_MESSAGE_PROP]: true,
            type: "jobCompleted",
            serverIndex: this.serverIndex,
            workerID: this.workerID,
            jobID: job.id,
            result: clone(result)
        });
    }

    shutdown() {
        this._deregister();
        if (cluster.isWorker) {
            process.removeListener("message", this.__handleNewJob);
        } else {
            getSharedChannel().removeListener("job", this.__handleNewJob);
        }
    }

    _acceptJob(job) {
        this.sendMessage({
            [CLUSTER_MESSAGE_PROP]: true,
            type: "accept",
            serverIndex: this.serverIndex,
            workerID: this.workerID,
            jobID: job.id
        });
    }

    _deregister() {
        this.sendMessage({
            [CLUSTER_MESSAGE_PROP]: true,
            type: "deregister",
            serverIndex: this.serverIndex,
            workerID: this.workerID
        });
    }

    _handleNewJob(msg) {
        if (msg && msg[CLUSTER_MESSAGE_PROP] !== true) {
            // not for us
            return;
        }
        if (msg && msg.workerID && msg.workerID === this.workerID) {
            const { job, payload } = msg;
            this._acceptJob(job);
            this.emit("job", job, payload);
        }
    }

    _register(jobType) {
        this.sendMessage({
            [CLUSTER_MESSAGE_PROP]: true,
            type: "register",
            jobType,
            serverIndex: this.serverIndex,
            workerID: this.workerID
        });
    }
}

module.exports = Proxy;
