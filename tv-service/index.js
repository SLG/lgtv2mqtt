const pkgInfo = require('./package.json');
const Service = require('webos-service');
const mqtt = require('mqtt');

// CHANGE THESE VALUES ACCORDINGLY
const host = 'YOUR MQTT BROKER HOST';
const port = '1883'; // OR THE POR OF THE BROKER
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

service.register('start', function (message) {
    // This tells the ActivityManager to keep the service running in the background, so the MQTT connection will be kept alive.
    service.activityManager.create('keepAlive', function (activity) {
        keepAlive = activity;
    });

    // Connect to the MQTT broker
    client = mqtt.connect(connectUrl, {
        clientId,
        clean: true,
        connectTimeout: 4000,
        username,
        password,
        reconnectPeriod: 1000,
    });

    // Subscribe to the com.webos.media service, to receive updates from the tv
    service.subscribe('luna://com.webos.media/getForegroundAppInfo', { 'subscribe': true })
        .on('response', function (message) {
            if (message.payload && message.payload.foregroundAppInfo) {
                if (Array.isArray(message.payload.foregroundAppInfo) && message.payload.foregroundAppInfo.length > 0) {
                    client.publish(topicPlayState, `${message.payload.foregroundAppInfo[0].playState}`, { qos: 0, retain: false });
                    client.publish(topicAppId, `${message.payload.foregroundAppInfo[0].appId}`, { qos: 0, retain: false });
                    client.publish(topicType, `${message.payload.foregroundAppInfo[0].type}`, { qos: 0, retain: false });
                }
            }
        });


    message.respond({
        started: true,
    });
});

service.register('stop', function (message) {
// When you're done, complete the activity
    service.activityManager.complete(keepAlive);

    client.end();

    message.respond({
        stopped: true
    });
});
