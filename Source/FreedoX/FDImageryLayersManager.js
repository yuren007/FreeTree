/*global define*/
define(function () {
    'use strict';

    /**
     * 影像图层管理器
     * @alias FdImageryLayersManager
     * @class
     * @private
     */
    function FDImageryLayersManager(project) {
        // 初始化sceneObjects数据为一个空对象
        project._options.imageryLayers = [];
        // 将这个变量也引用过去
        this._imageryLayersOpts = project._options.imageryLayers;

        this._project = project;
        this._imageryLayers = this._project.getViewer().imageryLayers;

        this._event = new FreeDo.Event();
        this._eventHelper = new FreeDo.EventHelper();

        this._imageryLayers.layerAdded.addEventListener(FDImageryLayersManager.prototype._rawEventCallback, this);
        this._imageryLayers.layerMoved.addEventListener(FDImageryLayersManager.prototype._rawEventCallback, this);
        this._imageryLayers.layerRemoved.addEventListener(FDImageryLayersManager.prototype._rawEventCallback, this);
        this._imageryLayers.layerShownOrHidden.addEventListener(FDImageryLayersManager.prototype._rawEventCallback, this);
    }

    Object.defineProperties(FDImageryLayersManager.prototype, {
        /**
         * 项目中所包含的影像数量
         * @memberof FdImageryLayersManager.prototyp
         * @type {number}
         */
        length: {
            get: function () {
                return this._imageryLayersOpts.length;
            }
        }
    });

    FDImageryLayersManager.prototype._rawEventCallback = function () {
        this._event.raiseEvent("Changed");
    }

    FDImageryLayersManager.prototype.getLayerProperty = function (index, property) {
        var imageLayerOpt = this._imageryLayersOpts[index];

        if (typeof (imageLayerOpt) === "undefined") {
            throw new Error("FDImageryLayersManager.getLayerProperty: cannot get property!");
        }

        if (imageLayerOpt.layerOption && typeof (imageLayerOpt.layerOption[property]) !== "undefined") {
            // TODO 是否要根据类型判断是否克隆？
            return FreeDo.clone(imageLayerOpt.layerOption[property], true);
        } else {
            var layer = this._imageryLayers.get(index);
            if (typeof (layer[property] !== "undefined")) {
                return layer[property];
            } else {
                throw new Error("FDImageryLayersManager.getLayerProperty: cannot get property!");
            }
        }
    }

    FDImageryLayersManager.prototype.setLayerProperty = function (index, property, value) {
        // 0 先检查是否存在这个sceneObject
        var imageLayerOpt = this._imageryLayersOpts[index];
        if (typeof (imageLayerOpt) === "undefined") {
            throw new Error("FDImageryLayersManager.setLayerProperty: cannot get property!");
        }

        var oldValue = this.getLayerProperty(index, property);

        if (_.isEqual(oldValue, value)) {
            return;
        }

        // 1 先给实际的物体属性赋值
        var layer = this._imageryLayers.get(index);
        if (typeof (layer[property] !== "undefined")) {
            layer[property] = value;
        } else {
            throw new Error("FDImageryLayersManager.setLayerProperty: cannot get property!");
        }

        // 2 然后给option赋值，使其保持同步
        if (typeof imageLayerOpt.layerOption === "undefined") {
            imageLayerOpt.layerOption = {};
        }
        imageLayerOpt.layerOption[property] = value;

        // 3 发送事件
        this._event.raiseEvent("Changed");
    }

    FDImageryLayersManager.prototype.add = function (imageryLayerOptions, index) {
        if (typeof index === "undefined") {
            index = this._imageryLayersOpts.length;
            this._imageryLayersOpts.push(imageryLayerOptions);
        } else {
            this._imageryLayersOpts.splice(index, 0, imageryLayerOptions);
        }
        var providerOptions = FreeDo.clone(imageryLayerOptions.providerOptions, true);

        var imageProvider;
        switch (imageryLayerOptions.type) {
            case "BingMaps":
                {
                    if (providerOptions.mapStyle === "AERIAL") {
                        providerOptions.mapStyle = FreeDo.BingMapsStyle.AERIAL;
                    } else if (providerOptions.mapStyle === "AERIAL_WITH_LABELS") {
                        providerOptions.mapStyle = FreeDo.BingMapsStyle.AERIAL_WITH_LABELS;
                    } else if (providerOptions.mapStyle === "ROAD") {
                        providerOptions.mapStyle = FreeDo.BingMapsStyle.ROAD;
                    }
                    imageProvider = new FreeDo.BingMapsImageryProvider(providerOptions);
                    break;
                }
            case "Mapbox":
                {
                    imageProvider = new FreeDo.MapboxImageryProvider(providerOptions);
                    break;
                }
            case "ESRI":
                {
                    imageProvider = new FreeDo.ArcGisMapServerImageryProvider(providerOptions);
                    break;
                }
            case "OpenStreetMap":
                {
                    imageProvider = FreeDo.createOpenStreetMapImageryProvider(providerOptions);
                    break;
                }
            case "WMTS":
                {
                    if (providerOptions.tilingScheme === "Geographic") {
                        providerOptions.tilingScheme = new FreeDo.GeographicTilingScheme();
                    }
                    imageProvider = new FreeDo.WebMapTileServiceImageryProvider(providerOptions);
                    break;
                }
            case "TileMapService":
                {
                    imageProvider = FreeDo.createTileMapServiceImageryProvider(providerOptions);
                    break;
                }
        }

        this._imageryLayers.addImageryProvider(imageProvider, index);

        var layer = this._imageryLayers.get(index);
        for (var property in imageryLayerOptions.layerOption) {
            this.setLayerProperty(index, property, imageryLayerOptions.layerOption[property]);

            if (typeof (layer[property] !== "undefined")) {
                layer[property] = imageryLayerOptions.layerOption[property];
            } else {
                throw new Error("FDImageryLayersManager.setLayerProperty: cannot get property!");
            }
        }
    }

    FDImageryLayersManager.prototype.raise = function (index) {
        if (index >= 0 && index < this.length - 1) {
            var temp = this._imageryLayersOpts[index];
            this._imageryLayersOpts[index] = this._imageryLayersOpts[index + 1];
            this._imageryLayersOpts[index + 1] = temp;

            var layer = this._imageryLayers.get(index);
            this._imageryLayers.raise(layer);
        }
    }

    // FDImageryLayersManager.prototype.raiseToTop = function (index) {
    //     if (index > 0 && index < this.length) {
    //         var temp = this._imageryLayersOpts[index];
    //         this._imageryLayersOpts.splice(index, 1);
    //         this._imageryLayersOpts.splice(0, 0, temp);

    //         var layer = this._imageryLayers.get(index);
    //         this._imageryLayers.raiseToTop(layer);
    //     }
    // }

    FDImageryLayersManager.prototype.lower = function (index) {
        if (index > 0 && index < this.length) {
            var temp = this._imageryLayersOpts[index];
            this._imageryLayersOpts[index] = this._imageryLayersOpts[index - 1];
            this._imageryLayersOpts[index - 1] = temp;

            var layer = this._imageryLayers.get(index);
            this._imageryLayers.lower(layer);
        }
    }

    // FDImageryLayersManager.prototype.lowerToBottom = function (index) {
    //     if (index >= 0 && index < this.length - 1) {
    //         var temp = this._imageryLayersOpts[index];
    //         this._imageryLayersOpts.splice(index, 1);
    //         this._imageryLayersOpts.push(temp);
    //         var layer = this._imageryLayers.get(index);
    //         this._imageryLayers.lowerToBottom(layer);
    //     }
    // }

    FDImageryLayersManager.prototype.remove = function (index) {
        if (index >= 0 && index < this.length) {
            this._imageryLayersOpts.splice(index, 1);
            var layer = this._imageryLayers.get(index);
            this._imageryLayers.remove(layer);
        }
    }

    FDImageryLayersManager.prototype.removeAll = function () {
        this._imageryLayersOpts.splice(0, this.length);
        this._imageryLayers.removeAll();
    }

    FDImageryLayersManager.prototype.getAllLayers = function () {
        return FreeDo.clone(this._imageryLayersOpts, true); // 克隆确保不被用户修改原始数据
    }

    // 函数返回值是一个函数，调用该函数即可取消监听
    FDImageryLayersManager.prototype.on = function (listener, scope) {
        // return this._event.addEventListener(listener, scope);
        return this._eventHelper.add(this._event, listener, scope);
    }

    FDImageryLayersManager.prototype.reset = function () {
        this.removeAll();
    }

    FDImageryLayersManager.prototype.dispose = function () {
        this.reset();
        this._eventHelper.removeAll();
    }

    return FDImageryLayersManager;
});


