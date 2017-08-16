/*global define*/
define([
    './FDMisc',
    './FDCamera',
    './FDSceneManager',
    './FDViewpointsManager2',
    // './FDLabelsManager', webpack执行时会报错，暂时注释
    './FDAnalysisManager',
    './FDRemoteCollaboration',
    './FDImageryLayersManager',
    './FDVR',
    './FDTerrain',
    './FDLabelPointsManager',
	'./FDFlyCircle',
], function (
    FDMisc,
    FDCamera,
    FDSceneManager,
    FDViewpointsManager,
    // FDLabelsManager,
    FDAnalysisManager,
    FDRemoteCollaboration,
    FDImageryLayersManager,
    FDVR,
    FDTerrain,
    FDLabelPointsManager,
	FDFlyCircle) {
    'use strict';

    /**
     * FdProject是项目类，用来管理和项目相关的所有信息，包含场景数据管理器、影像图层管理器、标签管理器等等多个入口信息
     * 用户不需要自行new出该类，而是需要从FdApp类中获取
     *
     * @alias FdProject
     * @constructor
     * 
     */
    function FDProject(viewer) {
        this._viewer = viewer;
        this._camera = new FDCamera(this._viewer.camera);
        this._options = {};
        this._options.projectInfo = FreeDo.clone(FDProject.defaultProjectOptions.projectInfo, true);

        this._event = new FreeDo.Event();
        this._eventHelper = new FreeDo.EventHelper();

        // sceneManager
        this._sceneManager = new FDSceneManager(this);
        this._viewpointsManager = new FDViewpointsManager(this);
        // this._viewportsManager = new FDViewpointsManager(this);
        // this._labelsManager = new FDLabelsManager(this);
        this._remoteCollaboration = new FDRemoteCollaboration(this);
        this._analysisManager = new FDAnalysisManager(this);
        this._imageryLayersManager = new FDImageryLayersManager(this);
        this._labelPointsManager = new FDLabelPointsManager(this);
        this._fdVR = new FDVR(this);
        this._fdTerrain = new FDTerrain(this);
		this._fdFlyCircle = new FDFlyCircle(this);

        //this._addBaseDefualtImageryLayer();
    }

    // 默认的项目配置信息
    FDProject.defaultProjectOptions = {
        projectInfo: {
            name: undefined, // 项目名称
            owner: undefined, // 项目所有者 userid
            initialCameraInfo: {
                "manualSet": false, // 是否手动设置
            }
        },
        sceneObjects: {},
        viewpoints: {},
        labels: {}
    }

    // 项目的属性信息
    Object.defineProperties(FDProject.prototype, {
        /**
         * 设置和获取项目名称
         * @memberof FdProject.prototype
         * @type {string}
         */
        name: {
            get: function () {
                return this._options.projectInfo.name;
            },
            set: function (value) {
                if (this._options.projectInfo.name !== value) {
                    this._options.projectInfo.name = value;
                    this._event.raiseEvent("projectInfoChanged");
                }
            }
        },
        /**
         * 设置和获取项目所有者
         * 
         * @memberof FdProject.prototype
         * @type {String}
         * @private
         */
        owner: {
            get: function () {
                return this._options.projectInfo.owner;
            },
            set: function (value) {
                if (this._options.projectInfo.owner !== value) {
                    this._options.projectInfo.owner = value;
                    this._event.raiseEvent("projectInfoChanged");
                }
            }
        },
        public: {
            get: function () {
                return this._options.projectInfo.public;
            },
            set: function (value) {
                if (this._options.projectInfo.public !== value) {
                    this._options.projectInfo.public = value;
                    this._event.raiseEvent("projectInfoChanged");
                }
            }
        },
        /**
         * 设置和获取项目的初始相机信息
         * 改参数设置以后，首次打开项目时，会自动飞入该方位
         * 
         * @memberof FdProject.prototype
         * @type {string}
         * @private
         */
        initialCameraInfo: {
            get: function () {
                return FreeDo.clone(this._options.projectInfo.initialCameraInfo, true);
            },
            set: function (value) {
                if (!_.isEqual(this._options.projectInfo.initialCameraInfo, value)) {
                    this._options.projectInfo.initialCameraInfo = _.clone(value, true);
                    this._event.raiseEvent("projectInfoChanged");
                }
            }
        },
        projectInfo: {
            get: function () {
                return FreeDo.clone(this._options.projectInfo, true);
            },
            set: function (value) {
                if (!_.isEqual(value, this._options.projectInfo)) {
                    // TODO这个地方可能需要做一下判断，避免写入错误的数据
                    this._options.projectInfo = FreeDo.clone(value, true);
                    this._event.raiseEvent("projectInfoChanged");
                }
            }
        },
    });

    FDProject.prototype._addBaseDefualtImageryLayer = function () {
        var imageLayerOptions = {
            name: "NaturalEarthII",
            type: "TileMapService",
            layerOption: {
                show: true,
                alpha: 0.8
            },
            providerOptions: {
                // url: FreeDo.buildModuleUrl('Assets/Textures/NaturalEarthII')
                // url: "http://freedo.tech:9999/txf/170626/FreeDo/Assets/Textures/NaturalEarthII"
                url: "http://gbim360.com:9999/txf/170626/FreeDo/Assets/Textures/NaturalEarthII"
            }
        }
        var imageryLayersManager = this.getImageryLayersManager();
        imageryLayersManager.add(imageLayerOptions);

        // var imageLayerOptions = {
        //     name: "资源三号卫星影像",
        //     type: "WMTS",
        //     layerOption: {
        //         show: true,
        //         alpha: 0.8
        //     },
        //     providerOptions: {
        //         url: "http://192.168.30.50:7090/rest/wmts/",
        //         layer: "资源三号卫星影像",
        //         style: "default",
        //         format: "tiles",
        //         tileMatrixSetID: "资源三号卫星影像",
        //         // credit: new FreeDo.Credit("FreeDo全球影像服务"),
        //         minimumLevel: 0,
        //         maximumLevel: 18,
        //         tilingScheme: "Geographic"
        //     }
        // }
        // var imageryLayersManager = this.getImageryLayersManager();
        // imageryLayersManager.add(imageLayerOptions);
    }


    /**
     * 获取当前项目的底层Viewer信息，用于底层方法调用
     *
     * @returns {Freedo.Viewer} 返回Freedo.Viewer类
     */
    FDProject.prototype.getViewer = function () {
        return this._viewer;
    }

    // Deprecated !!!
    FDProject.prototype.getCurrentCameraInfo = function () {
        return this._camera.getCurrentCameraInfo();
    }

    // Deprecated !!!
    FDProject.prototype.flytoByCameraInfo = function (cameraInfo, options) {
        return this._camera.flytoByCameraInfo(cameraInfo, options);
    }

    /**
     * 获取当前项目的Camera，Camera提供了相机相关操作。
     *
     * @returns {FdCamera} 返回FdCamera
     */
    FDProject.prototype.getCamera = function () {
        return this._camera;
    }

    FDProject.prototype.getOptions = function () {
        return FreeDo.clone(this._options, true);
    }

    FDProject.prototype.open = function (projectOptions) {
        // this.reset();

        // projectInfo 
        this._options.projectInfo = FreeDo.clone(projectOptions.projectInfo, true);
        this._event.raiseEvent("projectInfoChanged");

        // sceneManager
        var sceneObjectsOptions = projectOptions.sceneObjects;
        if (typeof sceneObjectsOptions !== "undefined") {
            for (var sceneOptKey in sceneObjectsOptions) {
                var sceneOpt = sceneObjectsOptions[sceneOptKey];
                this._sceneManager.addSceneObject(sceneOpt.name, sceneOpt.type, sceneOpt.options);
            }
        }

        // viewpointsManager
        var viewpointsOptions = projectOptions.viewpoints;
        if (typeof viewpointsOptions !== "undefined") {
            for (var vpGroupID in viewpointsOptions) {
                var vpGroup = viewpointsOptions[vpGroupID];

                this._viewpointsManager.createGroup(vpGroup.name, vpGroupID);

                if (typeof vpGroup.list !== "undefined") {
                    var vpl = vpGroup.list;
                    for (var i = 0; i < vpl.length; ++i) {
                        this._viewpointsManager.appendViewpoint(vpGroupID, vpl[i]);
                    }
                }
            }
        }

        // imageryLayersManager
        var imageryLayersOptions = projectOptions.imageryLayers;
        if (typeof imageryLayersOptions !== "undefined") {
            this._imageryLayersManager.removeAll();

            for (var i = 0; i < imageryLayersOptions.length; ++i) {
                this._imageryLayersManager.add(imageryLayersOptions[i]);
            }
        }

        // labelPointsManager
        var labelPointsOptions = projectOptions.labelPoints;
        if (typeof labelPointsOptions !== "undefined") {
            this._labelPointsManager.removeAllLabelPoints();

            for (var labelPoint in labelPointsOptions) {
                this._labelPointsManager.addLabelPoint(labelPointsOptions[labelPoint]);
            }
        }
    }

    /**
     * 重置所有资源，但是不包括事件监听者。如果需要清除事件监听者，可以在调用reset之后，再调用clearAllEventListeners函数
     */
    FDProject.prototype.reset = function () {
        this._options.projectInfo = FreeDo.clone(FDProject.defaultProjectOptions.projectInfo, true);
        this._event.raiseEvent("projectInfoChanged");
        this._remoteCollaboration.reset();
        this._sceneManager.reset();
        this._viewpointsManager.reset();
        this._analysisManager.reset();
        this._imageryLayersManager.reset();
        this._labelPointsManager.reset();

        this._addBaseDefualtImageryLayer();
    }

    /**
     * 注册捕捉Project类的回调函数
     * @param {Function} listener 当有事件触发时被执行的函数，project的事件类型只有“projectInfoChanged”一种。
     * @param {Object} [scope] listener函数执行时的绑定的对象
     * @returns {Freedo.Event~RemoveCallback} 返回一个函数，调用该函数可以取消监听
     */ 
    FDProject.prototype.on = function (listener, scope) {
        // return this._event.addEventListener(listener, scope);
        return this._eventHelper.add(this._event, listener, scope);
    }

    /**
     * 清除掉所有的事件监听者
     */
    FDProject.prototype.clearAllEventListeners = function () {
        this._eventHelper.removeAll();
    }

    FDProject.prototype.dispose = function () {
        // 销毁所有内容
        this._sceneManager.dispose();
        this._viewpointsManager.dispose();
        this._labelsManager.dispose();
        this._remoteCollaboration.dispose();
        this._viewer.destroy();
        this._imageryLayersManager.dispose();
        this._labelPointsManager.dispose();
        this._eventHelper.removeAll();
    }

    /**
     * 获取场景管理器
     * @returns {FdSceneManager}
     */
    FDProject.prototype.getSceneManager = function () {
        return this._sceneManager;
    }

    /**
     * 获取视点组管理器
     * @returns {FdViewpointsManager}
     */
    FDProject.prototype.getViewpointsManager = function () {
        return this._viewpointsManager;
    }

    /**
     * 获取视点组管理器
     * @returns {FdRemoteCollaboration}
     */
    FDProject.prototype.getRemoteCollaboration = function () {
        return this._remoteCollaboration;
    }

    /**
     * 获取分析管理器，该管理器包含测量等分析功能
     * 
     * @returns {FdAnalysisManager}
     */
    FDProject.prototype.getAnalysisManager = function () {
        return this._analysisManager;
    }

    /**
     * 获取影像图层管理器
     * @returns {FdImageryLayersManager}
     * @private
     */
    FDProject.prototype.getImageryLayersManager = function () {
        return this._imageryLayersManager;
    }

    /**
     * 获取标签管理器
     * @returns {FdLabelPointsManager}
     */
    FDProject.prototype.getLabelPointsManager = function () {
        return this._labelPointsManager;
    }

    /**
     * 获取VR管理器
     * @returns {FdVR}
     */
    FDProject.prototype.getVR = function () {
        return this._fdVR;
    }

    /**
     * 获取地形高程管理器
     * @returns {FdTerrain}
     */
    FDProject.prototype.getTerrain = function () {
        return this._fdTerrain;
    }
	
	FDProject.prototype.getFDFlyCircle = function () {
        return this._fdFlyCircle;
    }

    // MISC
    FDProject.staticTempPickCartographic = new FreeDo.Cartographic();
    FDProject.staticTempPickPosition = new FreeDo.Cartesian3();

    /**
     * 根据窗口坐标，返回三维空间中求交上的坐标位置
     * 
     * @param {Object} windowPosition 传入一个窗口的坐标。
     * @param {number} windowPosition.x 窗口的x坐标
     * @param {number} windowPosition.y 窗口的y坐标
     * @param {Array} [worldPosition] 传入一个放入最终结果的数组。
     * @returns {Array} 返回结果数组。第一个分量表示经度，第二个分量表示纬度，第三个分量表示高度。前两个分量以度为单位，后一个以米为单位。
     */
    FDProject.prototype.pickPosition = function (windowPosition, worldPosition) {
        if (typeof worldPosition === "undefined") {
            worldPosition = [];
        }

        var cartesian;
        if (this._viewer.scene.pickPositionSupported) {
            var cartesian = this._viewer.scene.pickPosition(windowPosition, FDProject.staticTempPickPosition);
        } else {
            cartesian = this._viewer.camera.pickEllipsoid(windowPosition, this._viewer.scene.globe.ellipsoid);
        }

        var carto = FreeDo.Cartographic.fromCartesian(cartesian, this._viewer.scene.globe.ellipsoid, FDProject.staticTempPickCartographic);

        var td = FreeDo.Math.toDegrees;
        worldPosition[0] = td(carto.longitude);
        worldPosition[1] = td(carto.latitude);
        worldPosition[2] = carto.height;
        return worldPosition;
    }

    return FDProject;
});