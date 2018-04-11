const uuid = require("uuid/v4");
const Proxy = require("./Proxy.js");

function registerHandler(jobType, callback) {
    const proxy = new Proxy(uuid());
    proxy.on("job", jobData => {

    });
    proxy._register(jobType);
    const remove = () => {
        proxy.shutdown();
    };
    return {
        remove
    };
}
