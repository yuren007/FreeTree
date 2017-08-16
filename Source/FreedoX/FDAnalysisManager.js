/*global define*/
define([
	'./FDMisc',
    './FDAnalysisSegDistance',
	'./FDAnalysisLineDistance'
], function (FDMisc, FDAnalysisSegDistance, FDAnalysisLineDistance) {
    'use strict';

    /**
     * 分析管理器，包含测量等功能
     * @alias FdAnalysisManager
     * @class
     */

    function FDAnalysisManager(project) {
		this._project = project;
		this._fdMidc = new FDMisc();
		this._surveyLine = undefined;
    }
    
    /**
     * 设置分析模式
     * @param {string} mode 分析模式，有两种：LINE_DISTANCE，SEGMENTS_DISTANCE
     */
    FDAnalysisManager.prototype.setMode = function (mode) {
		this.reset();
        if (mode === 'LINE_DISTANCE') {
			this._surveyLine = new FDAnalysisLineDistance(this._project);
			this._surveyLine.run('LINE_DISTANCE');
        }
		
		if (mode === 'SEGMENTS_DISTANCE') {
			this._surveyLine = new FDAnalysisLineDistance(this._project);
			this._surveyLine.run('SEGMENTS_DISTANCE');
        }
    }
	
    /**
     * 重置分析模式
     */
	FDAnalysisManager.prototype.reset = function () {
        if(this._surveyLine)this._surveyLine.reset();
    }

    return FDAnalysisManager;
});