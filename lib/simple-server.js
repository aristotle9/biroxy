"use strict";

const httpd = require("httpd");
const querystring = require("querystring");
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
        this._handleCmtDownload();
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
    },
    //下载功能
    _handleCmtDownload: function() {
        this._server.registerPathHandler("/download",
        function(request, response) {
            var get = querystring.parse(request.queryString);
            var url = get['url'];
            var name = get['name'];
            response.setHeader("Content-Type", "text/xml");
            response.setHeader("Content-Disposition", 'attachment; filename*="utf-8\'\'' +
                                querystring.escape(name) + '"');
            //response.setHeader("Content-Transfer-Encoding", "binary");
            //response.setHeader("Accept-Ranges", "bytes");
            response.write(utils.getBinary(url));
        });
    }
};

exports.simpleServer = simpleServer;
