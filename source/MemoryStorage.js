const VError = require("verror");

class MemoryStorage {
    constructor() {
        this._store = {};
    }

    getJobData(jobID) {
        const key = this.keyJob(jobID);
        if (this._store[key]) {
            return Promise
                .resolve(this._store[key])
                .then(JSON.parse)
                .catch(err => {
                    throw new VError(err, `Failed getting job data for ID: ${jobID}`);
                });
        }
        return Promise.resolve(null);
    }

    keyJob(jobID) {
        return `handlr:job:${jobID}`;
    }

    setJobData(jobID, jobData) {
        const key = this.keyJob(jobID);
        this._store[key] = JSON.stringify(jobData);
        return Promise.resolve();
    }
}

module.exports = MemoryStorage;
