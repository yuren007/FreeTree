/*global define*/
define(function () {
    'use strict';
	function FDCommentsManager(project, commentsOptions) {
		project._options.comments = {};
		
		// 辅助变量
		this._pCMTsGroupMap = {};
		
		//引用
		project._options.comments = this._pCMTsGroupMap;
		this._project = project;
		this._event = new FreeDo.Event();
		this._eventHelper = new FreeDo.EventHelper();

		for (var key in commentsOptions) {
			this.addComment(key, commentsOptions[key]);
		}
	}

	FDCommentsManager.prototype.addComment = function (key, cmtOption) {
		var cmtObject = {};
		cmtObject.id = key;
		cmtObject.option = cmtOption;
		this._pCMTsGroupMap[key] = cmtOption;
		
		setTimeout(() => {
			this._event.raiseEvent("CommentAdded", cmtObject);
		}, 0);
		
		return true;
	}


	FDCommentsManager.prototype.createComment = function (userID, content, tags) {		
		var cmtOption = {};
		var d = new Date();
		var id = FreeDo.createGuid();
		cmtOption.userid = userID;
		cmtOption.content = content;
		cmtOption.date = d.getDate();
		cmtOption.tags = tags;
		
		var cmtObject = {};
		cmtObject.id = id;
		cmtObject.option = cmtOption;
		setTimeout(() => {
			this._event.raiseEvent("CommentAdded", cmtObject);
		}, 0);
		return true;
	}


	FDCommentsManager.prototype.removeComment = function (id) {
		if(typeof(this._pCMTsGroupMap[id]) == "undefined")
			return false;
		
		delete this._pCMTsGroupMap[id];
		
		setTimeout(() => {
			this._event.raiseEvent("CommentRemoved", id);
		}, 0);
		
		return true;
	}

	FDCommentsManager.prototype.clearAllCMTs = function () {
		// 清空
		for (var key in this._pCMTsGroupMap) {
			this.removeComment(key);
		}
	}

	// 函数返回值是一个函数，调用该函数即可取消监听
	FDCommentsManager.prototype.on = function (listener, scope) {
		return this._eventHelper.add(this._event, listener, scope);
	}

	// 销毁所有资源
	FDCommentsManager.prototype.dispose = function () {
		this.clearAllCMTs();
	}

	return FDCommentsManager;
});