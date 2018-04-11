const VError = require("verror");
const EventEmitter = require("eventemitter3");
const NewJob = require("./NewJob.js");
const { addGlobalListeners, removeGlobalListeners } = require("./listening.js");
const {
    JOB_STATUS_CANCELLED,
    JOB_STATUS_COMPLETED,
    JOB_STATUS_FAILED,
    JOB_STATUS_IDLE,
    JOB_STATUS_RUNNING,
    JOB_STATUS_STARTING,
    JOB_TICKER_DELAY,
    PROCESSOR_STATUS_IDLE
} = require("./symbols.js");

const BASE_OPTIONS = {
    serverIndex: 0
};

function attemptsDelayAllowsExecution(method) {
    try {
        return !!method();
    } catch (err) {
        return false;
    }
}

function attemptsDelayTimestampAllowsExecution(lastAttemptTs, delay) {
    if (!lastAttemptTs) {
        return true;
    }
    return (lastAttemptTs + delay) <= Date.now();
}

function sanitiseOptions(ops) {
    if (typeof ops !== "object" || ops === null) {
        return Object.assign({}, BASE_OPTIONS);
    }
    return Object.assign({}, BASE_OPTIONS, ops);
}

class Handlr extends EventEmitter {
    constructor(options) {
        super();
        this._jobs = [];
        this._tick = null;
        this._options = Object.freeze(sanitiseOptions(options));
        this._handlers = [];
        this.__handleJobUpdate = this._handleJobUpdate.bind(this);
        addGlobalListeners(this);
    }

    get handlers() {
        return this._handlers;
    }

    get jobs() {
        return this._jobs;
    }

    get options() {
        return this._options;
    }

    createJob(jobType, data) {
        return new NewJob(this, jobType, data);
    }

    getJob(jobID) {
        return this.jobs.find(job => job.id === jobID) || null;
    }

    getNextJob() {
        const nextJob = this.jobs.find(job => {
            // @todo delayed
            if (job.status === JOB_STATUS_FAILED && job.attempts > 0) {
                // A failed job, but with attempts left
                if (typeof job.attemptsDelay === "function" && attemptsDelayAllowsExecution(job.attemptsDelay)) {
                    return true;
                } else if (job.attemptsDelay > 0 && attemptsDelayTimestampAllowsExecution(job.lastAttempt, job.attemptsDelay)) {
                    return true;
                }
            }
            return false;
        });
        return nextJob || null;
    }

    shutdown() {
        removeGlobalListeners(this);
        this.handlers.forEach(handler => {
            handler.removeListener("jobUpdate", this.__handleJobUpdate);
        });
        this._handlers = [];
    }

    _addJob(job) {
        this.jobs.push(job);
        this._sortJobs();
    }

    _addHandler(handler) {
        handler.on("jobUpdate", this.__handleJobUpdate);
        this.handlers.push(handler);
    }

    _handleJobUpdate() {

    }

    _removeHandler(workerID) {
        const handler = this.handlers.find(inst => inst.id === workerID);
        if (!handler) {
            throw new VError(`Failed removing handler: No handler found for ID: ${workerID}`);
        }
        handler.shutdown();
        this.handlers.splice(this.handlers.indexOf(handler), 1);
    }

    _sortJobs() {
        this.jobs.sort((jobA, jobB) => {
            const { priority: prioA } = jobA;
            const { priority: prioB } = jobB;
            if (prioA > prioB) {
                return 1;
            } else if (prioB > prioA) {
                return -1;
            }
            return 0;
        });
    }

    _startJob(job) {
        const { status, type } = job;
        if (status !== JOB_STATUS_IDLE) {
            throw new VError(`Failed starting job: Job not in IDLE state: ${status}`);
        }
        // find a worker that is idle
        const handler = this.handlers.find(handler =>
            handler.jobType === type &&
            handler.status === PROCESSOR_STATUS_IDLE
        );
        if (!handler) {
            // no handler available
            return false;
        }
        job.status = JOB_STATUS_STARTING;
        job.worker = handler.id;
        handler.startJob(job);
        return true;
    }
}

module.exports = Handlr;
