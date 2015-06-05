var async = require('async');
var fs = require('fs');
var ZK = require ("zookeeper").ZooKeeper;
var logger = require('./logger').appLogger;

var zkConfPath = __dirname + '/../conf/zkhosts.json';
var zkClient;

function new_zk(hosts, zkclient) {
	var zk = new ZK();
	zk.init({
		connect: hosts,
		timeout: 20000,
		debug_level: ZK.ZOO_LOG_LEVEL_WARNING,
		host_order_deterministic: false
	});
	zk.on(ZK.on_connected, function(zkk) {
		logger.info("zk session established, id=%s", zkk.client_id);
	});
	zk.on(ZK.on_closed, function(zkk) {
		//re-initialize
		//logger.info("zk session close, re-init it");
		//zkclient.zk = new_zk(hosts, zkclient);
		logger.info("zk session close, id=%s", zkk.client_id);
	});
	return zk;
}

function ZkClient(hosts) {
	this.zk = new_zk(hosts, this);

	this.nodeInfo = function(path, cb) {
		this.zk.a_get(path, null, cb);
	};

	this.nodeChildren = function(path, cb) {
		this.zk.a_get_children(path, null, cb);
	};

	this.nodeList = function(path, cb) {
		this.nodeChildren(path, function(rc, err, nodes) {
			if(rc === 0) {
				cb(null, nodes.sort());
			} else {
				logger.error(path + ', code:' + rc + ', err:', err);
				cb(err);
			}
		});
	};
}

module.exports.ZkClient = ZkClient;

function getZkClient(hosts) {
	var conf = getZkHostsConf();
	zkClient = new ZkClient(hosts || getZkHosts(conf));
	if(conf.scheme && conf.auth) {
		var sync = true;
		zkClient.zk.add_auth(conf.scheme, conf.auth, function(rc, err) {
			if (rc !== 0) {
				logger.error('Zookeeper auth error; code:' + rc, err);
			}
			sync = false;
		});
		// convert async to sync
		while(sync) {
			require('deasync').runLoopOnce();
		}
	}
	return zkClient;
}

module.exports.zkClient = getZkClient();
module.exports.resetZkClient = function(hosts) {
	if(zkClient && zkClient.zk) {
		zkClient.zk.close();
	}
	module.exports.zkClient = getZkClient(hosts);
};

module.exports.saveZkHosts = function(data, cb) {
	fs.writeFile(zkConfPath, JSON.stringify(data, null, '\t'), cb);
};

function getZkHostsConf() {
	try {
		var data = fs.readFileSync(zkConfPath, 'utf8');
		return JSON.parse(data);
	} catch(err) {
		return null;
	}
}
module.exports.getZkHostsConf = getZkHostsConf;

function getZkHosts(conf) {
	var conf = conf || getZkHostsConf();
	if(conf) {
		var hosts = conf.hosts;
		if(conf.chroot) {
			hosts += conf.chroot;
		}
		return hosts;
	} else {
        return null;
    }
}
module.exports.getZkHosts = getZkHosts;
