var vbt = document.getElementById("vbt");
var cbt = document.getElementById("cbt");
var okbt = document.getElementById("okbt");
var vlb = document.getElementById("vlabel");
var clb = document.getElementById("clabel");

vbt.onclick = function(event)
{
    self.port.emit("video");
    event.preventDefault();
};
cbt.onclick = function(event)
{
    self.port.emit("comment");
    event.preventDefault();
};

okbt.onclick = function(event)
{
    self.port.emit("play");
    event.preventDefault();
};

self.port.on("ready", function()
{
    okbt.style.display = "";
    okbt.setAttribute("title", "Play!");
});

self.port.on("serve", function(vpx, cpx)
{
//    window.alert(vpx + "\n" + cpx);
    var panel = document.getElementById("panel");
    
    okbt.onclick = function(event)
    {
        window.location.reload();
        event.preventDefault();
    };
    
    okbt.setAttribute("title", "reOpen!");
    okbt.style.width = "100%";
    okbt.style.backgroundColor = "#5382CA";
    
    panel.style.paddingTop = "0px";
    panel.style.height = "100%";
    document.getElementById("okimg").setAttribute("src", "_reload.gif");
    panel.removeChild(okbt);
    panel.innerHTML = 
    '<embed id="player" height="482" width="950" pluginspage="http://www.adobe.com/shockwave/download/download.cgi?P1_Prod_Version=ShockwaveFlash" AllowScriptAccess="always" rel="noreferrer" flashvars="file=video' + vpx + '&id=dm' + cpx + '" src="play.swf" type="application/x-shockwave-flash" allowfullscreen="true" quality="high"></embed>';
    panel.appendChild(okbt);
});

self.port.on("videoLabel", function(videoPath)
{
    vlb.textContent = videoPath;
});

self.port.on("cmtLabel", function(cmtPath)
{
    clb.textContent = cmtPath;
});
