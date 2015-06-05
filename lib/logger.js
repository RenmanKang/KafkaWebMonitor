var log4js = require('log4js');
var conf = require('../conf/config');

log4js.configure({
	appenders: [ conf.logger.access, conf.logger.app ]
});

var accessLogger = log4js.getLogger(conf.logger.access.category);
accessLogger.setLevel(conf.logger.access.level);

var appLogger = log4js.getLogger(conf.logger.app.category);
appLogger.setLevel(conf.logger.app.level);

module.exports = {
	accessLogger : log4js.getLogger(conf.logger.access.category),
	appLogger : log4js.getLogger(conf.logger.app.category)
};
