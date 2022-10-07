const pkgInfo = require('./package.json');
const Service = require('webos-service');
const mqtt = require('mqtt');
const {log, getLogs, clearLogs} = require("./log");

// CHANGE THESE VALUES ACCORDINGLY
const host = 'YOUR MQTT BROKER HOST';
const port = '1883'; // OR THE PORT OF THE BROKER
const username = 'YOUR MQTT USERNAME';
const password = 'YOUR MQTT PASSWORD';

const service = new Service(pkgInfo.name); // Create service by service name on package.json
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;
const connectUrl = `mqtt://${host}:${port}`;

const topicPlayState = 'tv-service/playState';
const topicAppId = 'tv-service/appId';
const topicType = 'tv-service/type';

let keepAlive;

let client;

let state = 'NOT STARTED';

service.register('start', function (message) {
    try {
        log('starting service');
        // This tells the ActivityManager to keep the service running in the background, so the MQTT connection will be kept alive.
        service.activityManager.create('keepAlive', function (activity) {
            log('keepAlive created');
            keepAlive = activity;
        });
        log('registered keepAlive');

        // Connect to the MQTT broker
        const mqttConfig = {
            clientId,
            clean: true,
            connectTimeout: 4000,
            username,
            password,
            reconnectPeriod: 1000,
        };
        log(`connecting to mqtt server with: ${JSON.stringify(mqttConfig)}`);
        client = mqtt.connect(connectUrl, mqttConfig);
        log('connected to mqtt server');

        log('subscribing to media service');
        // Subscribe to the com.webos.media service, to receive updates from the tv
        service.subscribe('luna://com.webos.media/getForegroundAppInfo', {'subscribe': true})
            .on('response', function (message) {
                if (message.payload && message.payload.foregroundAppInfo) {
                    if (Array.isArray(message.payload.foregroundAppInfo) && message.payload.foregroundAppInfo.length > 0) {
                        log(`send ForegroundAppInfo update to MQTT: ${JSON.stringify(message.payload)}`);
                        client.publish(topicPlayState, `${message.payload.foregroundAppInfo[0].playState}`, {
                            qos: 0,
                            retain: false
                        });
                        client.publish(topicAppId, `${message.payload.foregroundAppInfo[0].appId}`, {
                            qos: 0,
                            retain: false
                        });
                        client.publish(topicType, `${message.payload.foregroundAppInfo[0].type}`, {
                            qos: 0,
                            retain: false
                        });
                    } else {
                        log(`ignored ForegroundAppInfo because it's no array, or empty: ${JSON.stringify(message.payload)}`);
                    }
                } else {
                    log(`ignored ForegroundAppInfo because it contains no info: ${JSON.stringify(message)}`);
                }
            });


        log('started service');
        message.respond({
            started: true,
            logs: getLogs(),
        });
        state = 'STARTED';
    } catch (err) {
        log(`failed starting: ${JSON.stringify(err)}`);
        message.respond({
            started: false,
            logs: getLogs(),
        });
        state = 'FAILED TO START';
    }
});

service.register('stop', function (message) {
    try {
        log('stopping service');

        log('closing mqtt connection');
        client.end();

        log('complete keepAlive');
        // When you're done, complete the activity
        service.activityManager.complete(keepAlive);
        log('completed keepAlive');

        message.respond({
            stopped: true,
            logs: getLogs()
        });
        state = 'STOPPED';
    } catch (err) {
        log(`failed stopping: ${JSON.stringify(err)}`);
        message.respond({
            started: false,
            logs: getLogs(),
        });
        state = 'FAILED TO STOP';
    }
});

service.register('logs', function (message) {
    message.respond({
        logs: getLogs(),
    });
});

service.register('clearLogs', function (message) {
    clearLogs();

    message.respond({
        cleared: true,
        logs: getLogs()
    });
});

service.register('getState', function (message) {
    message.respond({
        state,
        logs: getLogs()
    });
});
