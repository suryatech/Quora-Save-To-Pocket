(function() {

    chrome.storage.onChanged.addListener(function(changes, namespace){
        if(namespace === 'local'){
  
            for(key in changes){
                if(data.hasOwnProperty(key)){
                    data[key] = changes[key].newValue;
                }
            }
        }
    });

    var storage = chrome.storage.local,
        initNoty = function() {
            $.noty.defaults = {
                layout: 'topRight',
                theme: 'defaultTheme',
                type: 'alert',
                text: 'Sample Notification', // can be html or string
                dismissQueue: false, // If you want to use queue feature set this true
                template: '<div class="noty_message"><span class="noty_text"></span><div class="noty_close"></div></div>',
                animation: {
                    open: {
                        height: 'toggle'
                    },
                    close: {
                        height: 'toggle'
                    },
                    easing: 'swing',
                    speed: 250 // opening & closing animation speed
                },
                timeout: false, // delay for closing event. Set false for sticky notifications
                force: true, // adds notification to the beginning of queue when set to true
                modal: false,
                maxVisible: 1, // you can set max visible notification for dismissQueue true option,
                killer: true, // for close all notifications before show
                closeWith: ['click'], // ['click', 'button', 'hover', 'backdrop'] // backdrop click will close all open notifications
                callback: {
                    onShow: function() {},
                    afterShow: function() {},
                    onClose: function() {},
                    afterClose: function() {}
                },
                buttons: false // an array of buttons
            };
        },
        data = {
            consumer_key: "34861-28c2d90660db385a7d94bd26",
            redirect_uri: "chrome-extension://" + chrome.runtime.id + "/html/options.html?getAccessToken=1",
            access_token: false,
            username: false,
            request_token: false
        },
        notyRef,
        init = function() {

            initNoty();

            var code,
                user;

            storage.get(null, function(o){
                data.access_token = o.access_token || false;
                data.username = o.username || false;
                data.request_token = o.request_token || false;

                code = o.x_error_code || false;
                user = o.username;

                if (code) {
                    notyRef = noty({
                        text: "Please logout and login again to fix any issues",
                        type: "info",
                        layout: "topRight"
                    });

                    storage.remove(["x_error", "x_error_code"]);
                }

                if (user) {
                    $('#username-field').text(user);
                    $('#login-link').hide();
                } else {
                    $('#logout-link').hide();
                }
            });
        },
        urls = {
            "authorize": "https://getpocket.com/v3/oauth/authorize",
            "requestToken": "https://getpocket.com/v3/oauth/request",
            "add": "https://getpocket.com/v3/add",
            "github": "https://github.com/suryatech/Quora-Save-To-Pocket"
        };
    
    chrome.runtime.onMessage.addListener(function(msg) {
        if (msg.action === 'authorize') {
            authorize();
        }
    });

    $(document).ready(function() {
        var queryString = window.location.search;
 
        if (queryString.indexOf("getAccessToken") >= 0) {
            console.log("Retrieving access token...");

            chrome.runtime.sendMessage({
                "action": "authorize"
            });
        }else if(queryString.indexOf("firstRun") >= 0){
            notyRef = noty({
                text: "Please login to start using the extension",
                type: "warning",
                layout: "topRight"
            });
        }
    });

    $(window).load(function() {

        $("#logout-link").click(function(event) {
            event.preventDefault();

            if (confirm("Are you sure you want to log out?")) {

                storage.remove(["username", "access_token", "request_token"]);
                
                $('#login-link').show();
                $('#logout-link').hide();
                $('#username-field').hide();
            }
        });

        $("#login-link").click(function(event) {
            event.preventDefault();
            getRequestToken();
        });

        $("#email").click(function(event) {
            event.preventDefault();

            chrome.windows.getCurrent(function(w) {
                chrome.windows.update(w.id, {
                    focused: true
                }, function(w) {
                    chrome.tabs.create({
                        url: url,
                        windowId: w.id
                    });
                });
            })
        });

        init();
    });

    var authorize = function() {

        if(!data.popup){
            // Only the main instance would call authorize
            return;
        }

        chrome.windows.remove(data.popup.id);

        notyRef.setText('Generating access token...');
        notyRef.setType('warning');

        storage.get("request_token", function(o){
            $.ajax({
                url: urls.authorize,
                type: 'POST',
                dataType: 'json',
                data: {
                    "consumer_key": data.consumer_key,
                    "code": o.request_token
                },
                headers: {
                    "X-Accept": "application/json"
                }
            })
            .done(function(res, textStatus, req) {
                
                if (res.access_token) {
                    data.access_token = res.access_token;
                    data.username = res.username;

                    storage.set({
                        "access_token": res.access_token,
                        "username": res.username
                    });
                    
                    $('#username-field').text(res.username).show();

                    $('#login-link').hide();
                    $('#logout-link').show();

                    notyRef.setText('Extension has been successfully authenticated.\
                                 Welcome aboard!');
                    notyRef.setType('success');

                } else {
                    notyRef.setText('Invalid access_token sent by server. Please\
                                 ensure that you have granted permissions.');
                    notyRef.setType('error');
                }
            })
            .fail(function(req) {

                handleError(req);
                printErrorMessage();

                storage.remove("request_token");
            });
        });
    };

    var getRequestToken = function() {

        notyRef = noty({
            text: "Generating request token...",
            type: "info",
            layout: "topRight"
        });

        $.ajax({
            url: urls.requestToken,
            type: 'POST',
            dataType: 'json',
            data: {
                "consumer_key": data.consumer_key,
                "redirect_uri": data.redirect_uri
            },
            headers: {
                "X-Accept": "application/json"
            }
        })
            .done(function(res, textStatus, req) {
                console.log("Successfully retrieved request token");

                data.request_token = res.code;

                storage.set({
                    'request_token': res.code   
                });
                
                notyRef.setText('Request token genereated, waiting for permissions...');
                notyRef.setType('warning');

                oAuthRedirect();
            })
            .fail(function(req) {

                handleError(req);
                printErrorMessage();
            });
    };

    var handleError = function(req) {

        if (req.status < 200) {

            storage.set({
                'x_error_code': req.status,
                'x_error': "( Unknown Error ) " + req.statusText
            });
            
            return;
        }

        var headers = req.getAllResponseHeaders().split('\n'),
            x_error, x_error_code;

        headers.forEach(function(item) {

            if (item.indexOf('X-Error-Code') >= 0) {
                x_error_code = item.split(":")[1];
                console.log('error message :' + x_error_code);

                storage.set({
                    'x_error_code': x_error_code
                });
            } else if (item.indexOf('X-Error') >= 0) {

                x_error = item.split(":")[1];
                console.log('error message :' + x_error);

                storage.set({
                    'x_error': x_error
                });
            }
        });
    };
    var oAuthRedirect = function() {

        var url = "https://getpocket.com/auth/authorize?request_token=";

        url += data.request_token + "&redirect_uri=" + data.redirect_uri;

        chrome.windows.getCurrent({
            populate: false
        }, function(w) {

            data.currWindow = w;

            chrome.windows.create({
                type: "popup",
                url: url,
                width: 800,
                height: 600
            }, function(p) {
                data.popup = p;
            });
        });
    }

    var printErrorMessage = function(){

        storage.get(["x_error_code", "x_error"], function(o){
            var text = o.x_error_code + ": " + o.x_error;
            
            notyRef.setText(text);
            notyRef.setType('error');    
        });

    }
})();
