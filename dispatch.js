/*
 * dispatch.js
 */

/**
 * init all paths
 */
var routes = require('./conf/routes');
var preProcessors = [];
var postProcessors = [];

/**
 * register request processor
 */
exports.dispatch = function(app) {
	// init url despatch
	var reqCfg = routes;
	var route, cfg;
	for (var i = 0; i < reqCfg.length; ++i) {
		cfg = reqCfg[i];
		route = require(cfg.path);
		// use configed method
		app[cfg.method](cfg.url, processReq(cfg, route[cfg.fn]));
	}
};

// process request with extension processor
// ALERT: preProcessors and postProcessors are only functional with processors
// configured in nelo2-routes.json
var processReq = function(routeCfg, processor) {
	return function(req, res, next) {
		for ( var i = 0, length = preProcessors.length; i < length; i++) {
			preProcessors[i](req, res, next, routeCfg);
		}
		processor(req, res, next);
	};
};

/**
 * add pre processor
 * 
 * @param {Function}
 *            processor request processor can deal with req,res,next
 */
exports.setupPreProcessor = function(processor) {
	preProcessors.push(processor);
};

/**
 * !!for history reason, post process is not support now, it can be add quickly.
 * add post processor
 * 
 * @param {Function}
 *            processor request processor can deal with req,res,next
 * 
 */
exports.setupPostProcessor = function(processor) {
	postProcessors.push(processor);
};
