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

/**
 * A job
 * @typedef {Object} Job
 * @property {Number} attempts - The number of attempts the job has left to be retried (1 = 1 attempt left)
 * @property {Number|Function} attemptsDelay - The delay before retrying. A number (ms before retry) or a function that returns
 *  true when a retry is possible.
 * @property {Array.<String>} depends - An array of Job IDs that this job depends on
 * @property {String} dependentResultAction - Action to take when resolving results of depended-upon jobs
 * @property {Object} error - The last error to occur when processing this job
 * @property {String} id - The job ID
 * @property {Number|null} lastAttempt - The timestamp of the last attempt or null if there was none
 * @property {Object} payload - The job data/payload, provided by `createJob`
 * @property {String} priority - The job priority
 * @property {Number} progress - The current job progress
 * @property {Number} progressMax - The maximum job progress
 * @property {Object|null} result - The job result or null if it has not run yet
 * @property {String} status - The current job status
 * @property {String} type - The job type
 * @property {String|null} worker - The worker ID or null if not assigned
 */

/**
 * Rig for creating a new job
 */
class NewJob {
    /**
     * Constructor for the rig
     * @param {JobService} service Reference to the job service
     * @param {String} type The job type
     * @param {Object=} payload The job payload
     * @throws {Error} Throws if the payload is not an object
     * @memberof NewJob
     */
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
        this._id = uuid();
    }

    /**
     * The raw job data
     * @type {Job}
     * @memberof NewJob
     */
    get data() {
        return Object.assign(
            {},
            {
                payload: this.payload,
                type: this.type,
                priority: this._priority,
                id: this.id,
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

    /**
     * The job ID
     * @type {String}
     * @memberof NewJob
     */
    get id() {
        return this._id;
    }

    /**
     * Set the number of attempts and delay between them
     * @param {Number} num The number of attempts
     * @param {String|Number|Function=} delay The delay: Can be a string representation of a time (eg. "5s") (see "ms" npm package),
     *  a number (milliseconds) or a function that returns true when a new attempt can be made.
     * @memberof NewJob
     * @throws {VError} Throws when the delay property type is invalid
     * @throws {VError} Throws if the number of attempts is less than 0
     * @returns {NewJob} Self
     */
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

    /**
     * Commit the job and send it to the service
     * @returns {Promise.<String>} A promise that resolves with the job ID
     * @memberof NewJob
     */
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

    /**
     * Attach an event listener for this job
     * @param {String} event The job-specific event name
     * @param {Function} callback The callback to call when the event fires
     * @returns {{ remove: Function }} An object with a method for removing the listener
     * @memberof NewJob
     * @throws {VError} Throws if the event type is not related to jobs
     */
    on(event, callback) {
        if (/^job:/.test(event) !== true) {
            throw new VError(`Failed attaching event handler: Invalid job event type: ${event}`);
        }
        const internalCB = job => {
            if (job.id === this.id) {
                callback(job);
            }
        };
        this._service.on(event, internalCB);
        return {
            remove: () => {
                this._service.removeListener(event, internalCB);
            }
        };
    }

    /**
     * Attach a one-time event listener for this job
     * @param {String} event The event name
     * @param {Function} callback The callback
     * @returns {Object} Listener controls
     * @see NewJob#on
     * @memberof NewJob
     */
    once(event, callback) {
        const handleEvent = job => {
            removeOnCB();
            callback(job);
        };
        const { remove: removeOnCB } = this.on(event, handleEvent);
        return {
            remove: removeOnCB
        };
    }

    /**
     * Set the job priority
     * @param {String} name The priority level name
     * @returns {NewJob} Self
     * @memberof NewJob
     */
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
