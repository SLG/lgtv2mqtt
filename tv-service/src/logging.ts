export class Logging {
    private logs: string[] = [];

    log(...s: any[]) {
        this.logs.unshift(`${new Date().toISOString()} - ${JSON.stringify(s)}`);
    }

    getLogs() {
        return this.logs;
    }

    clearLogs() {
        this.logs.length = 0;
    }
}
