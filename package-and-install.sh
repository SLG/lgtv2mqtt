echo "Compiling service"
cd tv-service || exit
run build --loglevel error
echo "Adding stuff"
run postbuild
cd .. || exit

echo "Packaging"
ares-package tv-app/ tv-service/

echo "Installing"
ares-install .\com.slg.lgtv2mqtt_0.0.1_all.ipk -d tv
