/**
 * Job control harness
 * @typedef {Object} ControlHarness
 * @property {String} id - The job ID
 * @property {Number} progress - The job progress
 * @property {Number} progressMax - The max progress
 * @property {String} type - The job type
 */

function generateJobControlHarness(proxy, job) {
    const harness = {
        get id() {
            return job.id;
        },
        get progress() {
            return job.progress;
        },
        get progressMax() {
            return job.progressMax;
        },
        get type() {
            return job.type;
        },
        /**
         * Set the current progress of the job
         * @name setProgress
         * @memberof ControlHarness
         * @param {Number} progress The new progress value
         * @returns {ControlHarness} Self
         */
        setProgress: progress => {
            job.progress = progress;
            proxy.updateProgress(job, progress, job.progressMax);
            return harness;
        },
        /**
         * Set the max progress for the job
         * @name setProgressMax
         * @memberof ControlHarness
         * @param {Number} max The new max progress value
         * @returns {ControlHarness} Self
         */
        setProgressMax: max => {
            job.progressMax = max;
            proxy.updateProgress(job, job.progress, max);
            return harness;
        }
    };
    return harness;
}

module.exports = {
    generateJobControlHarness
};
