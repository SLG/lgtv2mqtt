const logs: string[] = [];

export function log(...s: any[]) {
    logs.unshift(`${new Date().toISOString()} - ${s}`);
}

export function getLogs() {
    return logs;
}

export function clearLogs() {
    logs.length = 0;
}
