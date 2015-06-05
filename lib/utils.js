var util = require('util');

exports.validIP = function(ip) {
	if(!ip) return false;
	var arr = ip.split('.');
	if(arr.length !== 4) return false;
	var n1, n2;
	for(var i = 0; i < arr.length; i++) {
		n1 = arr[i];
		if(isNaN(n1)) return false;
		n2 = parseInt(n1, 10);
		if(n2 < 0 || n2 > 255) return false;
	}
	return true;
};

exports.endsWith = function(str, suffix) {
	return str.indexOf(suffix, str.length - suffix.length) !== -1;
};

exports.json = function(input) {
	return JSON.stringify(input, null, '    ');
};

exports.convertBytes = function(input) {
	input = parseInt(input, 10);
	if (input < 1024) {
		return input.toString() + ' Bytes';
	} else if (input < 1024 * 1024) {
		//Convert to KB and keep 2 decimal values
		input = Math.round((input / 1024) * 100) / 100;
		return input.toString() + ' KB';
	} else if (input < 1024 * 1024 * 1024) {
		input = Math.round((input / (1024 * 1024)) * 100) / 100;
		return input.toString() + ' MB';
	} else {
		return input.toString() + ' Bytes';
	}
};

exports.to_string = function (input) {
	return input != null ? input.toString() : "";
};

exports.getErrMsg = function(err) {
	var err_msg = err;
	if((err instanceof Error) && err.stack) {
		err_msg = util.format(err) + '\n' + err.stack;
	}
	return err_msg;
};

exports.random = function(low, high) {
	return Math.random() * (high - low) + low;
};

exports.randomInt = function(low, high) {
	return Math.floor(Math.random() * (high - low) + low);
};

exports.getOffset = function(data) {
	try {
		var dataStr = data ? data.toString() : '0';
		var off = dataStr.lastIndexOf('}');
		if (off != -1) dataStr = dataStr.substring(0, off + 1);
		var obj = JSON.parse(dataStr);
		return (obj.offset != undefined) ? obj.offset : obj;
	} catch (err) {
		return 0;
	}
};