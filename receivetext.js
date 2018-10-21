var TextReceiver = (function() {
    // window.$ = window.jQuery = require('jquery');
    var foundUserID = 0;
    var connectionTable = {};
    var username = "Fergus";
    Quiet.init({
        profilesPrefix: "js/",
        memoryInitializerPrefix: "js/",
        libfecPrefix: "js/"
    });
    var WiFiControl = require('wifi-control');
    var ip = require('ip');

    WiFiControl.init({
        debug: true
      });

    var transmit;
    var receivers;
    var ID = Math.floor(Math.random() *100);
    var minPort = 1024;
    var maxPort = 49151;
    var file = "";
    var port = 0;

    function getRandomPort() {
      return Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort; //The maximum is inclusive and the minimum is inclusive 
    }

    function onReceive(recvPayload, recvObj) {
        console.log(recvPayload);
        var msg = JSON.parse(Quiet.ab2str(recvPayload));
        // if (msg["id"] == ID) {console.log("got my own message"); return;}
        console.log("Got message" + msg.type);

        if (msg["type"] == "broadcast"){
            console.log("broadcast found" + msg.user);
            connectionTable[msg.src] = {"user": msg.user, "ip": msg.ip, "ssid": msg.ssid, "status": "broadcast"};
            var payload = JSON.stringify({'src': ID, "type":"broadcast_ack", "ip": ip.address(), "user": username});
            transmit.transmit(Quiet.str2ab(payload));
        }
        else if (msg["type"] == "broadcast_ack") {
            var user = connectionTable[msg.src].user;
            connectionTable[msg.src]["status"] = "broadcast_ack";
            addUser(user, msg.src);
            console.log("Discovered: " + user);
            M.toast({html: 'Discovered: ' + user});
        }
        else if (msg["type"] == "connect"){
            console.log
            var alertMsg = connectionTable[msg.src]['user'] + " wants to send you " + msg.file;
            var toastHTML = `<span> ${alertMsg} </span><button id="acceptAlert" class="btn-flat toast-action">Accept</button>`;

            M.toast({html: toastHTML});
            document.getElementById("acceptAlert").onclick = startServer;

            
        }
        else if (msg["type"] == "reply") {
            console.log("Got reply, connecting to server @ " + msg["ip"] + ":" + msg["port"]);
            var socket = require('socket.io-client')("http://" + msg["ip"] +":" + msg["port"]);
            socket.on('connect', function(){
                console.log("Connected!"); 
                // socket.emit('filesend', "boooo");
                let stream = ss.createStream();
                ss(socket).emit('file', stream, {size: file.size, name: file.name});
                let blobStream = ss.createBlobReadStream(file);
                let size = 0;
                blobStream.on('data', chunk => {
                    size += chunk.length;
                    var cent = Math.floor(size / file.size * 100) + '%';
                    console.log(cent);
                    var elem = $('#'+ msg.src + "_progress");
                    elem.css("height", cent);
                    var elem = $('#'+ msg.src + "_button");
                    elem.attr("data-tooltip", "Download: " + cent);
                });

                blobStream.pipe(stream);
                blobStream.on('end' , ()=> {
                    console.log('done');
                });
            });
            socket.on('connect_error', (error) => { console.log("connecterror" + error);
            });

            socket.on('event', function(data){});
            socket.on('disconnect', function(){});
            
        }
        recvObj.content = Quiet.mergeab(recvObj.content, recvPayload);
        recvObj.target.textContent = Quiet.ab2str(recvObj.content);
        recvObj.successes++;
        var total = recvObj.failures + recvObj.successes
        var ratio = recvObj.failures/total * 100;
        recvObj.warningbox.textContent = "You may need to move the transmitter closer to the receiver and set the volume to 50%. Packet Loss: " + recvObj.failures + "/" + total + " (" + ratio.toFixed(0) + "%)";
    };

    function onReceiverCreateFail(reason, recvObj) {
        console.log("failed to create quiet receiver: " + reason);
        recvObj.warningbox.classList.remove("hidden");
        recvObj.warningbox.textContent = "Sorry, it looks like this example is not supported by your browser. Please give permission to use the microphone or try again in Google Chrome or Microsoft Edge."
    };

    function onReceiveFail(num_fails, recvObj) {
        recvObj.warningbox.classList.remove("hidden");
        recvObj.failures = num_fails;
        var total = recvObj.failures + recvObj.successes
        var ratio = recvObj.failures/total * 100;
        recvObj.warningbox.textContent = "You may need to move the transmitter closer to the receiver and set the volume to 50%. Packet Loss: " + recvObj.failures + "/" + total + " (" + ratio.toFixed(0) + "%)";
    };

    function broadcast() {
        var payload = JSON.stringify({'src': ID, "type":"broadcast", "ip": ip.address(), "user": username});
        transmit.transmit(Quiet.str2ab(payload));
    }

    function onClick(e, recvObj) {
        e.target.disabled = true;
        var originalText = e.target.innerText;
        e.target.innerText = e.target.getAttribute('data-quiet-receiving-text');
        e.target.setAttribute('data-quiet-receiving-text', originalText);
        if (e.target.id == "broadcast") {
            broadcast();
            console.log("Broadcasting...");
            e.target.parentElement.classList.add('pulse');
            return;
        } else if (e.target.id == "listen") {
            console.log("Turning on listen");
            var receiverOnReceive = function(payload) { onReceive(payload, recvObj); };
            var receiverOnReceiverCreateFail = function(reason) { onReceiverCreateFail(reason, recvObj); };
            var receiverOnReceiveFail = function(num_fails) { onReceiveFail(num_fails, recvObj); };
            Quiet.receiver({profile: recvObj.profilename,
                onReceive: receiverOnReceive,
                onCreateFail: receiverOnReceiverCreateFail,
                onReceiveFail: receiverOnReceiveFail
            });
        }

        e.target.classList.remove('red');
        e.target.classList.add('green');

    }

    function setupReceiver(receiver) {
        var recvObj = {
            profilename: receiver.getAttribute('data-quiet-profile-name'),
            btn: receiver.querySelector('[data-quiet-receive-text-button]'),
            target: receiver.querySelector('[data-quiet-receive-text-target]'),
            warningbox: receiver.querySelector('[data-quiet-receive-text-warning]'),
            successes: 0,
            failures: 0,
            content: new ArrayBuffer(0)
        };
        var onBtnClick = function(e) { return onClick(e, recvObj); };
        recvObj.btn.addEventListener('click', onBtnClick, false);
    };

    function onQuietReady() {
        for (var i = 0; i < receivers.length; i++) {
            setupReceiver(receivers[i]);
        }

        transmit = Quiet.transmitter({profile: 'ultrasonic-experimental', onFinish:function() {},clampFrame: false});

    };

    function onQuietFail(reason) {
        console.log("quiet failed to initialize: " + reason);
        var warningbox = document.querySelector('[data-quiet-receive-text-warning]');
        warningbox.classList.remove("hidden");
        warningbox.textContent = "Sorry, it looks like there was a problem with this example (" + reason + ")";
    };

    function onDOMLoad() {
        receivers = document.querySelectorAll('[data-quiet-receive-text]');
        Quiet.addReadyCallback(onQuietReady, onQuietFail);
    };

    function startServer(){
        var io = require('socket.io')();
        var fs = require('fs');
        port = getRandomPort();
        io.on('connection', function(client){
            client.on('event', function(data){console.log("got data: " + data)});
            client.on('disconnect', function(){});
            client.on('TESTING', function(data){console.log("got testing: " + data)});
            ss(client).on('file', (stream, data) => {
                stream.pipe(fs.createWriteStream("warp/"+file.name));
            });
        });
        io.listen(port);
        var payload = JSON.stringify({'src': ID, "type":"reply", "ip": ip.address(), "port": port });
        transmit.transmit(Quiet.str2ab(payload));
    }

    function sendFile(transmit, user, filename) {
        var ifaceState = WiFiControl.getIfaceState();
        var ssid;
        if (ifaceState["success"] == true) {
            ssid = ifaceState["ssid"];
        } else {
            ssid = "none";
        }
        var payload = JSON.stringify({'src': ID, "type":"connect", "file": filename});
        if (payload === "") {
            onFinish();
            return;
        }
        console.log(payload);
        transmit.transmit(Quiet.str2ab(payload));
    };

 

var updateLayout = function(listItems) {
  for (var i = 0; i < listItems.length; i++) {
    var offsetAngle = 360 / listItems.length;
    var rotateAngle = offsetAngle * i;
    $(listItems[i]).css("transform", "rotate(" + rotateAngle + "deg) translate(12em) rotate(-" + rotateAngle + "deg)")
    // $(listItems[i]).children().addClass("pulse");
    
  };

  setTimeout(function() {
    for (var i = 0; i < listItems.length; i++) {
        $(listItems[i]).children().removeClass("pulse");
      };
    }, 3000);
};

document.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    for (let f of e.dataTransfer.files) {
        console.log("Dropped on:" + $(e.target).attr('user'));
        console.log('File(s) you dragged here: ', f.path)
        sendFile(transmit, $(e.target).attr('user'), f.name);
        file = f;
    }
});

document.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
    var listItems = $(".list-item");
    updateLayout(listItems);
});

    document.addEventListener("DOMContentLoaded", onDOMLoad);
    document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.fixed-action-btn');
    var instances = M.FloatingActionButton.init(elems, {});
  });

function addUser(user, id) {
  var list = $("#userlist");

  var listItem = $(`<li class='list-item'><button id="${id}_button" class='btn-floating btn-large green scale-transition scale-out tooltipped' user='${user}' userID='${id}' data-position='bottom' data-tooltip='${user}'><span id="${id}_progress" class="fill"></span><i class='material-icons' user='${user}' userID='${id}'>person</i></button></li>`);
  list.append(listItem);
  var listItems = $(".list-item");
  updateLayout(listItems);
  setTimeout(function() {
    listItem[0].children[0].classList.remove("scale-out");
    listItem[0].children[0].classList.add("scale-in");
    }, 500);
    $('.tooltipped').tooltip();
}

$(document).on("click", ".remove-item", function() {
  $(this).parent().remove();
  var listItems = $(".list-item");
  updateLayout(listItems);
});

$(document).ready(function(){
    $('.sidenav').sidenav({"edge":"right"});

  });


})();