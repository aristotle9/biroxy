"use strict";

const {Cc, Ci, Cr} = require("chrome");

const self = require("self");
const pageMod = require("page-mod");
const windowUtils = require("window-utils");
const widgets = require("widget");
const tabs = require("tabs");
const notifications = require("notifications");
const windows = require("windows").browserWindows;
const simpleServer = require("simple-server").simpleServer;
const utils = require("simple-utils");

var port = 51998 + Math.ceil(32 * Math.random());
var server = new simpleServer(port);
var fileList = [
 ["/pad.xml", "pad.xml", "text/xml"]
,["/crossdomain.xml", "crossdomain.xml", "text/xml"]
,["/", "play.html", "text/html"]
,["/about", "about.html", "text/html"]
,["/icon.png", "icon.png", "image/png"]
//    ,["/play.html", "play.html", "text/html"]
,["/player.xml", "player.xml"]    
,["/advanceComment.xml", "advanceComment.xml"]
,["/play.swf", "play.swf", "application/x-shockwave-flash"]
,["/framework_3.2.0.3958.swf", "framework_3.2.0.3958.swf", "application/x-shockwave-flash"]
,["/framework_3.2.0.3958.swz", "framework_3.2.0.3958.swz", "application/octet-stream"]

//图片
,["/_cmt.gif", "_cmt.gif", "image/gif"]
,["/_video.gif", "_video.gif", "image/gif"]
,["/_play.gif", "_play.gif", "image/gif"]
,["/_reload.gif", "_reload.gif", "image/gif"]
,["/biroxy-bg.gif", "biroxy-bg.gif", "image/gif"]
];

function notify(text, title)
{
    notifications.notify({
    title: title || "Biroxy",
    text: text,
    iconURL: self.data.url("icon.png")
    });
}

function localURL(path)
{
    return "http://localhost:" + port + path;
}

function MozFile(path)
{
    var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
    file.initWithPath(path);
    return file;
}

function OpenFile(title)
{
    var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    fp.init(windowUtils.activeWindow, title, Ci.nsIFilePicker.modeOpen);
    return fp;
}

function SaveFile(title)
{
    var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    fp.init(windowUtils.activeWindow, title, Ci.nsIFilePicker.modeSave);
    return fp;
}

function Hash(str)
{
    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";

    var result = {};

    var data = converter.convertToByteArray(str, result);
    var ch = Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);

    ch.init(ch.MD5);
    ch.update(data, data.length);
    var hash = ch.finish(false);

    function toHexString(charCode)
    {
        return ("0" + charCode.toString(0x10)).slice(-2);
    }

    var s = [toHexString(hash.charCodeAt(i)) for (i in hash)].join("");
//    console.log(s);
    return s;
}

function testCmtPage(url)
{
    return /bilibili\.tv\/video\/av\d+/i.test(url);
}

function fetchVideoVid(url)
{
    var text = utils.getBinary(url);
    return parseVid(text);
}

