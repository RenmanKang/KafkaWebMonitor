var async = require('async');
var _ = require('underscore');
var kafka = require('../lib/kafka');//require('kafka-node');
var zk = require('../lib/zk');
var utils = require('../lib/utils');
var conf = require('../conf/config');
var logger = require('../lib/logger').appLogger;

/**
 * Broker : /brokers/ids/{BrokerNo}
 * 	{"jmx_port":-1,"timestamp":"1430375110955","host":"112.175.29.39","version":1,"port":9092}
 *
 * Leader : Topic의 각 partition이 위치한 {BrokerNo}
 *  참고] http://epicdevs.com/17
 *      Replication factor를 N으로 설정할 경우 N개의 replica는 1개의 leader와 N-1개의 follower로 구성됨.
 *  	각 partition에 대한 읽기와 쓰기는 모두 leader에서 이루어지며, follower는 단순히 leader를 복제함.
 * 	/brokers/topics/{topicName}/partitions/{partitionNo}/state.leader
 * 	{"controller_epoch":45,"leader":0,"version":1,"leader_epoch":45,"isr":[0]}
 *
 * Offset :
 *   consumers/{consumerGroup}/offsets/{topicName}/{partitionNo}.getData()
 *   kafka spac(https://cwiki.apache.org/confluence/display/KAFKA/Kafka+data+structures+in+Zookeeper)에 따르면 consumer offset은 long 값으로 저장되나
 *   현재 elasticsearch가 사용하는 conssumer group인 river의 경우 {"offset":65751,"timestamp":"2015-05-10 18:22:03"} 형태로 저장됨
 *
 * LogSize : Topic의 각 partition에 존재하는 maxOffset 값
 *  brokers/topics/{topicName}/partitions-offsets/{partitionNo}/{lastDate}.getData().maxOffset
 * 	{"minOffset":"1311990","maxOffset":"1314744","count":"2754","timestamp":"2015-05-10 16:44:13"}
 *
 * Lag : consumer가 가져간 마지막 offset 값과 topic의 현재 offset 값의 차이. LogSize - Offset
 *
 * Monitoring
 * 	consumer group 내의 topic 별로 LogSize, Offset, Lag 값의 변화 추이를 그래프로 보여주자.
 *
 * // kafka-node 모듈을 이용하여 offset 및 logSize 구하기
 * var kafka = require('kafka-node'),
 *  client = new kafka.Client('112.175.29.45:10013/NHN/NELO2/kafka'),
 *  offset = new kafka.Offset(client);
 *
 *  // consumer가 가져간 Offset 구하기
 *  offset.fetchCommits('consumerGroupId', [
 *  	{ topic: 'topicName', partition: 0 }
 *  ], function (err, data) {
 *  });
 *
 *  // topic partition LogSize
 *  offset.fetch([
 *  	{ topic: 'topicName', partition: 0, time: -1, maxNum: 1 }
 *  ], function (err, data) {
 *  });
 */

var NODE_PATH = {
	broker : '/brokers/ids',
	topic : '/brokers/topics',
	consumer : '/consumers'
};
var REFRESH_INTERVAL = conf.cache_age || 1000 * 60 * 5;
var BROKER_CACHE = {
	expires: new Date().getTime() + REFRESH_INTERVAL,
	brokers: null
};
var TOPIC_CACHE = {
	expires: new Date().getTime() + REFRESH_INTERVAL,
	topics: null
};
var CONSUMER_CACHE = {
	expires: new Date().getTime() + REFRESH_INTERVAL,
	consumers: null
};

exports.index = function(req, res) {
	var zkHosts = zk.getZkHosts();
	if(zkHosts) {
		res.render('index', {
			layout: false,
			zkhosts: zkHosts
		});
	} else {
		res.render('zkhosts', {
			layout: false,
			zkConf: null
		});
	}
};

exports.getZkHosts = function(req, res) {
	var zkConf = zk.getZkHostsConf();
	res.render('zkhosts', {
		layout: false,
		zkConf: zkConf
	});
};

exports.addZkHost = function(req, res) {
	var hosts = req.body.hosts;
	var chroot = req.body.chroot;
	if(!hosts) {
		res.json({status: 403, message: res__i('Zookeeper connection string input required')});
		return;
	}

	var data = { hosts: hosts, chroot: chroot || '' };
	async.waterfall([
		function(cb) {
			zk.saveZkHosts(data, cb);
		},
		function(cb) {
			try {
				zk.resetZkClient();
				kafka.resetKafkaClient(zk.getZkHosts());
				cb();
			} catch(err) {
				cb(err);
			}
		}
	], function(err) {
		if(err) {
			logger.error(err);
			res.json({ status: 500, message: utils.getErrMsg(err) });
		} else {
			res.json({ status: 200, message: 'OK' });
		}
	});
};

