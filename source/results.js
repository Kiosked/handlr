const merge = require("merge");

function clone(obj) {
    return merge.clone(obj);
}

function isObject(obj) {
    return typeof obj === "object" && obj !== null;
}

function mergePayloads(...payloads) {
    return payloads.reduce(
        (output, payload) => merge.recursive(
            output,
            isObject(payload) ? payload : {}
        ),
        {}
    );
}

module.exports = {
    clone,
    mergePayloads
};