function parseVid(str)
{
    var idx = str.indexOf("id=\"bofqi\"");
    if(idx != -1)
    {
        var innerText = str.substr(idx);
        if(innerText.match(/id=([^&'"]+)/))
        {
            return RegExp.$1;
        }
    }
    return "";
}

function filtrateTitle(title)
{
    var idx = title.indexOf(" - ");
    if(idx != -1)
    {
        return title.substring(0, idx);
    }
    return title;
}

function downloadCmtFile(vid, title)
{
    var url = "http://comment.bilibili.tv/dm," + vid;
    var saver = SaveFile("保存弹幕");
    saver.appendFilter("XML", "*.xml");
    saver.appendFilters(Ci.nsIFilePicker.filterAll);
    saver.defaultExtension = "xml";
    saver.defaultString = title;
    
    if(saver.show() == Ci.nsIFilePicker.returnCancel)
    {
        console.log("discard");
//        notify("放弃保存弹幕");
        return;
    }
    
    utils.downloadFile(url, saver.file, "弹幕文件:" + saver.file.leafName);
}

exports.main = function(options, callbacks)
{
    for(var i in fileList)
    {
        server.handleURI(
             fileList[i][0]
            ,self.data.url(fileList[i][1])
            ,fileList[i].length == 2 ? null : fileList[i][2]
        );
    }
    
    require("unload").when(function cleanup(){
        server.stop();
    });
    
    server.start();

    pageMod.PageMod(
    {
        include: localURL("/"),
        contentScriptFile: self.data.url("selector.js"),
        contentScriptWhen: "ready",
        onAttach: function(worker)
        {
            //"select", "play"
            var state = "select";
            var ready = false;
            var videofile = null;
            var cmtfile = null;
            var vpx = "";
            var cpx = "";
            
            worker.on("detach", function(){
                //do detach 
                //处于选择页面,没有生成视频流
                if(state == "select")
                {
                    //没有什么可以做的
                }
                else if(state == "play")
                {
                    //取消本页面的视频流
                    server.releaseVideo(vpx);
                    server.releaseCmt(cpx);
                    console.log("release");
                }
            });

            //选择视频键按下
            worker.port.on("video", function(window)
            {
                console.log("open video");
                var videoOpenner = OpenFile("选择视频");
                videoOpenner.appendFilter("Video", "*.flv; *.mp4; *.hlv");
                videoOpenner.appendFilters(Ci.nsIFilePicker.filterAll);
                
                var res = videoOpenner.show();
                if(res == Ci.nsIFilePicker.returnOK)
                {
                    videofile = videoOpenner.file;
                    vpx = Hash(videofile.path) + videofile.lastModifiedTime.toString();
                    worker.port.emit("videoLabel", videofile.path);

                    //同名弹幕文件测试
                    var dir = videofile.parent.path;
                    var nm = videofile.leafName;
                    var idx = nm.lastIndexOf(".");
                    if(idx != -1)
                    {
                        var xmlName = nm.substring(0, idx) + ".xml";
                        var xmlPath = require("file").join(dir, xmlName);
//                        console.log(xmlPath);
                        var xmlFile = new MozFile(xmlPath);
                        if(xmlFile.exists())
                        {
                            cmtfile = xmlFile;
                            cpx = Hash(cmtfile.path) + cmtfile.lastModifiedTime.toString();
                            worker.port.emit("cmtLabel", cmtfile.path);
                            //不需要检验ready,因为下面有检验
                        }
                    }
                    
                    if(!ready && cpx != "")
                    {
                        worker.port.emit("ready");
                        ready = true;
                    }
                }
            });
            
            //选择弹幕键按下
            worker.port.on("comment", function()
            {
                console.log("open cmt");
                var cmtOpenner = OpenFile("选择弹幕");
                cmtOpenner.appendFilter("XML", "*.xml");
                cmtOpenner.appendFilters(Ci.nsIFilePicker.filterAll);
                
                var res = cmtOpenner.show();
                if(res == Ci.nsIFilePicker.returnOK)
                {
                    cmtfile = cmtOpenner.file;
                    cpx = Hash(cmtfile.path) + cmtfile.lastModifiedTime.toString();
                    worker.port.emit("cmtLabel", cmtfile.path);
                    
                    if(!ready && vpx != "")
                    {
                        worker.port.emit("ready");
                        ready = true;
                    }
                }
            });

            //播放键按下
            worker.port.on("play", function(info)
            {
                console.log("play");
                state = "play";
                server.handleVideo(vpx, videofile);
                server.handleCmt(cpx, cmtfile);
                worker.port.emit("serve", vpx, cpx);
            });
        }
    });

    //小图标
    var widget = widgets.Widget({
        id: "bili-local-player-icon",
        label: "Biroxy:左键 打开窗口|右键 下载当前窗口的XML弹幕",
        contentURL: self.data.url("icon.png"),
        contentScriptWhen: "ready",
        contentScript: "this.addEventListener('click', function(event)\
        {\
            if(event.button == 0 && event.shiftKey == false)\
            {\
                self.port.emit('left-click');\
            }\
            if(event.button == 2 || (event.button == 0 && event.shiftKey == true))\
            {\
                self.port.emit('right-click');\
            }\
            if(event.button == 1 || (event.button == 0 && event.ctrlKey == true))\
            {\
                self.port.emit('middle-click');\
            }\
            event.preventDefault();\
        }, true);"
    });

    widget.port.on("left-click", function()
    {
        if(tabs.activeTab.url == "about:blank")
        {
            tabs.activeTab.url = localURL("");
        }
        else
        {
            tabs.open(localURL(""));
        }
    });

    widget.port.on("middle-click", function()
    {
        //新开一个窗口并打开
        windows.open(localURL(""));
    });
    
    widget.port.on("right-click", function()
    {
        var url = tabs.activeTab.url;
        console.log("widget: right-click");
        console.log(url);
        if(!testCmtPage(url))
        {
            console.log("current Page dosnot has cmt.");
            notify("当前页面没有弹幕.");
            return;
        }
        var vid = fetchVideoVid(url);
        if(vid == "")
        {
            console.log("current Page dosnot has cmt.");
            notify("检测不到弹幕ID.");
            return;
        }
        console.log("vid: " + vid);
        downloadCmtFile(vid, filtrateTitle(tabs.activeTab.title));
    });
    
//    require("timer").setTimeout(function()
//    {
//        notify("使用时点击小图标.");
//        tabs.open(localURL("/"));
//        tabs.open("http://www.bilibili.tv/video/av201574/");
//        tabs.open("http://www.bilibili.tv/");
//        tabs.open("http://www.bilibili.tv/video/av28806/");
//        tabs.open("http://www.bilibili.tv/video/av55300/index_4.html");
//    }, 1000);
};