/**
 * 화면 좌측 Tree
 *
 * @param req
 * @param res
 */
exports.getKafkaTrees = function(req, res) {
	async.parallel({
		brokers : function(cb) {
			getBrokers(function(err, brokers) {
				var result = [];
				if(!err) {
					brokers.forEach(function(broker) {
						result.push({
							id: 'broker:'+broker.id,
							text: [ broker.data.host, ':', broker.data.port ].join(''),
							children: false
						});
					});
					result = _.sortBy(result, 'text');
				}
				cb(err, result);
			});
		},
		topics : function(cb) {
			getTopics(function(err, topics) {
				var result = [];
				if(!err) {
					topics.forEach(function(topic) {
						result.push({
							id: 'topic:'+topic,
							text: topic,
							children: false
						});
					});
					result = _.sortBy(result, 'text');
				}
				cb(err, result);
			});
		},
		consumers : function(cb) {
			getConsumers(function(err, consumers) {
				var result = [];
				if(!err) {
					consumers.forEach(function(consumer) {
						result.push({
							id: 'consumer:'+consumer,
							text: consumer,
							children: false
						});
					});
					result = _.sortBy(result, 'text');
				}
				cb(err, result);
			});
		}
	}, function(err, results) {
		if(err) {
			logger.error(err);
		}
		var list = [
			{ id: 'broker', text: 'Brokers', children: results.brokers },
			{ id: 'topic', text: 'Topics', children: results.topics },
			{ id: 'consumer', text: 'Consumers', children: results.consumers }
		];
		res.json(list);
	});
};

/**
 * 좌측 Tree에서 선택한 node에 따라 표시될 우측 정보 영역에 출력할 내용
 *
 * @param req
 * @param res
 */
exports.getContent = function(req, res) {
	var node = req.query.node;
	var tmp = node.split(':');
	var type = tmp[0];
	var name = tmp.length > 1 ? tmp[1] : null;

	if(type === 'broker') {
		if(name) {
			BrokerInfo(name, function(err, resp) {
				res.json({ status: 200, type: type, name: name, data: resp });
			});
		} else {
			getBrokerList(function(err, brokers) {
				res.json({ status: 200, type: type, name: name, data: brokers });
			});
		}
	} else if(type === 'topic') {
		if(name) {
			getTopicConsumerList(name, function(err, list) {
				res.json({ status: 200, type: type, name: name, data: list });
			});
		} else {
			async.waterfall([
				function(cb) {
					getTopics(cb);
				},
				function(topics, cb) {
					getTopicList(topics, cb);
				}
			], function(err, resp) {
				if(err) {
					logger.error(err);
				}
				res.json({ status: 200, type: type, name: name, data: resp });
			});
		}
	} else if(type === 'consumer') {
		if(name) {
			getConsumerTopicList(name, function(err, list) {
				res.json({ status: 200, type: type, name: name, data: list });
			})
		} else {
			async.waterfall([
				function(cb) {
					getConsumers(cb);
				},
				function(consumers, cb) {
					getConsumerList(consumers, cb);
				}
			], function(err, resp) {
				if(err) {
					logger.error(err);
				}
				res.json({ status: 200, type: type, name: name, data: resp });
			});
		}
	} else {
		logger.warn('Invalid type;', type);
		res.json({ status: 200, type: type, name: name, data: {} });
	}
};

function parseJsonData(data) {
	try {
		var dataStr = data ? data.toString() : '{}';
		var off = dataStr.lastIndexOf('}');
		if(off != -1) dataStr = dataStr.substring(0, off+1);
		return JSON.parse(dataStr);
	} catch(err) {
		logger.error(err);
		return {};
	}
}

var BrokerInfo = function(id, cb) {
	zk.zkClient.nodeInfo(NODE_PATH.broker+'/'+id, function(rc, err, stat, data) {
		var bInfo = parseJsonData(data);
		if(rc === 0) {
			cb(null, { id: id, stat: stat, data: bInfo });
		} else {
			logger.error('Broker info getting error; code:'+rc, err);
			cb(err, { id: id, stat: stat, data: bInfo });
		}
	});
};

function getBrokers(cb) {
	var now = new Date().getTime();
	if(!BROKER_CACHE.brokers || BROKER_CACHE.expires < now) {
		zk.zkClient.nodeChildren(NODE_PATH.broker, function(rc, err, ids) {
			BROKER_CACHE.expires = now + REFRESH_INTERVAL;
			if(rc === 0) {
				async.map(ids, BrokerInfo, cb);
			} else {
				logger.error('Broker list find error; code:' + rc, err);
				cb(err);
			}
		});
	} else {
		cb(null, BROKER_CACHE.brokers);
	}
}

