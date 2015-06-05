var async = require('async');
var _ = require('underscore');
var utils = require('../lib/utils');
var conf = require('../conf/config');
var logger = require('../lib/logger').appLogger;

var socketClients = {
	socket: [],
	req: [],
	status: []
};

var kafkaClient;

exports.showChart = function(req, res) {
	kafkaClient = req.kafkaClient;
	var interval = req.query.interval || conf.chart_tick_time || 5000;
	if(interval < 1000) interval = 1000;
	res.render('chart', {
		layout: false,
		topic: req.params.topic,
		consumer: req.params.consumer,
		interval: interval
	});
};

exports.requestChart = function(socket, req) {
	var idx = getSoIndex(socket);
	if(idx === -1) {
		socketClients.socket.push(socket);
		socketClients.req.push(req);
		var now = new Date().getTime();
		socketClients.status.push({
			init_time: now,
			init_logSize: 0,
			init_offset: 0
		});
		responseChart(socket, req, checckResponse);
	} else {
		socketClients.req[idx] = req;
	}
};

exports.stopChart = function(socket) {
	var idx = getSoIndex(socket);
	if(idx != -1) {
		logger.info('Stopping socket.io service; ', socket.id);
		delete socketClients.socket[idx];
		delete socketClients.req[idx];
		delete socketClients.status[idx];
	}
};

function getSoIndex(socket) {
	return socketClients.socket.indexOf(socket);
}

function getStatus(idx) {
	return (idx < socketClients.status.length) ? socketClients.status[idx] : null;
}

function checckResponse(socket, req) {
	var idx = getSoIndex(socket);
	if(idx != -1) {
		req = socketClients.req[idx];
		var tm = req.interval || conf.chart_tick_time || 5000;
		setTimeout(function() {
			responseChart(socket, req, checckResponse);
		}, tm);
	}
}

function responseChart(socket, req, cb) {
	var topic = req.topic;
	var consumer = req.consumer;
	async.waterfall([
		function(cb) {
			kafkaClient.topicMetadata([ topic ], cb);
		},
		function(data, cb) {
			// t_info = { topic: topic, logSize: 0, offset: 0, lag: 0, partitions: [ { partition: 0, logSize: 0, lag: 0, leader: 0, borker: ''... } ] };
			var t_info = { topic: topic, logSize: 0, offset: 0, partitions: [] };
			if(data && data.length > 1) {
				var metadata = data[1].metadata;
				var part = metadata[topic];
				Object.keys(part).forEach(function(idx) {
					part[idx].logSize = 0;
					t_info.partitions.push(part[idx]);
				});
				// Set log size
				kafkaClient.setLogSize(t_info, cb);
			} else {
				cb(null, t_info);
			}
		},
		function(t_info, cb) {
			// t_info = { topic: topic, logSize: 0, offset: 0, lag: 0, partitions: [ { partition: 0, offset:0, logSize: 0, lag: 0, owner: '', ctime: '', mtime: '' } ] };
			async.each(t_info.partitions, function(part, cbb) {
				var path = '/consumers/'+consumer+'/offsets/'+part.topic+'/'+part.partition;
				kafkaClient.nodeInfo(path, function(rc, err, stat, data) {
					if(rc === 0) {

						var offset = utils.getOffset(data);
						var lag = part.logSize - offset;

						part.offset = offset;
						part.lag = lag;

						// Offset
						if(!t_info.offset) t_info.offset = 0;
						t_info.offset += offset;

						// Lag
						if(!t_info.lag) t_info.lag = 0;
						t_info.lag += lag;

						cbb();
					} else {
						logger.error('kafkaClient.nodeInfo() error; ', err);
						cbb(err);
					}
				});
			}, function(err) {
				cb(err, t_info);
			});
		}
	], function(err, t_info) {
		if(err) {
			logger.error(err);
		}

		var idx = getSoIndex(socket);
		if(idx != -1 && t_info) {
			var now = new Date().getTime();
			var logSize = t_info.logSize || 0;
			var offset = t_info.offset || 0;
			var lag = t_info.lag || 0;

			var inc_logSize = 0, inc_offset = 0, proc_tm = 0;
			var status = getStatus(idx);
			if(status) {
				proc_tm = now - status.init_time;
				if(status.init_logSize) {
					inc_logSize = logSize - status.init_logSize;
				} else {
					status.init_logSize = logSize;
				}
				if(status.init_offset) {
					inc_offset = offset - status.init_offset;
				} else {
					status.init_offset = offset;
				}
			}

			var chartRes = {
				tick_time: now,
				proc_time: proc_tm,
				logSize: logSize,
				offset: offset,
				lag: lag,
				increment: {
					logSize: inc_logSize,
					offset: inc_offset
				}
			};
			socket.emit('res', chartRes);
		} else if(idx === -1) {
			logger.info('Socket closed;', socket.id);
		} else {
			logger.info('Invalid chart data; no data.');
		}
		cb(socket, req);
	});
}
