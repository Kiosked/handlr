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
        setProgress: progress => {
            job.progress = progress;
            proxy.updateProgress(job, progress, job.progressMax);
            return harness;
        },
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
