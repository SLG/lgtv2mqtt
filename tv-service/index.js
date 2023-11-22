const pkgInfo = require('./package.json');
const Service = require('webos-service');
const mqtt = require('mqtt');
const { log, getLogs, clearLogs } = require("./log");

// CHANGE THESE VALUES ACCORDINGLY
const host = 'YOUR MQTT BROKER HOST';
const port = '1883'; // OR THE PORT OF THE BROKER
const username = 'YOUR MQTT USERNAME';
const password = 'YOUR MQTT PASSWORD';

// This should be unique across the MQTT network. If you're using this on multiple TVs, update this
const deviceID = 'webOSTVService'

const service = new Service(pkgInfo.name); // Create service by service name on package.json
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;
const connectUrl = `mqtt://${host}:${port}`;

// MQTT auto-discovery configuration
const topicAutoDiscoveryPlayState = `homeassistant/sensor/${deviceID}/playState/config`;
const topicAutoDiscoveryAppId = `homeassistant/sensor/${deviceID}/appId/config`;
const topicAutoDiscoveryType = `homeassistant/sensor/${deviceID}/type/config`;

const topicAvailability = `LG2MQTT/${deviceID}/availability`;
const topicState = `LG2MQTT/${deviceID}/state`;

let keepAlive;

let client;

let state = 'NOT STARTED';

service.register('start', function (message) {
    start(message);
});

