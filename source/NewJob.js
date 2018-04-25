const VError = require("verror");
const uuid = require("uuid/v4");
const ms = require("ms");
const {
    JOB_PRIORITY_CRITICAL,
    JOB_PRIORITY_HIGH,
    JOB_PRIORITY_LOW,
    JOB_PRIORITY_NORMAL,
    JOB_STATUS_IDLE,
    MULTI_RESULT_DISCARD,
    MULTI_RESULT_FIRST,
    MULTI_RESULT_MERGE_DEPENDS,
    MULTI_RESULT_MERGE_PAYLOAD
} = require("./symbols.js");

const DefaultAttemptsDelay = ms("1m");
const Priority = {
    critical: JOB_PRIORITY_CRITICAL,
    high: JOB_PRIORITY_HIGH,
    normal: JOB_PRIORITY_NORMAL,
    low: JOB_PRIORITY_LOW
};

/**
 * Result actions
 * @name ResultAction
 * @enum {String}
 * @readonly
 */
const ResultAction = {
    /**
     * Discard all results from jobs depended upon
     */
    discard: MULTI_RESULT_DISCARD,
    /**
     * Take the result from the first job depended upon and provide that to the job as the payload
     */
    first: MULTI_RESULT_FIRST,
    /**
     * Merge the initial payload and all the results of the depended upon jobs,
     * from left to right (depends overwrites initial)
     */
    mergeDepends: MULTI_RESULT_MERGE_DEPENDS,
    /**
     * Merge all the results of the depended upon jobs, from left to right,
     * and then the initial payload (initial overwrites depends)
     */
    mergePayload: MULTI_RESULT_MERGE_PAYLOAD
};

class NewJob {
    constructor(service, type, payload = {}) {
        if (typeof payload !== "object" || payload === null) {
            throw new Error("Job payload must be an object");
        }
        this._service = service;
        this.type = type;
        this._priority = JOB_PRIORITY_NORMAL;
        this.payload = payload;
        this._attempts = 0;
        this._attemptsDelay = DefaultAttemptsDelay;
        this._depends = [];
        this._resultAction = MULTI_RESULT_MERGE_DEPENDS;
    }

    get data() {
        return Object.assign(
            {},
            {
                payload: this.payload,
                type: this.type,
                priority: this._priority,
                id: uuid(),
                status: JOB_STATUS_IDLE,
                depends: [...this._depends],
                dependentResultAction: this._resultAction,
                progress: 0,
                progressMax: 1,
                attempts: this._attempts,
                attemptsDelay: this._attemptsDelay,
                lastAttempt: null,
                worker: null,
                result: null,
                error: null
            }
        );
    }

    attempts(num, delay) {
        if (num >= 0) {
            this._attempts = num;
            if (delay) {
                if (delay > 0 || typeof delay === "function") {
                    this._attemptsDelay = delay;
                } else if (typeof delay === "string") {
                    this._attemptsDelay = ms(delay);
                } else {
                    throw new Error(
                        `Failed setting job attempts delay: Invalid type for delay: ${delay}`
                    );
                }
            }
            return this;
        }
        throw new VError(`Failed setting job attempts: Invalid attempts count: ${num}`);
    }

    commit() {
        const data = this.data;
        const remoteJob = this._service.getJob(data.id);
        if (remoteJob) {
            return Promise.reject(
                new VError(`Failed committing update: Job already exists: ${data.id}`)
            );
        }
        return this._service._addJob(data).then(() => data.id);
    }

    /**
     * Mark the job as dependent on other jobs
     * @param {Array.<String>|String} jobIDs
     * @param {ResultAction=} resultAction The action to take when merging results
     * @memberof NewJob
     * @returns {NewJob} Self
     */
    depends(jobIDs, resultAction = "mergeDepends") {
        const action = ResultAction[resultAction];
        if (!action) {
            throw new VError(
                `Failed setting job result processing action: Invalid action value: ${resultAction}`
            );
        }
        if (Array.isArray(jobIDs)) {
            this._depends = [...jobIDs];
        } else {
            this._depends = [jobIDs];
        }
        this._resultAction = action;
        return this;
    }

    priority(name) {
        const prio = Priority[name];
        if (!prio) {
            throw new VError(`Failed setting job priority: Invalid priority value: ${name}`);
        }
        this._priority = prio;
        return this;
    }
}

module.exports = NewJob;
