import { Client, connect, IClientOptions, IClientPublishOptions } from 'mqtt';
import Service, { Message } from 'webos-service';
import { Logging } from './logging';

enum ServiceState {
    STARTED = 'STARTED',
    FAILED_TO_PUBLISH_CONFIGS = 'FAILED TO PUBLISH CONFIGS',
    FAILED_TO_PUBLISH_INITIAL_STATE = 'FAILED TO PUBLISH INITIAL STATE',
    FAILED_TO_SET_ONLINE = 'FAILED TO SET ONLINE',
    FAILED_TO_START = 'FAILED TO START',
    STOPPED = 'STOPPED',
    FAILED_TO_STOP = 'FAILED TO STOP'
}

interface ForegroundAppInfo {
    windowId: string;
    appId: string;
    mediaId: string;
    type: string;
    playState: string;
}

interface ForegroundAppIdResponse {
    subscribed: boolean;
    foregroundAppInfo: ForegroundAppInfo[];
    returnValue: boolean
}

interface AppState {
    play: string;
    app: string;
    type: string;
}

export interface LgTvMqttConfig {
    host: string; // Your MQTT broker host
    port: number; // Your MQTT broker port, default 1883
    username: string; // Your MQTT username
    password: string; // Your MQTT password
    deviceID: string; // This should be unique across the MQTT network. If you're using this on multiple TVs, update this
}

export class LgTvMqtt {
    constructor(private service: Service, private config: LgTvMqttConfig) {
    }

    private state: ServiceState = ServiceState.STOPPED;
    private logging = new Logging();
    private keepAlive: Record<string, any> = {};
    private client: Client | undefined;

    private clientId = `mqtt_${Math.random().toString(16).slice(3)}`;
    private connectUrl = `mqtt://${this.config.host}:${this.config.port}`;

// MQTT auto-discovery configuration
    private topicAutoDiscoveryPlayState = `homeassistant/sensor/${this.config.deviceID}/playState/config`;
    private topicAutoDiscoveryAppId = `homeassistant/sensor/${this.config.deviceID}/appId/config`;
    private topicAutoDiscoveryType = `homeassistant/sensor/${this.config.deviceID}/type/config`;

    private topicAvailability = `LGTV2MQTT/${this.config.deviceID}/availability`;
    private topicState = `LGTV2MQTT/${this.config.deviceID}/state`;

    private mqttConfig: IClientOptions = {
        clientId: this.clientId,
        clean: true,
        connectTimeout: 4000,
        keepalive: 180, // 3 minutes
        username: this.config.username,
        password: this.config.password,
        reconnectPeriod: 10000, // 10 seconds
        will: {
            topic: this.topicAvailability,
            payload: "offline",
            retain: false,
            qos: 0
        }
    };

    private playStateConfig = JSON.stringify(this.createAutoDiscoveryConfig("mdi:play-pause", "play", "Play State"));
    private appIdConfig = JSON.stringify(this.createAutoDiscoveryConfig("mdi:apps", "app", "Application ID"));
    private typeConfig = JSON.stringify(this.createAutoDiscoveryConfig("mdi:import", "type", "Discovery Type"));

    private publicOptionRetain: IClientPublishOptions = {qos: 0, retain: true};
    private publicOptionNotRetain: IClientPublishOptions = {qos: 0, retain: false};

    start(message: Message) {
        if (this.state === ServiceState.STARTED) {
            return;
        }

        try {
            this.logging.log('Starting LG TV 2 MQTT service...');

            // This tells the ActivityManager to keep the service running in the background, so the MQTT connection will be kept alive.
            this.service.activityManager.create('keepAlive', (activity) => {
                this.logging.log('KeepAlive created');
                this.keepAlive = activity;
            });
            this.logging.log('Registered keepAlive');

            // Connect to the MQTT broker

            this.logging.log(`Connecting to MQTT server with: ${JSON.stringify(this.mqttConfig)}`);

            this.client = connect(this.connectUrl, this.mqttConfig);

            this.logging.log('Connected to mqtt server');

            this.sendAutoDiscovery(message);

            this.publishInitialState(message);

            this.publishAvailability(message);

            this.logging.log('Subscribing to media service');

            // Subscribe to the com.webos.media service, to receive updates from the tv
            this.service.subscribe('luna://com.webos.media/getForegroundAppInfo', {'subscribe': true})
                .on('response', (message: Message) => this.handleForegroundAppResponse(message, message.payload as ForegroundAppIdResponse));

            this.logging.log('Started LG TV 2 MQTT service');

            this.respond(message, {started: true});

            this.state = ServiceState.STARTED;
        } catch (err) {
            this.logging.log(`Failed starting: ${JSON.stringify(err)}`);
            this.respond(message, {started: false});
            this.state = ServiceState.FAILED_TO_START;
        }
    }

    private respond(message: Message, payload: Record<string, any>) {
        message.respond({
            ...payload,
            logs: this.logging.getLogs(),
        });
    }

