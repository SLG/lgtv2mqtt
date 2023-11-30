@echo off

echo "Compiling service"
cd tv-service
@REM npm run build
CMD /C "%ProgramFiles%\nodejs\npm" run install
CMD /C "%ProgramFiles%\nodejs\npm" run build
echo "Adding stuff"
CMD /C "%ProgramFiles%\nodejs\npm" run postbuild-win
cd ..

echo "Packaging"
CMD /C ares-package tv-app/ tv-service/

echo "Installing"
CMD /C ares-install .\com.slg.lgtv2mqtt_0.0.1_all.ipk -d tv
