/*global define*/
define(function () {
    'use strict';

    /**
     * 相机管理类，此类用来管理所有相机相关操作，并提供了相机发生变化的事件可供监听
     * 
     * @alias FdCamera
     * @class
     */
    function FDCamera(camera) {
        this._camera = camera;
        this._flying = false;

        this._event = new FreeDo.Event();
        this._eventHelper = new FreeDo.EventHelper();

        this._originRawCameraInfo = [0, 0, 0, 0, 0, 0];
        this._tempRawCameraInfo = [0, 0, 0, 0, 0, 0];
        this._currentCameraInfo = [0, 0, 0, 0, 0, 0];

        var that = this;
        setInterval(function () {
            var cam = that._camera;
            var pos = cam.positionCartographic;
            that._tempRawCameraInfo[0] = pos.longitude;
            that._tempRawCameraInfo[1] = pos.latitude;
            that._tempRawCameraInfo[2] = pos.height;
            that._tempRawCameraInfo[3] = cam.heading;
            that._tempRawCameraInfo[4] = cam.pitch;
            that._tempRawCameraInfo[5] = cam.roll;

            if (FDCamera.isCameraInfoChanged(that._tempRawCameraInfo, that._originRawCameraInfo)) {
                for (var i = 0; i < 6; ++i) {
                    that._originRawCameraInfo[i] = that._tempRawCameraInfo[i];
                }

                var td = FreeDo.Math.toDegrees;
                that._currentCameraInfo[0] = td(that._originRawCameraInfo[0]);
                that._currentCameraInfo[1] = td(that._originRawCameraInfo[1]);
                that._currentCameraInfo[2] = that._originRawCameraInfo[2];
                that._currentCameraInfo[3] = td(that._originRawCameraInfo[3]);
                that._currentCameraInfo[4] = td(that._originRawCameraInfo[4]);
                that._currentCameraInfo[5] = td(that._originRawCameraInfo[5]);

                that._event.raiseEvent("Changed", that._currentCameraInfo);
            }
        }, 100);
    }

    FDCamera.isCameraInfoChanged = function (left, right) {
        for (var i = 0; i < 6; ++i) {
            if (!FreeDo.Math.equalsEpsilon(left[i], right[i], FreeDo.Math.EPSILON10)) {
                return true;
            }
        }

        return false;
    }

    // danger !!!
    FDCamera.prototype.getRawCamera = function () {
        return this._camera;
    }

    // 项目的属性信息
    Object.defineProperties(FDCamera.prototype, {
        heading: {
            get: function () {
                return FreeDo.Math.toDegrees(this._camera.heading);
            },
            set: function (value) {
                var cameraInfo = this.getCurrentCameraInfo();
                cameraInfo[3] = value;
                cameraInfo[5] = 0;
                this.flytoByCameraInfo(cameraInfo, {
                    duration: 0.3
                });
            }
        }
    });

    /**
     * 获取当前相机信息
     * @param {Array} [cameraInfo] 给定一个用来存放相机信息的数组
     * @returns {Array} 返回一个数组，该数组含有6个分量，按顺序分别表示：经度、纬度、高度、偏航角、俯仰角和翻滚角。除了高度是以米为单位，其他的都是以度为单位。
     */
    FDCamera.prototype.getCurrentCameraInfo = function (cameraInfo) {
        if (typeof cameraInfo === "undefined") {
            cameraInfo = [];
        }

        // var cam = this._camera;
        // var pos = cam.positionCartographic;
        // var td = FreeDo.Math.toDegrees;
        // // roll 可能变成 359.xx，会导致相机飞入操作时发生大幅度旋转，应该是cesium的bug，此处将roll定死为0来避免这样的问题。
        // // var cameraInfo = [td(pos.longitude), td(pos.latitude), pos.height, td(cam.heading), td(cam.pitch), td(cam.roll)];
        // cameraInfo[0] = td(pos.longitude);
        // cameraInfo[1] = td(pos.latitude);
        // cameraInfo[2] = pos.height;
        // cameraInfo[3] = td(cam.heading);
        // cameraInfo[4] = td(cam.pitch);
        // cameraInfo[5] = 0;

        for (var i=0; i<6; ++i) {
            cameraInfo[i] = this._currentCameraInfo[i];
        }

        return cameraInfo;
    }

    /**
     * 飞入指定的相机方位，会有一个飞入的过程。
     * 
     * @param {Array} cameraInfo 存放相机信息的数组，该数组的组成与{@link FdCamera#getCurrentCameraInfo}相同。
     * @param {Object} options 包含一些选项，暂不开放
     */
    FDCamera.prototype.flytoByCameraInfo = function (cameraInfo, options) {
        var currentCameraInfo = this.getCurrentCameraInfo();
        if (!_.isEqual(currentCameraInfo, cameraInfo)) {
            var cam = cameraInfo;

            // viewer.camera.flyTo({
            //     destination: FreeDo.Cartesian3.fromDegrees(cam[0], cam[1], cam[2]),
            //     orientation: {
            //         heading: FreeDo.Math.toRadians(cam[3]),
            //         pitch: FreeDo.Math.toRadians(cam[4]),
            //         roll: cam[5]
            //     }
            // });

            var viewerOpts;
            if (typeof options === "undefined") {
                viewerOpts = {};
            } else {
                viewerOpts = FreeDo.clone(options, true);
            }

            viewerOpts.destination = FreeDo.Cartesian3.fromDegrees(cam[0], cam[1], cam[2]);
            viewerOpts.orientation = {
                heading: FreeDo.Math.toRadians(cam[3]),
                pitch: FreeDo.Math.toRadians(cam[4]),
                roll: cam[5]
            }

            this._camera.flyTo(viewerOpts);
            //viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
            return true;
        } else {
            return false;
        }
    }

    /**
     * 直接跳入指定的相机方位，不会有飞行的过程。
     * 
     * @param {Array} cameraInfo 存放相机信息的数组，该数组的组成与{@link FdCamera#getCurrentCameraInfo}相同。
     */
    FDCamera.prototype.gotoByCameraInfo = function (cameraInfo) {
        var currentCameraInfo = this.getCurrentCameraInfo();
        if (!_.isEqual(currentCameraInfo, cameraInfo)) {
            var cam = cameraInfo;
            this._camera.setView({
                destination: FreeDo.Cartesian3.fromDegrees(cam[0], cam[1], cam[2]),
                orientation: {
                    heading: FreeDo.Math.toRadians(cam[3]),
                    pitch: FreeDo.Math.toRadians(cam[4]),
                    roll: cam[5]
                }
            });
            //viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
            return true;
        } else {
            return false;
        }
    }

    /**
     * 如果相机处于飞行状态，则使其取消飞行，并停止在当前位置
     */
    FDCamera.prototype.cancelFlight = function () {
        this._camera.cancelFlight();
    }

    /**
     * 是否正在飞行
     */
    FDCamera.prototype.isFlying = function () {
        return FreeDo.defined(this._camera._currentFlight);
    }

    /**
     * 注册捕捉FDCamera类的回调函数。
     * @param {Function} listener 当有事件触发时被执行的函数，FDCamera的事件类型只有“Changed”一种。
     * @param {Object} [scope] listener函数执行时的绑定的对象。
     * @returns {Freedo.Event~RemoveCallback} 返回一个函数，调用该函数可以取消监听。
     *
     */ 
    FDCamera.prototype.on = function (listener, scope) {
        // return this._event.addEventListener(listener, scope);
        return this._eventHelper.add(this._event, listener, scope);
    }

    /**
     * 重置场景管理器中的资源，但不包含事件监听者。
     */
    FDCamera.prototype.reset = function () {}

    /**
     * 清除掉所有的事件监听者
     */
    FDCamera.prototype.clearAllEventListeners = function () {
        this._eventHelper.removeAll();
    }

    // 销毁所有资源
    FDCamera.prototype.dispose = function () {
        this.reset();
        this._eventHelper.removeAll();
    }

    return FDCamera;
});