const EventEmitter = require("eventemitter3");
const VError = require("verror");
const {
    COMM_TYPE_CLUSTER,
    COMM_TYPE_LOCAL,
    PROCESSOR_STATUS_ACTIVE,
    PROCESSOR_STATUS_IDLE
} = require("./symbols.js");
const log = require("./log.js");

class JobHandler extends EventEmitter {
    constructor(id, jobType, commType) {
        super();
        this._status = PROCESSOR_STATUS_IDLE;
        this._dispatcher = null;
        this.job = null;
        this._jobType = jobType;
        this._commType = commType;
        this._id = id;
        this.clusterWorkerID = null;
        if (!id) {
            throw new VError("Failed constructing JobHandler: Invalid or no ID provided");
        }
        if (!jobType) {
            throw new VError("Failed constructing JobHandler: Invalid or no job type provided");
        }
        if ([COMM_TYPE_CLUSTER, COMM_TYPE_LOCAL].indexOf(commType) === -1) {
            throw new VError("Failed constructing JobHandler: Invalid or no comm type provided");
        }
    }

    get commType() {
        return this._commType;
    }

    get dispatcher() {
        return this._dispatcher;
    }

    get id() {
        return this._id;
    }

    get jobType() {
        return this._jobType;
    }

    get status() {
        return this._status;
    }

    set dispatcher(newDispatcher) {
        if (typeof newDispatcher !== "function") {
            throw new VError("Failed setting dispatcher: Expected dispatcher to be a function");
        }
        this._dispatcher = newDispatcher;
    }

    completeJob(jobID, result) {
        this.emit("jobUpdate", {
            jobID,
            type: "resolution",
            success: true,
            result
        });
        this._status = PROCESSOR_STATUS_IDLE;
        this.job = null;
    }

    failJob(jobID, error) {
        this.emit("jobUpdate", {
            jobID,
            type: "resolution",
            success: false,
            error
        });
        this._status = PROCESSOR_STATUS_IDLE;
        this.job = null;
    }

    shutdown() {
        this._dispatcher = null;
        this.removeAllListeners();
    }

    startJob(job, payload) {
        if (this.status !== PROCESSOR_STATUS_IDLE) {
            throw new VError("Failed starting job on worker: Not in idle state");
        }
        log.service.info(`Starting job: ${job.type} (${job.id})`);
        this._status = PROCESSOR_STATUS_ACTIVE;
        setTimeout(() => {
            this.dispatcher(job, payload, this.id, this.commType, this.clusterWorkerID);
        }, 0);
    }

    updateJobProgress(jobID, progress, progressMax) {
        this.emit("jobUpdate", {
            jobID,
            type: "progress",
            progress,
            progressMax
        });
    }
}

module.exports = JobHandler;