function start(message) {
    if (state === 'STARTED') {
        return;
    }

    try {
        log('Starting LG TV 2 MQTT service...');

        // This tells the ActivityManager to keep the service running in the background, so the MQTT connection will be kept alive.
        service.activityManager.create('keepAlive', function (activity) {
            log('KeepAlive created');
            keepAlive = activity;
        });
        log('Registered keepAlive');

        // Connect to the MQTT broker
        const mqttConfig = {
            clientId,
            clean: true,
            connectTimeout: 4000,
            keepalive: 180, // 3 minutes
            username,
            password,
            reconnectPeriod: 10000, // 10 seconds
            will: {
                topic: topicAvailability,
                payload: "offline",
                retain: false,
                qos: 0
            }
        };

        log(`Connecting to MQTT server with: ${JSON.stringify(mqttConfig)}`);

        client = mqtt.connect(connectUrl, mqttConfig);

        log('Connected to mqtt server');

        log("Sending Home Assistant auto-discovery configs..")
        // Send the Home Assistant auto-discovery configs
        try {
            let pubOptions = { qos: 0, retain: true };
            client.publish(topicAutoDiscoveryPlayState, JSON.stringify(createAutoDiscoveryConfig("mdi:play-pause", "play", "Play State")), pubOptions, function (err) {
                if (err) {
                    log(`An error occurred during publish to ${topicAutoDiscoveryPlayState}`);
                } else {
                    log(`Published successfully to ${topicAutoDiscoveryPlayState}`);
                }
            });

            client.publish(topicAutoDiscoveryAppId, JSON.stringify(createAutoDiscoveryConfig("mdi:apps", "app", "Application ID")), pubOptions, function (err) {
                if (err) {
                    log(`An error occurred during publish to ${topicAutoDiscoveryAppId}`);
                } else {
                    log(`Published successfully to ${topicAutoDiscoveryAppId}`);
                }
            });

            client.publish(topicAutoDiscoveryType, JSON.stringify(createAutoDiscoveryConfig("mdi:import", "type", "Discovery Type")), pubOptions, function (err) {
                if (err) {
                    log(`An error occurred during publish to ${topicAutoDiscoveryType}`);
                } else {
                    log(`Published successfully to ${topicAutoDiscoveryType}`);
                }
            });
        } catch (e) {
            log("Failed to publish Home Assistant Auto Discovery configs");
            log(e);
            message.respond({
                started: false,
                logs: getLogs(),
            });
            state = 'FAILED TO PUBLISH CONFIGS';
            return;
        }

        // Publish initial state
        try {
            let pubOptions = { qos: 0, retain: false };
            client.publish(topicState, JSON.stringify(createState('idle', 'unknown', 'unknown')), pubOptions, function (err) {
                if (err) {
                    log(`An error occurred during publish to ${topicState}`);
                } else {
                    log(`Published successfully to ${topicState}`);
                }
            });
        } catch (e) {
            log("Failed to send initial MQTT state");
            log(e);
            message.respond({
                started: false,
                logs: getLogs(),
            });
            state = 'FAILED TO PUBLISH INITIAL STATE';
            return;
        }

        // Set availability to online
        try {
            let pubOptions = { qos: 0, retain: true };
            client.publish(topicAvailability, "online", pubOptions, function (err) {
                if (err) {
                    log(`An error occurred during publish to ${topicAvailability}`);
                } else {
                    log(`Published successfully to ${topicAvailability}`);
                }
            });
        } catch (e) {
            log("Failed to set availability to online");
            log(e);
            message.respond({
                started: false,
                logs: getLogs(),
            });
            state = 'FAILED TO SET ONLINE';
            return;
        }

        log('Subscribing to media service');
        // Subscribe to the com.webos.media service, to receive updates from the tv
        service.subscribe('luna://com.webos.media/getForegroundAppInfo', { 'subscribe': true })
            .on('response', function (message) {
                if (message.payload && message.payload.foregroundAppInfo) {
                    if (Array.isArray(message.payload.foregroundAppInfo) && message.payload.foregroundAppInfo.length > 0) {
                        log(`Send ForegroundAppInfo update to MQTT: ${JSON.stringify(message.payload)}`);
                        client.publish(topicState, JSON.stringify(createState(`${message.payload.foregroundAppInfo[0].playState}`,
                            `${message.payload.foregroundAppInfo[0].appId}`,
                            `${message.payload.foregroundAppInfo[0].type}`)), {
                            qos: 0,
                            retain: false
                        });
                    } else {
                        log(`Ignored ForegroundAppInfo because it's no array, or empty: ${JSON.stringify(message.payload)}`);
                        client.publish(topicState, JSON.stringify(createState('idle', 'unknown', 'unknown')), {
                            qos: 0,
                            retain: false
                        });
                    }
                } else {
                    log(`Ignored ForegroundAppInfo because it contains no info: ${JSON.stringify(message)}`);
                    client.publish(topicState, JSON.stringify(createState('idle', 'unknown', 'unknown')), {
                        qos: 0,
                        retain: false
                    });
                }

                try {
                    let pubOptions = { qos: 0, retain: true };
                    client.publish(topicAvailability, "online", pubOptions, function (err) {
                        if (err) {
                            log(`An error occurred during publish to ${topicAvailability}`);
                        } else {
                            log(`Published successfully to ${topicAvailability}`);
                        }
                    });
                } catch (e) {
                    log("Failed to set availability to online");
                    log(e);
                    message.respond({
                        started: false,
                        logs: getLogs(),
                    });
                    state = 'FAILED TO SET ONLINE';
                    return;
                }
            });

        log('Started LG TV 2 MQTT service');
        message.respond({
            started: true,
            logs: getLogs(),
        });
        state = 'STARTED';
    } catch (err) {
        log(`Failed starting: ${JSON.stringify(err)}`);
        message.respond({
            started: false,
            logs: getLogs(),
        });
        state = 'FAILED TO START';
    }
}

service.register('stop', function (message) {
    try {
        log('Stopping service');

        log('Closing MQTT connection');
        client.end();

        log('Complete keepAlive');
        // When you're done, complete the activity
        service.activityManager.complete(keepAlive);
        log('Completed keepAlive');

        message.respond({
            stopped: true,
            logs: getLogs()
        });
        state = 'STOPPED';
    } catch (err) {
        log(`Failed stopping: ${JSON.stringify(err)}`);
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

function createAutoDiscoveryConfig(icon, id, name) {
    return {
        "icon": `${icon}`,
        "~": `LGTV2MQTT/${deviceID}/`,
        "availability_topic": `${topicAvailability}`,
        "state_topic": `${topicState}`,
        "name": `${name}`,
        "unique_id": `${deviceID}_${id}`,
        "payload_available": "online",
        "payload_not_available": "offline",
        "value_template": `{{ value_json.${id}}}`,
        "device": {
            "identifiers": `${deviceID}`,
            "name": `${deviceID}`,
            "manufacturer": "LG",
        }
    };
}

function createState(play, app, type) {
    return {
        'play': `${play}`,
        'app': `${app}`,
        'type': `${type}`
    };
}
