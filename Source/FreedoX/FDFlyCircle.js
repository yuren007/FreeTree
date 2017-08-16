define(function () {
    'use strict';
	function FDFlyCircle(project) {
		this._project = project;
		this._viewer = project.getViewer();
		this._scene = this._viewer.scene;
		this._position = undefined; 
		this._bInFly = false;
		
		this.PositionType = {
			NONE: 0,
			ON_MODEL: 1,
			ON_TERRAIN: 2,
			ON_ELLIPSOID: 3
		};
		
		this._Index = 0;
		
		this._positions = [];
		this._headings = [];
		
		this._bPlay = false;
		
		this._pitch = 0;
		
		this._ptEntity = undefined;
	}
	
	FDFlyCircle.prototype.doAni = function(clock) {
		if(!this._bInFly)
			return;
		
		if(!this._bPlay)
			return;
		
		this._viewer.camera.setView({
			destination: this._positions[this._Index],
			orientation: {
				heading: FreeDo.Math.toRadians(this._headings[this._Index]),
				pitch: this._pitch,//FreeDo.Math.toRadians(this._pitch),
				roll: 0.0
			}
		});
		if (this._Index == (this._positions.length - 1)) {
			this._Index = 0;
		}
		else
			this._Index++;
		
		setTimeout(this.doAni.createDelegate(this), 100);
	}
	
	FDFlyCircle.prototype.fly = function(lonCenter, latCenter, lonCamera, latCamera, height){
		var centerPt = new FreeDo.Cartesian3.fromDegrees(lonCenter, latCenter, height);
		var ptCamera = new FreeDo.Cartesian3.fromDegrees(lonCamera, latCamera, height);
		var centerPtGra = FreeDo.Ellipsoid.WGS84.cartesianToCartographic(centerPt);
		var ptCameraGra = FreeDo.Ellipsoid.WGS84.cartesianToCartographic(ptCamera);
		var radiusA = new FreeDo.EllipsoidGeodesic(centerPtGra, ptCameraGra);
		var radius = radiusA.surfaceDistance;
		radius = radius / 111319.55;
		for (var i = 0; i < 360; i++) {
			var a = i + this._heading;
			var x = lonCenter - radius * Math.sin(2 * Math.PI / 360 * a);
			var y = latCenter - radius * Math.cos(2 * Math.PI / 360 * a);
			this._positions.push(new FreeDo.Cartesian3.fromDegrees(x, y, height));
			if (a < 360) {
				this._headings.push(Math.abs(a))
			} else {
				this._headings.push(Math.abs(a-360))
			}
		}
		this._bPlay = true;
		setTimeout(this.doAni.createDelegate(this), 100);
	}
	
	FDFlyCircle.prototype.pickPosition = function(windowPosition) {
        var cartesian;
		var type = this.PositionType.NONE;

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
	
	FDFlyCircle.prototype.handleLeftClick = function(movement) {
		if(this._bInFly == false)
			return;
		
		var p = this.pickPosition(movement.position);
		
		var cartographic = this._viewer.camera.positionCartographic;
		var heading = this._viewer.camera.heading;
		var pitch = this._viewer.camera.pitch;
		var roll = this._viewer.camera.roll;
		var str = "";

		str = FreeDo.Math.toDegrees(cartographic.longitude) +
			',' + FreeDo.Math.toDegrees(cartographic.latitude) +
			',' + cartographic.height +
			',' + FreeDo.Math.toDegrees(heading) +
			',' + FreeDo.Math.toDegrees(pitch) +
			',' + FreeDo.Math.toDegrees(roll);

		var pGra = FreeDo.Cartographic.fromCartesian(p.position);
		var lon,lat,lon1,lat1;
		lon = FreeDo.Math.toDegrees(pGra.longitude);
		lat = FreeDo.Math.toDegrees(pGra.latitude);
		lon1 = FreeDo.Math.toDegrees(cartographic.longitude);
		lat1 = FreeDo.Math.toDegrees(cartographic.latitude);
		
		var ballSize = cartographic.height/200;
		if(this._ptEntity)
			this._viewer.entities.remove(this._ptEntity);
		this._ptEntity = this._viewer.entities.add({
			position: p.position,
			ellipsoid : {
				material : FreeDo.Color.YELLOW.withAlpha(0.9),
				radii : new FreeDo.Cartesian3(ballSize, ballSize, ballSize)
			}
		});
		
		//this._viewer.trackedEntity = this._ptEntity;
			
		this._pitch = pitch;
		this._heading = FreeDo.Math.toDegrees(heading);
		this.fly(lon, lat, lon1, lat1, cartographic.height);
		
		this._hanlder.removeInputAction(FreeDo.ScreenSpaceEventType.LEFT_CLICK);
	};
	
	FDFlyCircle.prototype.run = function(enable) {
		if(enable){
			if(this._bInFly)
				return;
		
			this._Index = 0;
			this._positions = [];
			this._headings = [];
			
			this._hanlder = new FreeDo.ScreenSpaceEventHandler(this._project.getViewer().scene.canvas);
			this._hanlder.setInputAction(this.handleLeftClick.createDelegate(this), FreeDo.ScreenSpaceEventType.LEFT_CLICK);
			
			this._bInFly = true;	
		}
		else
			this.reset();
	}


	FDFlyCircle.prototype.reset = function() {
		this._bInFly = false;
		this._bPlay = false;
		if(this._ptEntity)
			this._viewer.entities.remove(this._ptEntity);
	};
	
	return FDFlyCircle;
})