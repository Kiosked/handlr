const EventEmitter = require("eventemitter3");
const NewJob = require("./NewJob.js");
const {
    JOB_STATUS_CANCELLED,
    JOB_STATUS_COMPLETED,
    JOB_STATUS_FAILED,
    JOB_STATUS_IDLE,
    JOB_STATUS_RUNNING,
    JOB_TICKER_DELAY
} = require("./symbols.js");

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

class Handlr extends EventEmitter {
    constructor() {
        super();
        this._jobs = [];
        this._handlers = {};
        this._tick = null;
    }

    get jobs() {
        return this._jobs;
    }

    create(jobType, data) {
        this._startTick();
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

    _addJob(jobData) {
        this.jobs.push(jobData);
        this._sortJobs();
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

    _startTick() {
        if (this._tick !== null) {
            return;
        }
        this._tick = setTimeout(() => this._tick, JOB_TICKER_DELAY);
    }

    _tick() {

    }
}

module.exports = Handlr;
