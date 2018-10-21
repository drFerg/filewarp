var TextTransmitter = (function() {
    var btns;
    var textbox;
    var warningbox;
    var transmit;


    function onTransmitFinish(btn) {
        textbox.focus();
        btn.disabled = false;
        var originalText = btn.innerText;
        btn.innerText = btn.getAttribute('data-quiet-sending-text');
        btn.setAttribute('data-quiet-sending-text', originalText);
    };

    function onClick(e, transmit) {
        e.target.disabled = true;
        var originalText = e.target.innerText;
        e.target.innerText = e.target.getAttribute('data-quiet-sending-text');
        e.target.setAttribute('data-quiet-sending-text', originalText);
        var ifaceState = WiFiControl.getIfaceState();
        var ssid;
        if (ifaceState["success"] == true) {
            ssid = ifaceState["ssid"];
        } else {
            ssid = "none";
        }
        var payload = JSON.stringify({'id': 0, "type":"broadcast", "ip": ip.address(), "ssid": ssid});
        if (payload === "") {
            onFinish();
            return;
        }
        transmit.transmit(Quiet.str2ab(payload));
    };





    function setupButton(btn) {
        var profilename = btn.getAttribute('data-quiet-profile-name');
        var onFinish = function() { return onTransmitFinish(btn); };
        var onBtnClick = function(e) { return onClick(e, transmit, "none"); };
        btn.addEventListener('click', onBtnClick, false);
    };

    function onQuietReady() {
        for (var i = 0; i < btns.length; i++) {
            setupButton(btns[i]);
        }
    };

    function onQuietFail(reason) {
        console.log("quiet failed to initialize: " + reason);
        warningbox.classList.remove("hidden");
        warningbox.textContent = "Sorry, it looks like there was a problem with this example (" + reason + ")";
    };

    function onDOMLoad() {
        btns = document.querySelectorAll('[data-quiet-send-text-button]');
        textbox = document.querySelector('[data-quiet-text-input]');
        warningbox = document.querySelector('[data-quiet-send-text-warning]');
        Quiet.addReadyCallback(onQuietReady, onQuietFail);

    };
    
    document.addEventListener("DOMContentLoaded", onDOMLoad);
})();