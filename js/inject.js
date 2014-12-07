(function(){

    var storage = chrome.storage.local,
        notyRef,
        port,
        id = chrome.runtime.id;
        reconnectExtension = function(){
            console.log("port reset");
            port = false;

            if(notyRef){
                notyRef.close();    
            }
            
            // Won't connect no matter what.
            //setTimeout(connectToExtension, 5000);
        },
        connectToExtension = function(){
            port = chrome.runtime.connect(id);
            port.onDisconnect.addListener(reconnectExtension);
        },
        initNoty = function() {
            $.noty.defaults = {
                layout: 'topRight',
                theme: 'defaultTheme',
                type: 'alert',
                text: 'Sample Notification',
                dismissQueue: false, 
                template: '<div class="noty_message"><span class="noty_text">\
                        </span><div class="noty_close"></div></div>',
                animation: {
                    open: {
                        height: 'toggle'
                    },
                    close: {
                        height: 'toggle'
                    },
                    easing: 'swing',
                    speed: 250 
                },
                timeout: false, 
                force: true, 
                modal: false,
                maxVisible: 1, 
                killer: true, 
                closeWith: ['click'], 
                callback: {
                    onShow: function() {},
                    afterShow: function() {},
                    onClose: function() {},
                    afterClose: function() {}
                },
                buttons: false
            };
        },
        data = {
            consumer_key: "34861-28c2d90660db385a7d94bd26",
            redirect_uri: "chrome-extension://" + chrome.runtime.id + "/html/\
                            options.html?getAccessToken=1",
            access_token: false,
            username: false,
            request_token: false
        },
        urls = {
            "add": "https://getpocket.com/v3/add",
        },
        init = function() {

            storage.get(null, function(o) {
                data.access_token = o.access_token || false;
                data.username = o.username || false;
                data.request_token = o.request_token || false;
            });

            connectToExtension();
        },
        saveItem = function(url) {

            storage.get('access_token', function(o) {

                $.ajax({
                    url: urls.add,
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        "access_token": o.access_token,
                        "consumer_key": data.consumer_key,
                        "url": url
                    },
                    headers: {
                        "X-Accept": "application/json"
                    }
                })
                    .done(function(data, textStatus, req) {

                        notyRef.setText('Item saved successfully');
                        notyRef.setType('success');
                    })
                    .fail(function(req) {

                        handleError(req);

                        var baseUri = 'chrome-extension://' + chrome.runtime.id 
                                    + '/html/options.html';

                        storage.get(["x_error_code", "x_error"], function(o) {
                            var text = o.x_error_code + ": " + o.x_error
                                    + "<br> Click <a target='_blank' href=" 
                                    + baseUri + ">here</a> to troubleshoot";

                            notyRef.setText(text);
                            notyRef.setType('error');

                            console.log("An error has occured\
                                         while saving the answer");
                        });
                    });
            });
        },
        handleError = function(req) {

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
        },
        readyStateCheckInterval = setInterval(function() {

            if (document.readyState === "complete") {
                clearInterval(readyStateCheckInterval);

                init();
                initNoty();

                console.log("A hello from Quora Save to Pocket Extension");

                $("body").on('click', 'a.overflow_link', function(ev) {

                    // If extension is disconnected, do not perform any task.
                    if(!port){
                        return;
                    }

                    ev.preventDefault();
                    $this = $(this);

                    var el = $('<li class="menu_list_item saveToPocket"><span>\
                        <a>Save to Pocket</a></span></li>'),
                        id = $this.attr('id').replace('_link', ''),
                        t = $('#' + id + '_menu_contents ul'),
                        actionBar = $this.parents('div.ActionBar'),
                        classList = actionBar.attr('class');

                    // Add button to answers, questions and posts.
                    // All other items can be directly saved by clicking the
                    // pocket extension icon.

                    if ((classList.indexOf('Answer') >= 0 
                        || classList.indexOf('Question') >= 0 
                        || classList.indexOf('Post') >= 0) 
                        && t.find('li.saveToPocket').length == 0) {

                        var feedItem = $this.parents('div.pagedlist_item'),
                            link = el.find('a').eq(0),
                            remove = false;


                        if (classList.indexOf('Answer') >= 0) {

                            var url = feedItem.find('a.answer_permalink').attr('href');

                            if (url) {
                                link.attr('href', url);
                            } else {
                                remove = true;
                            }
                        } else if (classList.indexOf('Question') >= 0) {

                            var url = feedItem.find('a.question_link').attr('href');

                            if (url) {
                                link.attr('href', url);
                            } else {
                                remove = true;
                            }
                        } else if (classList.indexOf('Post') >= 0) {

                            // Non-feed (single page) posts can be saved using the link
                            // in the address bar.

                            // All posts that appear in feeds will bear a save to pocket
                            // link.
                            var url = feedItem.find('a.BoardItemTitle').attr('href');

                            if (url) {
                                link.attr('href', url);
                            } else {
                                remove = true;
                            }
                        }

                        if (!remove) {
                            t.append(el);
                        }
                    }
                });

                $('body').on('click', 'li.saveToPocket a', function(ev) {

                    // If extension is disconnected, do not perform any task.
                    if(!port){
                        return;
                    }

                    ev.preventDefault();
                    var url = ev.target.href;
                    $this = $(this);
                    if (url) {
                        notyRef = noty({
                            text: "Saving Item...",
                            type: "info",
                            layout: "topRight"
                        });

                        saveItem(url);
                    }
                });
            }
        }, 10);
})();
