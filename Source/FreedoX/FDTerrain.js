define(function () {
    'use strict';

	/**
	 * 地形高程管理器
	 * @alias FdTerrain
	 * @class
	 */
	function FDTerrain(project) {
		this._project = project;
		this._viewer = project.getViewer();
		this._scene = this._viewer.scene;
		
		this._showTerrain = false;
		this._terrain = undefined;
		
		this._terrain = new FreeDo.CesiumTerrainProvider({ 
			url: "http://gbim360.com:8888/",
			requestWaterMask: false
		}); 
		
		this._defaultTerrain = new FreeDo.EllipsoidTerrainProvider();
	}
	
	/**
	 * 设置地形是否可见
	 * @param {boolean} show true表示使地形高程可见，否则为false
	 */
	FDTerrain.prototype.showTerrain = function(show){
		if(this._showTerrain && show == false){
			this._viewer.terrainProvider = this._defaultTerrain;
			this._showTerrain = false;
		}
			
		if(!this._showTerrain && show == true){
			this._viewer.terrainProvider = this._terrain;
			this._viewer.scene.globe.enableLighting = true;
			this._showTerrain = true;
		}
			
	}
	
	return FDTerrain;
})