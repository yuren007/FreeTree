/*global define*/
define([
    './FDProject',
], function (
    FDProject) {
    'use strict';

    function OpenStreetMapNominatimGeocoder() {}

    // 获取搜索功能
    OpenStreetMapNominatimGeocoder.prototype.geocode = function (input) {
        var endpoint = 'http://nominatim.openstreetmap.org/search?';
        var query = 'format=json&q=' + input;
        var requestString = endpoint + query;
        return FreeDo.loadJson(requestString)
            .then(function (results) {
                var bboxDegrees;
                return results.map(function (resultObject) {
                    bboxDegrees = resultObject.boundingbox;
                    return {
                        displayName: resultObject.display_name,
                        destination: FreeDo.Rectangle.fromDegrees(
                            bboxDegrees[2],
                            bboxDegrees[0],
                            bboxDegrees[3],
                            bboxDegrees[1]
                        )
                    };
                });
            });
    };

    /**
     * FDApp是整个SDK的入口，通过此类构建项目(FdProject)，再由FdProject类管理所有三维渲染数据。
     * 
     * @alias FdApp
     * @class
     */
    function FDApp() {}

    FDApp.defaultViewerOptions = {
        imageryProvider: FreeDo.createTileMapServiceImageryProvider({
            url: FreeDo.buildModuleUrl('Assets/Textures/NaturalEarthII')
        }),
        baseLayerPicker: false,
        geocoder: new OpenStreetMapNominatimGeocoder(),
        timeline: false,
        animation: false,
        vrButton: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        fullscreenButton: false,
        homeButton: false,
        selectionIndicator: false,
        infoBox: false

        //imageryProviderViewModels: getProviderViewModels()
    };

    FreeDo.Camera.DEFAULT_VIEW_RECTANGLE = FreeDo.Rectangle.fromDegrees(80, 5, 135, 55); // 指定HOME到中国的位置
    FreeDo.BingMapsApi.defaultKey = "AsosOjY68GIcKsRMisb8KcmGD266hYjtDHD5-EC-YTJUHi1Cxj1K3zWhLcp-SPNZ";

    /**
     * 创建一个项目
     *
     * @param {Element|String} viewerContainer 指定用来显示三维渲染窗口的DOM元素或者ID
     * @returns {FdProject} 返回一个新创建的项目
     * 
     */
    FDApp.createProject = function (viewerContainer, viewerOptions) {
        if (typeof viewerOptions === "undefined") {
            viewerOptions = {};
        }
        // viewerOptions = FDApp.defaultViewerOptions;
        // Object.assign(viewerOptions, FDApp.defaultViewerOptions);
        _.assign(viewerOptions, FDApp.defaultViewerOptions);
        var viewer = new FreeDo.Viewer(viewerContainer, viewerOptions);
        viewer._cesiumWidget._creditContainer.style.display = 'none';

        // china topojson
        const topojsonDatasource = new FreeDo.GeoJsonDataSource();
        topojsonDatasource.load('http://freedo.tech:9999/txf/170703/china.topojson', {
            stroke: FreeDo.Color.YELLOW,
            fill: new FreeDo.Color(0, 0, 0, 0),
            strokeWidth: 5,
            markerSymbol: '?'
        }).then(function (dataSource) {
            //Iterate over all entities and set their show property
            //to true only if they are part of the current series.
            var collection = dataSource._entityCollection;
            var entities = collection.values;
            collection.suspendEvents();
            for (var i = 0; i < entities.length; i++) {
                var entity = entities[i];
                //entity.show = value === entity.seriesName;
                entity.polygon.distanceDisplayCondition = new FreeDo.DistanceDisplayCondition(5, 20e7);
            }
            collection.resumeEvents();
        });

        viewer.dataSources.add(topojsonDatasource);

        viewer.scene.globe.depthTestAgainstTerrain = true;

        var project = new FDProject(viewer);
        var geoCoderTextBox = document.getElementsByClassName('cesium-geocoder-input')[0];
        geoCoderTextBox.setAttribute('placeholder', '请输入一个地址或者地标...');
        return project;
    }

    /**
     * 销毁一个项目
     *
     * @param {FdProject} project 指定需要销毁的项目
     */
    FDApp.destroyProject = function (project) {
        project.dispose();
    }

    return FDApp;
});