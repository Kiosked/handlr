const figure = require("figures");
const chalk = require("chalk");
const jsome = require("jsome");
const PrettyError = require("pretty-error");
const prettyMs = require("pretty-ms");
const log = require("./log.js");
const { consoleLog } = require("./console.js");
const { indent } = require("./format.js");
const { mergePayloads } = require("./results.js");
const {
    MULTI_RESULT_DISCARD,
    MULTI_RESULT_FIRST,
    MULTI_RESULT_MERGE_DEPENDS,
    MULTI_RESULT_MERGE_PAYLOAD
} = require("./symbols.js");

const INDENTATION = 4;

const prettyError = new PrettyError();
jsome.level.show = true;
jsome.level.color = "gray";
Object.assign(jsome.colors, {
    brack: "gray",
    punc: "white",
    quot: "gray",
    attr: "white",
    regex: "magenta",
    bool: "magenta",
    str: "green",
    num: "cyan"
});

function changeJobStatus(job, newStatus) {
    log.service.info(
        `Job ${job.id} (${job.type}) status changed:`,
        `${chalk.dim(job.status)} ${figure.arrowRight} ${chalk.underline(newStatus)}`
    );
    job.status = newStatus;
}

function markAttempt(job) {
    job.attempts -= 1;
    if (job.attempts < 0) {
        job.attempts = 0;
    }
    job.lastAttempt = Date.now();
    log.service.warning(`Job ${job.id} has ${chalk.red(job.attempts)} attempts left`);
    const { attemptsDelay } = job;
    if (typeof attemptsDelay === "number" && job.attempts > 0) {
        log.service.info(
            `Job ${job.id} will be retried in: ${chalk.cyan(prettyMs(attemptsDelay))}`
        );
    }
}

function resolvePayload(targetJob, dependedJobs = []) {
    const { dependentResultAction } = targetJob;
    switch (dependentResultAction) {
        case MULTI_RESULT_DISCARD: {
            return targetJob.payload;
        }
        case MULTI_RESULT_FIRST: {
            const [firstDepended] = dependedJobs;
            return firstDepended ? firstDepended.result : targetJob.payload;
        }
        case MULTI_RESULT_MERGE_DEPENDS: {
            return mergePayloads(targetJob.payload, ...dependedJobs.map(job => job.result));
        }
        case MULTI_RESULT_MERGE_PAYLOAD: {
            return mergePayloads(...dependedJobs.map(job => job.result), targetJob.payload);
        }
        default:
            throw new Error(
                `Failed resolving payload for job: Invalid result action: ${dependentResultAction}`
            );
    }
}

function setError(job, error) {
    log.service.error(`Recording error for job ${job.id}:`);
    try {
        consoleLog(indent(prettyError.render(error), INDENTATION));
    } catch (err) {
        consoleLog(indent(error, INDENTATION));
    }
    job.error = error;
}

function setResult(job, result) {
    log.service.info(`Recording result for job ${job.id}:`);
    try {
        consoleLog(indent(jsome.getColoredString(result), INDENTATION));
    } catch (err) {
        consoleLog(indent(result, INDENTATION));
    }
    job.result = result;
}

module.exports = {
    changeJobStatus,
    markAttempt,
    resolvePayload,
    setError,
    setResult
};
