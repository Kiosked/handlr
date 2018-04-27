const VError = require("verror");
const EventEmitter = require("eventemitter3");
const { arrowRight } = require("figures");
const NewJob = require("./NewJob.js");
const { addGlobalListeners, removeGlobalListeners } = require("./listening.js");
const {
    changeJobStatus,
    markAttempt,
    resolvePayload,
    setError,
    setProgress,
    setResult
} = require("./job.js");
const { clone } = require("./data.js");
const { patchConsole } = require("./console.js");
const {
    EVENT_JOB_ADDED,
    EVENT_JOB_COMPLETED,
    EVENT_JOB_FAILED,
    EVENT_JOB_PROGRESS,
    EVENT_JOB_STARTED,
    EVENT_JOB_STOPPED,
    EVENT_SERVICE_IDLE,
    EVENT_SERVICE_SHUTDOWN,
    JOB_STATUS_CANCELLED,
    JOB_STATUS_COMPLETED,
    JOB_STATUS_FAILED,
    JOB_STATUS_IDLE,
    JOB_STATUS_RUNNING,
    JOB_STATUS_STARTING,
    JOB_TICKER_DELAY,
    PROCESSOR_STATUS_IDLE
} = require("./symbols.js");
const log = require("./log.js");

const ACTIVE_JOB_STATUSES = [JOB_STATUS_IDLE, JOB_STATUS_RUNNING, JOB_STATUS_STARTING];
const BASE_OPTIONS = {
    serverIndex: 0,
    wrapConsole: true
};

function attemptsDelayAllowsExecution(lastAttemptTs, method) {
    try {
        const result = method(lastAttemptTs);
        if (typeof result === "string" || typeof result === "number") {
            return attemptsDelayTimestampAllowsExecution(lastAttemptTs, result);
        }
        return !!result;
    } catch (err) {
        return false;
    }
}

function attemptsDelayTimestampAllowsExecution(lastAttemptTs, delay) {
    if (!lastAttemptTs) {
        return true;
    }
    return lastAttemptTs + delay <= Date.now();
}

function sanitiseOptions(ops) {
    if (typeof ops !== "object" || ops === null) {
        return Object.assign({}, BASE_OPTIONS);
    }
    return Object.assign({}, BASE_OPTIONS, ops);
}