function getTopics(cb) {
	var now = new Date().getTime();
	if(!TOPIC_CACHE.topics || TOPIC_CACHE.expires < now) {
		zk.zkClient.nodeList(NODE_PATH.topic, function(err, topics) {
			TOPIC_CACHE.expires = now + REFRESH_INTERVAL;
			cb(err, topics);
		});
	} else {
		cb(null, TOPIC_CACHE.topics);
	}
}

function getConsumers(cb) {
	var now = new Date().getTime();
	if(!CONSUMER_CACHE.consumers || CONSUMER_CACHE.expires < now) {
		zk.zkClient.nodeList(NODE_PATH.consumer, function(err, topics) {
			CONSUMER_CACHE.expires = now + REFRESH_INTERVAL;
			cb(err, topics);
		});
	} else {
		cb(null, CONSUMER_CACHE.consumers);
	}
}

/**
 * Broker(Kafka Server) list
 *
 * @param cb
 */
function getBrokerList(cb) {
	var brokers;
	var topics;
	async.waterfall([
		function(cb) {
			async.parallel({
				brokers: function(cb) {
					getBrokers(cb);
				},
				topics: function(cb) {
					getTopics(cb);
				}
			}, function(err, results) {
				if(!err) {
					brokers = results.brokers;
					for(var i = 0; i < brokers.length; i++) {
						brokers[i].topicCount = 0;
					}
					topics = results.topics;
				}
				cb(err);
			});
		},
		function(cb) {
			kafka.topicMetadata(topics, cb);
		},
		function(data, cb) {
			if(data && data.length > 1) {
				var metadata = data[1].metadata;
				var part, topic, bid, found = false;
				for(var x in topics) {
					topic = topics[x];
					part = metadata[topic];
					found = false;
					Object.keys(part).forEach(function(idx) {
						bid = part[idx].leader;
						if(brokers[bid]) {
							if(!found) {
								found = true;
								brokers[bid].topicCount++;
								return;
							}
						} else {
							logger.info('Broker not found for '+bid);
						}
					});
				}
				cb();
			} else {
				cb('Invalid topics metadata');
			}
		}
	], function(err) {
		if(err) {
			logger.error(err);
		}
		cb(err, brokers);
	});
}

/**
 * Topic list
 *
 * @param topics
 * @param cb
 */
function getTopicList(topics, cb) {
	/* data struct
	[
		{
			'0': { nodeId: 0, host: '112.175.29.39', port: 9092 }
		},
		{
			metadata: {
				'notifier-topic2':  {
					'0': { topic: 'notifier-topic2', partition: 0, leader: 0, replicas: [Object], isr: [Object] },
					'1': { topic: 'notifier-topic2', partition: 1, leader: 0, replicas: [Object], isr: [Object] }
				},
				'notifier-topic3': [Object],
				'notifier-topic': [Object]
			}
		}
	]
	 */
	kafka.topicMetadata(topics, function(err, data) {
		var list = [];
		if(data && data.length > 1) {
			var metadata = data[1].metadata;

			var part, topic;
			for(var x in topics) {
				topic = topics[x];
				part = metadata[topic];
				if(!part) continue;

				// t_info = { topic: topic, partitions: [{ partition: 0, logSize: 0, leader: 0, broker: '', ... }], logSize: 0 }
				var t_info = { topic: topic, partitions: [], logSize: 0 };
				Object.keys(part).forEach(function(idx) {
					var broker = data[0][part[idx].leader];
					part[idx].broker = broker.host + ':' + broker.port;
					part[idx].logSize = 0;
					t_info.partitions.push(part[idx]);
				});
				list.push(t_info);
			}

			async.map(list, kafka.setLogSize, function(err, resp) {
				if(err) {
					logger.error('Log size fetch result error;', err);
				}
				cb(err, list);
			});
		} else {
			logger.warn('Topic metadata not found');
			cb(null, list);
		}
	});
}

/**
 * Consumer List
 *
 * @param consumers
 * @param cb
 */
function getConsumerList(consumers, cb) {
	var list = []; // [ { consumer: '', topics: [ { topic: '', offset: 0, partitions: [ partition: 0, offset: 0 ] } ] } ]
	async.each(consumers, function(consumer, cbb) {
		var path = '/consumers/'+consumer+'/offsets';
		zk.zkClient.nodeList(path, function(err, topics) {
			if(!err) {
				setTopicOffset(consumer, topics, function(err, c_info) {
					list.push(c_info);
					cbb(err);
				});
			} else {
				list.push({ consumer: consumer, topics: [] });
				cbb();
			}
		});
	}, function(err) {
		if(err) {
			logger.error(err);
		}
		cb(err, _.sortBy(list, 'consumer'));
	});
}

