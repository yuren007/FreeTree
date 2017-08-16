/*global require*/
define([
    './FreedoX/FDAnalysisLineDistance',
    './FreedoX/FDAnalysisManager',
    './FreedoX/FDAnalysisSegDistance',
    './FreedoX/FDApp',
    './FreedoX/FDCamera',
    './FreedoX/FDFlytoController',
    './FreedoX/FDImageryLayersManager',
    './FreedoX/FDMisc',
    './FreedoX/FDProject',
    './FreedoX/FDRemoteCollaboration',
    './FreedoX/FDSceneManager',
    './FreedoX/FDViewpointsManager2',
    './FreedoX/FDLabelPointsManager',
    './FreedoX/FDWebRTC',
	'./FreedoX/FDVR',
], function (
    FDAnalysisLineDistance,
    FDAnalysisManager,
    FDAnalysisSegDistance,
    FDApp,
    FDCamera,
    FDFlytoController,
    FDImageryLayersManager,
    FDMisc,
    FDProject,
    FDRemoteCollaboration,
    FDSceneManager,
    FDViewpointsManager2,
    FDLabelPointsManager,
    FDWebRTC,
	FDVR
) {
    'use strict';
    /*jshint sub:true*/
    var scope = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
    scope.Freedo = scope.FreeDo; // 临时改的，以后删除

    var FreedoX = scope.Freedo;

    FreedoX["FdAnalysisLineDistance"] = FDAnalysisLineDistance;
    FreedoX["FdAnalysisManager"] = FDAnalysisManager;
    FreedoX["FdAnalysisSegDistance"] = FDAnalysisSegDistance;
    FreedoX["FdApp"] = FDApp;
    FreedoX["FdCamera"] = FDCamera;
    FreedoX["FdFlytoController"] = FDFlytoController;
    FreedoX["FdImageryLayersManager"] = FDImageryLayersManager;
    FreedoX["FdMisc"] = FDMisc;
    FreedoX["FdProject"] = FDProject;
    FreedoX["FdRemoteCollaboration"] = FDRemoteCollaboration;
    FreedoX["FdSceneManager"] = FDSceneManager;
    FreedoX["FdViewpointsManager"] = FDViewpointsManager2;
    FreedoX["FdLabelPointsManager"] = FDLabelPointsManager;
    FreedoX["FdWebRTC"] = FDWebRTC;
    
    return FreedoX;
});