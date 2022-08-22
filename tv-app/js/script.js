function start() {
    webOS.service.request("luna://com.slg.tv.service/", {
        method: 'start',
        onFailure: showFailure,
        onSuccess: showSuccess
    });
    getState();
}

function stop() {
    webOS.service.request("luna://com.slg.tv.service/", {
        method: 'stop',
        onFailure: showFailure,
        onSuccess: showSuccess
    });
    getState();
}

function getState() {
    webOS.service.request("luna://com.slg.tv.service/", {
        method: 'getState',
        onFailure: showFailure,
        onSuccess: (res) => {
            document.getElementById("state").innerHTML = `Current state: ${res.state}`;
        }
    });
}

function getLogs() {
    webOS.service.request("luna://com.slg.tv.service/", {
        method: 'logs',
        onFailure: showFailure,
        onSuccess: showSuccess
    });
}

function clearLogs() {
    webOS.service.request("luna://com.slg.tv.service/", {
        method: 'clearLogs',
        onFailure: showFailure,
        onSuccess: showSuccess
    });
}

function showSuccess(res) {
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

function showFailure(err) {
    document.getElementById("error").innerHTML = `Failed: ${JSON.stringify(err)}`;
}


document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
        getState();
        getLogs();
    }
}, true);