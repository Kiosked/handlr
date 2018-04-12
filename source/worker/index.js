const uuid = require("uuid/v4");
const Proxy = require("./Proxy.js");

function registerHandler(jobType, callback, serverIndex = 0) {
    const proxy = new Proxy(uuid(), serverIndex);
    proxy.on("job", jobData => {
        try {
            const output = callback(jobData);
            if (output && typeof output.then === "function") {
                output
                    .then(result => proxy.resolveJob(result))
                    .catch(err => proxy.failJob(err));
            } else if (typeof output === "object") {
                proxy.resolveJob(output);
            } else {
                throw new Error("Job failed: Invalid output: Expected object or Promise");
            }
        } catch (err) {
            proxy.failJob(err);
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
