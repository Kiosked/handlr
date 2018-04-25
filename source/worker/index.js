const cluster = require("cluster");
const uuid = require("uuid/v4");
const Proxy = require("./Proxy.js");
const { patchConsole } = require("../console.js");

if (cluster.isWorker) {
    patchConsole();
}

function registerHandler(jobType, callback, serverIndex = 0) {
    const proxy = new Proxy(uuid(), serverIndex);
    proxy.on("job", (job, payload) => {
        try {
            const output = callback(payload);
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
