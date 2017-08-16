/*global require*/
require({
    baseUrl: '.',
    paths: {
        // domReady : 'https://cdn.bootcss.com/require.js/2.3.3/domReady',
        domReady: 'https://cdn.bootcss.com/require-domReady/2.0.1/domReady.min',
        FreedoX: '../../Source/'
    }
}, [
    './scripts/fdcontroller',
    './components/sceneTree',
    './scripts/qrcode.min'
     //'./components/test2'
], function (FDController, FDscenetree) {
    var freedoUI = new Vue({
        el: '#FreedoUI',
        data: {
            // 是否显示菜单
            isShowMenu: true,
            isShowBottom: false,
            isShowTip: false,
            isShowImageLayer: false,
            isShowMenuSetting: true,
            isSHowVRMode: false,
            bgPhone: false,
            defaultMenu: 1,
            // 是否要显示视点组
            isSelected: -1,
            showDialogs: false,
            showProDel: false,
            showLogin: false,
            showFrame: false,
            showShare: false,
            showToolTip: false,
            // 菜单状态
            menuStatus: "projects_selecting",
            // 项目列表
            ownersProjects: [],
            othersPublicProjects: [],
            // 项目信息
            currentProjectID: undefined,
            currentSelectedID: undefined,
            projectInfo: {
                initialCameraInfo: {}
            },
            // 场景结构
            sceneObjs: [],
            visibleSceneObjs: [],
            newSceneName: "xinpufei1",
            newSceneUrl: "http://gbim360.com:9999/txf/170620/xinpufei_3dtiles_gzip/1",
            XMLData: [],
            // 视点组
            viewpointsGroupIDs: [],
            currentViewpointsGroupID: "",
            currentViewpointsGroupName: "",
            currentViewpointIndex: -1,
            autoShowClose: true,
            viewpointsPlayingLoop: false,
            viewpoints: [],
            newViewpointsGroupName: "viewpointGroup",
            collaborationNumber: 123,
            // 影像图层
            pickImageLayerIndex: -1,
            imageLayerOptions: '',
            imageryLayersLists: [],
            imageryLayers: [],
            visibleImageryLayers: [],
            alphaImageryLayers: [],
            // 标签管理
            labelPointTags: [],
            activedLabelPointTags: [],
            labelPoints: [],
            newLabelPointName: "标签",
            newLabelPointPosition: [0, 0, 0],
            handPick: false,
            // 用户
            user: "",
            password: "",
            currentUser: '',
            loginStatus: false,
            // 代码引用
            frameArr: ['450', '750', false],
            frameURl: '',
            shareURL: '',
            // MISC
            currentCameraInfo: [0, 0, 0, 0, 0, 0],
            renderCameraInfo: [0, 0, 0, 0, 0, 0]
        },
        methods: {
            getCtrl: function () {
                return ctrl;
            },
            toggle: function () {
                this.isShowMenu = !this.isShowMenu;
                this.isShowBottom = false;
                if(!is_PC){
                    this.bgPhone = !this.bgPhone;
                }
                this.showFrame = false;
                this.showShare = false;
            },
            showBottom: function (id) {
                ctrl.setCurrentViewpointGroupID(id);
                this.isShowMenu = !this.isShowMenu;
                this.autoShowClose = true;
                this.isShowBottom = true;
                if(!is_PC){
                    this.bgPhone = false;
                }
            },
            toggleDialogs: function (type) {
                if(type == 'project'){
                    this.showFrame = false;
                    this.showLogin = false;
                    this.showShare = false;
                    this.showDialogs = !this.showDialogs;
                    this.showProDel = !this.showProDel;
                    this.newLabelPointPosition = [0, 0, 0];
                }else if(type == 'login'){
                    this.showDialogs = false;
                    this.showProDel = false;
                    this.showFrame = false;
                    this.showShare = false;
                    this.showLogin = !this.showLogin;
                }else if(type == 'frame') {
                    this.showDialogs = false;
                    this.showProDel = false;
                    this.showLogin = false;
                    this.showShare = false;
                    this.showFrame = !this.showFrame;
                    if(this.showFrame){
                        this.isShowMenu = false;
                        if(!is_PC){
                            this.bgPhone = true;
                        }
                    }else {
                        this.isShowMenu = true;
                        if(!is_PC){
                            this.bgPhone = false;
                        }
                    }
                    var menu = this.frameArr[2] == true ? 1 : 0;
                    this.frameURl = '<iframe id="freedo" src="'+base_url+'?viewer='
                    + this.currentCameraInfo[0]+ ',' + this.currentCameraInfo[1]+','+ this.currentCameraInfo[2] 
                    + '&menu='+menu+'" frameborder="0" style="width:'+this.frameArr[0]+'px;height:'+this.frameArr[1]+'px;"></iframe>';
                }else if(type == 'share') {
                    this.showDialogs = false;
                    this.showProDel = false;
                    this.showLogin = false;
                    this.showFrame = false;
                    this.showShare = !this.showShare;
                    if(this.showShare){
                        this.isShowMenu = false;
                        if(!is_PC){
                            this.bgPhone = true;
                        }
                    }else {
                        this.isShowMenu = true;
                        if(!is_PC){
                            this.bgPhone = false;
                        }
                    }
                    var qrcode = document.getElementById("qrcode");
                    qrcode.innerHTML = '';
                    new QRCode(qrcode,{
                        text: base_url + '?_='+ new Date().getTime(),
                        width: 200,
                        height: 200,
                        colorDark : "#000000",
                        colorLight : "#ffffff",
                        correctLevel : QRCode.CorrectLevel.H
                    });
                    this.shareURL = base_url + '?_='+ new Date().getTime();
                }else if(type == 'closeAll'){
                    this.showDialogs = false;
                    this.showProDel = false;
                    this.showLogin = false;
                    this.showFrame = false;
                    this.showShare = false;
                }
            },
            toggleVR: function (type) {
                if(type){
                    this.isSHowVRMode = true;
                    ctrl.enableVR(true);
                    // 启动全屏模式
                    if(document.documentElement.requestFullscreen) {
                        document.documentElement.requestFullscreen();
                    } else if(document.documentElement.mozRequestFullScreen) {
                        document.documentElement.mozRequestFullScreen();
                    } else if(document.documentElement.webkitRequestFullscreen) {
                        document.documentElement.webkitRequestFullscreen();
                    } else if(document.documentElement.msRequestFullscreen) {
                        document.documentElement.msRequestFullscreen();
                    }
                }else{
                    this.isSHowVRMode = false;
                    ctrl.enableVR(false);
                    // 退出全屏模式
                    if(document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if(document.mozCancelFullScreen) {
                        document.mozCancelFullScreen();
                    } else if(document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    }
                }
            },
            login: function (user, password) {
                this.toggleDialogs('closeAll');
                ctrl.signin(user, password);
                this.currentUser = ctrl.getCurrentUserName();
                this.loginStatus = true;
            },
            loginOut: function() {
                ctrl.signout();
                this.currentUser = ctrl.getCurrentUserName();
                this.loginStatus = false;
            },
            closeTip: function() {
                this.isShowTip = false;
            },
            hideBottomBar: function() {
                this.isShowMenu = false;
                this.isShowBottom = false;
            },
            pickViewpointsGroup: function (index) {
                this.isSelected = index;
            },
            setMenuStatus: function (status) {
                this.menuStatus = status;
                if (this.menuStatus === "scene_settings") {
                    ctrl.resetAllSceneObjectsProperty();
                }
            },
            saveProjectAndSetMenuStatus: function(status) {
                this.setMenuStatus(status);
                ctrl.saveProject();
            },
            openProject: function (projectID) {
                // 判断ua来显示或隐藏侧边栏
                if(!is_PC){
                    this.isShowMenu = !this.isShowMenu;
                    this.bgPhone = !this.bgPhone;
                }
                var that = this;
                ctrl.openProject(projectID, function () {
                    that.setMenuStatus('project_browsing');
                });
                /*展示场景树start*/
                // 展示场景树结构内容
                 scenetree.dataProc();
                /*展示场景树end*/
            },
            closeProject: function () {
                ctrl.saveProject();
                ctrl.closeProject();
                ctrl.flytoGlobe();
                this.setMenuStatus('projects_selecting');
            },
            deleteProject: function () {
                this.setMenuStatus('projects_selecting');
                this.toggleDialogs('closeAll');
                ctrl.deleteProject(this.currentProjectID);
            },
            addNewSceneObj: function (name, url, maximumScreenSpaceError) {
                ctrl.addSceneObj(name, url, maximumScreenSpaceError);
                this.setMenuStatus('scene_settings');
            },
            addNewLabel: function () {
                ctrl.addNewLabel(this.newLabelPointName, this.newLabelPointPosition);
                this.setMenuStatus('labels_settings');
            },
            createProject: function () {
                ctrl.createProject();
                this.setMenuStatus('project_browsing');
            },
            // viewpoints
            addNewViewpointsGroup: function (name) {
                ctrl.addViewpointsGroup(name);
                this.setMenuStatus('viewpoints_settings');
            },
            // imageLayer
            showImageLayer: function () {
                ctrl.getImageryLayer();
                this.isShowImageLayer = true;
                this.isShowMenuSetting = false;
            },
            pickImageLayer: function (index) {
                this.pickImageLayerIndex = index;
                this.imageLayerOptions = this.imageryLayersLists[index];
            },
            cancalSetImage: function () {
                this.imageLayerOptions = '';
                this.isShowImageLayer = false;
                this.isShowMenuSetting = true;
            },
            submitSetImage: function () {
                this.imageLayerOptions = this.imageLayerOptions || "undefined";
                ctrl.addImagerLayer(this.imageLayerOptions);
                this.isShowImageLayer = false;
                this.isShowMenuSetting = true;
            },
            toogleToolTip: function () {
                this.showToolTip = true;
                var that = this;
                setTimeout(function() {
                    that.showToolTip = false;
                }, 1000);
            },
            copyText: function (element) {
                var copy = document.getElementById(element);
                copy.select();
                document.execCommand("Copy");
                this.toogleToolTip();
            },
            // tags
            toggleHandPick: function () {
                ctrl.handPick(!this.handPick);
            }
        },
        watch: {
            visibleSceneObjs: function (newVisibleSceneObjs) {
                var that = this;
                this.sceneObjs.forEach(function (sceneObj) {
                    var id = sceneObj.id;
                    var show = newVisibleSceneObjs.includes(id);
                    ctrl.showSceneObject(id, show, that.menuStatus !== "scene_settings");
                });
            },
            visibleImageryLayers: function (newVisibleImagelayers) {
                var that = this;
                for (var i = 0; i < this.imageryLayers.length; ++i) {
                    if (newVisibleImagelayers.indexOf(i) === -1) {
                        ctrl.showImageryLayer(i, false);
                    } else {
                        ctrl.showImageryLayer(i, true);
                    }
                }
            },
            alphaImageryLayers: function (newAlphaImagelayers) {
                var timer = setTimeout(function (){
                    for (var i = 0; i < newAlphaImagelayers.length; ++i) {
                        ctrl.alphaImageryLayer(newAlphaImagelayers.length-i-1, newAlphaImagelayers[i]);
                    }
                    clearTimeout(timer);
                }, 1000);
            },
            projectInfo: {
                handler: function (value, oldValue) {
                    ctrl.setCurrentProjectInfo(value);
                },
                deep: true
            },
            currentSelectedID: {
                handler: function (value, oldValue) {
                    if (value == undefined) {
                        this.isShowTip = false;
                    } else {
                        this.isShowTip = true;
                    }
                },
                deep: true
            },
            currentCameraInfo: {
                handler: function (value, oldValue) {
                    this.renderCameraInfo = [];
                    for(var i=0; i<value.length; i++){
                        this.renderCameraInfo.push(value[i]);
                    }
                    var intNum = parseInt(this.renderCameraInfo[0]);
                    var floatNum = this.renderCameraInfo[0] - intNum;
                    var floatNum_1 = floatNum * 60;
                    if(intNum > 0){
                        this.renderCameraInfo[0] = intNum +'°'+ parseInt(floatNum_1)+'′'+ parseInt((floatNum_1-parseInt(floatNum_1))*60)+'″  E';
                    }else{
                        this.renderCameraInfo[0] = -intNum +'°'+ -parseInt(floatNum_1)+'′'+ parseInt(-(floatNum_1-parseInt(floatNum_1))*60)+'″  W';
                    }
                    intNum = parseInt(this.renderCameraInfo[1]);
                    var floatNum = this.renderCameraInfo[1] - intNum;
                    var floatNum_1 = floatNum * 60;
                    if(intNum > 0){
                        this.renderCameraInfo[1] = intNum +'°'+ parseInt(floatNum_1)+'′'+ parseInt((floatNum_1-parseInt(floatNum_1))*60)+'″  S';
                    } else {
                        this.renderCameraInfo[1] = -intNum +'°'+ -parseInt(floatNum_1)+'′'+ parseInt(-(floatNum_1-parseInt(floatNum_1))*60)+'″  N';
                    }
                    if(this.renderCameraInfo[2] < 1000){
                        this.renderCameraInfo[2] = Math.round(this.renderCameraInfo[2]) + '米'
                    } else {
                        this.renderCameraInfo[2] = (this.renderCameraInfo[2] / 1000).toFixed(2).toLocaleString() + '公里'
                    }
                    var menu = this.frameArr[2] == true ? 1 : 0;                    
                    this.frameURl = '<iframe id="freedo" src="'+base_url+'?viewer='+ value[0]+ ',' 
                    + value[1]+','+ value[2]+'&menu='+menu+'" frameborder="0" style="width:'+this.frameArr[0]+'px;height:'+this.frameArr[1]+'px;"></iframe>';
                },
                deep: true
            },
            frameArr: {
                handler: function (value, oldValue) {
                    var menu = value[2] == true ? 1 : 0;
                    this.frameURl = '<iframe id="freedo" src="'+base_url+'?viewer='+ this.currentCameraInfo[0]+ ',' 
                    + this.currentCameraInfo[1]+','+ this.currentCameraInfo[2]+'&menu='+menu+'" frameborder="0" style="width:'+value[0]+'px;height:'+value[1]+'px;"></iframe>';
                },
                deep: true
            }
        },
        computed: {
            currentProjectInitialCameraInfo: function () {
                if (this.projectInfo && this.projectInfo.initialCameraInfo &&
                    this.projectInfo.initialCameraInfo.cameraInfo) {
                    return this.projectInfo.initialCameraInfo.cameraInfo;
                } else {
                    return "undefined";
                }
            }
        }
    });
    window.ctrl = new FDController();
    var scenetree = new FDscenetree();
    var base_url = window.location.href;
    var is_PC = ctrl.checkUA();
    ctrl.create("freedoContainer", freedoUI);
});