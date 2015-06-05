var ChartHnadler = {
	isFirst: true,
	maxTick: 60,
	chart: c3.generate({
		bindto: '#chart',
		data: {
			x: 'x',
			columns: [
				['x', new Date()],
				['data1', 0],
				['data2', 0],
				['data3', 0]
			],
			type: 'line',
			types: {
				data3: 'bar'
			},
			names: {
				data1: 'Log Size',
				data2: 'Offset',
				data3: 'Lag'
			},
			axes: {
				data1: 'y',
				data2: 'y',
				data3: 'y2'
			},
			colors: {
				data1: '#337ab7',
				data2: '#d9534f',
				data3: '#f0ad4e'
			}
		},
		axis: {
			x: {
				type: 'timeseries',
				tick: {
					format: '%H:%M:%S'
				}
			},
			y: {
				show: true,
				label: 'Log Size / Offset',
				tick: {
					format: d3.format(',')
				}
			},
			y2: {
				show: true,
				label: 'Lag',
				tick: {
					format: d3.format(',')
				}
			}
		},
		size: {
			height: 600
		},
		grid: {
			x: {
				show: false
			},
			y: {
				show: true
			}
		},
		tooltip: {
			format: {
				title: function (d) { return 'Tick time ' + moment(d).format('HH:mm:ss'); },
				value: d3.format(',')
			}
		},
		bar: {
			width: 10 // this makes bar width 100px
		}
	}),
	initCondition: function() {
		console.log('initCondition');
		ChartHnadler.isFirst = true;
		ChartHnadler.chart.load({
			columns: [
				['x', new Date()],
				['data1', 0],
				['data2', 0],
				['data3', 0]
			]
		});
	},
	addChartData: function(data) {
		var x = new Date(data.tick_time);
		var logSize = data.logSize;
		var offset = data.offset;
		var lag = data.lag;

		$('#time-badge').text(moment(data.tick_time).format('HH:mm:ss'));
		$('#logsize-badge').text(logSize.toLocaleString());
		$('#offset-badge').text(offset.toLocaleString());
		$('#lag-badge').text(lag.toLocaleString());

		var timer = new Date();
		timer.setHours(0);
		timer.setMinutes(0);
		timer.setSeconds(0);
		timer.setMilliseconds(data.proc_time);
		$('#proc-time-badge').text(moment(timer).format('HH:mm:ss'));
		$('#proc-logsize-badge').text(data.increment.logSize.toLocaleString());
		$('#proc-offset-badge').text(data.increment.offset.toLocaleString());

		var x1, d1, d2, d3;
		if(ChartHnadler.isFirst) {
			x1 = [ 'x', x ];
			d1 = [ 'data1', logSize ];
			d2 = [ 'data2', offset ];
			d3 = [ 'data3', lag ];
			ChartHnadler.isFirst = false;
		} else {
			x1 = ChartHnadler.chart.x()['data1'];
			d1 = ChartHnadler.chart.data.values('data1');
			d2 = ChartHnadler.chart.data.values('data2');
			d3 = ChartHnadler.chart.data.values('data3');
			x1.push(x);
			d1.push(logSize);
			d2.push(offset);
			d3.push(lag);
			if(x1.length > ChartHnadler.maxTick) {
				x1.splice(0,1);
				d1.splice(0,1);
				d2.splice(0,1);
				d3.splice(0,1);
			}
			x1.unshift('x');
			d1.unshift('data1');
			d2.unshift('data2');
			d3.unshift('data3');
		}
		ChartHnadler.chart.load({
			columns: [ x1, d1, d2, d3 ]
		});
	}
};
