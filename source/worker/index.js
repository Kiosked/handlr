const cluster = require("cluster");
const uuid = require("uuid/v4");
const Proxy = require("./Proxy.js");
const { patchConsole } = require("../console.js");
const { generateJobControlHarness } = require("./controls.js");

if (cluster.isWorker) {
    patchConsole();
}

/**
 * Register a job handler
 * @param {String} jobType The type of job to handle
 * @param {Function} callback The callback method, which takes 2 parameters
 * @param {Number=} serverIndex The optional server index, if multiple servers are used
 * @example
 *  registerHandler("jobType", (data, control) => {
 *      control.setProgressMax(100);
 *      control.setProgress(1);
 *      // do something with `data`
 *      return data.item + 1;
 *  });
 */
function registerHandler(jobType, callback, serverIndex = 0) {
    const proxy = new Proxy(uuid(), serverIndex);
    proxy.on("job", (job, payload) => {
        try {
            const harness = generateJobControlHarness(proxy, job);
            const output = callback(payload, harness);
            if (output && typeof output.then === "function") {
                output
                    .then(result => proxy.resolveJob(job, result))
                    .catch(err => proxy.failJob(job, err));
            } else {
                proxy.resolveJob(job, output);
            }
        } catch (err) {
            proxy.failJob(job, err);
        }
    });
    proxy._register(jobType);
    const remove = () => {
        proxy.shutdown();
    };
    return {
        remove
    };
}

module.exports = {
    registerHandler
};
