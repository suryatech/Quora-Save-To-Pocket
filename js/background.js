chrome.runtime.onInstalled.addListener(function(obj) {

    var regex = /http(s){0,1}:(\/\/).*(\.)*quora\.com(\/)*.*/;
    
    var url = "chrome-extension://" + chrome.runtime.id
                +"/html/options.html?firstRun";

    // Open options page.
    if (obj.reason === "install") {
        chrome.windows.getCurrent({
            populate: false
        }, function(w) {
            chrome.windows.update(w.id, {
                focused: true
            }, function(w) {
                chrome.tabs.create({
                    url: url,
                    windowId: w.id
                });
            });
        });
    }

    // Insert on all quora.com pages during first run and after re-install/
    // upgrade

    if (obj.reason === "install" || obj.reason === "update" 
        || obj.reason === "chrome_update") {
        chrome.windows.getAll({
            populate: true
        }, function(w) {
            w.forEach(function(item) {
                item.tabs.forEach(function(tab) {
                    if (regex.test(tab.url)) {
                        console.log(tab.url);

                        chrome.tabs.executeScript(tab.id, {
                            file: "js/jquery/jquery.min.js"
                        });

                        chrome.tabs.executeScript(tab.id, {
                            file: "js/jquery.noty.packaged.min.js"
                        });

                        chrome.tabs.executeScript(tab.id, {
                            file: "js/inject.js"
                        });
                    
                        chrome.tabs.insertCSS(tab.id, {
                            file: 'css/inject.css'
                        });
                    }
                });
            });
        });
    }

});

chrome.runtime.onConnect.addListener(function(port) {
    console.log("Connected");
});
