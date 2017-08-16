/*global define*/
define([
    './FDFlytoController'
], function (FDFlytoController) {
    'use strict';

    /**
     * 视点管理器，用组的形式管理视点，每个视点组可以进行连续播放
     * @alias FdViewpointsManager
     * @class
     */
    function FDViewpointsManager2(project) {
        // 初始化sceneObjects数据为一个空对象
        project._options.viewpoints = {};
        // 将这个变量也引用过去
        this._viewpointOpts = project._options.viewpoints;

        // 辅助变量
        this._project = project;
        this._event = new FreeDo.Event();
        this._eventHelper = new FreeDo.EventHelper();

        this._flytoControl = new FDFlytoController(project.getCamera());
        this._currentPlayingGroupID = undefined;

        //this._flytoControl.on(this.flyingtoEventCallback, this);
        var that = this;
        this._flytoControl.on(function (eventType, param) {
            that.flyingtoEventCallback(eventType, param)
        });
    }

    // 属性信息
    Object.defineProperties(FDViewpointsManager2.prototype, {
        /**
         * 是否循环播放
         * @memberof FdViewpoints.prototype
         * @type {boolean}
         */
        playingLoop : {
            get: function () {
                return this._flytoControl.loop;
            },
            set: function (value) {
                if (this._flytoControl.loop !== value) {
                    this._flytoControl.loop = value;
                }
            }
        }
    });

    FDViewpointsManager2.prototype.flyingtoEventCallback = function (eventType, param) {
        if (eventType === "CurrentIndexChanged") {
            this._event.raiseEvent("PlayingGroupCurrentIndexChanged", param);
        } else if (eventType === "StatusChanged") {
            this._event.raiseEvent("PlayingGroupStatusChanged", param);
        } else if (eventType === "PropertyChanged") {
            this._event.raiseEvent("PlayingGroupPropertyChanged", param);
        }
    }

    /**
     * 给定视点组的名称，创建视点组
     * @param {string} groupName 视点组的名称
     * @returns {string} 返回视点组ID
     */
    FDViewpointsManager2.prototype.createGroup = function (groupName, groupID) {
        if (typeof groupID === "undefined") {
            groupID = FreeDo.createGuid();
        }

        this._viewpointOpts[groupID] = {
            name: groupName,
            list: [],
        };

        this._event.raiseEvent("GroupsChanged");
        return groupID;
    }

    /**
     * 删除视点组
     * @param {string} groupID 视点组ID
     */
    FDViewpointsManager2.prototype.removeGroup = function (groupID) {
        if (typeof (this._viewpointOpts[groupID]) == "undefined") {
            return false;
        }

        if (this._currentPlayingGroupID === groupID) {
            this._flytoControl.reset();
        }

        delete this._viewpointOpts[groupID];
        this._event.raiseEvent("GroupsChanged");

        return true;
    }

    /**
     * 获取视点组的名字
     * @param {string} groupID 视点组ID
     * @returns {string} 视点组名称
     */
    FDViewpointsManager2.prototype.getGroupName = function (groupID) {
        if (typeof (this._viewpointOpts[groupID]) == "undefined") {
            return "";
        }

        return this._viewpointOpts[groupID].name;
    }

    FDViewpointsManager2.prototype.getGroupOptions = function (groupID) {
        if (typeof (this._viewpointOpts[groupID]) == "undefined") {
            return undefined;
        }

        var groupOptions = FreeDo.clone(this._viewpointOpts[groupID], true);
        return groupOptions;
    }

    /**
     * 删除所有视点组
     */
    FDViewpointsManager2.prototype.removeAllGroups = function () {
        this._flytoControl.reset();
        for (var groupID in this._viewpointOpts) {
            delete this._viewpointOpts[groupID];
        }

        this._event.raiseEvent("GroupsChanged");

        return true;
    }

    /**
     * 获取所有视点组的ID
     * @returns 返回一个包含视点组ID的数组
     */
    FDViewpointsManager2.prototype.getAllGroupIDs = function () {
        var allGroupIDs = [];
        for (var groupID in this._viewpointOpts) {
            allGroupIDs.push(groupID);
        }

        return allGroupIDs;
    }

    /**
     * 在当前视点组列表的末尾增加一个视点
     * @param {string} groupID 视点组ID
     * @param {Object} options 视点组选项
     */
    FDViewpointsManager2.prototype.appendViewpoint = function (groupID, options) {
        if (typeof (this._viewpointOpts[groupID]) == "undefined") {
            return false;
        }

        var viewpointOpt = FreeDo.clone(options, true);
        this._viewpointOpts[groupID].list.push(viewpointOpt);
        this._event.raiseEvent("GroupChanged", groupID);

        return true;
    }

    /**
     * 在视点组列表的某个位置插入一个视点
     * @param {string} groupID 视点组ID
     * @param {Object} options 视点组选项
     * @param {number} index 指定视点组列表中的位置
     */
    FDViewpointsManager2.prototype.insertViewpoint = function (groupID, options, index) {
        if (typeof (this._viewpointOpts[groupID]) == "undefined") {
            return false;
        }

        var viewpointOpt = FreeDo.clone(options, true);
        this._viewpointOpts[groupID].list.splice(index, 0, viewpointOpt);
        this._event.raiseEvent("GroupChanged", groupID);

        return true;
    }

    /**
     * 删除视点
     * @param {string} groupID 视点组ID
     * @param {number} index 指定视点组列表中的位置
     */
    FDViewpointsManager2.prototype.removeViewpoint = function (groupID, index) {
        if (typeof (this._viewpointOpts[groupID]) === "undefined") {
            return false;
        }

        if (typeof (this._viewpointOpts[groupID].list[index]) === "undefined") {
            return false;
        }

        this._viewpointOpts[groupID].list.splice(index, 1);
        this._event.raiseEvent("GroupChanged", groupID);

        return true;
    }

    /**
     * 获取视点组中视点的数量
     * @param {string} groupID 视点组ID
     */
    FDViewpointsManager2.prototype.getViewpointsLength = function (groupID) {
        if (typeof (this._viewpointOpts[groupID]) === "undefined") {
            throw new Error("getViewpointsLength error!");
        }

        return this._viewpointOpts[groupID].list.length;
    }

    /**
     * 设置视点
     * @param {string} groupID 视点组ID
     * @param {number} index 指定视点组列表中的位置
     * @param {Object} options 视点选项，目前只有cameraInfo
     * @param {Array} options.cameraInfo 相机信息的数组，该数组的组成与{@link FdCamera#getCurrentCameraInfo}相同。
     */
    FDViewpointsManager2.prototype.setViewpoint = function (groupID, index, options) {
        if (typeof (this._viewpointOpts[groupID]) === "undefined") {
            return false;
        }

        if (typeof (this._viewpointOpts[groupID].list[index]) === "undefined") {
            return false;
        }

        var viewpointOpt = FreeDo.clone(options, true);

        this._viewpointOpts[groupID].list[index] = viewpointOpt;
        this._event.raiseEvent("ViewpointChanged", groupID);

        return true;
    }

    /**
     * 获取视点属性
     * @param {string} groupID 视点组ID
     * @param {number} index 指定视点组列表中的位置
     * @returns {Object} options 视点选项，目前只有cameraInfo
     * @returns {Array} options.cameraInfo 相机信息的数组，该数组的组成与{@link FdCamera#getCurrentCameraInfo}相同。
     */
    FDViewpointsManager2.prototype.getViewpoint = function (groupID, index) {
        if (typeof (this._viewpointOpts[groupID]) === "undefined") {
            throw new Error("getViewpoint error");
        }

        if (typeof (this._viewpointOpts[groupID].list[index]) === "undefined") {
            return new Error("getViewpoint error");
        }

        var options = this._viewpointOpts[groupID].list[index];
        var viewpointOpt = FreeDo.clone(options, true);
        return viewpointOpt;
    }

    /**
     * 飞入某个视点
     * @param {string} groupID 视点组ID
     * @param {number} index 指定视点组列表中的位置
     */
    FDViewpointsManager2.prototype.flyto = function (groupID, index) {
        if (typeof (this._viewpointOpts[groupID]) === "undefined") {
            return false;
        }

        if (typeof (this._viewpointOpts[groupID].list[index]) === "undefined") {
            return false;
        }

        var options = this._viewpointOpts[groupID].list[index];
        var camInfo = options.cameraInfo;
        if (typeof camInfo === "undefined") {
            return false;
        }
        this._project.getCamera().flytoByCameraInfo(options.cameraInfo);

        return true;
    }

    /**
     * 跳入某个视点
     * @param {string} groupID 视点组ID
     * @param {number} index 指定视点组列表中的位置
     */
    FDViewpointsManager2.prototype.goto = function (groupID, index) {
        if (typeof (this._viewpointOpts[groupID]) === "undefined") {
            return false;
        }

        if (typeof (this._viewpointOpts[groupID].list[index]) === "undefined") {
            return false;
        }

        var options = this._viewpointOpts[groupID].list[index];
        var camInfo = options.cameraInfo;
        if (typeof camInfo === "undefined") {
            return false;
        }
        this._project.getCamera().gotoByCameraInfo(options.cameraInfo);

        return true;
    }

    /**
     * 播放或者恢复播放视点组
     * @param {string} groupID 视点组ID
     * @param {number} startIndex 指定视点组列表中的位置
     */
    FDViewpointsManager2.prototype.startOrResumeGroup = function (groupID, startIndex) {
        if (typeof groupID === "undefined") {
            if (typeof this._currentPlayingGroupID !== "undefined") {
                groupID = this._currentPlayingGroupID;
            } else {
                throw new Error("FDViewpointsManager2 startOrResume should have argument!");
            }
        }

        if (typeof this._currentPlayingGroupID !== "undefined") {
            if (groupID !== this._currentPlayingGroupID) {
                this._flytoControl.stop();
                this._flytoControl._setViewpoints(null);

                this._flytoControl._setViewpoints(this._viewpointOpts[groupID].list);
                this._currentPlayingGroupID = groupID;

                this._flytoControl.startOrResume();
            } else {
                this._flytoControl.startOrResume();
            }
        } else {
            this._flytoControl._setViewpoints(this._viewpointOpts[groupID].list);
            this._currentPlayingGroupID = groupID;

            this._flytoControl.startOrResume();
        }
    }

    /**
     * 暂停正在播放的视点组，当前视点位置不变
     */
    FDViewpointsManager2.prototype.pauseGroup = function () {
        this._flytoControl.pause();
    }

    /**
     * 停止正在播放的视点组，当前视点回到第一个视点。
     */
    FDViewpointsManager2.prototype.stopGroup = function () {
        this._flytoControl.stop();
    }

    /**
     * 获取视点组的播放状态
     * @returns {string} 播放状态可能是 Playing/Stopped/Paused
     */
    FDViewpointsManager2.prototype.getGroupPlayingStatus = function () {
        return this._flytoControl.status;
    }

    /**
     * 获取正在播放的视点组的视点索引
     * @returns {number} 返回视点索引
     */
    FDViewpointsManager2.prototype.getGroupPlayingIndex = function () {
        return this._flytoControl.currentIndex;
    }

    /**
     * 设置当前播放的视点索引，并同时跳入该视点位置
     * @param {number} index 视点索引
     */
    FDViewpointsManager2.prototype.setGroupPlayingIndex = function (index) {
        this._flytoControl.currentIndex = index;
    }

    /**
     * 获取正在播放的视点组ID
     * @returns {string} 视点组ID
     */
    FDViewpointsManager2.prototype.getGroupPlayingGroupID = function () {
        return this._currentPlayingGroupID;
    }
    
    /**
     * 注册捕捉FdViewpointsManager类的回调函数。
     * 事件类型有：PlayingGroupCurrentIndexChanged/PlayingGroupStatusChanged/PlayingGroupPropertyChanged
     * @param {Function} listener 当有事件触发时被执行的函数。
     * @param {Object} [scope] listener函数执行时的绑定的对象。
     * @returns {Freedo.Event~RemoveCallback} 返回一个函数，调用该函数可以取消监听。
     */ 
    FDViewpointsManager2.prototype.on = function (listener, scope) {
        // return this._event.addEventListener(listener, scope);
        return this._eventHelper.add(this._event, listener, scope);
    }

    /**
     * 重置视点组的所有资源，同时取消之前的飞行状态
     */
    FDViewpointsManager2.prototype.reset = function () {
        this.removeAllGroups();
        this._flytoControl.reset();
    }

    // 销毁所有资源
    FDViewpointsManager2.prototype.dispose = function () {
        this.reset();
        this._flytoControl.dispose();
        this._eventHelper.removeAll();
    }

    return FDViewpointsManager2;
});