(function () {

    var storage = chrome.storage.local,
        notyRef,
        port,
        id = chrome.runtime.id,
        x_error,
        x_error_code,
        $body = $('body'),
        debug = false,
        saveToPocket = '<div class="action_item"><span><a class="saveToPocket">Save to Pocket</a></span></div>',
        notify = function (msg, type) {
            if (notyRef) {
                notyRef.close();
            }

            notyRef = noty({
                text: msg,
                type: type
            });
        },
        appendLink = function (actionBar, link) {
            // Better validation of node here.
            if (!actionBar) {
                return;
            }

            if (actionBar.find('a.saveToPocket').length !== 0 ||
                actionBar.find('a.savedToPocket').length !== 0) {
                return false;
            }

            var el = $(saveToPocket),
                saveToPocketLink = el.find('a').eq(0);

            saveToPocketLink.attr('href', link);
            actionBar.append(el);
        },
        insertSaveToPocket = function (node) {

            // Better validation of node here.
            if (!node) {
                return;
            }

            var url = getActionBarLink(node);

            // Do not insert and run into issues if the url is not valid
            if (typeof url !== 'string') {
                return;
            }

            console.debug("Link parsed: ", url);
            appendLink(node, url)
        },
        getActionBarLink = function (actionBar) {
            var element = actionBar.find("a.TwitterNetworkShare");
            var href = element.attr("href");

            var url = href
                      && href.split("url=")
                      && href.split("url=")[1]
                      && href.split("url=")[1].split("?")
                      && href.split("url=")[1].split("?")[0];

            return url;
        },
        reconnectExtension = function () {
            console.debug("port reset");
            port = false;

            if (notyRef) {
                notyRef.close();
            }

            // Won't connect no matter what.
            //setTimeout(connectToExtension, 5000);
        },
        connectToExtension = function () {
            port = chrome.runtime.connect(id);
            port.onDisconnect.addListener(reconnectExtension);
        },
        initNoty = function () {
            $.noty.defaults = {
                layout: 'topRight',
                theme: 'relax',
                type: 'alert',
                text: 'Sample Notification',
                dismissQueue: false,
                template: '<div class="noty_message"><span class="noty_text"></span><div class="noty_close"></div></div>',
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
                force: false,
                modal: false,
                maxVisible: 1,
                killer: true,
                closeWith: ['click'],
                callback: {
                    onShow: function () {
                    },
                    afterShow: function () {
                    },
                    onClose: function () {
                    },
                    afterClose: function () {
                    }
                },
                buttons: false
            };
        },

    //todo: consumer key needs to be in one place, refactor later
        data = {
            consumer_key: "34861-28c2d90660db385a7d94bd26",
            redirect_uri: "chrome-extension://" + chrome.runtime.id
                          + "/html/options.html?getAccessToken=1",
            access_token: false,
            username: false,
            request_token: false
        },
        urls = {
            "add": "https://getpocket.com/v3/add",
            "remove": "https://getpocket.com/v3/send"
        },
        init = function () {

            storage.get(null, function (o) {
                data.access_token = o.access_token || false;
                data.username = o.username || false;
                data.request_token = o.request_token || false;
            });

            connectToExtension();
        },
        saveItem = function (url, target) {

            storage.get('access_token', function (o) {

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
                    .done(function (data, textStatus, req) {

                              //notify("Item saved successfully", "success");
                              target
                                  .removeClass('saveToPocket')
                                  .addClass('savedToPocket')
                                  .text('Remove from Pocket')
                                  .data('id', data.item.item_id);
                          })
                    .fail(function (req) {

                              handleError(req);

                              if (!x_error_code && !x_error) {
                                  x_error = "";
                                  x_error_code = "Something went wrong";
                              }

                              var baseUri = 'chrome-extension://' + chrome.runtime.id
                                            + '/html/options.html';

                              var text = x_error_code + ": " + x_error
                                         + "<br> Click <a target='_blank' href="
                                         + baseUri + ">here</a> to troubleshoot";

                              notify(text, "error");

                              target.text('Save to Pocket');
                              console.error("An error has occured while saving the answer");
                          });
            });
        },
        removeItem = function (target) {

            storage.get('access_token', function (o) {

                $.ajax({
                    url: urls.remove,
                    type: 'POST',
                    dataType: 'json',
                    processData: false,
                    contentType: "application/json; charset=utf-8",
                    data: JSON.stringify({
                        "access_token": o.access_token,
                        "consumer_key": data.consumer_key,
                        "actions": [{
                            "action": "delete",
                            "item_id": target.data('id')
                        }]
                    }),
                    headers: {
                        "X-Accept": "application/json"
                    }
                })
                    .done(function (data, textStatus, req) {

                              //notify("Item saved successfully", "success");
                              target
                                  .removeClass('savedToPocket')
                                  .addClass('saveToPocket')
                                  .text('Save to Pocket')
                                  .removeData('id');
                          })
                    .fail(function (req) {

                              handleError(req);

                              if (!x_error_code && !x_error) {
                                  x_error = "";
                                  x_error_code = "Something went wrong";
                              }

                              var baseUri = 'chrome-extension://' + chrome.runtime.id
                                            + '/html/options.html';

                              var text = x_error_code + ": " + x_error
                                         + "<br> Click <a target='_blank' href="
                                         + baseUri + ">here</a> to troubleshoot";

                              notify(text, "error");

                              target.text('Remove from Pocket');
                              console.error("An error has occured while saving the answer");
                          });
            });
        },
        handleError = function (req) {

            var headers = req.getAllResponseHeaders().split('\n');

            headers.forEach(function (item) {

                if (item.indexOf('X-Error-Code') >= 0) {
                    x_error_code = item.split(":")[1];
                    console.error('error message :' + x_error_code);

                    storage.set({
                        'x_error_code': x_error_code
                    });
                } else if (item.indexOf('X-Error') >= 0) {

                    x_error = item.split(":")[1];
                    console.error('error message :' + x_error);

                    storage.set({
                        'x_error': x_error
                    });
                }
            });
        },
        handleQuestionItem = function (questionNode) {
            var actionBar = questionNode.find("div.ActionBar div.action_bar_inner");
            var questionLinkElement = questionNode.find("a.question_link");

            if (!questionLinkElement) {
                return false;
            }

            var link = questionLinkElement.attr('href');

            if (!link) {
                return false;
            }

            appendLink(actionBar, link);
        },
        readyStateCheckInterval = setInterval(function () {

            if (document.readyState === "complete") {
                clearInterval(readyStateCheckInterval);

                init();
                initNoty();

                console.debug("A hello from Quora Save to Pocket Extension");

                var documentSelector = $(document);

                documentSelector.bind('DOMNodeInserted', function (e) {
                    var element = e.target;

                    // Share button inside the action bar
                    $(element).find("div.ActionBar div.action_bar_inner").each(function (i, node) {
                        console.debug("inserting link in action bar because of changes to dom");
                        insertSaveToPocket($(node));
                    });

                    // Solves for questions with no share button
                    $(element).find("div.feed_item").each(function (i, node) {
                        console.debug("inserting link in question because of changes to dom");
                        handleQuestionItem($(node));
                    });

                });

                // Initial list of items with share button
                $("div.ActionBar div.action_bar_inner").each(function (i, node) {
                    console.debug("inserting link in action bar during first run");
                    insertSaveToPocket($(node));
                });

                // Solves for questions with no share button
                $("div.feed_item").each(function (i, node) {
                    console.debug("inserting link in question during first run");
                    handleQuestionItem($(node));
                });

                $body.on('click', 'a.saveToPocket', function (ev) {

                    // If extension is disconnected, do not perform any task.
                    if (!port) {
                        return;
                    }

                    ev.preventDefault();
                    var url = ev.target.href,
                        link = $(ev.target);

                    if (url) {
                        link.text('Saving...');

                        //notify("Saving Item...", "info");
                        saveItem(url, link);
                    }
                });

                $body.on('click', 'a.savedToPocket', function (ev) {

                    // If extension is disconnected, do not perform any task.
                    if (!port) {
                        return;
                    }

                    ev.preventDefault();

                    var link = $(ev.target);
                    link.text('Removing...');

                    removeItem(link);
                });
            }
        }, 10);

    if (!debug) {
        console.debug = function () {
        };
    }
})();
