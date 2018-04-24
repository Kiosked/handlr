module.exports = Object.freeze({
    COMM_TYPE_CLUSTER: "comm:cluster",
    COMM_TYPE_LOCAL: "comm:local",

    JOB_PRIORITY_CRITICAL: -2,
    JOB_PRIORITY_HIGH: -1,
    JOB_PRIORITY_LOW: 1,
    JOB_PRIORITY_NORMAL: 0,

    JOB_STATUS_CANCELLED: "job:status:cancelled",
    JOB_STATUS_COMPLETED: "job:status:completed",
    JOB_STATUS_FAILED: "job:status:failed",
    JOB_STATUS_IDLE: "job:status:idle",
    JOB_STATUS_RUNNING: "job:status:running",
    JOB_STATUS_STARTING: "job:status:starting",

    JOB_TICKER_DELAY: 1000,

    MESSAGE_PREFIX: "handlr:clustermsg:",

    MULTI_RESULT_DISCARD: "result:multi:discard",
    MULTI_RESULT_FIRST: "result:multi:first",
    MULTI_RESULT_MERGE_DEPENDS: "result:multi:mergedepends",
    MULTI_RESULT_MERGE_PAYLOAD: "result:multi:mergepayload",

    PROCESSOR_STATUS_ACTIVE: "processor:status:active",
    PROCESSOR_STATUS_IDLE: "processor:status:idle"
});
