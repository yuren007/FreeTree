/*global define*/
define([
    'FreedoX/FreedoX',
    './fdmodel',
], function (
    FreedoX,
    FDModel) {
    'use strict';
    var FDApp = Freedo.FdApp;
    var FDProject = Freedo.FdProject;
    var FDSceneManager = Freedo.FdSceneManager;
    var FDViewpointsManager = Freedo.FdViewpointsManager;
    var FDLabelPointsManager = Freedo.FdLabelPointsManager;
    var FDImageryLayersManager = Freedo.FdImageryLayersManager;
    var FDLabelsManager = Freedo.FDLabelsManager;

    function FDController() {
        this._ui = null;

        this._currentProject = null;
        this._currentProjectID = "";

        this._currentViewpointsGroupID = "";
        this._currentViewpointIndex = -1;
        this._autoShowClose = true;

        this._fdModel = new FDModel();
        this._fdModel.init();
        this._currentCameraInfo = [0, 0, 0, 0, 0, 0];
        this.screenSpaceEventHandler = null;
        this._is_PC = true;

        this._fdLabelPointIDs = [];

        this._projectOptionsChanged = false; // 用来决定是否要往服务器推送数据（保存）
    }

    FDController.prototype.create = function (container, ui) {
        var fdProject = FDApp.createProject(container, {});
        this._currentProject = fdProject;
        this.screenSpaceEventHandler = new FreeDo.ScreenSpaceEventHandler(this._currentProject.getViewer().canvas);
        this._ui = ui;
        this._register();
        this.createProject();
        this.flyToPosition();
    }

    FDController.prototype.destroy = function () {
        FDApp.destroy(this._currentProject);
        this._currentProject = null;
        this._ui = null;
        this._fdModel.dispose();
    }

    FDController.prototype.checkUA = function () {
        var UA = navigator.userAgent;
        var Agents = ["Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod"];
        var is_PC = true;
        for (var i = 0; i < Agents.length; i++) {
            if (UA.indexOf(Agents[i]) > 0) {
                is_PC = false;
                break;
            }
        }
        this._is_PC = is_PC;
        return is_PC;
    }

    FDController.prototype.flyToPosition = function () {
        var url = location.search; //获取url中"?"符后的字串 
        var theRequest = new Object();
        if (url.indexOf("?") != -1) {
            var str = url.substr(1);
            var strs = str.split("&");
            for(var i = 0; i < strs.length; i ++) {
                theRequest[strs[i].split("=")[0]]=unescape(strs[i].split("=")[1]); 
            }
        }
        if(theRequest.menu){
            this._ui.defaultMenu = theRequest.menu;
        }
        if(theRequest.viewer){
            var view = theRequest.viewer;
            var splitQuery = view.split(/[ ,]+/);
            if (splitQuery.length > 1) {
                var longitude = !isNaN(+splitQuery[0]) ? +splitQuery[0] : 0.0;
                var latitude = !isNaN(+splitQuery[1]) ? +splitQuery[1] : 0.0;
                var height = ((splitQuery.length > 2) && (!isNaN(+splitQuery[2]))) ? +splitQuery[2] : 300.0;
                this._currentProject.getViewer().camera.setView({
                    destination: FreeDo.Rectangle.fromDegrees(longitude, latitude, height)
                });
            }
        }
    }

    /////////////////////////////////////////////////
    // 登录相关操作
    // 登入
    FDController.prototype.signin = function (user, password) {
        return this._fdModel.signin(user, password);
    }

    // 登出
    FDController.prototype.signout = function () {
        this._fdModel.signout();
    }

    // 如果没有登录用户，则返回空字符串
    FDController.prototype.getCurrentUserName = function () {
        return this._fdModel.getUser();
    }

    ///////////////////////////////////////////////
    // 项目相关操作
    FDController.prototype.createProject = function () {
        this._currentProjectID = FreeDo.createGuid();
        this._ui.currentProjectID = this._currentProjectID;
        this._currentProject.reset();
        this._currentProject.name = "未命名项目";
        this._currentProject.owner = this._fdModel.getCurrentUserName();
        this._projectOptionsChanged = false;
    }

    FDController.prototype.deleteProject = function () {
        if (this._currentProject.owner === this.getCurrentUserName()) {
            this._fdModel.deleteProject(this._currentProjectID);
            this.closeProject();
            return true;
        } else {
            console.log("cannot delete!!!");
            return false;
        }
    }

    FDController.prototype.openProject = function (projectID, callback) {
        //var projectOpt = this._projects[projectID];
        //var projectOpt = this._fdModel.getProjectOptions(projectID);
        var that = this;
        this._fdModel.getProjectOptionsAsync(projectID, function (projectOpt) {
            if (typeof (projectOpt) === "undefined") {
                return;
            }

            if (typeof that._currentProject !== "undefined") {
                that.closeProject();
            }

            that._currentProjectID = projectID;
            that._currentProject.open(projectOpt);

            if (projectOpt.projectInfo.initialCameraInfo.manualSet) {
                var cam = projectOpt.projectInfo.initialCameraInfo.cameraInfo;
                var currentProject = that._currentProject;
                setTimeout(function () {
                    currentProject.flytoByCameraInfo(cam);
                }, 1000);
            } else {
                var sceneManager = that._currentProject.getSceneManager();
                var sos = sceneManager.getAllSceneObjects();
                for (var sokey in sos) {
                    var pModel = sceneManager.getSceneObject(sokey);
                    var viewer = that._currentProject.getViewer();
                    pModel.readyPromise.then(function (pModel) {
                        setTimeout(function () {
                            var boundingSphere = pModel.boundingSphere;
                            viewer.camera.flyToBoundingSphere(boundingSphere, {
                                offset: new FreeDo.HeadingPitchRange(-0.7, -0.7, boundingSphere.radius * 5.0),
                                duration: 6.0,
                            });
                            // viewer.camera.lookAtTransform(FreeDo.Matrix4.IDENTITY);
                        }, 1000);
                    });
                    break;
                }
            }

            callback();
        });
    }

    FDController.prototype.saveProject = function () {
        // 当前用户存在则可保存
        if (this.getCurrentUserName() !== "") {
            // 如果项目是匿名的，则直接转移过来
            if (this._currentProject.owner === "") {
                this._currentProject.owner = this.getCurrentUserName();
            }

            if (this._currentProject.owner === this.getCurrentUserName() && this._projectOptionsChanged) {
                var opt = this._currentProject.getOptions();
                this._fdModel.saveProject(this._currentProjectID, opt);
                this._projectOptionsChanged = false;
                return true;
            } else {
                return false;
            }
        } else {
            console.log("cannot save!!!");
            return false;
        }
    }

    FDController.prototype.closeProject = function () {
        if (typeof (this._currentProject) === "undefined") {
            alert("当前没有打开的项目！");
        }
        // this._currentProjectID = FreeDo.createGuid();
        // this._ui.currentProjectID = this._currentProjectID;
        // this._currentProject.reset();

        this.createProject();
    }

    FDController.prototype.flytoGlobe = function () {
        this._currentProject.getViewer().camera.flyHome();
    }

    FDController.prototype.setCurrentProjectInfo = function (projectInfo) {
        this._currentProject.projectInfo = FreeDo.clone(projectInfo, true);
    }

    FDController.prototype.resetInitialCameraInfo = function () {
        var initialCameraInfo = this._currentProject.initialCameraInfo;
        initialCameraInfo.cameraInfo = this.getCurrentCameraInfo();
        this._currentProject.initialCameraInfo = initialCameraInfo;
    }

    FDController.prototype.flytoInitialCameraInfo = function () {
        var initialCameraInfo = this._currentProject.initialCameraInfo;
        this._currentProject.flytoByCameraInfo(initialCameraInfo.cameraInfo);
    }

    ///////////////////////////////////////////////////
    // 场景对象相关操作
    FDController.prototype.getSceneObjUrl = function (sceneObjID) {
        var sceneManager = this._currentProject.getSceneManager();
        return sceneManager.getSceneObjectProperty(sceneObjID, "url");
    }

    FDController.prototype.showSceneObject = function (sceneObjectID, show, temporary) {
        var sceneManager = this._currentProject.getSceneManager();
        if (temporary) {
            var sceneObj = sceneManager.getSceneObject(sceneObjectID);
            if (sceneObj["show"] != show) {
                sceneObj["show"] = show;
            }
        } else {
            sceneManager.setSceneObjectProperty(sceneObjectID, "show", show);
        }
    }

    FDController.prototype.isSceneObjectVisible = function (sceneObjectID) {
        var sceneManager = this._currentProject.getSceneManager();
        //return sceneManager.getSceneObjectProperty(sceneObjectID, "show");
        var sceneObj = sceneManager.getSceneObject(sceneObjectID);
        return sceneObj["show"];
    }

    FDController.prototype.addSceneObj = function (name, url, maximumScreenSpaceError) {
        var sceneManager = this._currentProject.getSceneManager();
        sceneManager.addSceneObject(name, "PModel", {
            url: url,
            show: true,
            maximumScreenSpaceError: maximumScreenSpaceError
        });
    }

    FDController.prototype.deleteSceneObj = function (sceneObjID) {
        var sceneManager = this._currentProject.getSceneManager();
        sceneManager.removeSceneObject(sceneObjID);
    }

    FDController.prototype.flytoSceneObj = function (sceneObjID) {
        var sceneManager = this._currentProject.getSceneManager();
        sceneManager.flyto(sceneObjID);
    }

    FDController.prototype.setMaximumScreenSpaceError = function (sceneObjID, value) {
        var sceneManager = this._currentProject.getSceneManager();
        sceneManager.setSceneObjectProperty(sceneObjID, "maximumScreenSpaceError", value);
    }

    FDController.prototype.getMaximumScreenSpaceError = function (sceneObjID) {
        var sceneManager = this._currentProject.getSceneManager();
        return sceneManager.getSceneObjectProperty(sceneObjID, "maximumScreenSpaceError");
    }

    FDController.prototype.resetAllSceneObjectsProperty = function () {
        var sceneManager = this._currentProject.getSceneManager();
        sceneManager.resetAllSceneObjectsProperty();
    }

    FDController.prototype.getXMLData = function (id) {
        var xmlData = this._fdModel.getXMLData(id);
        return xmlData;
    }

    ///////////////////////////////////////////////////
    // 远程协作相关
    FDController.prototype.setCollaborationNumber = function (number) {
        var remoteCollaboration = this._currentProject.getRemoteCollaboration();
        remoteCollaboration.setCollaborationNumber(number);
    }

    ///////////////////////////////////////////////////
    // Analysis
    FDController.prototype.setAnalysisMode = function (mode) {

        var analysisManager = this._currentProject.getAnalysisManager();
        analysisManager.setMode(mode);
        if (!this._is_PC) {
            if (mode != 'CANCEL') {
                var selectComponentEventType = FreeDo.ScreenSpaceEventType.LEFT_CLICK
                this.screenSpaceEventHandler.removeInputAction(selectComponentEventType);
            } else {
                this.selectComponent();
            }
        }
    }

    ///////////////////////////////////////////////////
    // 视点组相关操作
    FDController.prototype.addViewpointsGroup = function (name) {
        var vpManager = this._currentProject.getViewpointsManager();
        var vpGroupID = vpManager.createGroup(name);
    }

    FDController.prototype.deleteViewpointsGroup = function (groupID) {
        var vpManager = this._currentProject.getViewpointsManager();
        vpManager.removeGroup(groupID);
    }

    FDController.prototype.playCurrentViewpointsGroup = function () {
        var vpManager = this._currentProject.getViewpointsManager();
        vpManager.startOrResumeGroup(this._currentViewpointsGroupID, this._currentViewpointIndex);
        this._autoShowClose = false;
        this._ui.autoShowClose = this._autoShowClose;
    }

    FDController.prototype.pauseCurrentViewpointsGroup = function () {
        var vpManager = this._currentProject.getViewpointsManager();
        vpManager.pauseGroup(this._currentViewpointsGroupID);
        this._autoShowClose = true;
        this._ui.autoShowClose = this._autoShowClose;
    }

    FDController.prototype.stopCurrentViewpointsGroup = function () {
        var vpManager = this._currentProject.getViewpointsManager();
        vpManager.stopGroup(this._currentViewpointsGroupID);
        this._autoShowClose = true;
        this._ui.autoShowClose = this._autoShowClose;
    }

    FDController.prototype.setViewpointsPlayingLoop = function (loop) {
        var vpManager = this._currentProject.getViewpointsManager();
        vpManager.playingLoop = loop;
    }

    FDController.prototype.isViewpointsPlayingLoop = function () {
        var vpManager = this._currentProject.getViewpointsManager();
        return vpManager.playingLoop;
    }

    FDController.prototype.setCurrentViewpointGroupID = function (groupID) {
        if (this._currentViewpointsGroupID !== groupID) {
            this._currentViewpointsGroupID = groupID;
            this.viewpointsGroupChanged("CurrentGroupIDChanged");
        }
    }

    FDController.prototype.getViewpointsGroupName = function (groupID) {
        var vpManager = this._currentProject.getViewpointsManager();
        return vpManager.getGroupName(groupID);
    }

    FDController.prototype.addViewpoint = function () {
        var vpManager = this._currentProject.getViewpointsManager();
        vpManager.appendViewpoint(this._currentViewpointsGroupID, {
            name: "",
            cameraInfo: this.getCurrentCameraInfo()
        });
    }

    FDController.prototype.deleteViewpoint = function (index) {
        var vpManager = this._currentProject.getViewpointsManager();
        vpManager.removeViewpoint(this._currentViewpointsGroupID, index);
    }

    FDController.prototype.setCurrentViewpointIndex = function (index) {
        if (this._currentViewpointIndex !== index) {
            this._currentViewpointIndex = index;
            this.viewpointsGroupChanged("CurrentIndexChanged");
        }
    }

    FDController.prototype.flytoViewpoint = function (index) {
        var vpManager = this._currentProject.getViewpointsManager();
        vpManager.flyto(this._currentViewpointsGroupID, index);
    }

    FDController.prototype.gotoViewpoint = function (index) {
        var vpManager = this._currentProject.getViewpointsManager();
        vpManager.goto(this._currentViewpointsGroupID, index);
        this.setCurrentViewpointIndex(index);
    }

    ///////////////////////////////////////////////////
    // 影像图层
    FDController.prototype.getImageryLayer = function () {
        this._ui.imageryLayersLists = this._fdModel.getImageLayers();
    }

    FDController.prototype.addImagerLayer = function (imageLayerOptions) {
        if (typeof imageLayerOptions === "undefined") {
            imageLayerOptions = {
                "name": "The Black Marble",
                "type": "TileMapService",
                "iconUrl": "http://gbim360.com:9999/txf/170626/FreeDo/Widgets/Images/ImageryProviders/blackMarble.png",
                "providerOptions": {
                    "url": "https://cesiumjs.org/blackmarble",
                    "flipXY": true
                }
            };
        }
        var imageryLayersManager = this._currentProject.getImageryLayersManager();
        imageryLayersManager.add(imageLayerOptions);
    }

    FDController.prototype.getImageryLayerUrl = function (index) {
        var imageryLayersManager = this._currentProject.getImageryLayersManager();
        return imageryLayersManager.getLayerProperty(index, "iconUrl");
    }

    FDController.prototype.deleteImageryLayer = function (index) {
        var imageryLayersManager = this._currentProject.getImageryLayersManager();
        imageryLayersManager.remove(index);
    }

    FDController.prototype.showImageryLayer = function (index, show) {
        var imageryLayersManager = this._currentProject.getImageryLayersManager();
        imageryLayersManager.setLayerProperty(index, "show", show);
    }

    FDController.prototype.alphaImageryLayer = function (index, alpha) {
        var imageryLayersManager = this._currentProject.getImageryLayersManager();
        imageryLayersManager.setLayerProperty(index, "alpha", alpha);
    }

    FDController.prototype.raiseImageryLayer = function (index) {
        var imageryLayersManager = this._currentProject.getImageryLayersManager();
        imageryLayersManager.raise(index);
    }

    FDController.prototype.lowerImageryLayer = function (index) {
        var imageryLayersManager = this._currentProject.getImageryLayersManager();
        imageryLayersManager.lower(index);
    }
    ///////////////////////////////////////////////////
    // 标签相关
    // FDController.prototype.addLabel = function (options) {
    //     var labelPointsManager = this._currentProject.getLabelPointsManager();
    //     labelPointsManager.addLabelPoint({
    //         position: [119, 40, 100],
    //         pixelSize: 5,
    //         tags: ["dd"],
    //         distanceDisplayCondition: [0, 1500000000],
    //     });
    // }


    // labelPointTags: [],
    // activedLabelPointTags: [],
    // labelPoints: [],

    // FDController.prototype.actvieLabelPointTag = function (tag) {
    //     var index = this._ui.activedLabelPointTags.indexOf(tag);
    //     if (-1 === index) {
    //         this._ui.activedLabelPointTags.push(tag);
    //         this.updateLabelPoints();
    //     }
    // }

    // FDController.prototype.unactiveLabelPointTag = function (tag) {
    //     var index = this._ui.activedLabelPointTags.indexOf(tag);
    //     if (-1 !== index) {
    //         this._ui.activedLabelPointTags.splice(index, 1);
    //     }
    //     this.updateLabelPoints();
    // }

    // FDController.prototype.unactiveAllLabelPointTags = function () {
    //     this._ui.activedLabelPointTags.splice(0, this._ui.activedLabelPointTags.length);
    //     this.updateLabelPoints();
    // }

    // FDController.staticTempLabelPointOption = {};
    // FDController.prototype.updateLabelPoints = function () {
    //     var labelPointsManager = this._currentProject.getLabelPointsManager();
    //     var stlo = FDController.staticTempLabelPointOption;

    //     labelPointsManager.getLabelPointIDsByTags(this._ui.activedLabelPointTags, this._fdLabelPointIDs);
    //     this._ui.labelPoints.splice(0, this._ui.labelPoints.length);

    //     for (var i = 0; i < this._fdLabelPointIDs.length; ++i) {
    //         var labelPointID = this._fdLabelPointIDs[i];
    //         var uilp = {};
    //         labelPointsManager.getLabelPointOptions(labelPointID, stlo);
    //         uilp.id = labelPointID;
    //         uilp.name = stlo.name;
    //         uilp.occuludedDisabled = stlo.occuludedDisabled;
    //         this._ui.labelPoints[i] = uilp;
    //     }

    //     labelPointsManager.enableLabelPointsByTagsAndDisableOthers(this._ui.activedLabelPointTags);
    // }

    FDController.prototype.enableLabelPoint = function (labelPointID) {
        var labelPointsManager = this._currentProject.getLabelPointsManager();
        if (labelPointsManager.hasLabelPoint(labelPointID)) {
            var enabled = labelPointsManager.isLabelPointEnabled(labelPointID);
            labelPointsManager.enableLablePoint(labelPointID, !enabled);
        }
    }

    FDController.prototype.deleteLabelPoint = function (labelPointID) {
        var labelPointsManager = this._currentProject.getLabelPointsManager();
        if (labelPointsManager.hasLabelPoint(labelPointID)) {
            labelPointsManager.removeLabelPoint(labelPointID);
        }
    }

    ///////////////////////////////////////////////////
    // 事件回调集合
    FDController.prototype.userChanged = function () {
        var ownersProjectInfos = this._fdModel.getOwnersProjectsInfos();
        // 先清空之前的项目
        this._ui.ownersProjects.splice(0, this._ui.ownersProjects.length);
        // 再重新添加所有项目
        for (var projectID in ownersProjectInfos) {
            this._ui.ownersProjects.push({
                id: projectID,
                projectInfo: ownersProjectInfos[projectID]
            })
            console.log('project: ', ownersProjectInfos[projectID].name);
        }

        var othersPublicProjectInfos = this._fdModel.getOthersPublicProjectsInfos();
        // 先清空之前的项目
        this._ui.othersPublicProjects.splice(0, this._ui.othersPublicProjects.length);
        // 再重新添加所有项目
        for (var projectID in othersPublicProjectInfos) {
            this._ui.othersPublicProjects.push({
                id: projectID,
                projectInfo: othersPublicProjectInfos[projectID]
            })
            console.log('othersPublicProject: ', othersPublicProjectInfos[projectID].name);
        }

        this._currentViewpointsGroupID = "";
        this._currentViewpointIndex = -1;

        // 如果当前项目是别人的私有项目需要关闭！如果是匿名项目则不需要关闭。
        var owner = this.getCurrentUserName();
        if (this._currentProject.owner !== "" && this._currentProject.owner !== owner && !this._currentProject.public) {
            this.closeProject();
        }
        // this._currentProjectID = FreeDo.createGuid();
        // this._ui.currentProjectID = this._currentProjectID;
        // this._currentProject.owner = this._fdModel.getCurrentUserName();
    }

    FDController.prototype.projectInfoChanged = function () {
        this._ui.projectInfo = FreeDo.clone(this._currentProject.getOptions().projectInfo, true);
        this._projectOptionsChanged = true;
    }

    FDController.prototype.sceneObjectsChanged = function () {
        var sceneManager = this._currentProject.getSceneManager();

        var sceneObjs = [];
        var sos = sceneManager.getAllSceneObjects();
        for (var sokey in sos) {
            sceneObjs.push({
                name: sos[sokey].name,
                id: sokey
            });
        }
        sceneObjs.sort(function (a, b) {
            // a.name.localeCompare(b.name);
            if (a.name < b.name) {
                return -1;
            } else if (a.name > b.name) {
                return 1;
            } else {
                return 0;
            }
        })

        var visibleSceneObjs = [];
        for (var i = 0; i < sceneObjs.length; ++i) {
            var sceneObj = sceneObjs[i];
            var show = sceneManager.getSceneObjectProperty(sceneObj.id, "show")
            if (show) {
                visibleSceneObjs.push(sceneObj.id);
            }
        }
        this._ui.visibleSceneObjs = visibleSceneObjs;
        this._ui.sceneObjs = sceneObjs;

        this._projectOptionsChanged = true;
    }

    FDController.prototype._refreshUICurrentViewpoints = function () {
        this._ui.viewpoints.splice(0, this._ui.viewpoints.length);

        var vpManager = this._currentProject.getViewpointsManager();
        var cgid = this._currentViewpointsGroupID;
        if (typeof cgid !== "undefined") {
            var vpl = vpManager.getViewpointsLength(cgid);
            for (var i = 0; i < vpl; ++i) {
                var vpo = vpManager.getViewpoint(cgid, i);
                this._ui.viewpoints.push({
                    index: i,
                    name: vpo.name,
                });
            }
            if (this._currentViewpointIndex >= vpl) {
                this.setCurrentViewpointIndex(-1);
            }
        }
    }

    FDController.prototype.viewpointsGroupChanged = function (eventType, param) {
        if (eventType === "GroupsChanged") {
            var vpManager = this._currentProject.getViewpointsManager();
            var vpgroupids = vpManager.getAllGroupIDs();
            this._ui.viewpointsGroupIDs = vpgroupids;
            var cgid = this._currentViewpointsGroupID;
            if (cgid !== "" && !vpgroupids.includes(cgid)) {
                this.setCurrentViewpointGroupID(undefined);
                this._refreshUICurrentViewpoints();
            }
        } else if (eventType === "GroupChanged" || eventType === "ViewpointChanged") {
            var groupID = param;
            if (this._currentViewpointsGroupID === groupID) {
                this._refreshUICurrentViewpoints();
            }
        } else if (eventType === "CurrentGroupIDChanged") {
            var vpManager = this._currentProject.getViewpointsManager();
            this._ui.currentViewpointsGroupID = this._currentViewpointsGroupID;
            this._ui.currentViewpointsGroupName = vpManager.getGroupName(this._currentViewpointsGroupID);
            this._refreshUICurrentViewpoints();
            this.setCurrentViewpointIndex(-1);
        } else if (eventType === "CurrentIndexChanged") {
            this._ui.currentViewpointIndex = this._currentViewpointIndex;
        } else if (eventType === "PlayingGroupStatusChanged") {
            // do nothing
        } else if (eventType === "PlayingGroupCurrentIndexChanged") {
            this.setCurrentViewpointIndex(param);
        } else if (eventType === "PlayingGroupPropertyChanged") {
            var vpManager = this._currentProject.getViewpointsManager();
            this._ui.viewpointsPlayingLoop = vpManager.playingLoop;
        }
        this._projectOptionsChanged = true;
    }

    FDController.staticTempLabelPointOption = {};
    FDController.staticTempLabelPointIDs = [];
    FDController.prototype.labelPointsChanged = function (eventType, param) {
        //var labelPointsManager = this._currentProject.getLabelPointsManager();
        //labelPointsManager.getAllTags(this._ui.labelPointTags);

        var labelPointsManager = this._currentProject.getLabelPointsManager();
        var stlo = FDController.staticTempLabelPointOption;
        var stlpids = labelPointsManager.getAllLabelPointIDs(FDController.staticTempLabelPointIDs);

        this._ui.labelPoints.splice(0, this._ui.labelPoints.length);
        for (var i = 0; i < stlpids.length; ++i) {
            var labelPointID = stlpids[i];
            var uilp = {};
            labelPointsManager.getLabelPointOptions(labelPointID, stlo);
            uilp.id = labelPointID;
            uilp.name = stlo.name;
            uilp.occuludedDisabled = stlo.occuludedDisabled;
            uilp.enabled = stlo.enabled;
            this._ui.labelPoints[i] = uilp;
        }

        this._projectOptionsChanged = true;
    }

    FDController.prototype.addNewLabel = function (name, position, tags) {
        var labelPointsManager = this._currentProject.getLabelPointsManager();
        labelPointsManager.addLabelPoint({
            position: position,
            pixelSize: 5,
            tags: ["dd"],
            name: name,
            distanceDisplayCondition: [0, 15000000000],
            enabled: true,
        });
    }
    FDController.prototype.handPick = function (type) {
        if(type){
            if(!this._is_PC){ // 如果是手机端 先把手机端的点击事件remove
                var selectComponentEventType = FreeDo.ScreenSpaceEventType.LEFT_CLICK
                this.screenSpaceEventHandler.removeInputAction(selectComponentEventType);
            }
            var inputAction = function (movement) {
                that._ui.newLabelPointPosition = that._currentProject.pickPosition(movement.position);
            }
            var selectComponentEventType = FreeDo.ScreenSpaceEventType.LEFT_CLICK;
            var that = this;
            this.screenSpaceEventHandler.setInputAction(inputAction, selectComponentEventType);
        } else {
            var selectComponentEventType = FreeDo.ScreenSpaceEventType.LEFT_CLICK
            this.screenSpaceEventHandler.removeInputAction(selectComponentEventType);
            this.selectComponent();
        }
    }

    FDController.prototype.imageryLayersChanged = function (eventType, param) {
        var imageryLayersManager = this._currentProject.getImageryLayersManager();

        var layers = this._ui.imageryLayers;
        layers.splice(0, layers.length);
        var allLayersOpts = imageryLayersManager.getAllLayers();
        for (var i = allLayersOpts.length - 1; i >= 0; --i) {
            layers.push({
                name: allLayersOpts[i].name,
                alpha: allLayersOpts[i].layerOption.alpha,
            });
        }
        var visibleLayers = this._ui.visibleImageryLayers;
        var alphaLayers = this._ui.alphaImageryLayers;
        visibleLayers.splice(0, visibleLayers.length);
        alphaLayers.splice(0, alphaLayers.length);
        for (var i = allLayersOpts.length - 1; i >= 0; --i) {
            var layerOpt = allLayersOpts[i];
            var show = imageryLayersManager.getLayerProperty(i, "show");
            var alpha = imageryLayersManager.getLayerProperty(i, "alpha");
            if (show) {
                visibleLayers.push(i);
            }
            alphaLayers.push(alpha);
        }
        this._projectOptionsChanged = true;
    }

    FDController.prototype.currentCameraChange = function (eventType, param) {
        var currentCameraInfo = [];
        this.getCurrentCameraInfo(currentCameraInfo);
        this._ui.currentCameraInfo = currentCameraInfo;
        var inner = document.getElementById('compass');
        var heading = -currentCameraInfo[3] - 45.0;
        inner.style.webkitTransform = 'rotate(' + heading + 'deg)';
        inner.style.MozTransform = 'rotate(' + heading + 'deg)';
        inner.style.msTransform = 'rotate(' + heading + 'deg)';
        inner.style.OTransform = 'rotate(' + heading + 'deg)';
        inner.style.transform = 'rotate(' + heading + 'deg)';
        this._projectOptionsChanged = true;
    }

    FDController.prototype.flyNorth = function () {
        var camera = this._currentProject.getCamera();
        camera.heading = 0;
        // // camera.getCurrentCameraInfo(this._currentCameraInfo);
        // var cameraInfo = _.clone(this._currentCameraInfo);
        // cameraInfo[3] = 0;
        // cameraInfo[5] = 0;
        // camera.flytoByCameraInfo(cameraInfo, {
        //     duration: 0.3
        // });
    }
    // this.currentProject

    FDController.prototype.selectComponent = function (eventType, param) {
        var inputAction = function (movement) {
            that._currentProject.getSceneManager().selectComponent(movement.position, function (componentID, pModelID) {
                if (FreeDo.defined(componentID)) {
                    //that._currentProject.getSceneManager().highlightComponent(componentID, pModelID, 0, 255, 255, 0.5);
                    that._currentProject.getSceneManager().showComponent(componentID, pModelID, false);
                    that._ui.currentSelectedID = componentID;
                } else {
                    that._currentProject.getSceneManager().unhighlightAllComponents();
                    that._currentProject.getSceneManager().showAllComponents();
                    that._ui.currentSelectedID = undefined;
                }
            });
        }

        if (this._is_PC) {
            var selectComponentEventType = FreeDo.ScreenSpaceEventType.LEFT_DOUBLE_CLICK;
            var that = this;
            this.screenSpaceEventHandler.setInputAction(inputAction, selectComponentEventType);
        } else {
            var selectComponentEventType = FreeDo.ScreenSpaceEventType.LEFT_CLICK
            var that = this;
            // 手机端只是点击事件
            this.screenSpaceEventHandler.setInputAction(inputAction, selectComponentEventType);
        }
    }

    FDController.prototype.enableVR = function (enable) {
        this._currentProject.getVR().enableVR(enable);
    }

    FDController.prototype.showTerrain = function (show) {
        this._currentProject.getTerrain().showTerrain(show);
    }
	
	FDController.prototype.flyCircle = function (enable) {
        this._currentProject.getFDFlyCircle().run(enable);
    }

    FDController.prototype._register = function () {
        var that = this;
        this._currentProject.on(function (eventType, param) {
            that.projectInfoChanged();
            that.selectComponent();
        });
        this._currentProject.getSceneManager().on(function (eventType, param) {
            that.sceneObjectsChanged();
        });
        this._currentProject.getViewpointsManager().on(function (eventType, param) {
            that.viewpointsGroupChanged(eventType, param);
        });
        this._currentProject.getLabelPointsManager().on(function (eventType, param) {
            that.labelPointsChanged(eventType, param);
        });
        this._currentProject.getImageryLayersManager().on(function (eventType, param) {
            that.imageryLayersChanged(eventType, param);
        });
        this._currentProject.getCamera().on(FDController.prototype.currentCameraChange, this);

        this._fdModel.on(FDController.prototype.userChanged, this);
    }

    // Misc
    FDController.prototype.getCurrentCameraInfo = function (cameraInfo) {
        cameraInfo = this._currentProject.getCamera().getCurrentCameraInfo(cameraInfo);
        cameraInfo[5] = 0;
        return cameraInfo;
    }

    return FDController;
});