const EventEmitter = require("eventemitter3");

let __sharedChannel;

class MessageChannel extends EventEmitter {}

MessageChannel.getSharedChannel = function getSharedChannel() {
    if (!__sharedChannel) {
        __sharedChannel = new MessageChannel();
    }
    return __sharedChannel;
}

module.exports = MessageChannel;
