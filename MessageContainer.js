/*!
 * Copyright (c) 2012 http://colorhook.com
 * @author: <a href="colorhook@gmail.com">colorhook</a>
 * @license: Released under the MIT License.
 */
/**
 * MessageContainer是基于socket.io设计的多人联机的服务器端工具类。该类需要配合客户端端的MessageAgent使用。
 */

var MessageContainer = {
	
	uuid: 0,

	pemissionDelegate: null,
	
	sessions: {},

	getSocket: function(sessionId){
		return this.sessions[sessionId].socket;
	},

	each: function(func){
		for(var i in this.sessions){
			if(this.sessions[i].agent){
				func(i, this.sessions[i].socket, this.sessions[i].agent);
			}
		}
	},
	getSocketsByGroupId: function(groupId){
		var result = [];
		var agent;
		this.each(function(i, socket, agent){
			if(agent.groups.indexOf(groupId) != -1){
				result.push(socket);
			}
		});
		return result;
	},
	
	getAgentBySocket: function(socket){
		for(var i in this.sessions){
			if(this.sessions[i].socket && socket == this.sessions[i].socket){
				return this.sessions[i].agent;
			}
		}
		return null;
	},

	subscribe: function(socket, agent){
		if(this.sessions[agent.sessionId]){
			return;
		}

		this.each(function(sessionId, iSocket, iAgent){
			iSocket.emit("ms:join", agent);
		});
		this.sessions[agent.sessionId] = {
			socket: socket,
			agent: agent
		};
	},
	unsubscribe: function(socket){
		var self = this;
		var mAgent = this.getAgentBySocket(socket);
		if(!mAgent){
			return;
		}
		this.each(function(sessionId, iSocket, agent){
			if(iSocket != socket){
				iSocket.emit("ms:part", mAgent);
			}
		});
		delete this.sessions[mAgent.sessionId];
	},

	authenticate: function(socket, data){
		if(this.pemissionDelegate){
			return this.pemissionDelegate.authenticate(socket, data);
		}

		return {
			sessionId: MessageContainer.uuid++,
			nickname: data.nickname,
			friends: [],
			groups: []
		}
	},

	hasPermission: function(socket, toId){
		if(this.pemissionDelegate){
			return this.pemissionDelegate.hasPermission(socket, toId);
		}
		var agent = this.getAgentBySocket(socket);
		return agent.friends.indexOf(toId) != -1;
	},
	
	hasGroupPermission: function(socket, groupId){
		if(this.pemissionDelegate){
			return this.pemissionDelegate.hasGroupPermission(socket, groupId);
		}

		var agent = this.getAgentBySocket(socket);
		return agent.groups.indexOf(groupId) != -1;
	}
}

MessageContainer.init = function(io){
	io.sockets.on('connection', function(socket) {
		
		socket.on('ma:connect', function(data) {
			var agent = MessageContainer.authenticate(socket, data);
			if(agent){
				socket.emit('ms:connect', agent);
				MessageContainer.subscribe(socket, agent);
			}else{
				socket.emit('ms:connect', false, "[Error]");
			}
		});
		
		socket.on('disconnect', function () {
			MessageContainer.unsubscribe(socket);
			socket.emit("ms:disconnect");
		});

		socket.on('ma:disconnet', function(data) {
			MessageContainer.unsubscribe(socket);
			socket.emit("ms:disconnect");
		});

		socket.on('ma:list', function(filter) {
			var coll = [];
			MessageContainer.each(function(sid, socket, agent){
				coll.push(agent);
			});
			socket.emit('ms:list', coll);
		});

		socket.on('ma:request', function(params) {
			socket.emit('ms:response', params);
		});
	
		socket.on('ma:message', function(args) {
			var message = args[0],
				to = args[1] || {},
				toId = to.id,
				toGroup = to.group,
				p,
				toSocket,
				mAgent = MessageContainer.getAgentBySocket(socket);

			if(toId){
				p = MessageContainer.hasPermission(socket, toId);
				toSocket = MessageContainer.getSocket(toId);
				if(toSocket){
					if(p){
						toSocket.emit("ms:message", message, mAgent);
					}else{
						toSocket.emit("ms:error", "Has no permission");
					}
				}
			}else if(toGroup){
				p = MessageContainer.hasGroupPermission(socket, toGroup);
				if(p){
					var toSockets = MessageContainer.getSocketsByGroupId(toGroup);
					for(var i = 0, l = toSockets.length; i < l; i++){
						toSocket = toSockets[i];
						if(toSocket){
							toSocket.emit("ms:message", message, mAgent);
						}
					}				
				}else{
					toSocket.emit("ms:error", "Has no permission");
				}
			}else{
				MessageContainer.each(function(sid, iSocket, agent){
					if(iSocket != socket){
						iSocket.emit("ms:message", message, mAgent);
					}
				});
			}
		});

	});
}

exports.MessageContainer = MessageContainer;