class JobService extends EventEmitter {
    constructor(options) {
        super();
        this._jobs = [];
        this._tick = null;
        this._options = Object.freeze(sanitiseOptions(options));
        this._handlers = [];
        this.__handleJobUpdate = this._handleJobUpdate.bind(this);
        if (this._options.wrapConsole) {
            patchConsole();
        }
        addGlobalListeners(this);
        this._init();
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

    createJob(jobType, payload) {
        return new NewJob(this, jobType, payload);
    }

    getJob(jobID) {
        return this.jobs.find(job => job.id === jobID) || null;
    }

    getNextJob() {
        const nextJob = this.jobs.find(job => {
            let matching = false;
            if (job.status === JOB_STATUS_FAILED && job.attempts > 0) {
                // A failed job, but with attempts left
                if (
                    typeof job.attemptsDelay === "function" &&
                    attemptsDelayAllowsExecution(job.lastAttempt, job.attemptsDelay)
                ) {
                    matching = true;
                } else if (
                    job.attemptsDelay > 0 &&
                    attemptsDelayTimestampAllowsExecution(job.lastAttempt, job.attemptsDelay)
                ) {
                    matching = true;
                }
            } else if (job.status === JOB_STATUS_IDLE) {
                // An idle job
                matching = true;
            }
            if (matching && job.depends.length > 0) {
                // Check dependent jobs are COMPLETED
                const dependentJobs = job.depends.map(jobID => this.getJob(jobID));
                matching = dependentJobs.every(job => job.status === JOB_STATUS_COMPLETED);
            }
            return matching;
        });
        return nextJob || null;
    }

    shutdown() {
        log.service.info("Shutting down");
        removeGlobalListeners(this);
        this.handlers.forEach(handler => {
            handler.shutdown();
            handler.removeListener("jobUpdate", this.__handleJobUpdate);
        });
        this._handlers = [];
        clearTimeout(this._tick);
        this._tick = null;
        this.emit(EVENT_SERVICE_SHUTDOWN, {
            serverIndex: this.options.serverIndex
        });
    }

    _acceptJob(workerID, jobID) {
        const job = this.getJob(jobID);
        changeJobStatus(job, JOB_STATUS_RUNNING);
    }

    _addJob(job) {
        log.service.info(`Adding new job: ${job.type} (${job.id})`);
        if (job.depends.length > 0) {
            log.service.info(`Job ${job.id} depends on:`);
            job.depends.forEach(dependedID => {
                log.service.info(`\t${arrowRight} ${dependedID}`);
            });
        }
        this.jobs.push(job);
        this._sortJobs();
        this.emit(EVENT_JOB_ADDED, clone(job));
        return Promise.resolve();
    }

    _addHandler(handler) {
        log.service.info(
            `Job handler registered for job type: ${handler.jobType} (${handler.commType})`
        );
        handler.on("jobUpdate", this.__handleJobUpdate);
        this.handlers.push(handler);
    }

    _checkAllStopped() {
        const activeJob = this.jobs.find(job => ACTIVE_JOB_STATUSES.indexOf(job.stats) >= 0);
        if (!activeJob) {
            this.emit(EVENT_SERVICE_IDLE, {
                serverIndex: this.options.serverIndex
            });
        }
    }

    _getHandler(handlerID) {
        return this.handlers.find(handler => handler.id === handlerID);
    }

    _handleJobUpdate(digest) {
        const { jobID, type } = digest;
        const job = this.getJob(jobID);
        if (type === "resolution") {
            const { success } = digest;
            if (success) {
                setResult(job, digest.result);
                changeJobStatus(job, JOB_STATUS_COMPLETED);
                this.emit(EVENT_JOB_COMPLETED, clone(job));
                this.emit(EVENT_JOB_STOPPED, clone(job));
            } else {
                markAttempt(job);
                changeJobStatus(job, JOB_STATUS_FAILED);
                setError(job, digest.error);
                this.emit(EVENT_JOB_FAILED, clone(job));
                this.emit(EVENT_JOB_STOPPED, clone(job));
            }
            this._checkAllStopped();
        } else if (type === "progress") {
            const { progress, progressMax } = digest;
            setProgress(job, progress, progressMax);
            this.emit(EVENT_JOB_PROGRESS, clone(job));
        }
    }

    _init() {
        if (this._tick !== null) {
            return;
        }
        log.service.info("Starting job service");
        const startTicker = () => {
            this._tick = setTimeout(() => {
                if (this._tick === null) {
                    return;
                }
                const job = this.getNextJob();
                if (job) {
                    this._startJob(job);
                }
                startTicker();
            }, JOB_TICKER_DELAY);
        };
        startTicker();
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
        const { status, type, id } = job;
        if (
            status !== JOB_STATUS_IDLE &&
            status !== JOB_STATUS_FAILED &&
            status !== JOB_STATUS_CANCELLED
        ) {
            throw new VError(
                `Failed starting job: Job not in IDLE/FAILED/CANCELLED state: ${status}`
            );
        }
        log.service.info(`Searching for handlers for job: ${job.type} (${id})`);
        // find a worker that is idle
        const handler = this.handlers.find(
            handler => handler.jobType === type && handler.status === PROCESSOR_STATUS_IDLE
        );
        if (!handler) {
            // no handler available
            return false;
        }
        // prepare payload
        const dependedJobs = job.depends.map(jobID => this.getJob(jobID));
        const payload = resolvePayload(job, dependedJobs);
        // start job
        log.service.info(`Assigning job ${id} (${job.type}) to handler: ${handler.id}`);
        changeJobStatus(job, JOB_STATUS_STARTING);
        job.worker = handler.id;
        // Take the payload separately, as it has just been resolved:
        handler.startJob(job, payload);
        this.emit(EVENT_JOB_STARTED, clone(job));
        return true;
    }
}

module.exports = JobService;
