const cluster = require("cluster");
const uuid = require("uuid/v4");
const VError = require("verror");
const { getSharedInstance: getSharedMessageChannel } = require("./MessageChannel.js");
const { MESSAGE_PREFIX } = require("../symbols.js");

const MESSAGE_TTL = 5000;

const __callbacks = {};
let __channelListener,
    __processListener;

function attachChannelListener() {
    if (__channelListener) {
        return;
    }
    __channelListener = resp => {
        if (resp && resp.id && __callbacks[resp.id]) {
            __callbacks[resp.id](resp);
        }
    };
    getSharedMessageChannel().on("response", __channelListener);
}

function attachProcessListener() {
    if (__processListener) {
        return;
    }
    __processListener = resp => {
        if (resp && resp.id && __callbacks[resp.id]) {
            __callbacks[resp.id](resp);
        }
    };
    process.on("message", __processListener);
}

function sendMessage(msg) {
    return Promise
        .resolve()
        .then(() => {
            const { type } = msg;
            const msgID = uuid();
            const payload = Object.assign({}, msg, {
                id: msgID,
                type: `${MESSAGE_PREFIX}${type}`
            });
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    delete __callbacks[msgID];
                    reject(new VError(`Timed-out waiting for message response: ${type} (${msgID})`));
                }, MESSAGE_TTL);
                __callbacks[msgID] = response => {
                    delete __callbacks[msgID];
                    clearTimeout(timeout);
                    resolve(response);
                };
                if (cluster.isWorker) {
                    attachProcessListener();
                    process.send(payload);
                } else {
                    attachChannelListener();
                    getSharedMessageChannel().emit("message", payload);
                }
            });
        });
}
