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

    receiveJobUpdate() {

    }

    shutdown() {

    }

    startJob(job) {
        if (this.status !== PROCESSOR_STATUS_IDLE) {
            throw new VError("Failed starting job on worker: Not in idle state");
        }
        log.worker.info(`Starting job: ${job.type} (${job.id})`);
        this._status = PROCESSOR_STATUS_ACTIVE;
        setTimeout(() => {
            this.dispatcher(job, this.id, this.commType);
        }, 0);
    }
}

module.exports = JobHandler;
