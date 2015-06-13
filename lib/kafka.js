var kafka_node = require('kafka-node');
var ZK = require ("zookeeper").ZooKeeper;
var zk_hosts = require('./zk-hosts');
var logger = require('./logger').appLogger;

module.exports.KafkaClient = KafkaClient;

function KafkaClient(id) {
	logger.debug('Create new kafkaClient. id:',id)
	var zkHosts = id ? zk_hosts.getZkHostsById(id) : zk_hosts.getDefaultZkHosts();
	if(!zkHosts) {
		logger.error('Invalid zkHosts: Check zkHosts config file(conf/zkhosts.json)');
		throw new Error('Invalid zkHosts: Check zkHosts config file(conf/zkhosts.json)');
	}

	var hostStr = zkHosts.connectionString;
	if(!hostStr) {
		logger.error('Invalid zkHosts connectionString: Check zkHosts config file; conf/zkhosts.json');
		throw new Error('Invalid zkHosts connectionString: Check zkHosts config file; conf/zkhosts.json');
	}

	var zkClient = getZkClient(hostStr);

	var kafkaClient = new kafka_node.Client(hostStr);
	var kafkaOffset = new kafka_node.Offset(kafkaClient);

	logger.debug('kafkaClient created. id:', zkHosts.id);

	this.getId = function() {
		return zkHosts.id;
	};

	this.getZkHosts = function() {
		return zkHosts;
	};

	this.getZkClient = function() {
		return zkClient;
	};

	this.nodeInfo = function(path, cb) {
		zkClient.a_get(path, null, cb);
	};

	this.nodeChildren = function(path, cb) {
		zkClient.a_get_children(path, null, cb);
	};

	this.nodeList = function(path, cb) {
		zkClient.a_get_children(path, null, function(rc, err, nodes) {
			if(rc === 0) {
				cb(null, nodes.sort());
			} else {
				logger.error(path + ', code:' + rc + ', err:', err);
				cb(err);
			}
		});
	};

	this.topicMetadata = function(topics, cb) {
		kafkaClient.loadMetadataForTopics(topics, cb);
	};

	this.setLogSize = function(tinfo, cb) {
		var topic = tinfo.topic;
		var list = [];
		for(var i = 0; i < tinfo.partitions.length; i++) {
			list.push({ topic: topic, partition: tinfo.partitions[i].partition, time: -1 });
		}
		var totalSize = 0;
		// { 'notifier-topic': { '0': [ 400000 ], '2': [ 400000 ] } }
		kafkaOffset.fetch(list, function(err, resp1) {
			if(err) {
				cb(err);
			} else {
				Object.keys(resp1[topic]).forEach(function(idx) {
					tinfo.partitions[idx].logSize = resp1[topic][idx][0];
					totalSize += tinfo.partitions[idx].logSize;
				});
				tinfo.logSize = totalSize;
				cb(null, tinfo);
			}
		});
	};

	this.close = function(cb) {
		kafkaClient.close();
		zkClient.close();
		cb && cb();
	}
}

function getZkClient(hosts) {
	var zk = new ZK();
	zk.init({
		connect: hosts,
		timeout: 20000,
		debug_level: ZK.ZOO_LOG_LEVEL_WARNING,
		host_order_deterministic: false
	});
	zk.on(ZK.on_connected, function(zkk) {
		logger.debug('zk session established, id=%s', zkk.client_id);
	});
	zk.on(ZK.on_closed, function(zkk) {
		logger.info('zk session closed, id=%s', zkk.client_id);
	});
	return zk;
}
