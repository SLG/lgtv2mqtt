echo "Compiling service"
cd tv-service || exit
npm run build --loglevel error
echo "Adding stuff"
npm run postbuild-linux
cd .. || exit

echo "Packaging"
ares-package tv-app/ tv-service/

echo "Installing"
ares-install .\com.slg.lgtv2mqtt_0.0.1_all.ipk -d tv
