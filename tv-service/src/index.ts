import Service from 'webos-service';
import { LgTvMqtt, LgTvMqttConfig } from './lgtv-mqtt';

const service = new Service("com.slg.lgtv2mqtt.service"); // Create service by service name on package.json

const config: LgTvMqttConfig = {
    host: 'YOUR MQTT BROKER HOST',
    port: 1883,
    username: 'YOUR MQTT USERNAME',
    password: 'YOUR MQTT PASSWORD',
    deviceID: 'webOSTVService'
};

const lgTvMqtt = new LgTvMqtt(service, config);

service.register('start', message => lgTvMqtt.start(message));

service.register('stop', message => lgTvMqtt.stop(message));

service.register('logs', message => lgTvMqtt.logs(message));

service.register('clearLogs', message => lgTvMqtt.clearLogs(message));

service.register('getState', message => lgTvMqtt.getState(message));
