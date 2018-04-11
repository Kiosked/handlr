module.exports = Object.freeze({
    JOB_PRIORITY_CRITICAL: -2,
    JOB_PRIORITY_HIGH: -1,
    JOB_PRIORITY_LOW: 1,
    JOB_PRIORITY_NORMAL: 0,

    JOB_STATUS_CANCELLED: "job:status:cancelled",
    JOB_STATUS_COMPLETED: "job:status:completed",
    JOB_STATUS_FAILED: "job:status:failed",
    JOB_STATUS_IDLE: "job:status:idle",
    JOB_STATUS_RUNNING: "job:status:running",

    JOB_TICKER_DELAY: 1000,

    MESSAGE_PREFIX: "handlr:clustermsg:",

    PROCESSOR_STATUS_ACTIVE: "processor:status:active",
    PROCESSOR_STATUS_IDLE: "processor:status:idle"
});
