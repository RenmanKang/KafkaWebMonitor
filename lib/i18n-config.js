var i18n = require('i18n');
var conf = require('../conf/config');

i18n.configure({
	locales : conf.locales || ['ko', 'en'],
	defaultLocale: 'ko',
	directory: './locales',
	updateFiles: false,
	extension: '.json'
});

module.exports = {
	init: function(req, res, next) {
		!res._locals && (res._locals = {});

		// inject i18n shorthand method for controllers and views
		res.locals.__ = res._locals.__i = res._locals.__ = res.__i = res.__ = req.__i = req.__ = function() {
			return i18n.__.apply(req, arguments);
		};

		res._locals.__n = res.__n = req.__n = function() {
			return i18n.__n.apply(req, arguments);
		};

		next();
	}
};
