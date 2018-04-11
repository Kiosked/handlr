const EventEmitter = require("eventemitter3");
const VError = require("verror");
const uuid = require("uuid/v4");
const { PROCESSOR_STATUS_ACTIVE, PROCESSOR_STATUS_IDLE } = require("./symbols.js");

class JobProcessor extends EventEmitter {
    constructor() {
        super();
        this._status = PROCESSOR_STATUS_IDLE;
        this._dispatcher = null;
        this._job = null;
        this._id = uuid();
    }

    get dispatcher() {
        return this._dispatcher;
    }

    get id() {
        return this._id;
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
