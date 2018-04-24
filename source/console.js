const chalk = require("chalk");
const logSymbol = require("log-symbols");
const { indent } = require("./format.js");

let __oldConsole = null;

function argsToString(args) {
    return args
        .map(arg => {
            if (typeof arg === "string") {
                return arg;
            }
            try {
                return JSON.stringify(arg, undefined, 4);
            } catch (err) {
                return `${arg}`;
            }
        })
        .join(" ");
}

function consoleLog(...items) {
    __oldConsole.log.apply(console, items);
}

function patchConsole() {
    if (__oldConsole !== null) {
        return false;
    }
    __oldConsole = {};
    ["log", "error", "warn"].forEach(methodName => {
        __oldConsole[methodName] = console[methodName];
    });
    console.log = (...args) => {
        consoleLog(indent(argsToString(args), 5, `${chalk.dim("│")} `));
    };
    console.warn = (...args) => {
        consoleLog(indent(argsToString(args), 3, `${chalk.yellow(logSymbol.warning)} ${chalk.dim("│")} `));
    };
    console.error = (...args) => {
        consoleLog(indent(argsToString(args), 3, `${chalk.yellow(logSymbol.error)} ${chalk.dim("│")} `));
    };
    return true;
}

module.exports = {
    consoleLog,
    patchConsole
};
