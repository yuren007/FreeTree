/*global define*/
define([
    './FDMisc'
], function (FDMisc) {
    'use strict';
	function FDAnalysisLineDistance(project) {
		this.SurveyType = {
			NONE: 0,
			LINE_DISTANCE: 1,
			SEGMENTS_DISTANCE: 2,
		};

		this.PositionType = {
			NONE: 0,
			ON_MODEL: 1,
			ON_TERRAIN: 2,
			ON_ELLIPSOID: 3
		};
		
		this.ResultType = {
            StraightLine: 1,
            HorizontalAndVertical: 2
        };
		
		//进行线段量测或者折线量测
		//FDMisc = new FDMisc();
		this._project = project;
		this._viewer = this._project.getViewer();
		
        this._results = [];
        this._startPoint = undefined;

        this._polylineCollection = new FreeDo.PolylineCollection();
        this._viewer.scene.primitives.add(this._polylineCollection);
		
		this._collection = new FreeDo.PrimitiveCollection();
		this._viewer.scene.primitives.add(this._collection);
		
        this._tempLine;
        this._tempPointEntities = [null, null];
		this._tempSumLabelEntity = undefined;
		this._sumLabel = [];
		this._lastLabel = undefined;
		
		this._points = [];
		
		this._hanlder = {};
		
		this._ballSize = 0.5;
		this._lineWidth = 5;
		this._fontSize = '22px 黑体';
		
		this._bInSurvey = false;
		this._surveyType = "";
	}
	
	FDAnalysisLineDistance.prototype.computeCircle = function(radius) {
		var positions = [];
		for (var i = 0; i < 360; i++) {
		var radians = FreeDo.Math.toRadians(i);
			positions.push(new FreeDo.Cartesian2(radius * Math.cos(radians), radius * Math.sin(radians)));
		}
		return positions;
	}
	
	FDAnalysisLineDistance.prototype.pickPosition = function(windowPosition) {
        var cartesian,
            type = this.PositionType.NONE;

        var pickedObjects, entity;
        if (this._viewer.scene.pickPositionSupported) {
            var pickedObjects = this._viewer.scene.drillPick(windowPosition);
            if (FreeDo.defined(pickedObjects) && pickedObjects.length > 0) {
                for (var i = 0; i < pickedObjects.length; ++i) {
                    if (pickedObjects[i] instanceof FreeDo.FreeDoPModelFeature) {
                        cartesian = this._viewer.scene.pickPosition(windowPosition);
                        if (FreeDo.defined(cartesian)) {
                            type = this.PositionType.ON_MODEL;
                        }                        
                    }
                }
            }
        }

        //尝试在地形上拾取点

        if (type === this.PositionType.NONE) {
            cartesian = this._viewer.camera.pickEllipsoid(windowPosition, this._viewer.scene.globe.ellipsoid);
            if (FreeDo.defined(cartesian))
                type = this.PositionType.ON_ELLIPSOID;
        }

        return {
            type: type,
            position: cartesian
        };
    }

	FDAnalysisLineDistance.prototype.updateTmpLine = function(windowPosition) {
		var pickResult = this.pickPosition(windowPosition);
		if (pickResult.type !== this.PositionType.NONE) {
			this._points.pop();
			this._points.push(pickResult.position);
			if (this._tempLine) {
				this._polylineCollection.remove(this._tempLine);
				this._tempLine = undefined;
			}
			this._tempLine = this._polylineCollection.add({
				positions: [this._startPoint.position, pickResult.position],
				width: this._lineWidth,
				show: true,
				loop: false,
				material: new FreeDo.Material({
					fabric : {
						type : 'Color',
						uniforms : {
							color: FreeDo.Color.RED
						}
					}
				})
			});
			if (!this._tempPointEntities[1]) {
				this._tempPointEntities[1] = this._viewer.entities.add({
					position: pickResult.position,
					point: {
                        pixelSize: 5,
                        color: FreeDo.Color.WHITE,
                        outlineColor: FreeDo.Color.BLACK,
                        outlineWidth: 1
                    }
				});
			} else {
				this._tempPointEntities[1].position = pickResult.position;                    
			}
			
			if(this._tempSumLabelEntity == undefined){
				this._tempSumLabelEntity = this._viewer.entities.add({
					label : {
						showBackground : true,
						backgroundColor: new FreeDo.Color(0.165, 0.165, 0.165, 1),
						font : this._fontSize,
						fillColor: FreeDo.Color.RED,
						outlineColor: FreeDo.Color.GREEN,
						horizontalOrigin : FreeDo.HorizontalOrigin.LEFT,
						verticalOrigin : FreeDo.VerticalOrigin.TOP,
						pixelOffset : new FreeDo.Cartesian2(15, 0),
						disableDepthTestDistance: Number.POSITIVE_INFINITY
					}
				});
			}
			else{
				this._tempSumLabelEntity.position = pickResult.position;
				this._tempSumLabelEntity.label.text = FDMisc.getLengthText(FDMisc.calculateLength(this._points));
			}
		}
	}
	
	FDAnalysisLineDistance.prototype.updateTmpLine2 = function(windowPosition) {
		var pickResult = this.pickPosition(windowPosition);
		if (pickResult.type !== this.PositionType.NONE) {
			if (this._tempLine) {
				this._collection.remove(this._tempLine);
				this._tempLine = undefined;
			}
			this._tempLine = new FreeDo.PolylineGraphics({
				positions: [this._startPoint.position, pickResult.position],
				width: this._lineWidth,
				show: true,
				loop: false,
				material: new FreeDo.Material({
					fabric : {
						type : 'Color', 
						uniforms : {
							color: FreeDo.Color.RED
						}
					}
				})
			});
			this._collection.add(this._tempLine);
			if (!this._tempPointEntities[1]) {
				this._tempPointEntities[1] = this._viewer.entities.add({
					position: pickResult.position,
					ellipsoid : {
						material : FreeDo.Color.YELLOW.withAlpha(0.9),
						radii : new FreeDo.Cartesian3(this._ballSize, this._ballSize, this._ballSize)
					}
				});
			} else {
				this._tempPointEntities[1].position = pickResult.position;                    
			}
		}
	}
	
	FDAnalysisLineDistance.prototype.updateTmpLine3 = function(windowPosition) {
		var pickResult = this.pickPosition(windowPosition);
		if (pickResult.type !== this.PositionType.NONE) {
			if (this._tempLine) {
				this._tempLine.polyline.positions = [this._startPoint.position, pickResult.position];
			}
			else
			{
				var op = {
						polyline : {
							positions: [this._startPoint.position, pickResult.position],
							width : 6,
							material: FreeDo.Color.RED
						}
					}					
				this._tempLine = this._viewer.entities.add(op);
			}
			
			if (!this._tempPointEntities[1]) {
				this._tempPointEntities[1] = this._viewer.entities.add({
					position: pickResult.position,
					ellipsoid : {
						material : FreeDo.Color.YELLOW.withAlpha(0.9),
						radii : new FreeDo.Cartesian3(this._ballSize, this._ballSize, this._ballSize)
					}
				});
			} else {
				this._tempPointEntities[1].position = pickResult.position;                    
			}
		}
	}
	
	FDAnalysisLineDistance.prototype.updateTmpLine4 = function(windowPosition) {
		var pickResult = this.pickPosition(windowPosition);
		if (pickResult.type !== this.PositionType.NONE) {
			if (this._tempLine) {
				//this._collection.remove(this._tempLine);
				//this._tempLine = undefined;
				//this._tempLine.polyline.positions = [this._startPoint.position, pickResult.position];
				this._viewer.scene.primitives.remove(this._tempLine);
				this._tempLine = undefined;
			}
			// A polyline with two connected line segments
			var polyline = new FreeDo.PolylineGeometry({
			  positions : [this._startPoint.position, pickResult.position],
			  width: this._lineWidth
			});
			var spl = FreeDo.PolylineGeometry.createGeometry(polyline);

			var volume = new FreeDo.PolylineVolumeGeometry({
			  vertexFormat : FreeDo.VertexFormat.POSITION_ONLY,
			  polylinePositions : [this._startPoint.position, pickResult.position],
			  shapePositions : this.computeCircle(10.0)
			});

			var instance = new FreeDo.GeometryInstance({
			  geometry : volume,
			  id : ''
			});
			
			this._tempLine = new FreeDo.Primitive({
			  geometryInstances : instance,
			  appearance : new FreeDo.EllipsoidSurfaceAppearance({
				  aboveGround: true
			  })
			})
			this._viewer.scene.primitives.add(this._tempLine);
			
			if (!this._tempPointEntities[1]) {
				this._tempPointEntities[1] = this._viewer.entities.add({
					position: pickResult.position,
					ellipsoid : {
						material : FreeDo.Color.YELLOW.withAlpha(0.9),
						radii : new FreeDo.Cartesian3(this._ballSize, this._ballSize, this._ballSize)
					}
				});
			} else {
				this._tempPointEntities[1].position = pickResult.position;                    
			}
		}
	}
	
	FDAnalysisLineDistance.prototype.updateTmpLine5 = function(windowPosition) {
		var pickResult = this.pickPosition(windowPosition);
		if (pickResult.type !== this.PositionType.NONE) {
			if (this._tempLine) {
				//this._collection.remove(this._tempLine);
				//this._tempLine = undefined;
				//this._tempLine.polyline.positions = [this._startPoint.position, pickResult.position];
				//this._viewer.scene.primitives.remove(this._tempLine);
				//this._tempLine = undefined;
			}
			var pp = new FreeDo.PolylineGeometry({
			  positions : [this._startPoint.position, pickResult.position],
			  width : 1.0
			});
			var gg = FreeDo.PolylineGeometry.createGeometry(pp);

			var instance = new FreeDo.GeometryInstance({
				geometry : gg,
				id : '12112'
			});
			
			this._tempLine = new FreeDo.Primitive({
				geometryInstances : instance,
				appearance : new FreeDo.PerInstanceColorAppearance()
			})
			var aa = this._viewer.scene.primitives.add(this._tempLine);
			
			if (!this._tempPointEntities[1]) {
				this._tempPointEntities[1] = this._viewer.entities.add({
					position: pickResult.position,
						ellipsoid : {
						material : FreeDo.Color.YELLOW.withAlpha(0.9),
						radii : new FreeDo.Cartesian3(this._ballSize, this._ballSize, this._ballSize)
					}
				});
			} else {
				this._tempPointEntities[1].position = pickResult.position;                    
			}
		}
	}
	
	FDAnalysisLineDistance.prototype.updateTmpLine6 = function(windowPosition) {
		var pickResult = this.pickPosition(windowPosition);
		if (pickResult.type !== this.PositionType.NONE) {
			if (this._tempLine) {
				//this._collection.remove(this._tempLine);
				//this._tempLine = undefined;
				//this._tempLine.polyline.positions = [this._startPoint.position, pickResult.position];
				this._viewer.scene.primitives.remove(this._tempLine);
				this._tempLine = undefined;
			}
			
			var color = new FreeDo.ColorGeometryInstanceAttribute(0.0, 1.0, 1.0, 0.5); 
			
			// A polyline with two connected line segments
			var polyline = new FreeDo.CorridorGeometry({
				positions : [this._startPoint.position, pickResult.position],
				vertexFormat : FreeDo.VertexFormat.POSITION_ONLY,
				width: this._lineWidth*10,
				height: 100,
				extrudedHeight: 100000
			});

			var polylineInstance = new FreeDo.GeometryInstance({
				geometry : polyline,
				id : 'polyline',
				attributes : {
					color : color
				}
			});
						
			this._tempLine = new FreeDo.GroundPrimitive({
				geometryInstances : [polylineInstance]
			});
			
			this._viewer.scene.primitives.add(this._tempLine);
			
			if (!this._tempPointEntities[1]) {
				this._tempPointEntities[1] = this._viewer.entities.add({
					position: pickResult.position,
					ellipsoid : {
						material : FreeDo.Color.YELLOW.withAlpha(0.9),
						radii : new FreeDo.Cartesian3(this._ballSize, this._ballSize, this._ballSize)
					}
				});
			} else {
				this._tempPointEntities[1].position = pickResult.position;                    
			}
		}
	}
	
	FDAnalysisLineDistance.prototype.removeTmpLine = function() {
		if (this._tempLine) {
			this._polylineCollection.remove(this._tempLine);
			this._tempLine = undefined;
		}
		
		if (this._tempSumLabelEntity) {
			this._viewer.entities.remove(this._tempSumLabelEntity);
			this._tempSumLabelEntity = undefined;
		}
		
		for (var i = 0; i < this._tempPointEntities.length; i++) {
			if (!!this._tempPointEntities[i]) {
				this._viewer.entities.remove(this._tempPointEntities[i]);
				this._tempPointEntities[i] = null;
			}
		}
	}
	
	FDAnalysisLineDistance.prototype.addResult = function(endPoint) {
		var resultType = this._startPoint.type === this.PositionType.ON_MODEL ? this.ResultType.HorizontalAndVertical : 
				(endPoint.type === this.PositionType.ON_MODEL ? this.ResultType.HorizontalAndVertical : this.ResultType.StraightLine);
		this._points.pop();
		this._points.push(endPoint.position);
		this._points.push(endPoint.position);
		
		//动态计算球的大小
		this._ballSize = FDMisc.calculateLength(this._points)/1000;
		
		if (resultType === this.ResultType.StraightLine) {
			var positions = [this._startPoint.position, endPoint.position];
			var line = this._polylineCollection.add({
				positions: positions,
				width: this._lineWidth,
				show: true,
				loop: false,
				material: new FreeDo.Material({
					fabric : {
						type : 'Color',
						uniforms : {
							color: FreeDo.Color.RED
						}
					}
				})
			});
			var labelEntity = this._viewer.entities.add({
				position: FDMisc.getCenter(this._startPoint.position, endPoint.position),
				label: {
					text: FDMisc.getLengthText(FDMisc.calculateLength(positions)),
					show: true,
					showBackground: true,
					backgroundColor: new FreeDo.Color(0.165, 0.165, 0.165, 1),
					font: this._fontSize,
					horizontalOrigin : FreeDo.HorizontalOrigin.CENTER,
					verticalOrigin : FreeDo.VerticalOrigin.BOTTOM,
					pixelOffset : new FreeDo.Cartesian2(1, 1),
					disableDepthTestDistance: Number.POSITIVE_INFINITY
				}
			});
			var startPointEntity = this._viewer.entities.add({
				position: this._startPoint.position,
				show: true,
				ellipsoid : {
					material : FreeDo.Color.YELLOW.withAlpha(0.9),
					radii : new FreeDo.Cartesian3(this._ballSize, this._ballSize, this._ballSize)
				}
			});
			var endPointEntity = this._viewer.entities.add({
				position: endPoint.position,
				show: true,
				ellipsoid : {
					material : FreeDo.Color.YELLOW.withAlpha(0.9),
					radii : new FreeDo.Cartesian3(this._ballSize, this._ballSize, this._ballSize)
				}
			});
			this._results.push({
				type: resultType,
				labelEntity: labelEntity,
				line: line,
				startPointEntity: startPointEntity,
				endPointEntity: endPointEntity
			});		
		} else if (resultType === this.ResultType.HorizontalAndVertical) {

			var startPointCartographic = FreeDo.Cartographic.fromCartesian(this._startPoint.position);
			var endPointCartographic = FreeDo.Cartographic.fromCartesian(endPoint.position);
			var lowPoint, highPoint, verticalOffset, horizontalOffset;
			if (startPointCartographic.height > endPointCartographic.height) {
				highPoint = this._startPoint.position;
				lowPoint = endPoint.position;
				verticalOffset = startPointCartographic.height - endPointCartographic.height;
			} else {
				highPoint = endPoint.position;
				lowPoint = this._startPoint.position;
				verticalOffset = endPointCartographic.height - startPointCartographic.height;
			}

			var up = new FreeDo.Cartesian3();
			FreeDo.Cartesian3.normalize(lowPoint, up);
			FreeDo.Cartesian3.multiplyByScalar(up, verticalOffset, up);
			var crossPoint = new FreeDo.Cartesian3();
			FreeDo.Cartesian3.add(lowPoint, up, crossPoint);

			horizontalOffset = FreeDo.Cartesian3.distance(crossPoint, highPoint);

			var line = this._polylineCollection.add({
				positions: [highPoint, lowPoint],
				width: this._lineWidth,
				show: true,
				loop: false,
				material: new FreeDo.Material({
					fabric : {
						type : 'Color',
						uniforms : {
							color: FreeDo.Color.RED
						}
					}
				})
			});
			var verticalLine = this._polylineCollection.add({
				positions: [lowPoint, crossPoint],
				width: this._lineWidth,
				show: true,
				loop: false,
				material: new FreeDo.Material({
					fabric : {
						type : 'Color',
						uniforms : {
							color: FreeDo.Color.BLUE
						}
					}
				})
			});
			var horizontalLine = this._polylineCollection.add({
				positions: [highPoint, crossPoint],
				width: this._lineWidth,
				show: true,
				loop: false,
				material: new FreeDo.Material({
					fabric : {
						type : 'Color',
						uniforms : {
							color: FreeDo.Color.GREEN
						}
					}
				})
			});

			var lineLabelEntity = this._viewer.entities.add({
				position: FDMisc.getCenter(highPoint, lowPoint),
				label: {
					text: FDMisc.getLengthText(FDMisc.calculateLength([highPoint, lowPoint])),
					show: true,
					showBackground: true,
					backgroundColor: new FreeDo.Color(0.165, 0.165, 0.165, 1),
					font: this._fontSize,
					horizontalOrigin : FreeDo.HorizontalOrigin.CENTER,
					verticalOrigin : FreeDo.VerticalOrigin.BOTTOM,
					pixelOffset : new FreeDo.Cartesian2(0, 3),
					disableDepthTestDistance: Number.POSITIVE_INFINITY
				}
			});
			
			var verticalLineLabelEntity = this._viewer.entities.add({
				position: FDMisc.getCenter(lowPoint, crossPoint),
				label: {
					text: FDMisc.getLengthText(verticalOffset),
					show: true,
					showBackground: true,
					backgroundColor: new FreeDo.Color(0.165, 0.165, 0.165, 1),
					font: this._fontSize,
					horizontalOrigin : FreeDo.HorizontalOrigin.CENTER,
					verticalOrigin : FreeDo.VerticalOrigin.BOTTOM,
					pixelOffset : new FreeDo.Cartesian2(0, 3),
					disableDepthTestDistance: Number.POSITIVE_INFINITY
				}
			});
			var horizontalLineLabelEntity = this._viewer.entities.add({
				position: FDMisc.getCenter(highPoint, crossPoint),
				label: {
					text: FDMisc.getLengthText(horizontalOffset),
					show: true,
					showBackground: true,
					backgroundColor: new FreeDo.Color(0.165, 0.165, 0.165, 1),
					font: this._fontSize,
					horizontalOrigin : FreeDo.HorizontalOrigin.CENTER,
					verticalOrigin : FreeDo.VerticalOrigin.BOTTOM,
					pixelOffset : new FreeDo.Cartesian2(0, 3),
					disableDepthTestDistance: Number.POSITIVE_INFINITY
				}
			});
			var startPointEntity = this._viewer.entities.add({
				position: this._startPoint.position,
				ellipsoid : {
					material : FreeDo.Color.YELLOW.withAlpha(0.9),
					radii : new FreeDo.Cartesian3(this._ballSize, this._ballSize, this._ballSize)
				}
			});
			var endPointEntity = this._viewer.entities.add({
				position: endPoint.position,
				ellipsoid : {
					material : FreeDo.Color.YELLOW.withAlpha(0.9),
					radii : new FreeDo.Cartesian3(this._ballSize, this._ballSize, this._ballSize)
				}
			});
			this._results.push({
				type: resultType,
				line: line,
				verticalLine: verticalLine,
				horizontalLine: horizontalLine,
				lineLabelEntity: lineLabelEntity,
				verticalLineLabelEntity: verticalLineLabelEntity,
				horizontalLineLabelEntity: horizontalLineLabelEntity,
				startPointEntity: startPointEntity,
				endPointEntity: endPointEntity
			});
		}
		
		if(this._points.length > 3)
		{
			if(this._lastLabel == undefined){
				this._lastLabel = this._viewer.entities.add({
					position: endPoint.position,
					label : {
						showBackground : true,
						backgroundColor: new FreeDo.Color(0.165, 0.165, 0.165, 1),
						font : this._fontSize,
						fillColor : FreeDo.Color.GREEN,
						position: endPoint.position,
						text: FDMisc.getLengthText(FDMisc.calculateLength(this._points)),
						outlineColor: FreeDo.Color.GREEN,
						horizontalOrigin : FreeDo.HorizontalOrigin.LEFT,
						verticalOrigin : FreeDo.VerticalOrigin.TOP,
						pixelOffset : new FreeDo.Cartesian2(15, 0),
						disableDepthTestDistance: Number.POSITIVE_INFINITY
					}
				});
			}
			else
			{
				this._lastLabel.position = endPoint.position;
				this._lastLabel.label.text = FDMisc.getLengthText(FDMisc.calculateLength(this._points));
			}			
		}

		//同意修改所有球的大小
		for(var key in this._results){
			this._results[key].startPointEntity.ellipsoid.radii = new FreeDo.Cartesian3(this._ballSize, this._ballSize, this._ballSize)
			this._results[key].endPointEntity.ellipsoid.radii = new FreeDo.Cartesian3(this._ballSize, this._ballSize, this._ballSize)
		}
		if(this._surveyType == "SEGMENTS_DISTANCE")
			this._startPoint = FreeDo.clone(endPoint, true);
		else
			this._startPoint = undefined;
		endPoint = undefined;
	}

	FDAnalysisLineDistance.prototype.clearResults = function() {
		this.removeTmpLine();

		for (var i = 0; i < this._results.length; ++i) {
			if (this._results[i].type === this.ResultType.StraightLine) {
				this._polylineCollection.remove(this._results[i].line);
				this._viewer.entities.remove(this._results[i].labelEntity);
				this._viewer.entities.remove(this._results[i].startPointEntity);
				this._viewer.entities.remove(this._results[i].endPointEntity);
			} else if (this._results[i].type === this.ResultType.HorizontalAndVertical) {
				this._polylineCollection.remove(this._results[i].line);
				this._polylineCollection.remove(this._results[i].verticalLine);
				this._polylineCollection.remove(this._results[i].horizontalLine);
				this._viewer.entities.remove(this._results[i].lineLabelEntity);
				this._viewer.entities.remove(this._results[i].verticalLineLabelEntity);
				this._viewer.entities.remove(this._results[i].horizontalLineLabelEntity);
				this._viewer.entities.remove(this._results[i].startPointEntity);
				this._viewer.entities.remove(this._results[i].endPointEntity);
			}
		}
		
		for(var key in this._sumLabel)
		{
			this._viewer.entities.remove(this._sumLabel[key]);
		}
		this._results = [];
		this._sumLabel = [];
	}

	FDAnalysisLineDistance.prototype.pickStartPoint = function(windowPosition) {
		this._points = [];
		var pickResult = this.pickPosition(windowPosition);
		if (pickResult.type !== this.PositionType.NONE) {
			this._startPoint = pickResult;
			this._points.push(pickResult.position);
			this._points.push(pickResult.position);
			this._tempPointEntities[0] = this._viewer.entities.add({
				position: this._startPoint.position,
				ellipsoid : {
					material : FreeDo.Color.YELLOW.withAlpha(0.9),
					radii : new FreeDo.Cartesian3(this._ballSize, this._ballSize, this._ballSize)
				}
			});
		}
	}

	FDAnalysisLineDistance.prototype.pickEndPoint = function(windowPosition) {
		var pickResult = this.pickPosition(windowPosition);
		if (pickResult.type !== this.PositionType.NONE) {
			this.removeTmpLine();

			this.addResult(pickResult);
		}
	}

	FDAnalysisLineDistance.prototype.handleLeftClick = function(movement) {
		if(this._bInSurvey == false)
			return;
		if (this._startPoint) {
			this.pickEndPoint(movement.position);
		} else {
			this.pickStartPoint(movement.position);
		}
	};
	
	FDAnalysisLineDistance.prototype.addSumLabel = function(){
		this._points.pop();
		this._viewer.entities.remove(this._lastLabel);
		this._lastLabel = undefined;
		
		if(this._points.length > 2){
			var sumLabel = this._viewer.entities.add({
				position: this._points[this._points.length - 1],
				label : {
					showBackground : true,
					backgroundColor: new FreeDo.Color(0.165, 0.165, 0.165, 1),
					font : this._fontSize,
					fillColor: FreeDo.Color.GREEN,
					text: FDMisc.getLengthText(FDMisc.calculateLength(this._points)),
					outlineColor: FreeDo.Color.GREEN,
					horizontalOrigin : FreeDo.HorizontalOrigin.LEFT,
					verticalOrigin : FreeDo.VerticalOrigin.TOP,
					pixelOffset : new FreeDo.Cartesian2(15, 0),
					disableDepthTestDistance: Number.POSITIVE_INFINITY
				}
			});
			this._sumLabel.push(sumLabel);	
		}
	}

	FDAnalysisLineDistance.prototype.handleRightClick = function(movement) {
		if(this._bInSurvey == false)
			return;
		if (!!this._startPoint) {
			this._startPoint = undefined;
			this.addSumLabel();
		}
		this.removeTmpLine();
	}

	FDAnalysisLineDistance.prototype.handleMouseMove = function(movement) {
		if(this._bInSurvey == false)
			return;
		if (!!this._startPoint && !FreeDo.Cartesian3.equals(movement.endPosition, movement.startPosition)) {
			this.updateTmpLine(movement.endPosition);
		}
	}
	
	FDAnalysisLineDistance.prototype.onKeyDown = function(){
		if(this._bInSurvey == false)
			return;
		if(window.event.keyCode==27)   
		{   
			this.handleRightClick();
		} 
	}
	
	FDAnalysisLineDistance.prototype.run = function(type) {
		this._surveyType = type;
		this._hanlder = new FreeDo.ScreenSpaceEventHandler(this._project.getViewer().scene.canvas);
		this._hanlder.setInputAction(this.handleLeftClick.createDelegate(this), FreeDo.ScreenSpaceEventType.LEFT_CLICK);
		this._hanlder.setInputAction(this.handleRightClick.createDelegate(this), FreeDo.ScreenSpaceEventType.RIGHT_CLICK);
		this._hanlder.setInputAction(this.handleMouseMove.createDelegate(this), FreeDo.ScreenSpaceEventType.MOUSE_MOVE);
		
		window.addEventListener("keydown", this.onKeyDown.createDelegate(this));
		this._bInSurvey = true;
	}


	FDAnalysisLineDistance.prototype.reset = function() {
		this._bInSurvey = false;
		this._hanlder.removeInputAction(FreeDo.ScreenSpaceEventType.LEFT_CLICK);
		this._hanlder.removeInputAction(FreeDo.ScreenSpaceEventType.RIGHT_CLICK);
		this._hanlder.removeInputAction(FreeDo.ScreenSpaceEventType.MOUSE_MOVE);
		this.clearResults();
		this._viewer.scene.primitives.remove(this._polylineCollection);
	};
	
	return FDAnalysisLineDistance;
})