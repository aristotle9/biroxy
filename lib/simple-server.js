"use strict";

const httpd = require("httpd");
const utils = require("simple-utils");

//一个简单的内置http服务器
function simpleServer(port)
{
    this._server = new httpd.nsHttpServer();
    this._port = port;
}

simpleServer.prototype =
{
    start: function()
    {
        this._server.start(this._port);
    },
    stop: function()
    {
        this._server.stop(function(){});
    },
    handleFile: function(url, file)
    {
        this._server.registerFile(url, file);
    },
    handleURI: function(url, uri, mime)
    {
        this._server.registerPathHandler(url, function(request, response)
        {
            response.setHeader("Content-Type", mime ? mime : "text/plain", false);
            response.write(utils.getBinary(uri));
        });
    },
    handleVideo: function(videoHash, videoFile)
    {
        this.handleFile("/video" + videoHash, videoFile);
    },
    handleCmt: function(cmtHash, cmtFile)
    {
        this.handleFile("/dm" + cmtHash, cmtFile);
    },
    releaseHandle: function(url)
    {
        this.handleFile(url);
    },
    releaseVideo: function(videoHash)
    {
        this.releaseHandle("/video" + videoHash);
    },
    releaseCmt: function(cmtHash)
    {
        this.releaseHandle("/dm" + cmtHash);
    }
};

exports.simpleServer = simpleServer;
