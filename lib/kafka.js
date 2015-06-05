var kafka_node = require('kafka-node');
var zk = require('./zk');
var logger = require('./logger').appLogger;

var kafkaClient = new kafka_node.Client(zk.getZkHosts());
var kafkaOffset = new kafka_node.Offset(kafkaClient);

module.exports.kafkaClient = kafkaClient;
module.exports.kafkaOffset = kafkaOffset;

module.exports.resetKafkaClient = function(zkHosts) {
	this.kafkaClient.close(function() {
		logger.info("kafka client session closed.");
		kafkaClient = new kafka_node.Client(zkHosts || zk.getZkHosts());
		kafkaOffset = new kafka_node.Offset(kafkaClient);
		module.exports.kafkaClient = kafkaClient;
		module.exports.kafkaOffset = kafkaOffset;
	});
};

module.exports.topicMetadata = function(topics, cb) {
	kafkaClient.loadMetadataForTopics(topics, cb);
};

module.exports.setLogSize = function(tinfo, cb) {
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