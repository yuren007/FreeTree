/*global define*/
define(function () {
    'use strict';

    function FDModel() {
        this._event = new FreeDo.Event();
        this._eventHelper = new FreeDo.EventHelper();
        // this._projects = {};
        this._user = "";
        this._aUsers = ["txf", "zyq", "zsc", "ccm", "xgf", "lxh", "test1"];
        this._aPassword = ["txf3", "zyq3", "zsc3", "ccm3", "xgf3", "lxh3", "test15"];

        this._projectsRef = null;
        this._projectInfosRef = null;
        this._onProjectInfosChange = null;

        this._ownersProjectInfos = {};
        this._othersPublicProjectInfos = {};
    }

    function ajax(options) {
        options = options || {};
        options.type = (options.type || "GET").toUpperCase();
        options.dataType = options.dataType || "json";
        options.async = options.async;
        var params = formatParams(options.data);
        if (window.XMLHttpRequest) {
            var xhr = new XMLHttpRequest();
        } else { //IE6及其以下版本浏览器
            var xhr = new ActiveXObject('Microsoft.XMLHTTP');
        }

        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                var status = xhr.status;
                if (status >= 200 && status < 300) {
                    options.success && options.success(xhr.responseText, xhr.responseXML);
                } else {
                    options.fail && options.fail(status);
                }
            }
        }
        if (options.type == "GET") {
            xhr.open("GET", options.url + "?" + params, options.async);
            xhr.send(null);
        } else if (options.type == "POST") {
            xhr.open("POST", options.url, options.async);
            //设置表单提交时的内容类型
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhr.send(params);
        }
    }
    
    /*场景树应用ajax请求start*/
    function myAjax(url, data, callback) {
        var p = new Promise(function (resolve, reject) {
            ajax({
                url: url,
                type: 'GET',
                dataType: "json",
                data: data == null ? '' : JSON.stringify(data),
                async: true,
                contentType: "application/json",
                success: function (resp) {
                    callback(resp);
                    resolve();
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    if (XMLHttpRequest.status == "401") {
                        console.log('...')
                    } else {
                        alert(XMLHttpRequest.responseText);
                    }
                    reject();
                }
            });
        });
        return p;
    }
    /*场景树ajax请求end*/

    //格式化参数
    function formatParams(data) {
        var arr = [];
        for (var name in data) {
            arr.push(encodeURIComponent(name) + "=" + encodeURIComponent(data[name]));
        }
        arr.push(("v=" + Math.random()).replace(".",""));
        return arr.join("&");
    }

    FDModel.prototype.init = function () {
        var config = {
            authDomain: "txf1.wilddog.com",
            syncURL: "https://txf3.wilddogio.com"
        }
        wilddog.initializeApp(config);

        // this._projectsRef = wilddog.sync().ref("freedoProjects/" + this._user);
        // var that = this;
        // this._onProjectsChange = this._projectsRef.on('value', function (snapshot) {
        //     that.projectsChanged(snapshot.val());
        // });

        this._projectsRef = wilddog.sync().ref("fdProjects");
        this._projectInfosRef = wilddog.sync().ref("fdProjectInfos");

        var that = this;
        this._onProjectInfosChange = this._projectInfosRef.on('value', function (snapshot) {
            if (typeof snapshot.val() === "object") {
                that.projectInfosChanged(snapshot.val());
            } else {
                that.projectInfosChanged();
            }
        });
    }

    FDModel.prototype.getImageLayers = function () {
        var res = [];
        ajax({
            async: false, //同步请求
            url: "./res/imageryLayers.json",              //请求地址
            type: "GET",                       //请求方式
            data: {},        //请求参数
            dataType: "json",
            success: function (response, xml) {
                console.log(response)
                res = JSON.parse(response);
            },
            fail: function (status) {
                // 此处放失败后执行的代码
                res = [];
            }
        });
        return res;
    }
    /*场景树获取数据start*/
    FDModel.prototype.getXMLData = function (id, childData) {
        var url = 'http://freedoonline.com:3003/services/pmts/1.0.0/PMTSCapabilities'
        var flag = false;
        var res = [];
        var layer = null;
        var TileMatrixSetName = null;
        var uid = null;
        ajax({
            async: false, //异步请求
            url: url,  //请求地址
            type: "GET", //请求方式
            data: {},        //请求参数
            dataType: "xml",
            success: function (response, xml) {
                flag = true;
                var xmlDom = xml.documentElement;
                layer = xmlDom.getElementsByTagName('Layer');
                var TileMatrixSet = xmlDom.getElementsByTagName('TileMatrixSet')[0];
                TileMatrixSetName = TileMatrixSet.getElementsByTagName('ows:Identifier')[0].innerHTML;
                uid = TileMatrixSet.getElementsByTagName('uid')[0].innerHTML;
                /*发送第二个请求获取json数据*/
                if (flag) {
                    for (let i=0; i<layer.length; i++) {
                        var layerNameAll = layer[i].getElementsByTagName('ows:Identifier')[0];
                        var layerName = layerNameAll.innerHTML;
                        url = 'http://freedoonline.com:3003/services/pmts/1.0.0/cid/'+layerName+'/'+TileMatrixSetName+'/'+ uid;
                    }
                    ajax({
                        async: false, //异步请求
                        url: url,  //请求地址
                        type: "GET", //请求方式
                        data: {},        //请求参数
                        dataType: "json",
                        success: function (response, xml) {

                            res = JSON.parse(response);
                            /*获取cids，并将其放入res.parentE数组中*/
                            //遍历res获取新的uid
                            res.forEach((e, index) => {
                                uid = e.uid;
                                url = 'http://freedoonline.com:3003/services/pmts/1.0.0/cid/'+layerName+'/'+TileMatrixSetName+'/'+ uid;
                                if (e.cids !== undefined) {
                                    ajax({
                                        async: false,
                                        url: url,
                                        type: 'GET',
                                        data: {},
                                        dataType: 'json',
                                        success: function (response, xml) {
                                                e.childE = JSON.parse(response);
                                                e.childE.forEach((e,index) => {
                                                    uid = e.uid;
                                                    url = 'http://freedoonline.com:3003/services/pmts/1.0.0/cid/'+layerName+'/'+TileMatrixSetName+'/'+ uid;
                                                    if (e.cids !== undefined) {
                                                        ajax({
                                                            async: false, //异步请求
                                                            url: url,  //请求地址
                                                            type: "GET", //请求方式
                                                            data: {},        //请求参数
                                                            dataType: "json",
                                                            success:function (response, xml) {
                                                               console.log("看到我了")
                                                               e.childE = JSON.parse(response)
                                                               e.childE.forEach((e ,index) => {
                                                               uid = e.uid;
                                                               url = 'http://freedoonline.com:3003/services/pmts/1.0.0/cid/'+layerName+'/'+TileMatrixSetName+'/'+ uid;
                                                               if (e.cids !== undefined) {
                                                                   ajax({
                                                                       async: false,
                                                                       url: url,
                                                                       type: 'GET',
                                                                       data: {},
                                                                       dataType: 'json',
                                                                       success: function (response, xml) {
                                                                           //console.log('继续发送请求')
                                                                          e.childE = JSON.parse(response)
                                                                          e.childE.forEach((e ,index) => {
                                                                              uid = e.uid;
                                                                              url = 'http://freedoonline.com:3003/services/pmts/1.0.0/cid/'+layerName+'/'+TileMatrixSetName+'/'+ uid;
                                                                              if (e.cids !== undefined) {
                                                                                  ajax({
                                                                                      async: false,
                                                                                      url: url,
                                                                                      type: 'GET',
                                                                                      data: {},
                                                                                      dataType: 'json',
                                                                                      success: function (response, xml) {
                                                                                          e.childE = JSON.parse(response)
                                                                                          e.childE.forEach((e ,index) => {
                                                                                              uid = e.uid;
                                                                                              url = 'http://freedoonline.com:3003/services/pmts/1.0.0/cid/'+layerName+'/'+TileMatrixSetName+'/'+ uid;
                                                                                              if (e.cids !== undefined) {
                                                                                                  ajax({
                                                                                                      async: false,
                                                                                                      url: url,
                                                                                                      type: 'GET',
                                                                                                      data: {},
                                                                                                      dataType: 'json',
                                                                                                      success: function (response, xml) {
                                                                                                          e.childE = JSON.parse(response)
                                                                                                      }
                                                                                                  })
                                                                                              }

                                                                                          })
                                                                                      }
                                                                                  })
                                                                              }

                                                                          })
                                                                      }
                                                                   })
                                                               }

                                               })
                                                            }
                                                        })
                                                    }
                                                })



                                        },
                                        fail: function (status) {
                                            //错误信息
                                        }
                                    })
                                }
                            })
                        },
                        fail: function (status) {
                            // 此处放失败后执行的代码
                            console.log(status)
                            res = {};
                        }
                    })
                }
            },
            fail: function (status) {
                // 此处放失败后执行的代码
                console.log(status)
                res = {};
            }
        });
        return res;
    }

    /*场景树获取数据end*/
    FDModel.prototype.refreshProjects = function () {
        var that = this;
        this._projectInfosRef.once('value', function (snapshot) {
            if (typeof snapshot.val() === "object") {
                that.projectInfosChanged(snapshot.val());
            } else {
                that.projectInfosChanged();
            }
        });
    }

    FDModel.prototype.signin = function (user, password) {
        if (this._user !== "") {
            this.signout();
        }

        var ui = this._aUsers.indexOf(user);
        if (ui !== -1 && password === this._aPassword[ui]) {
            this._user = user;
            this.refreshProjects();
            return true;
        } else if (user + user.length === password) {
            this._user = user;
            this.refreshProjects();
            return true;
        }

        return false;
    }

    FDModel.prototype.uninit = function () {
        this._projectInfosRef.off('value', this._onProjectInfosChange);

        this._projectInfosRef = null;
        this._onProjectInfosChange = null;

        this._projectsRef = null;
    }

    FDModel.prototype.signout = function () {
        if (this._onProjectInfosChange !== null && this._projectsRef !== null) {
            this._user = "";
            this.refreshProjects();
            return true;
        }
    }

    FDModel.prototype.getUser = function () {
        return this._user;
    }

    FDModel.prototype.getCurrentUserName = function () {
        return this._user;
    }

    FDModel.prototype.getOwnersProjectsInfos = function () {
        return this._ownersProjectInfos;
    }

    FDModel.prototype.getOthersPublicProjectsInfos = function () {
        return this._othersPublicProjectInfos;
    }

    FDModel.setDefaultProjectInfo = function (projectInfo) {
        if (typeof projectInfo.public === "undefined") {
            projectInfo.public = false;
        }
        if (typeof projectInfo.iconUrl === "undefined") {
            projectInfo.iconUrl = "images/img_2.png";
        }
        if (typeof projectInfo.description === "undefined") {
            projectInfo.description = "";
        }
    }

    FDModel.prototype.getProjectOptionsAsync = function (projectID, callback) {
        var projectRef = this._projectsRef.child(projectID);
        projectRef.once("value", function (snapshot) {
            // 有一些数值之前没有定义，这里定义一下，避免错误
            var projectOptions = snapshot.val();
            FDModel.setDefaultProjectInfo(projectOptions.projectInfo);
            callback(projectOptions);
        });
    }

    FDModel.prototype.deleteProject = function (projectID) {
        this._projectInfosRef.child(projectID).set(null);
        this._projectsRef.child(projectID).set(null);
    }

    FDModel.prototype.saveProject = function (projectID, projectOptions) {
        this._projectInfosRef.child(projectID).set(projectOptions.projectInfo);
        this._projectsRef.child(projectID).set(projectOptions);
    }

    FDModel.prototype.projectInfosChanged = function (projectInfos) {
        for (var pikey in this._ownersProjectInfos) {
            delete this._ownersProjectInfos[pikey];
        }
        for (var pikey in this._othersPublicProjectInfos) {
            delete this._othersPublicProjectInfos[pikey];
        }

        if (typeof projectInfos !== "undefined") {
            var pi;
            for (var pikey in projectInfos) {
                pi = projectInfos[pikey];
                FDModel.setDefaultProjectInfo(pi);
                if (pi.owner === this._user) {
                    this._ownersProjectInfos[pikey] = pi;
                } else if (typeof pi.public !== "undefined" && pi.public) {
                    this._othersPublicProjectInfos[pikey] = pi;
                }
            }
        }

        this._event.raiseEvent("Changed");
    }

    // 函数返回值是一个函数，调用该函数即可取消监听
    FDModel.prototype.on = function (listener, scope) {
        // return this._event.addEventListener(listener, scope);
        return this._eventHelper.add(this._event, listener, scope);
    }

    FDModel.prototype.reset = function () {
        this.uninit();
    }

    // 销毁所有资源
    FDModel.prototype.dispose = function () {
        this.reset();
        this._eventHelper.removeAll();
    }

    return FDModel;
});