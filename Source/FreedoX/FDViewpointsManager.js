/*global define*/
define(function () {
    'use strict';
	function FDViewpointsManager(project, viewpointsOptions) {
		project._options.viewpoints = {};
		
		// 辅助变量
		this._pVPsGroupMap = {};
		
		//引用
		project._options.viewpoints = this._pVPsGroupMap;
		this._project = project;
		this._event = new FreeDo.Event();
		this._eventHelper = new FreeDo.EventHelper();
		
		//控制是否进行快照
		this._startCapture = false;
		this._tempVPOption = null;
		this._tempGroupID = null;
		this._tempImage;
		
		//播放功能需要用到的变量
		this.curGroupID = "";
		this.bStop = true;
		this.iIndex = 0;
		this.nLastClickTime = 0;
		this.bActive = true;
		this.bPause = true;
		
		this.bInRoute = false;
		
		//0 初始状态，1 手动暂停 2 手动恢复
		this.bPauseMannul = 0;
		this.lastOPTime =  0;
		
		this.bKeydown = false;
		
		//添加渲染完成监听
		this.addPostRenderListener();

		for (var key in viewpointsOptions) {
			var groupOption = FreeDo.clone(viewpointsOptions[key], true);
			groupOption.groupID = key;
			
			this.createGroup(key, groupOption.groupName);
			
			//处理一个组的信息
			this.addViewpointsGroup(groupOption);
			
			var objGroupOption = {};
			objGroupOption.groupID = key;
			objGroupOption.groupOption = this._pVPsGroupMap[key];
			//setTimeout(() => {
				//this._event.raiseEvent("GroupChanged", objGroupOption);
			//}, 0);
			OnGroupChanged(objGroupOption);
		}
	}

	FDViewpointsManager.prototype.addViewpointsGroup = function (groupOption) {
		if(groupOption.list == undefined)
			return;
		for (var i=0; i < groupOption.list.length;i++) {
			this.addViewpoint(groupOption.groupID, groupOption.list[i]);
		}
	}

	////////////////////////////////////////////////////////////////////////////
	FDViewpointsManager.prototype.addViewpoint = function (groupID, vpOption) {
		if (typeof(this._pVPsGroupMap[groupID]) == "undefined") {
			return false;
		}
		
		var vpObject = {};
		vpObject.vpOption = vpOption;//FreeDo.clone(vpOption, true);
		vpObject.groupID = groupID;
		
		this._pVPsGroupMap[groupID].list.push(vpOption);
		return true;
	}

	FDViewpointsManager.prototype.getViewpointInfoStr = function(){
		var viewer = this._project.getViewer();
		var cartographic = viewer.camera.positionCartographic;
		var heading = viewer.camera.heading;
		var pitch = viewer.camera.pitch;
		var roll = viewer.camera.roll;
		var str = "";

		str = FreeDo.Math.toDegrees(cartographic.longitude) +
			',' + FreeDo.Math.toDegrees(cartographic.latitude) +
			',' + cartographic.height +
			',' + FreeDo.Math.toDegrees(heading) +
			',' + FreeDo.Math.toDegrees(pitch) +
			',' + FreeDo.Math.toDegrees(roll);

		return str;
	}

	FDViewpointsManager.prototype.getViewpointInfoArray = function(){
		var s = this.getViewpointInfoStr();
		var a = s.split(",");
		for(var key in a)
			a[key] = parseFloat(a[key]);
		return a;
	}

	//数据存在image.src
	FDViewpointsManager.prototype.postRenderHandler = function(){
		if(this._startCapture)
		{
			var viewer = this._project.getViewer();
			var image = new Image();
			var cwidth = viewer.scene._canvas.width;
			var cheight = viewer.scene._canvas.height;
			
			var canvas = viewer.scene._canvas;
			var imageData = canvas.toDataURL("image/png");
			image.src = imageData;
			
			//this.putb64(imageData);
			
			this._startCapture = false;
			
			this.compressPic(image.src, cwidth, cheight);
		}
	}

	FDViewpointsManager.prototype.addPostRenderListener = function(){
		this._project.getViewer().scene._postRender.addEventListener(this.postRenderHandler.createDelegate(this), null);
	}
	
	FDViewpointsManager.prototype.compressPicPost = function(){
		var nScale = 15;
		var width = this._tempImage.srcWidth/nScale,    //图片resize宽度
		height = this._tempImage.srcHeight/nScale,    //图片resize宽度
		canvas = document.createElement("canvas"),  
		drawer = canvas.getContext("2d");
		canvas.width = width>height?height:width;
		canvas.height = width>height?height:width;
		if(width > height)
		{
			drawer.drawImage(this._tempImage, (this._tempImage.srcWidth - this._tempImage.srcHeight)/2, 0, this._tempImage.srcHeight, this._tempImage.srcHeight, 
			0,0, canvas.width, canvas.height);
		}
		else
		{
			drawer.drawImage(this._tempImage, 0, (this._tempImage.srcHeight - this._tempImage.srcWidth)/2, this._tempImage.srcWidth, this._tempImage.srcWidth, 
			0,0, canvas.width, canvas.height);
		}
		
		this._tempVPOption.id = FreeDo.createGuid();
		this._tempVPOption.imageUrl = canvas.toDataURL();
		this._tempVPOption.imageWidth = canvas.width;
		this._tempVPOption.imageHeight = canvas.height;
		this.addViewpoint(this._tempGroupID, this._tempVPOption);
		
		var tempGroupID = FreeDo.clone(this._tempGroupID, true);
		
		var objGroupOption = {};
		objGroupOption.groupID = tempGroupID;
		objGroupOption.groupOption = this._pVPsGroupMap[tempGroupID];
		setTimeout(() => {
			this._event.raiseEvent("GroupChanged", objGroupOption);
		}, 0);
		
		this._tempGroupID = null;
		this._tempVPOption = null;
	}
	
	FDViewpointsManager.prototype.compressPic = function(data64, srcWidth, srcHeight){
		var img = new Image();
		img.srcWidth = srcWidth;
		img.srcHeight = srcHeight;
		
		//必须放到onload里面去，不然绘制不正常
		img.onload = this.compressPicPost.createDelegate(this);
		
		this._tempImage = img;
		img.src = data64;
		return "";
	}

	//用户创建视口
	FDViewpointsManager.prototype.createViewpoint = function (groupID, name) {		
		this._tempGroupID = groupID;
		this._tempVPOption = {};
		this._tempVPOption.name = name;
		this._tempVPOption.cameraInfo = this.getViewpointInfoArray();
		this._startCapture = true;
		
		return true;
	}


	FDViewpointsManager.prototype.removeViewpoint = function (groupID, index) {
		if (typeof(this._pVPsGroupMap[groupID]) == "undefined") {
			return false;
		}
		
		if (typeof(this._pVPsGroupMap[groupID].list[index]) == "undefined") {
			return false;
		}
		
		this._pVPsGroupMap[groupID].list = this._pVPsGroupMap[groupID].list.splice(index,1);
		
		var objGroupOption = {};
		objGroupOption.groupID = groupID;
		objGroupOption.groupOption = this._pVPsGroupMap[groupID];
		
		setTimeout(() => {
			this._event.raiseEvent("GroupChanged", objGroupOption);
		}, 0);
		
		this.bStop = true;
		
		return true;
	}

	FDViewpointsManager.prototype.createGroup = function (groupID, groupName) {
		this._pVPsGroupMap[groupID] = {};
		this._pVPsGroupMap[groupID].groupName = groupName;
		this._pVPsGroupMap[groupID].list = [];
		
		var groupOption = FreeDo.clone(this._pVPsGroupMap[groupID], true);
		groupOption.groupID = groupID;
		
		setTimeout(() => {
			//this._event.raiseEvent("GroupCreated", groupOption);
		}, 0);
		OnGroupCreated(groupOption);
		return true;
	}
	
	FDViewpointsManager.prototype.removeGroup = function (groupID) {
		if (typeof(this._pVPsGroupMap[groupID]) == "undefined") {
			return false;
		}

		delete this._pVPsGroupMap[groupID];
		
		setTimeout(() => {
			this._event.raiseEvent("GroupRemoved", groupID);
		}, 0);
		
		return true;
	}

	FDViewpointsManager.prototype.clearAllVPs = function () {
		// 清空
		for (var key in this._pVPsGroupMap) {
			this.removeGroup(key);
		}
	}
	
	FDViewpointsManager.prototype.flyTo = function (sCI) {
		var ci = sCI.split(",");
		this._project.getViewer().camera.flyTo({
			destination : FreeDo.Cartesian3.fromDegrees(ci[0], ci[1], ci[2]),
			orientation: {
				heading : FreeDo.Math.toRadians(ci[3]),
				pitch : FreeDo.Math.toRadians(ci[4]),
				roll : FreeDo.Math.toRadians(ci[5])
			}
		});
	}
	
	FDViewpointsManager.prototype.goTo = function (sCI) {
		var ci = sCI.split(",");
		this._project.getViewer().camera.setView({
			destination : FreeDo.Cartesian3.fromDegrees(ci[0], ci[1], ci[2]),
			orientation: {
				heading : FreeDo.Math.toRadians(ci[3]),
				pitch : FreeDo.Math.toRadians(ci[4]),
				roll : FreeDo.Math.toRadians(ci[5])
			}
		});
	}

	// 飞行到视口
	FDViewpointsManager.prototype.flyToVP = function (groupID, index) {
		if (typeof(this._pVPsGroupMap[groupID]) == "undefined") {
			return false;
		}
		if (typeof(this._pVPsGroupMap[groupID].list[index]) == "undefined") {
			return false;
		}
		var ci = this._pVPsGroupMap[groupID].list[index].vpOption.cameraInfo;
		this._project.getViewer().camera.flyTo({
			destination : FreeDo.Cartesian3.fromDegrees(ci[0], ci[1], ci[2]),
			orientation: {
				heading : FreeDo.Math.toRadians(ci[3]),
				pitch : FreeDo.Math.toRadians(ci[4]),
				roll : FreeDo.Math.toRadians(ci[5])
			}
		});
	}

	// 跳转到视口
	FDViewpointsManager.prototype.goToVP = function (groupID, index) {
		if (typeof(this._pVPsGroupMap[groupID]) == "undefined") {
			return false;
		}
		if (typeof(this._pVPsGroupMap[groupID].list[index]) == "undefined") {
			return false;
		}
		var ci = this._pVPsGroupMap[groupID].list[index].vpOption.cameraInfo;
		this._project.getViewer().camera.setView({
			destination : FreeDo.Cartesian3.fromDegrees(ci[0], ci[1], ci[2]),
			orientation: {
				heading : FreeDo.Math.toRadians(ci[3]),
				pitch : FreeDo.Math.toRadians(ci[4]),
				roll : FreeDo.Math.toRadians(ci[5])
			}
		});
	}

	FDViewpointsManager.prototype.putb64 = function(pic){
	  //var pic = "填写你的base64后的字符串";
	  var url = "http://upload.qiniu.com/putb64/20264"; //非华东空间需要根据注意事项 1 修改上传域名
	  var xhr = new XMLHttpRequest();
	  xhr.onreadystatechange=function(){
		if (xhr.readyState==4){
		  document.getElementById("images").innerHTML=xhr.responseText;
		}
	  }
	  xhr.open("POST", url, true);
	  xhr.setRequestHeader("Content-Type", "application/octet-stream");
	  xhr.setRequestHeader("Authorization", "UpToken 123");
	  xhr.send(pic);
	}

	// 函数返回值是一个函数，调用该函数即可取消监听
	FDViewpointsManager.prototype.on = function (listener, scope) {
		return this._eventHelper.add(this._event, listener, scope);
	}

	// 销毁所有资源
	FDViewpointsManager.prototype.dispose = function () {
		lastY = 330;
		this.clearAllVPs();
		this.bStop = true;
		setTimeout(() => {
			this._eventHelper.removeAll();
		}, 200);
	}
	
	FDViewpointsManager.prototype.onKeyDown = function(){
		this.bKeydown = true;
		//console.log(this.bKeydown);
	}
	
	FDViewpointsManager.prototype.onKeyUp = function(){
		this.bKeydown = false;
		//console.log(this.bKeydown);
	}
	
	FDViewpointsManager.prototype.playGroup = function(groupID){
		this.curGroupID = groupID;
		
		document.addEventListener("click", this.checkOp.createDelegate(this));
		document.addEventListener("touchstart", this.checkOp.createDelegate(this));
		document.addEventListener("mousewheel", this.checkOp.createDelegate(this));
		
		var handler = new FreeDo.ScreenSpaceEventHandler(this._project.getViewer().scene.canvas);
		
		window.addEventListener("keydown", this.onKeyDown.createDelegate(this));
		window.addEventListener("keyup", this.onKeyUp.createDelegate(this));
		
		this.playAni();
		
		if(!this.bInRoute){
			setInterval(this.checkKey.createDelegate(this), 200);
			setInterval(this.checkActive.createDelegate(this), 1000);
			setInterval(this.pauseAni.createDelegate(this), 100);
			setInterval(this.playAni.createDelegate(this), 5000);
			this.bInRoute = true;
		}
		
		this.bStop = false;
	}
	
	FDViewpointsManager.prototype.checkKey = function(){
		if(this.bKeydown)
			this.checkOp();
	}
	
	FDViewpointsManager.prototype.checkActive = function() {
		var myDate = new Date();
		var nCur = myDate.getTime() / 1000;

		//2秒无点击操作则认为是离线状态
		if ((nCur - this.nLastClickTime) > 5) {
			this.bActive = false;
			if(!this.bStop && this.bPause)
			{
				console.log("恢复动画");
				this.bPause = false;
				this.playAni();
			}
			
		}
	}
	
	FDViewpointsManager.prototype.playAni = function(){
		if(this.bStop){
			return;
		}
		
		if(this.bPauseMannul == 1)
			return;
		
		if(this._pVPsGroupMap[this.curGroupID].list.length == 0)
			return;
		
		if(this.bPause)
			return;
		
		this.bStop = false;
		
		console.log("正在播放："  + (this.iIndex+1));
		
		var sCI = this._pVPsGroupMap[this.curGroupID].list[this.iIndex].cameraInfo.join(",");
		this.flyTo(sCI);
		this.iIndex++;
		
		if(this.iIndex == this._pVPsGroupMap[this.curGroupID].list.length)
			this.iIndex = 0;
	}

	FDViewpointsManager.prototype.stopPlay = function(){
		this.bStop = true;
		this.iIndex = 0;
		this.bPauseMannul = 0;
		console.log("停止播放");
	}

	FDViewpointsManager.prototype.checkOp = function(){
		var myDate = new Date();
		this.nLastClickTime = myDate.getTime()/1000;
		//console.log(this.nLastClickTime);
		this.bActive = true;
	}
	
	FDViewpointsManager.prototype.pauseAni = function(){
		if(this.bActive && this.bStop == false && !this.bPause)
		{
			this._project.getViewer().camera.cancelFlight();
			this.bPause = true;
			console.log("暂停动画");
		}
	}

	FDViewpointsManager.prototype.pausePlay = function(){
		if(this.bPauseMannul == 0){
			this.bPauseMannul = 1;
			console.log("手动暂停0-1");
			return;
		}
		
		if(this.bPauseMannul == 1){
			this.bPauseMannul = 2;
			console.log("手动恢复");
			return;
		}
			
		
		if(this.bPauseMannul == 2){
			this.bPauseMannul = 1;
			console.log("手动暂停2-1");
			return;
		}
	}

	return FDViewpointsManager;
});