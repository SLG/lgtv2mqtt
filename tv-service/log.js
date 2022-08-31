const logs = [];

function log(...s) {
    logs.unshift(`${new Date().toISOString()} - ${s}`);
}

function getLogs() {
    return logs;
}

function clearLogs() {
    logs.length = 0;
}

module.exports.log = log;
module.exports.getLogs = getLogs;
module.exports.clearLogs = clearLogs;
