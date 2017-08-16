/*global define*/
define(function () {
    'use strict';

    /**
     * 标签管理器
     * @alias FdLabelPointsManager
     * @class
     */
    function FDLabelPointsManager(project) {
        // 初始化一个空对象
        project._options.labelPoints = {};
        // 将这个变量引用过去
        this._pointCollection = project.getViewer().scene.primitives.add(new FreeDo.PointPrimitiveCollection());
        this._labelPointOpts = project._options.labelPoints;
        this._labelPoints = {};
        // labelPoint结构
        // {
        //     point: null,
        //     labelDiv: null,
        //     status: null,
        // }
        // this._points = {};
        // this._lableDivs = {};

        this._initLabelDivFunc = FDLabelPointsManager.defaultInitLabelDivFunc;
        this._hideLabelDivFunc = FDLabelPointsManager.defaultHideLabelDivFunc;
        this._showLabelDivFunc = FDLabelPointsManager.defaultShowLabelDivFunc;

        this._project = project;
        this._viewer = project.getViewer();
        this._event = new FreeDo.Event();
        this._eventHelper = new FreeDo.EventHelper();

        this._freeDivs = [];
        this._freeLabelStatusCollection = [];

        this._changedLabelPointIDs = [];
        this._changedLabelPointStatusCollection = [];

        var that = this;
        this._updateLabelDivsByChangedInfoThrottle = _.throttle(that._updateLabelsDivsByChangedInfo, 100);
        this._updateAllLabelDivsByStatusDebounce = _.debounce(that._updateAllLabelDivsByStatus, 500);
        this._project.getCamera().on(this._dirtyAllLabelPoints, this);
    }

    FDLabelPointsManager.defaultInitLabelDivFunc = function (labelDiv) {
        labelDiv.style.position = 'absolute';
        labelDiv.style.left = '50px';
        labelDiv.style.top = '50px';
        labelDiv.style.zIndex = '100';
        labelDiv.style.color = 'white';
        labelDiv.style.visibility = 'hidden';
    }

    FDLabelPointsManager.defaultHideLabelDivFunc = function (labelDiv, labelPointOption, labelPointID) {
        //ldiv.style.display = "none";
        labelDiv.style.visibility = "hidden";
        labelDiv.style.opacity = "0";
        labelDiv.style.transition = "opacity 0.0s linear";
    }

    FDLabelPointsManager.defaultShowLabelDivFunc = function (labelDiv, labelStatus, labelPointOption, labelPointID) {
        //ldiv.style.display = "block";
        labelDiv.style.left = labelStatus.screenPos.x + "px";
        labelDiv.style.top = labelStatus.screenPos.y + "px";
        labelDiv.innerText = labelPointOption.name;
        labelDiv.style.transition = "opacity 0.5s linear";
        labelDiv.style.visibility = "visible";
        labelDiv.style.opacity = "1";
        labelDiv.style.fontSize = "20px";
        labelDiv.style.textShadow = "0px 0px 1px #000";
    }

    FDLabelPointsManager.copyLabelPointStatus = function (src, dest) {
        dest.screenPos.x = src.screenPos.x;
        dest.screenPos.y = src.screenPos.y;
        dest.isInWindow = src.isInWindow;
        dest.cameraDistanceSquared = src.cameraDistanceSquared;
        dest.isInDistanceRange = src.isInDistanceRange;
        dest.isOcculuded = src.isOcculuded;
    }

    // labelPointOptions
    // var labelPointOption = {
    //     // 必须的
    //     name: "",
    //     position: [0, 0, 0], // longitude(degrees), latitude(degrees), heigth(meter)
    //     viewDistance: 100.0,
    //     tags: [],

    //     // 不重要的
    //     iconUrl: "",
    //     description: "",
    // }

    FDLabelPointsManager.defaultLabelPointOptions = {
        name: "未命名标签",
        position: [0, 0, 0], // longitude(degrees), latitude(degrees), heigth(meter)
        viewDistance: 100.0,
        tags: [],
        pixelSize: 10,
        color: [1.0, 0.0, 0.0, 1.0], // r g b a 范围 0-1 
        distanceDisplayCondition: [0.0, 100000000000000],
        iconUrl: "http://gbim360.com:9999/txf/170712/bimimage/32.jpg",
        occuludedDisabled: true,
        enabled: false,
    };

    FDLabelPointsManager.defaultLabelPointStatus = {
        screenPos: {
            x: 0,
            y: 0
        },
        isInWindow: false,
        cameraDistanceSquared: 0,
        isInDistanceRange: false,
        isOcculuded: true,
    };

    /**
     * 设置标签的样式回调函数
     * @param {Function} initFunc div标签的初始样式设置
     * @param {Function} showFunc div标签的显示样式设置
     * @param {Function} hideFunc div标签的隐藏样式设置
     */
    FDLabelPointsManager.prototype.setLabelDivFuncs = function (initFunc, showFunc, hideFunc) {
        if (typeof initFunc !== "undefined") {
            this._initLabelDivFunc = initFunc;
        }

        if (typeof showFunc !== "undefined") {
            this._showLabelDivFunc = showFunc;
        }

        if (typeof hideFunc !== "undefined") {
            this._hideLabelDivFunc = hideFunc;
        }
    }

    FDLabelPointsManager.prototype._createLabelDiv = function () {
        var div;
        if (this._freeDivs.length === 0) {
            var div = document.createElement("div");
            this._initLabelDivFunc(div);
            this._viewer.container.appendChild(div);
        } else {
            div = this._freeDivs[this._freeDivs.length - 1];
            this._freeDivs.pop();
        }

        return div;
    }

    /**
     * 增加一个标签
     * @param {Object} options 标签的配置
     * @param {Array} options.position 标签的位置，三个分量的数组，分别表示x、y、z
     * @param {Array} options.color 标签的颜色，四个分量的数组，分别表示r、g、b、a，四个分量的范围都是0~1
     * @param {Array} options.distanceDisplayCondition 标签的可见范围，两个分量的数组，分别表示最小可见距离和最大可见距离
     * @param {number} options.pixelSize 标签指定位置point的屏幕大小，单位是像素
     * @returns {string} 标签ID
     */
    FDLabelPointsManager.prototype.addLabelPoint = function (options) {
        var labelPointID = FreeDo.createGuid();
        // TODO 检查一下数据是否齐全，至少具备name\position\viewDistance\tags四项
        var lpo = FreeDo.clone(FDLabelPointsManager.defaultLabelPointOptions, true);
        var cloneOpts = FreeDo.clone(options, true);

        Object.assign(lpo, cloneOpts);
        this._labelPointOpts[labelPointID] = lpo;

        var pos = lpo.position;
        var clr = lpo.color;
        var ddc = lpo.distanceDisplayCondition;
        var point = this._pointCollection.add({
            position: FreeDo.Cartesian3.fromDegrees(pos[0], pos[1], pos[2]),
            color: new FreeDo.Color(clr[0], clr[1], clr[2], clr[3]),
            // color: FreeDo.Color.RED,
            pixelSize: lpo.pixelSize,
            distanceDisplayCondition: new FreeDo.DistanceDisplayCondition(ddc[0], ddc[1]),
            point: false,
        });

        this._labelPoints[labelPointID] = {};
        this._labelPoints[labelPointID].point = point;
        if (lpo.enabled) {
            this._enableLabelPointDiv(this._labelPoints[labelPointID], true);
            point.show = true;
        }

        this._addChangedLabelPoint(labelPointID);

        this._event.raiseEvent("Add", {
            id: labelPointID,
        });

        return labelPointID;
    }

    FDLabelPointsManager.prototype._enableLabelPointDiv = function (labelPoint, enabled) {
        if (enabled) {
            var div = this._createLabelDiv();

            // div.style.display = "block";
            labelPoint.labelDiv = div;
            labelPoint.point.show = true;
        } else {
            var labelDiv = labelPoint.labelDiv;
            if (typeof labelDiv !== "undefined") {
                this._hideLabelDivFunc(labelDiv);
                this._freeDivs.push(labelDiv);

                delete labelPoint["labelDiv"];
            }
            labelPoint.point.show = false;
        }
    }

    FDLabelPointsManager.prototype._enableLabelPoint = function (labelPointID, enabled) {
        var lpo = this._labelPointOpts[labelPointID];
        var labelPoint = this._labelPoints[labelPointID];
        if (lpo.enabled != enabled) {
            this._enableLabelPointDiv(labelPoint, enabled);
            lpo.enabled = enabled;
            return true;
        } else {
            return false;
        }
    };

    /**
     * 使标签处于可用状态
     * @param {string} labelPointID 标签ID
     * @param {boolean} enabled 是否可用
     */
    FDLabelPointsManager.prototype.enableLablePoint = function (labelPointID, enabled) {
        var lpo = this._labelPointOpts[labelPointID];

        if (typeof lpo === "undefined") {
            throw new Error("FDLabelPointsManager.enableLablePoint got error!");
        }

        if (this._enableLabelPoint(labelPointID, enabled)) {
            this._addChangedLabelPoint(labelPointID);
            this._event.raiseEvent("Changed", labelPointID);
        }
    }

    /**
     * 检查标签是否可用
     * @returns {boolean} 标签可用则返回true，否则false
     */
    FDLabelPointsManager.prototype.isLabelPointEnabled = function (labelPointID) {
        var lpo = this._labelPointOpts[labelPointID];

        if (typeof lpo === "undefined") {
            throw new Error("FDLabelPointsManager.isLabelPointEnabled error");
        }

        return lpo.enabled;
    }

    /**
     * 检查某个标签是否存在
     * @param {string} labelPointID 标签ID
     * @returns {boolean} 如果存在该标签，则返回true，否则返回false
     */
    FDLabelPointsManager.prototype.hasLabelPoint = function (labelPointID) {
        var lpo = this._labelPointOpts[labelPointID];
        var has = typeof lpo !== "undefined";
        return has;
    }

    FDLabelPointsManager.prototype._removeLabelPoint = function (labelPointID) {
        var point = this._labelPoints[labelPointID].point;
        this._pointCollection.remove(point);

        // var labelDiv = this._labelPoints[labelPointID].labelDiv;
        // if (typeof labelDiv !== "undefined") {
        //     this._hideLabelDivFunc(labelDiv);
        //     this._freeDivs.push(labelDiv);
        // }
        this._enableLabelPoint(labelPointID, false);

        var labelStatus = this._labelPoints[labelPointID].labelStatus;
        this._freeLabelStatusCollection.push(labelStatus);

        delete this._labelPoints[labelPointID];
        delete this._labelPointOpts[labelPointID];
    }

    /**
     * 删除某个标签
     * @param {string} labelPointID 标签ID
     */
    FDLabelPointsManager.prototype.removeLabelPoint = function (labelPointID) {
        if (typeof (this._labelPointOpts[labelPointID]) === "undefined") {
            alert("sceneObjectID: " + labelPointID + " 已不存在！");
            return false;
        }
        this._removeLabelPoint(labelPointID);
        this._event.raiseEvent("Changed");

        return true;
    }

    /**
     * 删除所有标签
     */
    FDLabelPointsManager.prototype.removeAllLabelPoints = function () {
        for (var labelPointID in this._labelPoints) {
            this._removeLabelPoint(labelPointID);
        }

        this._event.raiseEvent("Changed");
    }

    FDLabelPointsManager.prototype.getLabelPointOptions = function (labelPointID, labelPointOptions) {
        var lpo = this._labelPointOpts[labelPointID];

        if (typeof lpo === "undefined") {
            throw new Error("FDLabelPointsManager.getLabelPointOptions: cannot get property!");
        }

        if (typeof labelPointOptions === "undefined") {
            labelPointOptions = {};
        }

        Object.assign(labelPointOptions, lpo);
        return labelPointOptions;
    }

    FDLabelPointsManager.prototype.setLabelPointOptions = function (labelPointID, labelPointOptions) {
        var lpo = this._labelPointOpts[labelPointID];

        if (typeof lpo === "undefined") {
            throw new Error("FDLabelPointsManager.setLabelOptions: cannot get property!");
        }

        if (!_.isEqual(lpo, labelPointOptions)) {
            if (typeof labelPointOptions.position !== "undefined") {
                var point = this._labelPoints[labelPointID].point;
                var pos = labelPointOptions.position;
                point.position = Cartesian3.fromDegrees(pos[0], pos[1], pos[2]);
            }

            if (typeof labelPointOptions.color !== "undefined") {
                var clr = labelPointOptions.color;
                point.color = new FreeDo.Color(clr[0], clr[1], clr[2], clr[3]);
            }

            if (typeof labelPointOptions.pixelSize !== "undefined") {
                point.pixelSize = labelPointOptions.pixelSize;
            }

            Object.assign(lpo, labelPointOptions);

            this._addChangedLabelPoint(labelPointID);
            this._event.raiseEvent("Changed", labelPointID);
        }
    }

    FDLabelPointsManager.prototype.getLabelPointPosition = function (labelPointID, position) {
        var lpo = this._labelPointOpts[labelPointID];

        if (typeof lpo === "undefined") {
            throw new Error("FDLabelPointsManager.getLabelOption: cannot get property!");
        }

        if (typeof position === "undefined") {
            position = [];
        }
        position[0] = lpo.position[0];
        position[1] = lpo.position[1];
        position[2] = lpo.position[2];

        return position;
    }

    FDLabelPointsManager.prototype.setLabelPointPosition = function (labelPointID, position) {
        var lpo = this._labelPointOpts[labelPointID];

        if (typeof lpo === "undefined") {
            throw new Error("FDLabelPointsManager.setPosition got error!");
        }

        if (typeof position === "undefined") {
            throw new Error("FDLabelPointsManager.setPosition got error!");
        }

        if (!_.isEqual(lpo.position, position)) {
            var point = this._labelPoints[labelPointID].point;
            var pos = position;
            point.position = Cartesian3.fromDegrees(pos[0], pos[1], pos[2]);

            this._addChangedLabelPoint(labelPointID);
            this._event.raiseEvent("Changed", labelPointID);
        }
    }

    FDLabelPointsManager.prototype._addChangedLabelPoint = function (labelPointID) {
        if (this._changedLabelPointIDs.indexOf(labelPointID) === -1) {
            this._changedLabelPointIDs.push(labelPointID);
            this._updateLabelDivsByChangedInfoThrottle();
        }
    }

    FDLabelPointsManager.prototype._dirtyAllLabelPoints = function () {
        if (this._labelPoints.length !== 0) {
            this._changedLabelPointIDs.splice(0, this._changedLabelPointIDs.length);
            for (var key in this._labelPoints) {
                this._changedLabelPointIDs.push(key);
            }
            this._updateLabelDivsByChangedInfoThrottle();
        }
    }

    FDLabelPointsManager.prototype.getLabelPointStatus = function (labelPointID, labelPointStatus) {
        var point = this._labelPoints[labelPointID].point;
        if (typeof point === "undefined") {
            throw new Error("FDLabelPointsManager.isLabelPointOccluded got error");
        }

        var lpo = this._labelPointOpts[labelPointID];

        if (typeof lpo === "undefined") {
            throw new Error("FDLabelPointsManager.setPosition got error!");
        }

        if (typeof labelPointStatus === "undefined") {
            if (this._freeLabelStatusCollection.length !== 0) {
                labelPointStatus = this._freeLabelStatusCollection[this._freeLabelStatusCollection.length - 1];
                this._freeLabelStatusCollection.pop();
            } else {
                labelPointStatus = FreeDo.clone(FDLabelPointsManager.defaultLabelPointStatus, true);
            }
        } else {
            FDLabelPointsManager.copyLabelPointStatus(FDLabelPointsManager.defaultLabelPointStatus, labelPointStatus);
        }

        do {
            var viewer = this._viewer;
            var width = viewer.container.offsetWidth;
            var height = viewer.container.offsetHeight;
            point.computeScreenSpacePosition(viewer.scene, labelPointStatus.screenPos);
            var screenPos = labelPointStatus.screenPos;
            screenPos.y = height - screenPos.y;
            if (screenPos.x >= 0 && screenPos.x < width && screenPos.y >= 0 && screenPos.y < height) {
                labelPointStatus.isInWindow = true;
            } else {
                labelPointStatus.isInWindow = false;
                break;
            }

            labelPointStatus.cameraDistanceSquared = FreeDo.Cartesian3.distanceSquared(viewer.camera.positionWC, point.position);
            var ddc = lpo.distanceDisplayCondition;
            if (labelPointStatus.cameraDistanceSquared >= ddc[0] * ddc[0] && labelPointStatus.cameraDistanceSquared <= ddc[1] * ddc[1]) {
                labelPointStatus.isInDistanceRange = true;
            } else {
                labelPointStatus.isInDistanceRange = false;
                break;
            }

            if (!lpo.occuludedDisabled) {
                var pickedObject = viewer.scene.pick(screenPos);
                if (FreeDo.defined(pickedObject) && (pickedObject.primitive === point)) {
                    labelPointStatus.isOcculuded = false;
                } else {
                    labelPointStatus.isOcculuded = true;
                }
            } else {
                labelPointStatus.isOcculuded = false;
            }

        } while (false);
    }

    FDLabelPointsManager.prototype.getLabelPointStatusCollection = function (labelPointIDs, labelPointStatusCollection) {
        if (typeof labelPointStatusCollection === "undefined") {
            labelPointStatusCollection = [];
        }

        var l = labelPointIDs.length;
        for (var i = 0; i < l; ++i) {
            var lpid = labelPointIDs[i];
            if (typeof lpid !== "undefined") {
                if (typeof labelPointStatusCollection[i] === "undefined") {
                    labelPointStatusCollection[i] = FreeDo.clone(FDLabelPointsManager.defaultLabelPointStatus, true);
                }
                this.getLabelPointStatus(lpid, labelPointStatusCollection[i]);
            }
        }
    }

    FDLabelPointsManager.prototype._updateAllLabelDivsByStatus = function () {
        for (var labelPointID in this._labelPoints) {
            if (this._labelPointOpts[labelPointID].enabled) {
                var ldiv = this._labelPoints[labelPointID].labelDiv;
                var lps = this._labelPoints[labelPointID].labelStatus;
                var lpo = this._labelPointOpts[labelPointID];
                if (typeof ldiv !== "undefined") {
                    if (lps.isInWindow && lps.isInDistanceRange && !lps.isOcculuded) {
                        this._showLabelDivFunc(ldiv, lps, lpo, labelPointID);
                    } else {
                        this._hideLabelDivFunc(ldiv, lpo, labelPointID);
                    }
                }
            }
        }
    }

    FDLabelPointsManager.prototype._hideLabelDivImmediately = function (labelPointID) {
        if (typeof this._labelPoints[labelPointID] !== "undefined") {
            var ldiv = this._labelPoints[labelPointID].labelDiv;
            var lpo = this._labelPointOpts[labelPointID];
            if (typeof ldiv !== "undefined") {
                this._hideLabelDivFunc(ldiv, lpo, labelPointID);
            }
        }
    }

    // labelPointStatus = {
    //     screenPos: {
    //         x: 0,
    //         y: 0
    //     },
    //     isInWindow: false,
    //     cameraDistanceSquared: 0,
    //     isInDistanceRange: false,
    //     isOcculuded: true,
    // };
    FDLabelPointsManager.prototype._updateLabelsDivsByChangedInfo = function () {
        var clp = this._changedLabelPointIDs;
        var lpsc = this._changedLabelPointStatusCollection;
        this.getLabelPointStatusCollection(clp, lpsc);

        var labelPointID;
        var lps;
        var ldiv;
        for (var i = 0; i < clp.length; ++i) {
            labelPointID = clp[i];
            if (this._labelPointOpts[labelPointID].enabled) {
                lps = lpsc[i];
                if (typeof this._labelPoints[labelPointID].labelStatus === "undefined") {
                    this._labelPoints[labelPointID].labelStatus = FreeDo.clone(FDLabelPointsManager.defaultLabelPointStatus, true);
                }
                var orgLps = this._labelPoints[labelPointID].labelStatus;

                var osp = orgLps.screenPos;
                var csp = lps.screenPos;
                var screenPosChanged = !FreeDo.Math.equalsEpsilon(osp.x, csp.x, 0.001) || !FreeDo.Math.equalsEpsilon(osp.y, csp.y, 0.001);

                ldiv = this._labelPoints[labelPointID].labelDiv;
                if (lps.isInWindow && lps.isInDistanceRange && !lps.isOcculuded && !screenPosChanged) {
                    //this._updateLabelDiv(labelPointID);
                } else {
                    this._hideLabelDivImmediately(labelPointID);
                }

                FDLabelPointsManager.copyLabelPointStatus(lps, orgLps);
                this._updateAllLabelDivsByStatusDebounce();
            }
        }

        clp.splice(0, clp.length);
    }

    FDLabelPointsManager.prototype.getAllTags = function (tags) {
        if (typeof tags === "undefined") {
            tags = [];
        }
        tags.splice(0, tags.length);
        var lpos = this._labelPointOpts;
        for (var lpid in lpos) {
            var lpo = lpos[lpid];
            var ll = lpo.tags.length;
            for (var i = 0; i < ll; ++i) {
                var tag = lpo.tags[i];
                if (-1 === tags.indexOf(lpo.tags[i])) {
                    tags.push(tag);
                }
            }
        }

        return tags;
    }

    FDLabelPointsManager.prototype.getLabelPointIDsByTags = function (tags, labelPointIDs) {
        if (typeof labelPointIDs === "undefined") {
            labelPointIDs = [];
        }

        labelPointIDs.splice(0, labelPointIDs.length);

        var lpos = this._labelPointOpts;
        for (var lpid in lpos) {
            var lpo = lpos[lpid];
            for (var i = 0; i < tags.length; ++i) {
                var tag = tags[i];
                if (-1 !== lpo.tags.indexOf(tag)) {
                    labelPointIDs.push(lpid);
                    break;
                } else {
                    continue;
                }
            }
        }

        return labelPointIDs;
    }

    FDLabelPointsManager.prototype.enableLabelPointsByTagsAndDisableOthers = function (tags) {
        var lpos = this._labelPointOpts;
        var hasTag;
        var lpo;
        var tag;
        var changed = false;
        for (var lpid in lpos) {
            lpo = lpos[lpid];
            hasTag = false;
            for (var i = 0; i < tags.length; ++i) {
                tag = tags[i];
                if (-1 !== lpo.tags.indexOf(tag)) {
                    hasTag = true;
                    break;
                } else {
                    continue;
                }
            }
            if (this._enableLabelPoint(lpid, hasTag)) {
                this._addChangedLabelPoint(lpid);
                changed = true;
            }
        }

        if (changed) {
            this._event.raiseEvent("Changed");
        }
    }

    /**
     * 注册捕捉FdLabelPointsManager类的回调函数
     * @param {Function} listener 当有事件触发时被执行的函数，FDLabelPointsManager的事件类型只有“Changed”一种。
     * @param {Object} [scope] listener函数执行时的绑定的对象
     * @returns {Freedo.Event~RemoveCallback} 返回一个函数，调用该函数可以取消监听
     */ 
    FDLabelPointsManager.prototype.on = function (listener, scope) {
        // return this._event.addEventListener(listener, scope);
        return this._eventHelper.add(this._event, listener, scope);
    }

    // FDLabelPointsManager.prototype.getAllLabelPoints = function () {
    //     return FreeDo.clone(this._labelPointOpts, true); // 克隆确保不被用户修改原始数据
    // }

    /**
     * 获取所有的标签ID
     * @param {Array} labelPointIDs 用来存放标签ID的数组
     * @returns {Array} 返回包含所有标签ID的数组
     */
    FDLabelPointsManager.prototype.getAllLabelPointIDs = function (labelPointIDs) {
        if (typeof labelPointIDs === "undefined") {
            labelPointIDs = [];
        }

        labelPointIDs.splice(0, labelPointIDs.length);
        for (var labelPointID in this._labelPointOpts) {
            labelPointIDs.push(labelPointID);
        }

        return labelPointIDs;
    }

    /**
     * 重置标签管理器的所有资源
     */
    FDLabelPointsManager.prototype.reset = function () {
        this.removeAllLabelPoints();
    }

    FDLabelPointsManager.prototype.dispose = function () {
        this._project._viewer.scene.primitives.remove(this._pointCollection);
        this.reset();
        this._eventHelper.removeAll();
    }

    return FDLabelPointsManager;
});