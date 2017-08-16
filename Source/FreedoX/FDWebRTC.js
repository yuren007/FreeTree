/*global define*/
define([], function () {
    'use strict';
	
	function FDWebRTC(){
		this.PeerConnection = (window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozRTCPeerConnection);
		this.URL = (window.URL || window.webkitURL || window.msURL || window.oURL);
		this.nativeRTCIceCandidate = (window.mozRTCIceCandidate || window.RTCIceCandidate);
		this.nativeRTCSessionDescription = (window.mozRTCSessionDescription || window.RTCSessionDescription); 
		this.iceServer = {
			"iceServers": [{
				"url": "stun:stun.xten.net"
			}]
		};

		this.room = "";
		this.socket = null;
		this.me = null;
		this.peerConnections = {};
		this.connections = [];
		this.dataChannels = {};
		this.events = {};
	}
    
		
    //绑定事件函数
    FDWebRTC.prototype.on = function(eventName, callback) {
        this.events[eventName] = this.events[eventName] || [];
        this.events[eventName].push(callback);
    };
    //触发事件函数
    FDWebRTC.prototype.emit = function(eventName, _) {
        var events = this.events[eventName],
            args = Array.prototype.slice.call(arguments, 1),
            i, m;

        if (!events) {
            return;
        }
        for (i = 0, m = events.length; i < m; i++) {
            events[i].apply(null, args);
        }
    };

    //本地连接信道，信道为websocket
    FDWebRTC.prototype.connect = function(server, room) {
        var socket,
            that = this;
        room = room || "";
        socket = this.socket = new WebSocket(server);
        socket.onopen = function() {
            socket.send(JSON.stringify({
                "eventName": "__join",
                "data": {
                    "room": room 
                }
            }));
            that.emit("socket_opened", socket);
			console.log("socket_opened");
        };

        socket.onmessage = function(message) {
            var json = JSON.parse(message.data);
            if (json.eventName) {
                that.emit(json.eventName, json.data);
            } else {
                that.emit("socket_receive_message", socket, json);
            }
        };

        socket.onerror = function(error) {
            that.emit("socket_error", error, socket);
        };

        socket.onclose = function(data) {
            var pcs = that.peerConnections;
            //for (i = pcs.length; i--;) {
                //that.closePeerConnection(pcs[i]);
            //}
			for (var key in that.peerConnections) {
				that.closePeerConnection(that.peerConnections[key]);
			}
            that.peerConnections = [];
            that.dataChannels = {};
            that.connections = [];
            that.emit('socket_closed', socket);
			console.log("socket_closed");
        };

        this.on('_peers', function(data) {
			console.log("_peers");
            //获取所有服务器上的
            that.connections = data.connections;
            that.me = data.you;
            that.emit("get_peers", that.connections);
            that.emit('connected', socket);
        });

        this.on("_ice_candidate", function(data) {
			console.log("_ice_candidate");
            var candidate = new that.nativeRTCIceCandidate(data);
            var pc = that.peerConnections[data.socketId];
            pc.addIceCandidate(candidate);
            that.emit('get_ice_candidate', candidate);
        });

        this.on('_new_peer', function(data) {
			console.log("_new_peer");
            that.connections.push(data.socketId);
            var pc = that.createPeerConnection(data.socketId), i, m;
            that.emit('new_peer', data.socketId);
        });

        this.on('_remove_peer', function(data) {
			console.log("_remove_peer");
            var sendId;
            that.closePeerConnection(that.peerConnections[data.socketId]);
            delete that.peerConnections[data.socketId];
            delete that.dataChannels[data.socketId];
            that.emit("remove_peer", data.socketId);
        });

        this.on('_offer', function(data) {
			console.log("_offer");
            that.receiveOffer(data.socketId, data.sdp);
            that.emit("get_offer", data);
        });

        this.on('_answer', function(data) {
			console.log("_answer");
            that.receiveAnswer(data.socketId, data.sdp);
            that.emit('get_answer', data);
        });


        this.on('ready', function() {
			console.log("ready");
            that.createPeerConnections();
            that.addDataChannels();
            that.sendOffers();
        });
    };

    //向所有PeerConnection发送Offer类型信令
    FDWebRTC.prototype.sendOffers = function() {
        var i, m,
            pc,
            that = this,
            pcCreateOfferCbGen = function(pc, socketId) {
                return function(session_desc) {
                    pc.setLocalDescription(session_desc);
                    that.socket.send(JSON.stringify({
                        "eventName": "__offer",
                        "data": {"sdp": session_desc, "socketId": socketId}
                    }));
                };
            },
            pcCreateOfferErrorCb = function(error) {
                console.log(error);
            };
        for (i = 0, m = this.connections.length; i < m; i++) {
            pc = this.peerConnections[this.connections[i]];
            pc.createOffer(pcCreateOfferCbGen(pc, this.connections[i]), pcCreateOfferErrorCb);
        }
    };

    //接收到Offer类型信令后作为回应返回answer类型信令
    FDWebRTC.prototype.receiveOffer = function(socketId, sdp) {
        var pc = this.peerConnections[socketId];
        this.sendAnswer(socketId, sdp);
    };

    //发送answer类型信令
    FDWebRTC.prototype.sendAnswer = function(socketId, sdp) {
        var pc = this.peerConnections[socketId];
        var that = this;
        pc.setRemoteDescription(new this.nativeRTCSessionDescription(sdp));
        pc.createAnswer(function(session_desc) {
            pc.setLocalDescription(session_desc);
            that.socket.send(JSON.stringify({
                "eventName": "__answer",
                "data": {"socketId": socketId, "sdp": session_desc}
            }));
        }, function(error) {
            console.log(error);
        });
    };

    //接收到answer类型信令后将对方的session描述写入PeerConnection中
    FDWebRTC.prototype.receiveAnswer = function(socketId, sdp) {
        var pc = this.peerConnections[socketId];
        pc.setRemoteDescription(new this.nativeRTCSessionDescription(sdp));
    };

    //创建与其他用户连接的PeerConnections
    FDWebRTC.prototype.createPeerConnections = function() {
        var i, m;
        for (i = 0, m = this.connections.length; i < m; i++) {
            this.createPeerConnection(this.connections[i]);
        }
    };

    //创建单个PeerConnection
    FDWebRTC.prototype.createPeerConnection = function(socketId) {
		console.log("createPeerConnection: " + socketId);
        var that = this;
        var pc = new this.PeerConnection(this.iceServer);
        this.peerConnections[socketId] = pc;
        pc.onicecandidate = function(evt) {
			console.log("pc.onicecandidate: ");
            if (evt.candidate){
				console.log("that.socket.send(JSON.stringify)");
                that.socket.send(JSON.stringify({
                    "eventName": "__ice_candidate",
                    "data": {
                        "label": evt.candidate.sdpMLineIndex,
                        "candidate": evt.candidate.candidate,
                        "socketId": socketId
                    }
                }));
			}
            that.emit("pc_get_ice_candidate", evt.candidate, socketId, pc);
        };

        pc.onopen = function() {
            that.emit("pc_opened", socketId, pc);
        };

        pc.ondatachannel = function(evt) {
            that.addDataChannel(socketId, evt.channel);
            that.emit('pc_add_data_channel', evt.channel, socketId, pc);
        };
        return pc;
    };

    //关闭PeerConnection连接
    FDWebRTC.prototype.closePeerConnection = function(pc) {
        if (!pc) return;
        pc.close();
    };

    //消息广播
    FDWebRTC.prototype.broadcast = function(message) {
        var socketId;
        for (socketId in this.dataChannels) {
            this.sendMessage(message, socketId);
        }
    };

    //发送消息方法
    FDWebRTC.prototype.sendMessage = function(message, socketId) {
        if (this.dataChannels[socketId].readyState.toLowerCase() === 'open') {
            this.dataChannels[socketId].send(JSON.stringify({
                type: "__msg",
                data: message
            }));
        }
    };

    //对所有的PeerConnections创建Data channel
    FDWebRTC.prototype.addDataChannels = function() {
        var connection;
        for (connection in this.peerConnections) {
            this.createDataChannel(connection);
        }
    };

    //对某一个PeerConnection创建Data channel
    FDWebRTC.prototype.createDataChannel = function(socketId, label) {
		console.log("createDataChannel: " + socketId);
        var pc, key, channel;
        pc = this.peerConnections[socketId];

        if (!socketId) {
            this.emit("data_channel_create_error", socketId, new Error("attempt to create data channel without socket id"));
        }

        if (!(pc instanceof this.PeerConnection)) {
            this.emit("data_channel_create_error", socketId, new Error("attempt to create data channel without peerConnection"));
        }
        try {
            channel = pc.createDataChannel(label);
        } catch (error) {
            this.emit("data_channel_create_error", socketId, error);
        }

        return this.addDataChannel(socketId, channel);
    };

    //为Data channel绑定相应的事件回调函数
    FDWebRTC.prototype.addDataChannel = function(socketId, channel) {
		
		console.log("addDataChannel:" + socketId);
		
        var that = this;
        channel.onopen = function() {
            that.emit('data_channel_opened', channel, socketId);
        };

        channel.onclose = function(event) {
            delete that.dataChannels[socketId];
            that.emit('data_channel_closed', channel, socketId);
        };

        channel.onmessage = function(message) {
            var json;
            json = JSON.parse(message.data);
            if (json.type === '__file') {
                /*that.receiveFileChunk(json);*/
                that.parseFilePacket(json, socketId);
            } else {
                that.emit('data_channel_message', channel, socketId, json.data);
            }
        };

        channel.onerror = function(err) {
            that.emit('data_channel_error', channel, socketId, err);
        };

        this.dataChannels[socketId] = channel;
        return channel;
    };

	FDWebRTC.prototype.ready = function(){
		this.emit("ready");
	}
	
	FDWebRTC.prototype.exit = function(){
		this.socket.close();
	}
	
    return FDWebRTC;
});