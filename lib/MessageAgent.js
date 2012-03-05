/*!
 * Copyright (c) 2012 http://colorhook.com
 * @author: <a href="colorhook@gmail.com">colorhook</a>
 * @license: Released under the MIT License.
 */
/**
 * MessageAgent是基于socket.io设计的多人联机的客户端工具类。该类需要配合服务器端的MessageContainer使用
 * @example
 * <pre>
 * var messageAgent = new MessageAgent("http://localhost/endpoint");
 * messageAgent.on("connect", function(event, session){
 *	   console.log("已经建立连接");
 *     //发送给所有人（服务器端可以做权限控制）
 *	   messageAgent.sendMessage("Hello");
 * });
 * messageAgent.on("message", function(event, message, remoteClient){
 *	   console.log("收到来自"+remoteClient.id+"的消息:"+message);
 * });
 * messageAgent.connect();
 * </pre>
 */
(function(){
	
	var MessageAgent = function(endpoint){
		var self = this;
		this.session = null;
		this._listeners = {};
		this.socket = io.connect(endpoint);
		this.initSocket();
	}

	MessageAgent.prototype = {
		
		constructor: MessageAgent,
		
		/**
		 * 注册事件监听器
		 * @param type {String} 事件类型
		 * @param listener {Function} 监听器
		 */
		on: function(event, listener){
			if(!this._listeners[event]){
				this._listeners[event] = [];
			}
			this._listeners[event].push(listener);
		},
		/**
		 * 移除某个事件的监听器
		 * @param type {String} 事件名称
		 * @param<Optional> listener {Function} 监听器
		 */
		remove: function(type, listener){
			if(!listener){
				delete this._listeners[type];
			}else{
				var l = this._listeners[type];
				if(l && l.indexOf(listener) != -1){
					l.splice(l.indexOf(listener), 1);
				}
			}
		},
		/**
		 * 某个事件是否有监听器或者指定的监听器
		 * @param type {String} 事件名称
		 * @param<Optional> listener {Function} 
		 */
		has: function(type, listener){
			var l = this._listeners[type];

			if(listener === undefined){
				return l && (l.length > 0);
			}
			return l && l.indexOf(listener) != -1;
		},
		/**
		 * 派发事件
		 * @param event {String|Object} 事件名称或者事件对象
		 * @param<Optional> args {Array} 事件参数
		 */
		dispatch: function(event, args){
			var l = this._listeners[event],
				type,
				e;
			if(event.type){
				type = event.type;
				e = event;
			}else{
				type = event;
				e = {type: type};
			}
			e.target = this;
			if(!l || l.length == 0){
				return;
			}
			l = l.slice();
			for(var i = 0, len = l.length; i < len; i++){
				if(!args){
					args = [];
				}
				if(!Object.prototype.toString.call(args) == '[object Array]'){
					args = [args]
				}
				args.unshift(e);
				l[i].apply(null, args);
			}
		},

		/**
		 * 初始化socket
		 * @internal
		 */
		initSocket: function(){
			var self = this;
			this.socket.on("connect", function(){
				self.connected = true;
			});
			this.socket.on("ms:connect", function(response, msg){
				self.session = response;
				self.dispatch("connect", [self.session, msg]);
			});
			this.socket.on("ms:disconnect", function(response){
				self.socket = null;
				self.session = null;
				self.connected = false;
				self.dispatch("disconnect", []);
			});
			this.socket.on("ms:join", function(remoteClient){
				self.dispatch("join", [remoteClient]);
			});
			this.socket.on("ms:part", function(remoteClient){
				self.dispatch("part", [remoteClient]);
			});
			this.socket.on("ms:message", function(response, remoteClient){
				self.dispatch("message", [response, remoteClient]);
			});
			this.socket.on("ms:error", function(response){
				self.dispatch("error", [response]);
			});
			this.socket.on("ms:list", function(remoteClients){
				self.dispatch("list", [remoteClients]);
			});
			this.socket.on("ms:response", function(response){
				self.dispatch("response", [response]);
			});
		},
		
		/**
		 * 建立连接
		 * @param data {Object} 连接时发送给服务器的参数，服务器可以以参数作为连接凭证
		 */
		connect: function(data){
			if(this.session){
				return;
			}
			var self = this;
			var callback = function(){
				self.socket.emit("ma:connect", data);
			}
			if(this.connected){
				callback();
			}else{
				this.socket.on("connect", function(){
					callback();
				});
			}
		},
		
		/**
		 * 断开连接
		 */
		disconnect: function(){
			if(!this.session){
				return;
			}
			this.socket.emit("ma:disconnect");
		},
		
		/**
		 * 给其他人发消息
		 * @param message {Object} 发送的消息
		 * @param<Optional> to {Object} 消息接收方
		 */
		sendMessage: function(message, to){
			if(!this.session){
				return;
			}
			this.socket.emit("ma:message", [message, to]);
		},
		
		/**
		 * 请求在线列表
		 * @param filter {Object} 取得在线列表
		 */
		list: function(filter){
			if(!this.session){
				return;
			}
			this.socket.emit("ma:list", [filter]);
		},
		/**
		 * 请求server
		 * @param params 请求参数
		 */
		request: function(params){
			if(!this.session){
				return;
			}
			this.socket.emit("ma:request", [params]);
		}

	};

	window.MessageAgent = MessageAgent;
	
})();