function setTopicOffset(consumer, topics, cb) {
	var path = '/consumers/'+consumer+'/offsets';
	var c_info = { consumer: consumer, topics: [] };
	async.each(topics, function(topic, cbb) {
		var t_path = path+'/'+topic;
		zk.zkClient.nodeList(t_path, function(err, parts) {
			if(!err) {
				setPartitionOffset(t_path, topic, parts, function(err, t_info) {
					c_info.topics.push(t_info);
					cbb(err);
				});
			} else {
				cbb();
			}
		});
	}, function(err) {
		if(err) {
			logger.error(err);
		}
		cb(err, c_info);
	});
}

function setPartitionOffset(t_path, topic, parts, cb) {
	var t_info = { topic: topic, offset: 0, partitions: [] };
	async.each(parts, function(part, cbb) {
		var p_path = t_path + '/' + part;
		zk.zkClient.nodeInfo(p_path, function (rc, err, stat, data) {
			if(rc === 0) {
				var offset = utils.getOffset(data);
				var p_info = { partition: part, offset: offset };
				if(stat) {
					p_info.ctime = stat.ctime;
					p_info.mtime = stat.mtime;
				}
				t_info.partitions.push(p_info);
				t_info.offset += offset;
				cbb();
			} else {
				logger.error('zk.zkClient.nodeInfo error. path:'+p_path+', err:', err);
				cbb(err);
			}
		});
	}, function(err) {
		if(err) {
			logger.error(err);
		}
		cb(err, t_info);
	});
}

/**
 * 주어진 Topic을 참조하고 있는 Consumer 목록 정보
 *
 * @param topic
 * @param cb
 */
function getTopicConsumerList(topic, cb) {
	var tlist = [];
	async.waterfall([
		function(cb) {
			getConsumers(cb);
		},
		function(consumers, cb) {
			async.each(consumers, function(consumer, cbb) {
				// list = [ { topic: topic, offset: 0 logSize: 0, lag: 0, partitions: [ { partition: 0, offset:0, logSize: 0, lag: 0, owner: '', ctime: '', mtime: '' } ] } ];
				getConsumerTopicList(consumer, function(err, list) {
					if(err) {
						logger.error(err);
					} else if(list && list.length) {
						for(var i = 0; i < list.length; i++) {
							if(topic === list[i].topic) {
								var info = list[i];
								info.consumer = consumer;
								delete info.topic;
								tlist.push(info);
							}
						}
					}
					cbb();
				});
			}, cb);
		}
	], function(err) {
		if(err) {
			logger.error(err);
		}
		cb(null, tlist);
	});
}

/**
 * 주어진 Consumer가 참조하고 있는 Topic 목록 정보
 *
 * @param consumer
 * @param cb
 */
function getConsumerTopicList(consumer, cb) {
	var path = '/consumers/'+consumer+'/offsets';
	async.waterfall([
		function(cb) {
			zk.zkClient.nodeList(path, cb);
		},
		function(topics, cb) {
			getTopicList(topics, cb);
		},
		function(list, cb) {
			// list = [ { topic: topic, logSize: 0, partitions: [ { partition: 0, logSize: 0, lag: 0, leader: 0, broker: ''... } ] } ];
			// new list = [ { topic: topic, offset: 0 logSize: 0, lag: 0, partitions: [ { partition: 0, offset:0, logSize: 0, lag: 0, owner: '', ctime: '', mtime: '' } ] } ];
			async.each(list, function(t_info, cbb) {
				async.each(t_info.partitions, function(part, cbbb) {
					getTopicPartitionInfo(consumer, t_info, part, cbbb);
				}, cbb);
			}, function(err) {
				cb(err, list);
			});
		}
	], function(err, list) {
		if(err) {
			logger.error(err);
		}
		cb(err, list);
	});
}

function getTopicPartitionInfo(consumer, t_info, part, cb) {
	async.parallel({
		offset: function(cb) {
			zk.zkClient.nodeInfo('/consumers/'+consumer+'/offsets/'+part.topic+'/'+part.partition, function(rc, err, stat, data) {
				if(rc === 0) {
					if(stat) {
						part.ctime = stat.ctime;
						part.mtime = stat.mtime;
					}

					var offset = utils.getOffset(data);
					var lag = part.logSize - offset;

					part.offset = offset;
					part.lag = lag;

					if(!t_info.offset) t_info.offset = 0;
					t_info.offset += offset;

					if(!t_info.lag) t_info.lag = 0;
					t_info.lag += lag;

					cb();
				} else {
					logger.error('zk.zkClient.nodeInfo() error; ', err);
					cb(err);
				}
			});
		},
		owner: function(cb) {
			zk.zkClient.nodeInfo('/consumers/'+consumer+'/owners/'+part.topic+'/'+part.partition, function(rc, err, stat, data) {
				if(rc === 0) {
					part.owner = data ? data.toString() : '';
				}
				cb();
			});
		}
	}, function(err, results) {
		if(err) {
			logger.error(err);
		}
		cb(err);
	});
}
