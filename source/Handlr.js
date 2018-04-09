const EventEmitter = require("eventemitter3");
const ChannelQueue = require("@buttercup/channel-queue");
const MemoryStorage = require("./MemoryStorage.js");
const NewJob = require("./NewJob.js");
const {
    JOB_STATUS_CANCELLED,
    JOB_STATUS_COMPLETED,
    JOB_STATUS_FAILED,
    JOB_STATUS_IDLE,
    JOB_STATUS_RUNNING
} = require("./symbols.js");

function attemptsDelayAllowsExecution(method) {

}

function attemptsDelayTimestampAllowsExecution(lastAttemptTs, delay) {

}

class Handlr extends EventEmitter {
    constructor(storage = new MemoryStorage()) {
        super();
        this._jobs = [];
        this._queue = new ChannelQueue();
        this.storage = storage;
    }

    get jobExecChannel() {
        return this._queue.channel("jobExec");
    }

    get jobSyncChannel() {
        return this._queue.channel("jobSync");
    }

    createJob(jobType, data) {
        return new NewJob(this, jobType, data);
    }

    exec() {
        if (this.jobExecChannel.isRunning) {
            // Already running, so we don't need to restart it
            return;
        }
        this.jobExecChannel.enqueue(() => {

        });
    }

    getJob(jobID) {
        return this._jobs.find(job => job.id === jobID) || null;
    }

    getNextJob() {
        const nextJob = this._jobs.find(job => {
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
        return this.jobSyncChannel.enqueue(() => {
            this._jobs.push(jobData);
            return this.storage
                .setJobData(jobData.id, jobData)
                .then(() => this._sortJobs());
        });
    }

    _sortJobs() {
        this._jobs.sort((jobA, jobB) => {
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
}

module.exports = Handlr;