// name : 'Bing Maps Aerial',
// iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/bingAerial.png'),

// creationFunction : function() {
//     return new BingMapsImageryProvider({
//         url : 'https://dev.virtualearth.net',
//         mapStyle : BingMapsStyle.AERIAL
//     });
// }



// name : 'Bing Maps Aerial with Labels',
// iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/bingAerialLabels.png'),

// creationFunction : function() {
//     return new BingMapsImageryProvider({
//         url : 'https://dev.virtualearth.net',
//         mapStyle : BingMapsStyle.AERIAL_WITH_LABELS



// name : 'Bing Maps Roads',
// iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/bingRoads.png'),

// creationFunction : function() {
//     return new BingMapsImageryProvider({
//         url : 'https://dev.virtualearth.net',
//         mapStyle : BingMapsStyle.ROAD


// name: 'Mapbox Satellite',
// tooltip: 'Mapbox satellite imagery https://www.mapbox.com/maps/',

// creationFunction: function() {
//     return new MapboxImageryProvider({
//         mapId: 'mapbox.satellite'


// name: 'Mapbox Streets',
// tooltip: 'Mapbox streets imagery https://www.mapbox.com/maps/',

// creationFunction: function() {
//     return new MapboxImageryProvider({
//         mapId: 'mapbox.streets'


