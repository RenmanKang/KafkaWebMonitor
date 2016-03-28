module.exports = {
	port: 9000,
	locales: ['en', 'ko'],
	cookie: {
		path : '/',
		httpOnly : true,
		maxAge: 1000 * 60 * 60 * 24
	},
	static: {
		maxAge: 1000 * 60 * 60 * 24
	},
	// Kafka node caching time. millisecond
	cache_age: 1000 * 60 * 5,
	chart_tick_time: 5000,
	logger: {
		access: {
			category: 'access',
			type: 'dateFile',
			filename: __dirname+'/../logs/kwm-access.log',
			pattern: '-yyyy-MM-dd',
			level: 'DEBUG'
		},
		app: {
			category: 'app',
			type: 'dateFile',
			filename: __dirname+'/../logs/kwm-app.log',
			pattern: '-yyyy-MM-dd',
			level: 'DEBUG'
		}
	}
};