/*global define*/
define([
    './FDMisc'
], function (FDMisc) {
    'use strict';
	function FDAnalysisSegDistance(project) {
		this._fdMidc = new FDMisc();
		this._project = project;
		this._viewer = this._project.getViewer();
        this._results = [];
        this._currentResult = undefined;
        this._lastPositionIsTemp = false;
		this._hanlder = undefined;
	}
	
	FDAnalysisSegDistance.prototype.pickPosition = function(windowPosition) {
        var cartesian,
            type = this._fdMidc.PositionType.NONE;

        var pickedObjects, entity;
        if (this._viewer.scene.pickPositionSupported) {
            var pickedObjects = this._viewer.scene.drillPick(windowPosition);
            if (FreeDo.defined(pickedObjects) && pickedObjects.length > 0) {
                for (var i = 0; i < pickedObjects.length; ++i) {
                    if (pickedObjects[i] instanceof FreeDo.FreeDoPModelFeature) {
                        cartesian = this._viewer.scene.pickPosition(windowPosition);
                        if (FreeDo.defined(cartesian)) {
                            type = this._fdMidc.PositionType.ON_MODEL;
                        }                        
                    }
                }
            }
        }

        //尝试在地形上拾取点
        if (type === this._fdMidc.PositionType.NONE) {
            cartesian = this._viewer.camera.pickEllipsoid(windowPosition, this._viewer.scene.globe.ellipsoid);
            if (FreeDo.defined(cartesian))
                type = this._fdMidc.PositionType.ON_ELLIPSOID;
        }

        return {
            type: type,
            position: cartesian
        };
    }

	FDAnalysisSegDistance.prototype.newResult = function() {
		var positions = [];
		var labelEntity = this._viewer.entities.add({
			label : {
				show : false,
				showBackground : true,
				backgroundColor: new FreeDo.Color(0.165, 0.165, 0.165, 1),
				font : 'italic 24px 黑体',
				outlineColor: FreeDo.Color.GREEN,
				horizontalOrigin : FreeDo.HorizontalOrigin.LEFT,
				verticalOrigin : FreeDo.VerticalOrigin.TOP,
				pixelOffset : new FreeDo.Cartesian2(15, 0),
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			}
		});
		var polylineEntity = this._viewer.entities.add({
			polyline: {
				positions: positions,
				show: false,
				width: 6,
				followSurface: false,
				material: FreeDo.Color.RED
			}
		});
		return {
			labelEntity: labelEntity,
			polylineEntity: polylineEntity,
			positions: positions,
			length: 0
		};
	}

	FDAnalysisSegDistance.prototype.saveResult = function(result) {
		_results.push({
			labelEntity: result.labelEntity,
			polylineEntity: result.polylineEntity,
			length: result.length
		});
	}

	FDAnalysisSegDistance.prototype.finishCurrent = function() {
		saveResult(this._currentResult);
		this._currentResult = null;
		this._lastPositionIsTemp = false;
	}

	FDAnalysisSegDistance.prototype.cancelCurrent = function() {
		this._viewer.entities.remove(this._currentResult.labelEntity);
		this._viewer.entities.remove(this._currentResult.polylineEntity);
		this._currentResult = null;
		this._lastPositionIsTemp = false;
	}

	FDAnalysisSegDistance.prototype.clearResults = function() {
		for (var i = 0; i < this._results.length; ++i) {
			this._viewer.entities.remove(this._results[i].labelEntity);
			this._viewer.entities.remove(this._results[i].polylineEntity);
		}
		this._results = [];
	}

	FDAnalysisSegDistance.prototype.pickAPoint = function(windowPosition) {
		var pickResult = this.pickPosition(windowPosition);
		if (pickResult.type !== this._fdMidc.PositionType.NONE) {
			if (!this._currentResult) {
				this._currentResult = this.newResult();
			}

			if (this._lastPositionIsTemp) {
				this._currentResult.positions.pop();
			}
			this._currentResult.positions.push(pickResult.position);
			this._lastPositionIsTemp = false;
		}
	}

	FDAnalysisSegDistance.prototype.updateTmpPoint = function(windowPosition) {
		var pickResult = this.pickPosition(windowPosition);
		if (pickResult.type !== this._fdMidc.PositionType.NONE) {
			if (!this._lastPositionIsTemp) {
				this._currentResult.positions.push(pickResult.position);
				this._lastPositionIsTemp = true;
			} else {
				this._currentResult.positions[this._currentResult.positions.length-1] = pickResult.position;
			}
			if (this._currentResult.positions.length > 1) {
				this._currentResult.polylineEntity.polyline.show = true;
				this._currentResult.labelEntity.position = pickResult.position;
				this._currentResult.labelEntity.label.show = true;
				this._currentResult.labelEntity.label.text = this._fdMidc.getLengthText(this._fdMidc.calculateLength(this._currentResult.positions));
			}
		}
	}

	FDAnalysisSegDistance.prototype.handleLeftClick = function(movement) {
		this.pickAPoint(movement.position);
	};

	FDAnalysisSegDistance.prototype.handleMouseMove = function(movement) {
		if (this._currentResult) {
			this.updateTmpPoint(movement.endPosition);
		}
	}

	FDAnalysisSegDistance.prototype.handleLeftDblClick = function(movement) {
		if (this._currentResult) {
			this.updateTmpPoint(movement.position);
			this.finishCurrent();
		}
	}

	FDAnalysisSegDistance.prototype.handleRightClick = function(movement) {
		if (this._currentResult) {
			this.cancelCurrent();
		}
	}
	
	FDAnalysisSegDistance.prototype.run = function(){
		this.reset();
		this._hanlder = new FreeDo.ScreenSpaceEventHandler(this._project.getViewer().scene.canvas);
		this._hanlder.setInputAction(this.handleLeftClick.createDelegate(this), FreeDo.ScreenSpaceEventType.LEFT_CLICK);
		this._hanlder.setInputAction(this.handleRightClick.createDelegate(this), FreeDo.ScreenSpaceEventType.RIGHT_CLICK);
		this._hanlder.setInputAction(this.handleMouseMove.createDelegate(this), FreeDo.ScreenSpaceEventType.MOUSE_MOVE);
		this._hanlder.setInputAction(this.handleLeftDblClick.createDelegate(this), FreeDo.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);	
	}

	FDAnalysisSegDistance.prototype.reset = function() {
		if(this._hanlder){
			this._hanlder.removeInputAction(FreeDo.ScreenSpaceEventType.LEFT_CLICK);
			this._hanlder.removeInputAction(FreeDo.ScreenSpaceEventType.RIGHT_CLICK);
			this._hanlder.removeInputAction(FreeDo.ScreenSpaceEventType.MOUSE_MOVE);
			this._hanlder.removeInputAction(FreeDo.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
			this.clearResults();
		}
	};
	
	return FDAnalysisSegDistance;
})