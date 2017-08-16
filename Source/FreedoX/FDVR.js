define(function () {
    'use strict';

	/**
	 * VR管理器
	 * @alias FdVR
	 * @class
	 */
	function FDVR(project) {
		this._project = project;
		this._viewer = project.getViewer();
		this._scene = this._viewer.scene;
		
		this._inVr = false;
	}
	
	/**
	 * 开启VR
	 * @param {boolean} enable true表示开启VR，否则为false
	 */
	FDVR.prototype.enableVR = function(enable){
		if(this._inVr && enable == false){
			this._scene.useWebVR = false;
			this._inVr = false;
		}
			
		if(!this._inVr && enable == true){
			this._scene.useWebVR = true;
			this._inVr = true;
		}
			
	}
	
	return FDVR;
})