    private handleForegroundAppResponse(message: Message, payload: ForegroundAppIdResponse) {
        if (payload && payload.foregroundAppInfo) {
            if (Array.isArray(payload.foregroundAppInfo) && payload.foregroundAppInfo.length > 0) {
                this.logging.log(`Send ForegroundAppInfo update to MQTT: ${JSON.stringify(payload)}`);

                const info: ForegroundAppInfo = payload.foregroundAppInfo[0];

                const state = this.createState(info.playState, info.appId, info.type);

                this.client?.publish(this.topicState, JSON.stringify(state), this.publicOptionNotRetain);
            } else {
                this.logging.log(`Ignored ForegroundAppInfo because it's no array, or empty: ${JSON.stringify(payload)}`);
                this.client?.publish(this.topicState, JSON.stringify(this.createState('idle', 'unknown', 'unknown')), this.publicOptionNotRetain);
            }
        } else {
            this.logging.log(`Ignored ForegroundAppInfo because it contains no info: ${JSON.stringify(message)}`);
            this.client?.publish(this.topicState, JSON.stringify(this.createState('idle', 'unknown', 'unknown')), this.publicOptionNotRetain);
        }

        this.publishAvailability(message);
    }

    private sendAutoDiscovery(message: Message) {
        this.logging.log("Sending Home Assistant auto-discovery configs..")
        // Send the Home Assistant auto-discovery configs
        try {
            this.client?.publish(this.topicAutoDiscoveryPlayState, this.playStateConfig, this.publicOptionRetain, (err) => this.handleError(err, this.topicAutoDiscoveryPlayState));

            this.client?.publish(this.topicAutoDiscoveryAppId, this.appIdConfig, this.publicOptionRetain, (err) => this.handleError(err, this.topicAutoDiscoveryAppId));

            this.client?.publish(this.topicAutoDiscoveryType, this.typeConfig, this.publicOptionRetain, (err) => this.handleError(err, this.topicAutoDiscoveryType));
        } catch (err) {
            this.logging.log("Failed to publish Home Assistant Auto Discovery configs", `${JSON.stringify(err)}`);
            this.respond(message, {started: false});
            this.state = ServiceState.FAILED_TO_PUBLISH_CONFIGS;
            throw err;
        }
    }

    private publishInitialState(message: Message) {
        // Publish initial state
        try {
            let pubOptions: IClientPublishOptions = {qos: 0, retain: false};
            this.client?.publish(this.topicState, JSON.stringify(this.createState('idle', 'unknown', 'unknown')), pubOptions, (err) => this.handleError(err, this.topicState));
        } catch (err) {
            this.logging.log("Failed to send initial MQTT state", `${JSON.stringify(err)}`);
            this.respond(message, {started: false});
            this.state = ServiceState.FAILED_TO_PUBLISH_INITIAL_STATE;
            throw err;
        }
    }

    private publishAvailability(message: Message) {
        // Set availability to online
        try {
            this.client?.publish(this.topicAvailability, "online", this.publicOptionRetain, (err) => this.handleError(err, this.topicAvailability));
        } catch (err) {
            this.logging.log("Failed to set availability to online", `${JSON.stringify(err)}`);
            this.respond(message, {started: false});
            this.state = ServiceState.FAILED_TO_SET_ONLINE;
            throw err;
        }
    }

    private handleError(err: Error | undefined, topicName: string) {
        if (err) {
            this.logging.log(`An error occurred during publish to ${topicName}`, `${JSON.stringify(err)}`);
        } else {
            this.logging.log(`Published successfully to ${topicName}`);
        }
    }

    stop(message: Message) {
        try {
            this.logging.log('Stopping service');

            this.logging.log('Closing MQTT connection');
            this.client?.end();

            this.logging.log('Complete keepAlive');

            // When you're done, complete the activity
            this.service.activityManager.complete(this.keepAlive);

            this.logging.log('Completed keepAlive');

            this.respond(message, {stopped: true});
            this.state = ServiceState.STOPPED;
        } catch (err) {
            this.logging.log(`Failed stopping: ${JSON.stringify(err)}`);
            this.respond(message, {started: false});
            this.state = ServiceState.FAILED_TO_STOP;
        }
    }

    logs(message: Message) {
        this.respond(message, {});
    }

    clearLogs(message: Message) {
        this.logging.clearLogs();
        this.respond(message, {cleared: true});
    }

    getState(message: Message) {
        this.respond(message, {state: this.state});
    }

    private createAutoDiscoveryConfig(icon: string, id: string, name: string) {
        return {
            icon: `${icon}`,
            "~": `LGTV2MQTT/${this.config.deviceID}/`,
            availability_topic: `${this.topicAvailability}`,
            state_topic: `${this.topicState}`,
            name: `${name}`,
            unique_id: `${this.config.deviceID}_${id}`,
            payload_available: "online",
            payload_not_available: "offline",
            value_template: `{{ value_json.${id}}}`,
            device: {
                identifiers: `${this.config.deviceID}`,
                name: `${this.config.deviceID}`,
                manufacturer: "LG",
            }
        };
    }

    private createState(play: string, app: string, type: string): AppState {
        return {play, app, type};
    }
}
