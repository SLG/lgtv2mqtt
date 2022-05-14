# tv-service

## Setup tv
I'm not really sure if it's needed to do this, but it makes it easier to get the service started automatically.
- So start with https://rootmy.tv
- Enable the SSH server in the *Homebrew Channel*
- Set up your dev environment with the *ares-cli*: https://www.webosbrew.org/pages/configuring-sdk.html
- Then you can connect with your tv: 
```
ares-setup-device
```
## Install app and service
- Check out the code
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
ares-install ./nl.slg.tv_0.0.1_all.ipk
```
THe service and app are now installed.
## Starting the service
Then you can start the service manually:
```
ares-shell -r "luna-send -n 1 -f luna://nl.slg.tv.service/start '{}'"
```

But you can also use a script to start the service automatically when starting the tv.

Copy the *start-tv-service.sh*-file to */var/lib/webosbrew/init.d* and make it executable: 
```
chmod +x start-tv-service.sh
```
After that, the service should start automatically.
## Using the service
*TBD*

# TODO
- Setup Home Assistant with a sensor, and document here
- Use the app to configure the service via the tv
- Send a screenshot/some color information to color lights when pausing
