var fs = require('fs');

var zkConfPath = __dirname + '/../conf/zkhosts.json';

module.exports = {
	saveZkHosts: saveZkHosts,
	addZkHosts: addZkHosts,
	updateZkHosts: updateZkHosts,
	deleteZkHosts: deleteZkHosts,
	clearAll: clearAll,
	loadZkHostsList: loadZkHostsList,
	getZkHostsList: getZkHostsList,
	getZkHosts: getZkHosts,
	getZkHostsById: getZkHostsById,
	getDefaultZkHosts: getDefaultZkHosts
};

var list = loadZkHostsList() || [];

function saveZkHosts(data, cb) {
	fs.writeFile(zkConfPath, JSON.stringify(data, null, '\t'), cb);
}

function addZkHosts(zkHosts, cb) {
	var connectionString = zkHosts.hosts;
	if(zkHosts.chroot) connectionString += zkHosts.chroot;
	zkHosts.connectionString = connectionString;

	var exist = false;
	for(var i = 0; i < list.length; i++) {
		if(list[i].connectionString === connectionString) {
			exist = true;
			break;
		}
	}

	if(exist) {
		cb('Already exist zk connection string.');
	} else {
		list.unshift(zkHosts);
		saveZkHosts(list, function(err) {
			cb(err, zkHosts)
		});
	}
}

function updateZkHosts(zkHosts, cb) {
	var exist = false;
	for(var i = 0; i < list.length; i++) {
		if(list[i].id === zkHosts.id) {
			list[i].hosts = zkHosts.hosts;
			list[i].chroot = zkHosts.chroot;
			var connectionString = zkHosts.hosts;
			if(zkHosts.chroot) connectionString += zkHosts.chroot;
			list[i].connectionString = connectionString;
			exist = true;
			break;
		}
	}

	if(exist) {
		saveZkHosts(list, function(err) {
			cb(err, zkHosts);
		});
	} else {
		addZkHosts(zkHosts, cb);
	}
}

function deleteZkHosts(id, cb) {
	var nlist = [];
	for(var i = 0; i < list.length; i++) {
		if(list[i].id !== id) {
			nlist.push(list[i]);
		}
	}
	saveZkHosts(nlist, function(err) {
		if(!err) {
			list = loadZkHostsList();
		}
		cb && cb(err);
	});
}

function clearAll(cb) {
	saveZkHosts([], function(err) {
		if(!err) {
			list = [];
		}
		cb && cb(err);
	});
}

function loadZkHostsList() {
	try {
		var data = fs.readFileSync(zkConfPath, 'utf8');
		list = JSON.parse(data);
		return list;
	} catch(err) {
		return null;
	}
}

function getZkHostsList() {
	return list;
}

function getZkHostsById(id) {
	var zkHosts = null;
	for(var i = 0; i < list.length; i++) {
		if(list[i].id === id) {
			zkHosts = list[i];
			break;
		}
	}
	return zkHosts;
}

function getZkHosts(hosts, chroot) {
	var zkHosts = null;
	var connStr = hosts;
	if(chroot) connStr += chroot;
	for(var i = 0; i < list.length; i++) {
		if(list[i].connectionString === connStr) {
			zkHosts = list[i];
			break;
		}
	}
	return zkHosts;
}

function getDefaultZkHosts() {
	return (list.length) ? list[0] : null;
}
