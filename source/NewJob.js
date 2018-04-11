const VError = require("verror");
const uuid = require("uuid/v4");
const ms = require("ms");
const {
    JOB_PRIORITY_CRITICAL,
    JOB_PRIORITY_HIGH,
    JOB_PRIORITY_LOW,
    JOB_PRIORITY_NORMAL,
    JOB_STATUS_IDLE
} = require("./symbols.js");

const DefaultAttemptsDelay = ms("1m");
const Priority = {
    "critical": JOB_PRIORITY_CRITICAL,
    "high": JOB_PRIORITY_HIGH,
    "normal": JOB_PRIORITY_NORMAL,
    "low": JOB_PRIORITY_LOW
};

class NewJob {
    constructor(handlr, type, data) {
        this._handlr = handlr;
        this.type = type;
        this.priority = JOB_PRIORITY_NORMAL;
        this.data = data;
        this.attempts = 0;
        this.attemptsDelay = DefaultAttemptsDelay;
    }

    get data() {
        return Object.assign({}, {
            data: this.data,
            type: this.type,
            priority: this.priority,
            id: uuid(),
            status: JOB_STATUS_IDLE,
            progress: 0,
            progressMax: 1,
            attempts: this.attempts,
            attemptsDelay: this.attemptsDelay,
            lastAttempt: null,
            worker: null
        });
    }

    attempts(num, delay) {
        if (num >= 0) {
            this.attempts = num;
            if (delay) {
                if (delay > 0 || typeof delay === "function") {
                    this.attemptsDelay = delay;
                } else {
                    throw new Error(`Failed setting job attempts delay: Invalid type for delay: ${delay}`);
                }
            }
            return this;
        }
        throw new VError(`Failed setting job attempts: Invalid attempts count: ${num}`);
    }

    commit() {
        const data = this.data;
        return this._handlr
            ._addJob(data)
            .then(() => data.id);
    }

    priority(name) {
        const prio = Priority[name];
        if (!prio) {
            throw new VError(`Failed setting job priority: Invalid priority value: ${name}`);
        }
        this.priority = prio;
        return this;
    }
}

module.exports = NewJob;
