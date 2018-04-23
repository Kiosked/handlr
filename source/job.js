const figure = require("figures");
const chalk = require("chalk");
const log = require("./log.js");

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

module.exports = {
    changeJobStatus,
    markAttempt
};
