const chalk = require("chalk");
const logSymbol = require("log-symbols");
const figure = require("figures");
const leftPad = require("left-pad");
const { consoleLog } = require("./console.js");

const SERVICE_ICON = chalk.hex("#FFFF84")(figure.star);
const PREFIXES = {
    service: ` ${SERVICE_ICON}`,
    worker: `  `
};

function buildLog(type) {
    return {
        error: (...args) => error(type, ...args),
        info: (...args) => info(type, ...args),
        success: (...args) => success(type, ...args),
        warning: (...args) => warning(type, ...args)
    };
}

function error(type, ...args) {
    const symbol = chalk.hex("#FF4848")(logSymbol.error);
    const argStr = args.join(" ");
    consoleLog(`${PREFIXES[type]} ${symbol} ${time()} ${argStr}`);
}

function info(type, ...args) {
    const symbol = chalk.hex("#A8CFFF")(logSymbol.info);
    const argStr = args.join(" ");
    consoleLog(`${PREFIXES[type]} ${symbol} ${time()} ${argStr}`);
}

function success(type, ...args) {
    const symbol = chalk.hex("#D2FFC4")(logSymbol.success);
    const argStr = args.join(" ");
    consoleLog(`${PREFIXES[type]} ${symbol} ${time()} ${argStr}`);
}

function time() {
    const date = new Date();
    return chalk.dim(`[${leftPad(date.getHours(), 2, "0")}:${leftPad(date.getMinutes(), 2, "0")}:${leftPad(date.getSeconds(), 2, "0")}]`);
}

function warning(type, ...args) {
    const symbol = chalk.hex("#ffb347")(logSymbol.warning);
    const argStr = args.join(" ");
    consoleLog(`${PREFIXES[type]} ${symbol} ${time()} ${argStr}`);
}

module.exports = {
    service: buildLog("service"),
    worker: buildLog("worker")
};
