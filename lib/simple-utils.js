"use strict";

//一些工具函数

const {Cc, Ci, Cr, CC} = require("chrome");
const windowUtils = require("window-utils");
const XMLHttpRequest = CC('@mozilla.org/xmlextras/xmlhttprequest;1',
                          'nsIXMLHttpRequest');

//同步读取二进制文件URI
function getBinary(uri)
{
    let request = XMLHttpRequest();
    request.open("GET", uri, false);
    request.overrideMimeType("text/plain; charset=x-user-defined");
    request.send(null);
    return request.responseText;
}

//下载文件
function downloadFile(url, file, shortTitle)
{
    var ioService = Cc["@mozilla.org/network/io-service;1"]
                  .getService(Ci.nsIIOService);
                  
    var srcURI = ioService.newURI(url, null, null);
    var fileURI = ioService.newFileURI(file);

    //监视
    var nsIWBP = Ci.nsIWebBrowserPersist;
    var pers = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].
        createInstance(nsIWBP);
    pers.persistFlags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES |
        nsIWBP.PERSIST_FLAGS_BYPASS_CACHE |
        nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;

    var downloadManager = Cc["@mozilla.org/download-manager;1"]
                      .getService(Ci.nsIDownloadManager);
                      
    // Start download
    var dl = downloadManager.addDownload(downloadManager.DOWNLOAD_TYPE_DOWNLOAD, srcURI, fileURI,
        shortTitle, null, Math.round(Date.now() * 1000),
        null, pers);

    pers.progressListener = dl.QueryInterface(Ci.nsIWebProgressListener);
    pers.saveURI(dl.source, null, null, null, null, dl.targetFile);

    // And finally show download manager
    var dm_ui = Cc["@mozilla.org/download-manager-ui;1"].
        createInstance(Ci.nsIDownloadManagerUI);
    dm_ui.show(windowUtils.activeWindow, dl.id, Ci.nsIDownloadManagerUI.REASON_NEW_DOWNLOAD);
}

exports.getBinary = getBinary;
exports.downloadFile = downloadFile;
