/*global define*/
define(function () {
    'use strict';
	function FDLabelsManager(project, labelsOptions) {
		project._options.labels = {};
		
		// 辅助变量
		this._pLabelsMap = {};
		
		this._pLabelsGroupMap = {};
		
		// 场景变量
		this._dataLabels = [];
		
		//引用
		project._options.labels = this._pLabelsMap;
		
		
		this._project = project;
		this._event = new FreeDo.Event();
		this._eventHelper = new FreeDo.EventHelper();

		this.defaultGroupID = "123";
		
		this._tempID = "";
		this._tempLabelOption = {};
		
		this.PositionType = {
			NONE: 0,
			ON_MODEL: 1,
			ON_TERRAIN: 2,
			ON_ELLIPSOID: 3
		};
		
		this.createGroup(this.defaultGroupID, "标签");
		
		for (var key in labelsOptions) {
			var labelOption = FreeDo.clone(labelsOptions[key], true);
			var labelID = FreeDo.createGuid();
			labelOption.id = labelID;
			this.addLabel(this.defaultGroupID, labelOption);
		}
		
		var handler = new FreeDo.ScreenSpaceEventHandler(this._project.getViewer().scene.canvas);
		//handler.setInputAction(function(movement){
		//	this.onMouseLeftClick(movement);
		//}, FreeDo.ScreenSpaceEventType.LEFT_CLICK);
		handler.setInputAction(this.onMouseLeftClick.createDelegate(this), FreeDo.ScreenSpaceEventType.LEFT_CLICK);
	}

	FDLabelsManager.prototype.pickPosition = function(windowPosition) {
        var cartesian,
            type = PositionType.NONE;

        var pickedObjects, entity;
        if (scene.pickPositionSupported) {
            var pickedObjects = scene.drillPick(windowPosition);
            if (FreeDo.defined(pickedObjects) && pickedObjects.length > 0) {
                for (var i = 0; i < pickedObjects.length; ++i) {
                    if (pickedObjects[i] instanceof FreeDo.FreeDoPModelFeature) {
                        cartesian = scene.pickPosition(windowPosition);
                        if (FreeDo.defined(cartesian)) {
                            type = PositionType.ON_MODEL;
                        }                        
                    }
                }
            }
        }

        //TODO: 尝试在地形上拾取点?

        if (type === PositionType.NONE) {
            cartesian = camera.pickEllipsoid(windowPosition, scene.globe.ellipsoid);
            if (FreeDo.defined(cartesian))
                type = PositionType.ON_ELLIPSOID;
        }

        return {
            type: type,
            position: cartesian
        };
    }
	
	FDLabelsManager.prototype.onMouseLeftClick = function(movement){
		if(!this._startCapture)
			return;
		var viewer = this._project.getViewer();
		var cartesian = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
        if (cartesian) {
            var cartographic = FreeDo.Cartographic.fromCartesian(cartesian);
            //var longitudeString = FreeDo.Math.toDegrees(cartographic.longitude).toFixed(2);
            //var latitudeString = FreeDo.Math.toDegrees(cartographic.latitude).toFixed(2);
			this.createLabelPost(cartesian);
        } else {
        }
	}
	
	FDLabelsManager.prototype.addLabelsGroup = function (groupOption) {
		if(groupOption.list == undefined)
			return;
		for (var i=0; i < groupOption.list.length;i++) {
			this.addLabel(groupOption.groupID, groupOption.list[i]);
		}
	}

	////////////////////////////////////////////////////////////////////////////
	FDLabelsManager.prototype.addLabel = function (groupID, labelOption) {
		if (typeof(this._pLabelsGroupMap[groupID]) == "undefined") {
			return false;
		}
		
		var labelObject = {};
		labelObject.labelOption = labelOption;//FreeDo.clone(labelOption, true);
		labelObject.groupID = groupID;
		
		this._pLabelsGroupMap[groupID].list.push(labelOption);
		return true;
	}

	FDLabelsManager.prototype.getLabelInfoStr = function(){
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

	FDLabelsManager.prototype.getLabelInfoArray = function(){
		var s = this.getLabelInfoStr();
		var a = s.split(",");
		return a;
	}
	
	FDLabelsManager.prototype.createLabelPost = function (cartesian) {		
		this._tempLabelOption.positon = cartesian;
		this._tempLabelOption.id = this._tempID;
		
		this._pLabelsMap[this._tempID] = this._tempLabelOption;
		this._pLabelsGroupMap[this.defaultGroupID].list.push(this._tempLabelOption);
		
		var entity = this._project.getViewer().entities.add({
			position : cartesian,
			billboard : {
				image : this._tempLabelOption.imageUrl,
				pixelOffset : new FreeDo.Cartesian2(0, -24)
			},
			label : {
				show : false,
				showBackground : true,
				font : '16px 黑体',
				horizontalOrigin : FreeDo.HorizontalOrigin.LEFT,
				verticalOrigin : FreeDo.VerticalOrigin.BOTTOM,
				pixelOffset : new FreeDo.Cartesian2(20, -12)
			}
		});
		
		entity.label.show = true;
        entity.label.text = this._tempLabelOption.text + "";
			
		this._dataLabels.push(entity);
		
		this._startCapture = false;
		
		var objGroupOption = {};
		objGroupOption.groupID = this.defaultGroupID;
		objGroupOption.groupOption = this._pLabelsGroupMap[this.defaultGroupID];
		
		setTimeout(() => {
			this._event.raiseEvent("LabelGroupChanged", objGroupOption);
		}, 0);
		
		return true;
	}
	
	FDLabelsManager.prototype.createLabel = function (name, tags) {	
		this._tempID = FreeDo.createGuid();
		
		this._tempLabelOption = {};
		this._tempLabelOption.text = name;
		this._tempLabelOption.show = true;
		this._tempLabelOption.imageUrl = "images/poi.png";
		this._tempLabelOption.highlight = true;
		this._tempLabelOption.tags = tags;
		
		this._startCapture = true;
		
		return true;
	}

	FDLabelsManager.prototype.removeLabel = function (groupID, index) {
		if (typeof(this._pLabelsGroupMap[groupID]) == "undefined") {
			return false;
		}
		
		if (typeof(this._pLabelsGroupMap[groupID].list[index]) == "undefined") {
			return false;
		}
		
		this._project.getViewer().entities.remove(this._dataLabels[index]);
		
		this._dataLabels = remove(this._dataLabels,index);
		
		var id = this._pLabelsGroupMap[groupID].list[index].id;
		delete this._pLabelsMap[id];
		
		this._pLabelsGroupMap[groupID].list = this._pLabelsGroupMap[groupID].list.splice(index,1);
		
		var objGroupOption = {};
		objGroupOption.groupID = this.defaultGroupID;
		objGroupOption.groupOption = this._pLabelsGroupMap[this.defaultGroupID];
		
		
		setTimeout(() => {
			this._event.raiseEvent("LabelGroupChanged", objGroupOption);
		}, 0);
		
		this.bStop = true;
		
		return true;
	}

	FDLabelsManager.prototype.createGroup = function (groupID, groupName) {
		this._pLabelsGroupMap[groupID] = {};
		this._pLabelsGroupMap[groupID].groupName = groupName;
		this._pLabelsGroupMap[groupID].list = [];
		
		var groupOption = FreeDo.clone(this._pLabelsGroupMap[groupID], true);
		groupOption.groupID = groupID;
		
		setTimeout(() => {
			this._event.raiseEvent("LabelGroupCreated", groupOption);
		}, 0);
		
		return true;
	}
	
	FDLabelsManager.prototype.removeGroup = function (groupID) {
		if (typeof(this._pLabelsGroupMap[groupID]) == "undefined") {
			return false;
		}

		delete this._pLabelsGroupMap[groupID];
		
		setTimeout(() => {
			this._event.raiseEvent("LabelGroupRemoved", groupID);
		}, 0);
		
		return true;
	}

	FDLabelsManager.prototype.clearAllLabels = function () {
		// 清空
		for (var key in this._pLabelsGroupMap) {
			this.removeGroup(key);
		}
	}
	
	FDLabelsManager.prototype.flyTo = function (sCI) {
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
	
	FDLabelsManager.prototype.goTo = function (sCI) {
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
	FDLabelsManager.prototype.flyToLabel = function (groupID, index) {
		if (typeof(this._pLabelsGroupMap[groupID]) == "undefined") {
			return false;
		}
		if (typeof(this._pLabelsGroupMap[groupID].list[index]) == "undefined") {
			return false;
		}
		var ci = this._pLabelsGroupMap[groupID].list[index].labelOption.cameraInfo;
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
	FDLabelsManager.prototype.goToLabel = function (groupID, index) {
		if (typeof(this._pLabelsGroupMap[groupID]) == "undefined") {
			return false;
		}
		if (typeof(this._pLabelsGroupMap[groupID].list[index]) == "undefined") {
			return false;
		}
		var ci = this._pLabelsGroupMap[groupID].list[index].labelOption.cameraInfo;
		this._project.getViewer().camera.setView({
			destination : FreeDo.Cartesian3.fromDegrees(ci[0], ci[1], ci[2]),
			orientation: {
				heading : FreeDo.Math.toRadians(ci[3]),
				pitch : FreeDo.Math.toRadians(ci[4]),
				roll : FreeDo.Math.toRadians(ci[5])
			}
		});
	}

	// 函数返回值是一个函数，调用该函数即可取消监听
	FDLabelsManager.prototype.on = function (listener, scope) {
		return this._eventHelper.add(this._event, listener, scope);
	}

	// 销毁所有资源
	FDLabelsManager.prototype.dispose = function () {
		this.clearAllLabels();
		this._pLabelsMap = {};
		this._pLabelsGroupMap = {};
		this._dataLabels = [];
		setTimeout(() => {
			this._eventHelper.removeAll();
		}, 200);
	}

	return FDLabelsManager;
});