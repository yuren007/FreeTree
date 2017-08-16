/*global define*/
define([
	'./FDWebRTC',
	'./FDCamera',
], function (FDWebRTC, FDCamera) {
    'use strict';

	/**
	 * 远程协作控制类
	 * @alias FdRemoteCollaboration
	 * @class
	 */
    function FDRemoteCollaboration(project) {
        this.number = 0;
		
		this._viewer = project.getViewer();
		this._project = project;
		
		this._nLastClickTime = "";
		this._bActive = false;
		this._bMouseDown = false;
		this._bKeyDown = false;
		this._nLastOPTime =  0; 
		this._nLastRenderTime = 0;
		
		this._bInRun = false;
		this._bOffline = true;
		
		this._rtc = undefined;
		this._messageR = "";
		this._messageS = "";
    }

	/**
	 * 设置远程协作的随机数
	 * @param {number} number 设置为0时，表示不协作；否则自动进入协作模式
	 */
    FDRemoteCollaboration.prototype.setCollaborationNumber = function (number) {
		this.number = number;
		this.run();
		
		if(this.number == 0){
			if(this._bOffline)
				return;
			this.disconnect();
			this._rtc = undefined;
			this._bOffline = true;
		}
		else{
			if(!this._bOffline)
				return;
			this._bOffline = false;
			this._rtc = new FDWebRTC();
			this._rtc.on("connected", this.onConnected.createDelegate(this));
			this._rtc.on("data_channel_message", this.onMsgReceived.createDelegate(this));
			this.connect();
		}
    }
	
	FDRemoteCollaboration.prototype.run = function(){
		if(this._bInRun)
			return;
		else
			this._bInRun = true;
		this.addListeners();
		this.setTimers();
	}
	
	FDRemoteCollaboration.prototype.sendView = function () {
		if(this._bOffline)
			return;
		
		var cartographic = this._viewer.camera.positionCartographic;
		var heading = this._viewer.camera.heading;
		var pitch = this._viewer.camera.pitch;
		var roll = this._viewer.camera.roll;
		var message = '' + FreeDo.Math.toDegrees(cartographic.longitude) +
			', ' + FreeDo.Math.toDegrees(cartographic.latitude) +
			', ' + cartographic.height +
			', ' + FreeDo.Math.toDegrees(heading) +
			', ' + FreeDo.Math.toDegrees(pitch) +
			', ' + FreeDo.Math.toDegrees(roll);
		
		if(this._messageS != message){
			this._rtc.broadcast(message);
			this._messageS = message; 
		}
		return true;
	}
	
	FDRemoteCollaboration.prototype.checkOp = function () {
		this._bActive = true;
		this._nLastClickTime = (new Date()).getTime()/1000;
		this.sendView();
	}

	FDRemoteCollaboration.prototype.onKeyDown = function () {
		this._bKeyDown = true;
	}

	FDRemoteCollaboration.prototype.onKeyUp = function () {
		this._bKeyDown = false;
	}
	
	FDRemoteCollaboration.prototype.onMouseDown = function () {
		this._bMouseDown = true;
	}
	
	FDRemoteCollaboration.prototype.onMouseUp = function () {
		this._bMouseDown = false;
	}
	
	FDRemoteCollaboration.prototype.onMouseMove = function () {
		if(this._bMouseDown && (new Date()).getTime() - this._nLastOPTime > 5){
			this.checkOp();
			this._nLastOPTime = (new Date()).getTime();
		}
	}
	
	FDRemoteCollaboration.prototype.checkKey = function () {
		if(this._bKeyDown)
			this.checkOp();
	}

	FDRemoteCollaboration.prototype.checkActive = function () {
		//2秒无点击操作则认为是非活跃状态
		if (((new Date()).getTime() / 1000 - this._nLastClickTime) > 0.5) {
			this._bActive = false;
		}
	}
	
	FDRemoteCollaboration.prototype.onPostRender = function () {
		if((new Date()).getTime() - this._nLastRenderTime > 50 && this._bActive)		{
			this.sendView();
			this._nLastRenderTime = (new Date()).getTime();
		}
	}
	
	FDRemoteCollaboration.prototype.setView = function(lon, lat, height, heading, pitch, roll) {
		//._project.getCamera().gotoByCameraInfo([lon, lat, height, heading, pitch, roll]);
		//var cam = cameraInfo;
		this._viewer.camera.setView({
			destination: FreeDo.Cartesian3.fromDegrees(lon, lat, height),
			orientation: {
				heading: FreeDo.Math.toRadians(heading),
				pitch: FreeDo.Math.toRadians(pitch),
				roll: FreeDo.Math.toRadians(roll)
			}
		});
	}
	
	FDRemoteCollaboration.prototype.addListeners = function () {
		document.addEventListener("click", this.checkOp.createDelegate(this));
		document.addEventListener("touchstart", this.checkOp.createDelegate(this));
		window.addEventListener("keydown", this.onKeyDown.createDelegate(this));
		window.addEventListener("keyup", this.onKeyUp.createDelegate(this));
		
		var handler = new FreeDo.ScreenSpaceEventHandler(this._viewer.scene.canvas);
		handler.setInputAction(this.checkOp.createDelegate(this), FreeDo.ScreenSpaceEventType.WHEEL);
		handler.setInputAction(this.onMouseDown.createDelegate(this), FreeDo.ScreenSpaceEventType.LEFT_DOWN);
		handler.setInputAction(this.onMouseUp.createDelegate(this), FreeDo.ScreenSpaceEventType.LEFT_UP);
		handler.setInputAction(this.onMouseDown.createDelegate(this), FreeDo.ScreenSpaceEventType.RIGHT_DOWN);
		handler.setInputAction(this.onMouseUp.createDelegate(this), FreeDo.ScreenSpaceEventType.RIGHT_UP);
		handler.setInputAction(this.onMouseMove.createDelegate(this), FreeDo.ScreenSpaceEventType.MOUSE_MOVE);
		
		this._viewer.scene._postRender.addEventListener(this.onPostRender.createDelegate(this), null);
	}
	
	FDRemoteCollaboration.prototype.setTimers = function () {
		setInterval(this.checkActive.createDelegate(this), 1000); 
		setInterval(this.checkKey.createDelegate(this), 5);
	}
	
	FDRemoteCollaboration.prototype.onConnected = function () {
		console.log("FDRemoteCollaboration: onConnected");
		this._rtc.ready();
	}
	
	FDRemoteCollaboration.prototype.onMsgReceived = function (channel, socketId, message) {
		if(this._messageR != message)
		{
			if(this._bOffline)
				return;
			if (!this._bActive){
				var aPos = message.split(",");
				this.setView(aPos[0],aPos[1],aPos[2],aPos[3],aPos[4],aPos[5]);
			}
			this._messageR = message;
			console.log(message);
		}
	}
	
	FDRemoteCollaboration.prototype.connect = function () {
		this._rtc.connect("ws://182.92.7.32:3000", "room" + this.number);
	}
	
	FDRemoteCollaboration.prototype.disconnect = function () {
		this._rtc.exit();
	}
	
	FDRemoteCollaboration.prototype.dispose = function () {
		this._bOffline = true;
	}
	
	FDRemoteCollaboration.prototype.reset = function () {
		this._bOffline = true;
	}

    return FDRemoteCollaboration;
});