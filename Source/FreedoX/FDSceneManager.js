/*global define*/
define(function () {
    'use strict';

    /**
     * 场景管理器，包含PModel的管理，以后可能同时包含其他类型对象的管理，目前只有PModel。
     * 
     * @alias FdSceneManager
     * @constructor
     */
    function FDSceneManager(project) {
        // 初始化sceneObjects数据为一个空对象
        project._options.sceneObjects = {};
        // 将这个变量也引用过去
        this._sceneObjectOpts = project._options.sceneObjects;

        // 辅助变量
        this._pModelMap = {};
        this._pModelStyleMap = {};
        this._project = project;
        this._event = new FreeDo.Event();
        this._eventHelper = new FreeDo.EventHelper();

        var that = this;
        this.updatePModelStyleThrottle = _.throttle(that._updatePModelStyle, 100);
    }

    /**
     * 增加一个场景对象，目前只能增加PModel类型
     * @param {String} name
     * @param {String} type 只能是PModel
     * @param {Object} options 模型的配置信息
     * @param {String} options.url PModel的url路径
     * @param {Boolean} [options.show=true] PModel的初始状态是否可见
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] 一个4X4矩阵，用来定义PModel的方位，目前暂不能用
     * @param {Number} [options.maximumScreenSpaceError=16] 模型显示的精细程度。此值越大，PModel会显示得越粗糙；越小越精细。
     * @returns {String} 返回场景对象的id
     * 
     */
    FDSceneManager.prototype.addSceneObject = function (name, type, options) {
        var sceneObjectID = FreeDo.createGuid();

        var sceneObject = null;
        if (type === "PModel") {
            sceneObject = this._project._viewer.scene.primitives.add(new FreeDo.FreeDoPModelset(options));
        } else if (type === "Model") {
            // TODO
            return null;
        } else {
            throw new Error("FDSceneManager.addSceneObject: error");
        }

        this._pModelMap[sceneObjectID] = sceneObject;
        this._pModelStyleMap[sceneObjectID] = {};

        var sceneObjectOpt = {
            name: name,
            type: type,
            options: FreeDo.clone(options, true)
        }
        this._sceneObjectOpts[sceneObjectID] = sceneObjectOpt;

        this._event.raiseEvent("Add", {
            id: sceneObjectID,
            opt: sceneObjectOpt,
        });

        return sceneObjectID;
    }

    /**
     * 删除一个场景对象
     * @param {String} sceneObjectID
     */
    FDSceneManager.prototype.removeSceneObject = function (sceneObjectID) {
        if (typeof (this._sceneObjectOpts[sceneObjectID]) === "undefined") {
            alert("sceneObjectID: " + sceneObjectID + " 已不存在！");
            return false;
        }

        var sceneObjectOpt = this._sceneObjectOpts[sceneObjectID];

        if (sceneObjectOpt.type === "PModel") {
            var pModel = this._pModelMap[sceneObjectID];
            this._project._viewer.scene.primitives.remove(pModel);
            delete this._sceneObjectOpts[sceneObjectID];
            delete this._pModelMap[sceneObjectID];
            delete this._pModelStyleMap[sceneObjectID];
        } else if (sceneObjectOpt.type === "Model") {
            // TODO ...
            return false;
        } else {
            throw new Error("FDSceneManager.removeSceneObject: cannot get sceneObject");
        }

        this._event.raiseEvent("Remove", sceneObjectID);

        return true;
    }

    /**
     * 后去底层的PModel对象，会暴露底层接口，慎用
     * 
     * @private
     * 
     */
    FDSceneManager.prototype.getSceneObject = function (sceneObjectID) {
        var sceneObjectOpt = this._sceneObjectOpts[sceneObjectID];

        if (sceneObjectOpt === undefined) {
            return null;
        }

        if (sceneObjectOpt.type === "PModel") {
            return this._pModelMap[sceneObjectID];
        } else if (sceneObjectOpt.type === "Model") {
            // TODO
            return null;
        } else {
            throw new Error("FDSceneManager.getSceneObject: cannot get sceneObject!");
        }
    }

    // 统一使用getSceneObjectProperty和setSceneObjectProperty获取和设置属性值
    // FDSceneManager.prototype.showSceneObject = function (sceneObjectID, show) {
    //     this.setSceneObjectProperty(sceneObjectID, "show", show);
    // }

    // FDSceneManager.prototype.isSceneObjectVisible = function (sceneObjectID) {
    //     return this.getSceneObjectProperty(sceneObjectID, "show");
    // }

    /**
     * 获取场景对象的属性信息，不同类型的场景对象会有不同的属性信息。目前只有PModel类型。
     * 针对PModel类型，属性有：
     * @param {String} sceneObjectID 场景对象的ID号
     * @param {String} property 场景对象的属性名，可能是show/url/maximumScreenSpaceError。show表示可见与否，url表示场景路径，maximumScreenSpaceError表示模型显示的精细程度，默认值是16，越大则越粗糙，越小则显示得越精细。
     * @returns {Boolean/String/Number} show的类型是Boolean，url是String类型，maximumScreenSpaceError是Number类型
     */
    FDSceneManager.prototype.getSceneObjectProperty = function (sceneObjectID, property) {
        var sceneObjectOpt = this._sceneObjectOpts[sceneObjectID];

        if (typeof (sceneObjectOpt) === "undefined") {
            throw new Error("FDSceneManager.getSceneObjectProperty: cannot get property!");
        }

        if (sceneObjectOpt.options && typeof (sceneObjectOpt.options[property]) !== "undefined") {
            // TODO 是否要根据类型判断是否克隆？
            return FreeDo.clone(sceneObjectOpt.options[property], true);
        } else {
            if (sceneObjectOpt.type === "PModel") {
                var pModel = this._pModelMap[sceneObjectID];
                if (typeof (pModel[property] !== "undefined")) {
                    return pModel[property];
                } else {
                    throw new Error("FDSceneManager.getSceneObjectProperty: cannot get property!");
                }
            } else if (sceneObjectOpt.type === "Model") {
                // TODO
                throw new Error("FDSceneManager.getSceneObjectProperty: cannot get property!");
            } else {
                throw new Error("FDSceneManager.getSceneObjectProperty: cannot get property!");
            }
        }
    }

    /**
     * 设置场景对象的属性信息，不同类型的场景对象会有不同的属性信息。目前只有PModel类型。
     * @param {String} sceneObjectID 场景对象的ID号
     * @param {String} property 场景对象的属性名，可能是show/url/maximumScreenSpaceError。show表示可见与否，url表示场景路径，maximumScreenSpaceError表示模型显示的精细程度，默认值是16，越大则越粗糙，越小则显示得越精细。
     * @param {Boolean/String/Number} value show的类型是Boolean，url是String类型，maximumScreenSpaceError是Number类型
     */
    FDSceneManager.prototype.setSceneObjectProperty = function (sceneObjectID, property, value) {
        // 0 先检查是否存在这个sceneObject
        var sceneObjectOpt = this._sceneObjectOpts[sceneObjectID];
        if (typeof (sceneObjectOpt) === "undefined") {
            throw new Error("FDSceneManager.getSceneObjectProperty: cannot get property!");
        }

        var oldValue = this.getSceneObjectProperty(sceneObjectID, property);

        if (_.isEqual(oldValue, value)) {
            return;
        }

        // 1 先给实际的物体属性赋值
        if (sceneObjectOpt.type === "PModel") {
            var pModel = this._pModelMap[sceneObjectID];
            if (typeof (pModel[property] !== "undefined")) {
                pModel[property] = value;
            } else {
                throw new Error("FDSceneManager.getSceneObjectProperty: cannot get property!");
            }
        } else if (sceneObjectOpt.type === "Model") {
            // TODO
            throw new Error("FDSceneManager.getSceneObjectProperty: cannot get property!");
        } else {
            throw new Error("FDSceneManager.getSceneObjectProperty: cannot get property!");
        }

        // 2 然后给option赋值，使其保持同步
        sceneObjectOpt.options[property] = value;

        // 3 发送事件
        this._event.raiseEvent("Changed", sceneObjectID);
    }

    /**
     * 对象的属性可能会被底层对象修改，此时需要调用此对象来重置
     * @private
     */
    FDSceneManager.prototype.resetAllSceneObjectsProperty = function () {
        for (var sceneObjectID in this._sceneObjectOpts) {
            var sceneObjectOpt = this._sceneObjectOpts[sceneObjectID];
            for (var property in sceneObjectOpt.options) {
                var oldValue = this.getSceneObject(sceneObjectID)[property];
                var value = sceneObjectOpt.options[property];
                if (_.isEqual(oldValue, value)) {
                    continue;
                }

                // 1 先给实际的物体属性赋值
                if (sceneObjectOpt.type === "PModel") {
                    var pModel = this._pModelMap[sceneObjectID];
                    if (typeof (pModel[property] !== "undefined")) {
                        pModel[property] = value;
                    } else {
                        throw new Error("FDSceneManager.getSceneObjectProperty: cannot get property!");
                    }
                } else if (sceneObjectOpt.type === "Model") {
                    // TODO
                    throw new Error("FDSceneManager.getSceneObjectProperty: cannot get property!");
                } else {
                    throw new Error("FDSceneManager.getSceneObjectProperty: cannot get property!");
                }

                // 2 然后给option赋值，使其保持同步
                sceneObjectOpt.options[property] = value;

                // 3 发送事件
                this._event.raiseEvent("Changed", sceneObjectID);
            }
        }
    }

    /**
     * 飞入某个场景对象，飞入的范围是根据场景对象的所在位置和包围盒大小自动计算出来的。
     * @param {String} sceneObjectID 场景对象ID号
     * @param {Object} options 其他飞入配置信息
     * @param {number} options.duration 飞行时间
     */
    FDSceneManager.prototype.flyto = function (sceneObjectID, options) {
        var boundingSphere = this.getSceneObjectProperty(sceneObjectID, "boundingSphere");
        var viewer = this._project.getViewer();
        var duration = 1.0;
        if (typeof options !== "undefined" && typeof options.duration !== "undefined") {
            duration = options.duration;
        }

        viewer.camera.flyToBoundingSphere(boundingSphere, {
            offset: new FreeDo.HeadingPitchRange(-0.7, -0.7, boundingSphere.radius * 5.0),
            duration: duration,
        });
        //viewer.camera.lookAtTransform(FreeDo.Matrix4.IDENTITY);
    }

    FDSceneManager.prototype._findPModel = function (picked) {
        var ts = picked._content._tileset;
        for (var mk in this._pModelMap) {
            if (this._pModelMap[mk] === ts) {
                return mk;
            }
        }

        return undefined;
    }

    /**
     * 根据鼠标在窗口中的位置来拾取场景中的对象
     * @param {Array} windowPosition 窗口坐标，0分量表示x轴向坐标，1分量表示y轴向坐标
     * @param {Function} selectedCallback 回调函数，当拾取到某个对象以后就会调用该回调函数
     */
    FDSceneManager.prototype.selectComponent = function (windowPosition, selectedCallback) {
        var viewer = this._project.getViewer();
        var picked = viewer.scene.pick(windowPosition);
        if (FreeDo.defined(picked) && picked instanceof FreeDo.FreeDoPModelFeature) {
            var pModel = this._findPModel(picked);
            var id = picked.getProperty('component');
            if (FreeDo.defined(id, pModel)) {
                selectedCallback(id, pModel);
                return;
            }
        }
        selectedCallback(undefined, undefined);
    }

    FDSceneManager.prototype._updatePModelStyle = function () {
        var pModel;
        var pModelStyle;
        var colorConditions = [];
        var showConditions = [];
        for (var sceneObjectID in this._pModelStyleMap) {
            pModel = this._pModelMap[sceneObjectID];
            colorConditions.splice(0, colorConditions.length);
            showConditions.splice(0, showConditions.length);

            pModelStyle = this._pModelStyleMap[sceneObjectID];
            if (typeof pModelStyle !== "undefined") {
                for (var componentID in pModelStyle) {
                    var componentStyle = pModelStyle[componentID];
                    if (typeof componentStyle.color !== "undefined") {
                        // colorConditions.push(["${component} === \'" + componentID + "\'", "color('green')"]);
                        var c = componentStyle.color;
                        //var colorStr = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3]})`;
                        var colorStr = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + c[3] + ")";
                        colorConditions.push(["${component} === \'" + componentID + "\'", colorStr]);
                        //colorConditions.push(["${component} === \'" + componentID + "\'", "rgba(0, 255, 0, 1)"]);
                    }
                    if (typeof componentStyle.show !== "undefined") {
                        if (!componentStyle.show) {
                            showConditions.push(["${component} === \'" + componentID + "\'", "false"]);
                        }
                    }
                }

                colorConditions.push(["true", "color('white')"]);
                showConditions.push(["true", "true"]);

                pModel.style = new FreeDo.FreeDoPModelStyle({
                    color: {
                        conditions: colorConditions,
                    },
                    show: {
                        conditions: showConditions,
                    },
                });
            }
        }
    }

    /**
     * 高亮某个部件
     * 
     * @param {string} componentID 部件ID
     * @param {string} sceneObjectID 场景对象ID
     * @param {number} r 颜色R分量，范围0~255
     * @param {number} g 颜色G分量，范围0~255
     * @param {number} b 颜色B分量，范围0~255
     * @param {number} a 透明度，范围0~1
     * @returns {boolean} 返回true表示设置成功，否则表示未成功
     */
    FDSceneManager.prototype.highlightComponent = function (componentID, sceneObjectID, r, g, b, a) {
        var pModelID = sceneObjectID;
        if (FreeDo.defined(componentID) && typeof this._pModelMap[pModelID] !== "undefined") {
            if (typeof this._pModelStyleMap[pModelID] === "undefined") {
                this._pModelStyleMap[pModelID] = {};
            }
            var pModelStyle = this._pModelStyleMap[pModelID];
            if (typeof pModelStyle[componentID] === "undefined") {
                pModelStyle[componentID] = {};
            }
            pModelStyle[componentID].color = [r, g, b, a];

            this.updatePModelStyleThrottle();

            return true;
        } else {
            return false;
        }
    }

    /**
     * 恢复所有高亮对象
     */
    FDSceneManager.prototype.unhighlightAllComponents = function () {
        for (var pModelID in this._pModelMap) {
            var pModelStyle = this._pModelStyleMap[pModelID];
            for (var componentID in pModelStyle) {
                delete pModelStyle[componentID]["color"];
            }
        }

        this.updatePModelStyleThrottle();
    }

    /**
     * 显示或者隐藏某个部件
     * @param {string} componentID 组件ID
     * @param {string} sceneObjectID 场景对象ID
     * @param {boolean} show 显示用true表示，隐藏用false表示
     */
    FDSceneManager.prototype.showComponent = function (componentID, sceneObjectID, show) {
        var pModelID = sceneObjectID;
        if (FreeDo.defined(componentID)) {
            var pModel = this._pModelMap[pModelID];
            if (typeof this._pModelStyleMap[pModelID] === "undefined") {
                this._pModelStyleMap[pModelID] = {};
            }
            var pModelStyle = this._pModelStyleMap[pModelID];
            if (typeof pModelStyle[componentID] === "undefined") {
                pModelStyle[componentID] = {};
            }

            if (!show) {
                pModelStyle[componentID].show = false;
            }
        }

        this.updatePModelStyleThrottle();
    }

    /**
     * 显示某个场景对象中所有的组件
     * @param {string} sceneObjectID 场景对象ID
     */
    FDSceneManager.prototype.showAllComponents = function (sceneObjectID) {
        for (var pModelID in this._pModelMap) {
            var pModelStyle = this._pModelStyleMap[pModelID];
            for (var componentID in pModelStyle) {
                delete pModelStyle[componentID]["show"];
            }
        }

        this.updatePModelStyleThrottle();
    }

    /**
     * 注册捕捉FDSceneManager类的回调函数。
     * 事件类型有：sceneObjectsChanged Add Remove Changed。
     * @param {Function} listener 当有事件触发时被执行的函数。
     * @param {Object} [scope] listener函数执行时的绑定的对象。
     * @returns {Freedo.Event~RemoveCallback} 返回一个函数，调用该函数可以取消监听。
     */ 
    FDSceneManager.prototype.on = function (listener, scope) {
        // return this._event.addEventListener(listener, scope);
        return this._eventHelper.add(this._event, listener, scope);
    }

    FDSceneManager.prototype.getAllSceneObjects = function () {
        return FreeDo.clone(this._sceneObjectOpts, true); // 克隆确保不被用户修改原始数据
    }

    /**
     * 删除所有的场景对象，会触发sceneObjectsChanged事件
     */
    FDSceneManager.prototype.removeAllSceneObjects = function () {
        // 清空PModel
        for (var item in this._pModelMap) {
            var pModel = this._pModelMap[item];
            delete this._pModelMap[item];
            var result = this._project._viewer.scene.primitives.remove(pModel);
            if (!result) {
                throw new Error("FDSceneManager.removeAllSceneObjects: error");
            }
        }

        // 清空Model
        // TODO

        // 清空所有对象属性
        for (var key in this._sceneObjectOpts) {
            delete this._sceneObjectOpts[key];
        }

        this._event.raiseEvent("sceneObjectsChanged");
    }

    /**
     * 重置场景管理器中的资源，但不包含事件监听者。
     */
    FDSceneManager.prototype.reset = function () {
        this.removeAllSceneObjects();
    }

    /**
     * 清除掉所有的事件监听者
     */
    FDSceneManager.prototype.clearAllEventListeners = function () {
        this._eventHelper.removeAll();
    }

    // 销毁所有资源
    FDSceneManager.prototype.dispose = function () {
        this.reset();
        this._eventHelper.removeAll();
    }

    return FDSceneManager;
});