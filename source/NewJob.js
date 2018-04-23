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
    constructor(service, type, payload) {
        this._service = service;
        this.type = type;
        this._priority = JOB_PRIORITY_NORMAL;
        this.payload = payload;
        this._attempts = 0;
        this._attemptsDelay = DefaultAttemptsDelay;
    }

    get data() {
        return Object.assign({}, {
            payload: this.payload,
            type: this.type,
            priority: this._priority,
            id: uuid(),
            status: JOB_STATUS_IDLE,
            progress: 0,
            progressMax: 1,
            attempts: this._attempts,
            attemptsDelay: this._attemptsDelay,
            lastAttempt: null,
            worker: null,
            result: null,
            error: null
        });
    }

    attempts(num, delay) {
        if (num >= 0) {
            this._attempts = num;
            if (delay) {
                if (delay > 0 || typeof delay === "function") {
                    this._attemptsDelay = delay;
                } else if (typeof delay === "string") {
                    this._attemptsDelay = ms(delay);
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
        return this._service
            ._addJob(data)
            .then(() => data.id);
    }

    priority(name) {
        const prio = Priority[name];
        if (!prio) {
            throw new VError(`Failed setting job priority: Invalid priority value: ${name}`);
        }
        this._priority = prio;
        return this;
    }
}

module.exports = NewJob;
