var routes = [
	{
		url: '/',
		path: './routes/index',
		fn: 'index',
		method: 'get'
	},
	{
		url: '/zkHosts',
		path: './routes/index',
		fn: 'getZkHosts',
		method: 'get'
	},
	{
		url: '/zkHosts',
		path: './routes/index',
		fn: 'addZkHost',
		method: 'post'
	},
	{
		url: '/api/tree',
		path: './routes/index',
		fn: 'getKafkaTrees',
		method: 'get'
	},
	{
		url: '/api/content',
		path: './routes/index',
		fn: 'getContent',
		method: 'get'
	},
	{
		url: '/chart/:topic/:consumer',
		path: './routes/chart',
		fn: 'showChart',
		method: 'get'
	}
];

module.exports = routes;
