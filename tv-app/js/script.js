function start() {
    try {
        webOS.service.request("luna://com.slg.lgtv2mqtt.service/", {
            method: 'start',
            onFailure: (err) => showFailure('start', err),
            onSuccess: showSuccess
        });
        getState();
    } catch (err) {
        showFailure('start - catch', err)
    }
}

function stop() {
    try {
        webOS.service.request("luna://com.slg.lgtv2mqtt.service/", {
            method: 'stop',
            onFailure: (err) => showFailure('stop', err),
            onSuccess: showSuccess
        });
        getState();
    } catch (err) {
        showFailure('stop - catch', err)
    }
}

function getState() {
    try {
        webOS.service.request("luna://com.slg.lgtv2mqtt.service/", {
            method: 'getState',
            onFailure: (err) => showFailure('getState', err),
            onSuccess: (res) => {
                document.getElementById("state").innerHTML = `Current state: ${res.state}`;
            }
        });
    } catch (err) {
        showFailure('getState - catch', err)
    }
}

function getLogs() {
    try {
        webOS.service.request("luna://com.slg.lgtv2mqtt.service/", {
            method: 'logs',
            onFailure: (err) => showFailure('getLogs', err),
            onSuccess: showSuccess
        });
    } catch (err) {
        showFailure('getLogs - catch', err)
    }
}

function clearLogs() {
    try {
        webOS.service.request("luna://com.slg.lgtv2mqtt.service/", {
            method: 'clearLogs',
            onFailure: (err) => showFailure('clearLogs', err),
            onSuccess: showSuccess
        });
    } catch (err) {
        showFailure('clearLogs - catch', err)
    }
}

function showSuccess(res) {
    document.getElementById("error").innerHTML = '';

    document.getElementById("list").innerHTML = '';
    if (!res.logs || res.logs.length === 0) {
        let li = document.createElement('li');
        li.innerHTML += 'no logging available';
        document.getElementById("list").appendChild(li);
    }
    res.logs.forEach(log => {
        let li = document.createElement('li');
        li.innerHTML += log;
        document.getElementById("list").appendChild(li);
    });
}

function showFailure(method, err) {
    document.getElementById("error").innerHTML = `${method} failed: ${JSON.stringify(err)}`;
    console.error(method, err)
}

document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
        getState();
        getLogs();
    }
}, true);

// function getConfigFile() {
//     console.log('getConfigFile')
//     webOS.service.request("luna://com.slg.lgtv2mqtt.service/", {
//         method: 'getConfig',
//         onFailure: (err) => showFailure('getConfigFile', err),
//         onSuccess: (resp) => {
//             console.log('done')
//             console.log(resp);
//         }
//     });
// }
