const EventEmitter = require("eventemitter3");

let __sharedChannel;

class MessageChannel extends EventEmitter {}

MessageChannel.getSharedInstance = function getSharedInstance() {
    if (!__sharedChannel) {
        __sharedChannel = new MessageChannel();
    }
    return __sharedChannel;
}

module.exports = MessageChannel;
