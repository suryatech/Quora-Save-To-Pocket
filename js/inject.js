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
          console.debug("Cannot find action bar");
          return;
        }

        if (actionBar.find('a.saveToPocket').length !== 0 ||
            actionBar.find('a.savedToPocket').length !== 0) {
          console.debug("Action bar has save to pocket button");
          return false;
        }

        var el = $(saveToPocket),
            saveToPocketLink = el.find('a').eq(0);

        saveToPocketLink.attr('href', link);
        actionBar.append(el);
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
      insertSaveToPocketForItem = function (element) {

        // Given an element, try to find either of the following elements
        // Answer, Question, Blog Item
        var results = element.find(
            "a.answer_permalink, a.question_link, a.timestamp");

        // Check in the order of answer, question and then blog item
        if (results.length !== 0) {
          var url;
          var permalink_results = element.find("a.answer_permalink");
          var question_link_results = element.find("a.question_link");
          var timestamp_results = element.find("a.timestamp");

          if (permalink_results.length > 0) {
            url = permalink_results.attr('href');
          } else if (question_link_results.length > 0) {
            url = question_link_results.attr('href');
          } else if (timestamp_results.length > 0) {
            url = timestamp_results.attr('href');
          }

          if (url) {
            appendLink(element.find("div.ActionBar div.action_bar_inner"), url);
          }
        } else {
          console.debug("Cannot find link for item", element);
        }
      },

      getItemsToAppendLinkTo = function (element) {
        // In case a new node is inserted, try to find the following elements
        // inside the inserted node
        var items = element.find("div.feed_item, div.pagedlist_item");

        if (items.length === 0) {
          // check if element itself is a pagedlist or feed item
          // this happens in case of questions page
          var classes = element.attr("class");
          var classList = classes && classes.split(/\s+/) || [];

          if (classList.indexOf("feed_item") >= 0 || classList.indexOf(
                  "pagedlist_item") >= 0) {
            return element;
          } else {
            return undefined;
          }
        }

        return items;
      },

      bindNodeInsertedHandler = function () {
        var documentSelector = $(document);

        documentSelector.bind('DOMNodeInserted', function (e) {
          var element = $(e.target);
          var items = getItemsToAppendLinkTo(element);
          console.debug("Processing new item", element);
          items && items.each(function (i, node) {
            insertSaveToPocketForItem($(node));
          });
        });
      },

      readyStateCheckInterval = setInterval(function () {

        if (document.readyState === "complete") {
          clearInterval(readyStateCheckInterval);

          init();
          initNoty();

          console.debug("A hello from Quora Save to Pocket Extension");

          bindNodeInsertedHandler();

          // Required for processing items that arrive when the page
          // is initially loaded

          $("div.feed_item, div.pagedlist_item").each(function (i, node) {
            console.debug("inserting link for first set of items");
            insertSaveToPocketForItem($(node));
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
})
();