// name: 'Mapbox Streets Classic',
// tooltip: 'Mapbox streets basic imagery https://www.mapbox.com/maps/',

// creationFunction: function() {
//     return new MapboxImageryProvider({
//         mapId: 'mapbox.streets-basic'


// name : 'ESRI World Imagery',
// iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/esriWorldImagery.png'),

// creationFunction : function() {
//     return new ArcGisMapServerImageryProvider({
//         url : 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
//         enablePickFeatures : false


// name : 'ESRI World Street Map',
// iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/esriWorldStreetMap.png'),

// creationFunction : function() {
//     return new ArcGisMapServerImageryProvider({
//         url : 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer',
//         enablePickFeatures : false




// name : 'ESRI National Geographic',
// iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/esriNationalGeographic.png'),

// creationFunction : function() {
//     return new ArcGisMapServerImageryProvider({
//         url : 'https://services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/',
//         enablePickFeatures : false

// name : 'Open\u00adStreet\u00adMap',
// iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/openStreetMap.png'),

// creationFunction : function() {
//     return createOpenStreetMapImageryProvider({
//         url : 'https://a.tile.openstreetmap.org/'


// name : 'Stamen Watercolor',
// iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/stamenWatercolor.png'),

// creationFunction : function() {
//     return createOpenStreetMapImageryProvider({
//         url : 'https://stamen-tiles.a.ssl.fastly.net/watercolor/',
//         credit : 'Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under CC BY SA.'


// name : 'Stamen Toner',
// iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/stamenToner.png'),
// creationFunction : function() {
//     return createOpenStreetMapImageryProvider({
//         url : 'https://stamen-tiles.a.ssl.fastly.net/toner/',
//         credit : 'Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under CC BY SA.'


// name : 'The Black Marble',
// iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/blackMarble.png'),

// creationFunction : function() {
//     return createTileMapServiceImageryProvider({
//         url : 'https://cesiumjs.org/blackmarble',
//         flipXY : true,
//         credit : 'Black Marble imagery courtesy NASA Earth Observatory'


// name : 'Natural Earth\u00a0II',
// iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/naturalEarthII.png'),

// creationFunction : function() {
//     return createTileMapServiceImageryProvider({
//         url : buildModuleUrl('Assets/Textures/NaturalEarthII')