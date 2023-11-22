# MQTT WebOS Service
For WebOS 6. Maybe it works for earlier or later versions...?
## Setup tv
### WebOS developer
You can use the default way, as an LG WebOS developer: https://webostv.developer.lge.com/develop/getting-started/developer-mode-app

#### (TODO)
Renew automatically: https://github.com/SR-Lut3t1um/Webos-renew-dev/

### Connect TV
- Then you can connect with your tv: 
```
ares-setup-device
```

## Install app and service
- Check out the code
- Run the following command:
```shell
npm install
```
- Update these fields:
```javascript
const host = 'YOUR MQTT BROKER HOST';
const port = '1883'; // OR THE POR OF THE BROKER
const username = 'YOUR MQTT USERNAME';
const password = 'YOUR MQTT PASSWORD';
```
- Run the following commands:
```shell
cd tv-service
npm i
cd ..
ares-package tv-app/ tv-service/
ares-install ./com.slg.tv_0.0.1_all.ipk
```
The service and app are now installed.

## Starting the service
The app is now installed on the home screen, and can be started from there.

### Automatically with an automation

Based on a notification (Can MQTT be turned on?) and [home-assistant-variables](https://github.com/snarky-snark/home-assistant-variables):

```yaml
alias: "Start TV app MQTT "
description: ""
trigger:
  - platform: event
    event_type: mobile_app_notification_action
    event_data:
      action: TURN_TV_MQTT_ON
condition: []
action:
  - service: var.update
    data:
      entity_id: var.tv_media_source
  - service: media_player.select_source
    data:
      source: MQTT TV App
    target:
      entity_id: media_player.living_room_tv
  - delay:
      hours: 0
      minutes: 0
      seconds: 5
      milliseconds: 0
  - service: media_player.select_source
    data:
      source: "{{states('var.tv_media_source')}}"
    target:
      entity_id: media_player.living_room_tv
mode: single
```

## Using the service
In Home Assistant, add two new sensors:
```yaml
sensor:
  - platform: mqtt
    name: "LG TV PlayState"
    state_topic: "tv-service/playState"
  - platform: mqtt
    name: "LG TV AppId"
    state_topic: "tv-service/appId"
```
Now you can make an automation to listen to these states and turn lights on or off, or whatever you want to do...

# TODO
- Use the app to configure the service via the tv
- Send a screenshot/some color information to color lights when pausing
- Move to Typescript
