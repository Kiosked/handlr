const { createSession } = require("iocane");
const ChannelQueue = require("@buttercup/channel-queue");

class Persistence {
    constructor(encryptionKey = null) {
        this._queue = new ChannelQueue();
        this._encryptionKey = encryptionKey;
    }

    get active() {
        return this.workChannel.isRunning;
    }

    get workChannel() {
        return this._queue.channel("work");
    }

    persist(jobs) {
        return this.workChannel.enqueue(() =>
            Promise.resolve(jobs)
                .then(JSON.stringify)
                .then(jobsStr => {
                    if (this._encryptionKey) {
                        return createSession()
                            .use("gcm")
                            .setDerivationRounds(500000)
                            .encrypt(jobsStr, this._encryptionKey);
                    }
                    return jobsStr;
                })
        );
    }
}

module.exports = Persistence;
