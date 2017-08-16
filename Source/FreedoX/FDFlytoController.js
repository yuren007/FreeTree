/*global define*/
define(function () {
    'use strict';

    function FDFlytoController(fdcamera) {
        this._viewpoints = null;
        this._fdCamera = fdcamera;
        this._currentIndex = -1; // 如果为0则表示目前相机在0这个位置，播放时就跳过0，直接往1飞了
        this._status = "Stopped";
        this._flyingToIndex = -1; // -1表示没有进行飞行，否则表示正在飞往某index
        this._loop = false;

        this._event = new FreeDo.Event();
        this._eventHelper = new FreeDo.EventHelper();
        this._timeoutID = undefined;
    }

    // 属性信息
    Object.defineProperties(FDFlytoController.prototype, {
        currentIndex: {
            get: function () {
                return this._currentIndex;
            },
            set: function (index) {
                this._goto(index);
                this._setCurrentIndex(index);
            }
        },
        status: {
            get: function () {
                return this._status;
            }
        },
        loop : {
            get: function () {
                return this._loop;
            },
            set: function (value) {
                this._loop = value;
                this._event.raiseEvent("PropertyChanged"); 
            }
        }
    });

    FDFlytoController.prototype.startOrResume = function () {
        switch (this._status) {
            case "Playing":
                // do nothing!
                break;
            case "Stopped":
                this._play();
                break;
            case "Paused":
                this._play();
                break;
            default:
                throw new Error("ViewpointsManager FDFlytoController error");
        }
    }

    FDFlytoController.prototype.pause = function () {
        switch (this._status) {
            case "Playing":
                this._pause();
                break;
            case "Stopped":
                // do nothing!
                break;
            case "Paused":
                // do nothing!
                break;
            default:
                throw new Error("ViewpointsManager FDFlytoController error");
        }
    }

    FDFlytoController.prototype.stop = function () {
        switch (this._status) {
            case "Playing":
                this._stop();
                break;
            case "Stopped":
                // do nothing!
                break;
            case "Paused":
                this._stop();
                break;
            default:
                throw new Error("ViewpointsManager FDFlytoController error");
        }
    }

    FDFlytoController.prototype.reset = function () {
        this._stop();
        this._viewpoints = null;
    }
    
    FDFlytoController.prototype.dispose = function () {
        this._viewpoints = null;
    }

    FDFlytoController.prototype._setViewpoints = function (viewpoints) {
        this._stop();
        this._viewpoints = viewpoints;
    }

    FDFlytoController.prototype._getViewpoints = function () {
        return this._viewpoints;
    }

    FDFlytoController.prototype._play = function () {
        if (this._viewpoints === null) {
            throw new Error("FDFlytoController play error!");
        }
        this._flytoNext();
        this._setStatus("Playing");
    }

    FDFlytoController.prototype._pause = function () {
        this._cancel();
        this._setStatus("Paused");
    }

    FDFlytoController.prototype._stop = function () {
        this._cancel();
        this._setCurrentIndex(-1);
        this._setStatus("Stopped");
    }

    FDFlytoController.prototype._completeCallback = function () {
        this._setCurrentIndex(this._flyingToIndex);
        if (this._currentIndex >= this._viewpoints.length) {
            this._setCurrentIndex(-1);
        }

        this._flyingToIndex = -1;

        var that = this;
        this._timeoutID = setTimeout(function () {
            that._flytoNext();
        }, 1000);
    }

    FDFlytoController.prototype._flytoNext = function () {
        this._cancel();

        var camInfo;
        if (this._currentIndex >= this._viewpoints.length - 1) {
            if (this._loop && this._viewpoints.length != 1) {
                this._flyingToIndex = 0;
            } else {
                this._stop();
            }
        } else {
            this._flyingToIndex = this._currentIndex + 1;
        }

        if (this._flyingToIndex != -1) {
            camInfo = this._viewpoints[this._flyingToIndex].cameraInfo;

            if (typeof camInfo !== "undefined") {
                var that = this;
                this._fdCamera.flytoByCameraInfo(camInfo, {
                    complete: function () {
                        that._completeCallback();
                    }
                });
            }
        }
    }

    FDFlytoController.prototype._cancel = function () {
        clearTimeout(this._timeoutID);
        this._timeoutID = undefined;
        this._fdCamera.cancelFlight();
        this._flyingToIndex = -1;
    }

    FDFlytoController.prototype._goto = function (index) {
        if (index >= this._viewpoints.length) {
            throw new Error("FDFlytoController inde error");
        }
        this._cancel();
        var option = this._viewpoints.list[index];
        var camInfo = option.cameraInfo;
        if (typeof camInfo === "undefined") {
            throw new Error("FDFlytoController cameraInfo error");
        }
        this._fdCamera.gotoByCameraInfo(camInfo);
    }

    FDFlytoController.prototype._setStatus = function (status) {
        this._status = status;
        this._event.raiseEvent("StatusChanged", status);
    }

    FDFlytoController.prototype._setCurrentIndex = function (index) {
        this._currentIndex = index;
        this._event.raiseEvent("CurrentIndexChanged", index);
    }

    FDFlytoController.prototype.on = function (listener, scope) {
        // return this._event.addEventListener(listener, scope);
        return this._eventHelper.add(this._event, listener, scope);
    }

    FDFlytoController.prototype.reset = function () {
        this._setViewpoints(null);
        this._stop();
    }

    // 销毁所有资源
    FDFlytoController.prototype.dispose = function () {
        this.reset();
        this._eventHelper.removeAll();
    }

    return FDFlytoController;
});
