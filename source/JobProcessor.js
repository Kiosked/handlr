const EventEmitter = require("eventemitter3");
const VError = require("verror");
const { PROCESSOR_STATUS_ACTIVE, PROCESSOR_STATUS_IDLE } = require("./symbols.js");

class JobProcessor extends EventEmitter {
    constructor(id, jobType) {
        super();
        this._status = PROCESSOR_STATUS_IDLE;
        this._dispatcher = null;
        this.job = null;
        this._jobType = jobType;
        this._id = id;
        if (!id) {
            throw new VError("Failed constructing JobProcessor: Invalid or no ID provided");
        }
        if (!jobType) {
            throw new VError("Failed constructing JobProcessor: Invalid or no job type provided");
        }
    }

    get dispatcher() {
        return this._dispatcher;
    }

    get id() {
        return this._id;
    }

    get jobType() {
        return this._jobType;
    }

    set dispatcher(newDispatcher) {
        if (typeof newDispatcher !== "function") {
            throw new VError("Failed setting dispatcher: Expected dispatcher to be a function");
        }
        this._dispatcher = newDispatcher;
    }

    receiveJobUpdate() {

    }
}

module.exports = JobProcessor;
