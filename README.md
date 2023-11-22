# LG TV 2 MQTT WebOS Service
For WebOS 6. Maybe it works for earlier or later versions...?
## Setup tv
### WebOS developer
[Register as an LG WebOS developer](https://webostv.developer.lge.com/develop/getting-started/developer-mode-app)

### Connect TV
- Then you can connect with your tv: 
```shell
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
ares-package tv-app/ tv-service/
ares-install ./com.slg.lgtv2mqtt_0.0.1_all.ipk
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

## Renew Devmode session


#### Manually

1. Make sure the sdk is working
2. Run `ssh prisoner@<tv IP> -p 9922 -i <key location> "/bin/sh -i"`
3. Run `cat /var/luna/preferences/devmode_enabled` and safe the promting key
4. in Home Asisstant configuration.yaml:
   ```yaml
   rest_command:
    update_lg_dev:
    url: "https://developer.lge.com/secure/ResetDevModeSession.dev?sessionToken=<the key from step 3>"
    ```
5. Create an automation:
   ```yaml
   alias: Reset LG Dev session
   description: ""
   trigger:
     - platform: time
       at: "01:00:00"
   condition: []
   action:
     - service: rest_command.update_lg_dev
       data: {}
   mode: single
   ```

notes:

the key is located in ~/ssh name is webos with your device name

you can ignore the prompting error message

[source](https://www.reddit.com/r/jellyfin/comments/ryowwb/i_created_a_simple_script_to_renew_the_devmode_on/)


# TODO
- Use the app to configure the service via the tv
- Send a screenshot/some color information to color lights when pausing
- Move to Typescript
- [Renew developer session automatically](https://github.com/SR-Lut3t1um/Webos-renew-dev/)
