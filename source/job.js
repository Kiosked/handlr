const figure = require("figures");
const chalk = require("chalk");
const jsome = require("jsome");
const log = require("./log.js");
const { indent } = require("./format.js");

const INDENTATION = 4;

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
}

function setError(job, error) {
    job.error = error;
}

function setResult(job, result) {
    log.service.info(`Result for job ${job.id}:`);
    try {
        console.log(indent(jsome.getColoredString(result), INDENTATION));
    } catch (err) {
        console.log(indent(result, INDENTATION));
    }
    job.result = result;
}

module.exports = {
    changeJobStatus,
    markAttempt,
    setError,
    setResult
};
