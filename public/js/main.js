$(function () {
	loadTree();
	$(window).bind('resize', resizeApp);

	$('#content-refresh-btn').on('click', function() {
		var state = $(this).attr('data-state');
		if(state == 'refresh') {
			if(contentTimer) { clearTimeout(contentTimer); }
			$(this).attr('data-state', 'stop');
			$(this).find('i').removeClass('glyphicon-refresh').addClass('glyphicon-play');
		} else {
			$(this).attr('data-state', 'refresh');
			$(this).find('i').removeClass('glyphicon-play').addClass('glyphicon-refresh');
			loadContent($('#curr-node').val());
		}
	});
});

function resizeApp() {
	$('#kafkaTree').height($(window).height() - $('#kafkaTree').offset().top);
}

function loadTree() {
	$('#kafkaTree').jstree({
		core : {
			data : {
				url : '/api/tree?srch=',
				dataType : 'json',
				data : function (node) {
					return { path : node.id };
				}
			},
			multiple : false,
			themes : {
				name: 'proton',
				responsive: true
			}
		},
		plugins : [ 'search' ]
	});
	//$('#kafkaTree').bind('changed.jstree', function (e, data) {
	$('#kafkaTree').bind('select_node.jstree', function (e, data) {
		loadContent(data.selected);
	}).bind('loaded.jstree', function(e, data) {
		resizeApp();
		$('#search-node').on('keyup', searchNode);
		$('#search-btn').on('click', searchNode);
		$('#refresh-btn').on('click', reloadTree);
		$('#kafkaTree').jstree('select_node', '#broker_anchor');
	});
}

function reloadTree() {
	$('#kafkaTree').jstree('refresh');
}

var srchTimer = false;
function searchNode() {
	var val = $('#search-node').val();
	console.log('search-node:'+val);
	if(val) {
		if(srchTimer) { clearTimeout(srchTimer); }
		srchTimer = setTimeout(function () {
			$('#kafkaTree').jstree(true).search(val);
		}, 250);
	}
}

var contentTimer = false;
function loadContent(node) {
	if(node && Array.isArray(node)) {
		node = node[0];
	}
	console.log('node;',node);
	if(contentTimer) { clearTimeout(contentTimer); }
	$('#content-refresh-btn').attr('disabled', 'disabled');
	$.get('/api/content?node='+node, function(result) {
		$("#bs-alert").remove();
		if(result.status === 200) {
			$('#data-tb').empty();
			if(result.type === 'broker') {
				if(result.name) {
					setBrokerInfo(result);
				} else {
					setBrokerList(result);
				}
			} else if(result.type === 'topic') {
				if(result.name) {
					setTopicConsumerList(result);
				} else {
					setTopicList(result);
				}
			} else if(result.type == 'consumer') {
				if(result.name) {
					setConsumerTopicList(result);
				} else {
					setConsumerList(result);
				}
			}
			$('#curr-node').val(node);
			if($('#content-refresh-btn').attr('data-state') == 'refresh') {
				contentTimer = setTimeout(function() {
					loadContent(node);
				}, 5000);
			}
		} else {
			BSAlert('danger', result.message, '#alert-div', true);
		}
		$('#content-refresh-btn').removeAttr('disabled');
	});
}

function setBrokerList(result) {
	$('#content-title').text('Broker List');
	$('#data-tb').removeClass('table-bordered');
	var thead, tbody, tr;
	$('#data-tb').append('<colgroup><col width="10%" /><col /><col width="15%"/><col width="15%"/></colgroup>');
	thead = $('<thead>');
	tr = $('<tr class="info">');
	tr.append('<th class="_center">ID</th>');
	tr.append('<th>Host</th>');
	tr.append('<th>Port</th>');
	tr.append('<th class="_center">Topic Count</th>');
	thead.append(tr);
	$('#data-tb').append(thead);
	var list = result.data;
	var len = list ? list.length : 0;
	if(len > 0) {
		for(var i = 0; i < len; i++) {
			var cls = (i % 2) === 0 ? 'success' : '';
			tbody = $('<tbody>');
			tr = $('<tr class="'+cls+' broker">');
			tr.append('<td class="_center">'+list[i].id+'</td>');
			tr.append('<td>'+list[i].data.host+'</td>');
			tr.append('<td>'+list[i].data.port+'</td>');
			tr.append('<td class="_center">'+list[i].topicCount.toLocaleString()+'</td>');
			tbody.append(tr);
			$('#data-tb').append(tbody);
		}
	} else {
		$('#data-tb').append('<tbody><tr><td colspan="4" class="_center"><strong>Broker list not found</strong></td></tr></tbody>');
	}
}

function setBrokerInfo(result) {
	$('#content-title').text('Broker '+result.data.data.host+':'+result.data.data.port);
	$('#data-tb').addClass('table-bordered');
	var thead, tbody, tr;
	thead = $('<thead>');
	tr = $('<tr class="info">');
	tr.append('<th>Name</th>');
	tr.append('<th>Value</th>');
	thead.append(tr);
	$('#data-tb').append(thead);

	tbody = $('<tbody>');
	tbody.append('<tr><td>ID</td><td>'+result.data.id+'</td></tr>');
	tbody.append('<tr><td>Host</td><td>'+result.data.data.host+'</td></tr>');
	tbody.append('<tr><td>Port</td><td>'+result.data.data.port+'</td></tr>');

	var stat = result.data && result.data.stat;
	var val;
	for(var p in stat) {
		val = (p === 'ctime' || p === 'mtime') ? moment(stat[p]).format('YYYY-MM-DD HH:mm:ss') : stat[p];
		tbody.append('<tr><td>'+p+'</td><td>'+val+'</td></tr>');
	}
	$('#data-tb').append(tbody);
}

function setTopicList(result) {
	$('#content-title').text('Topic List');
	$('#data-tb').removeClass('table-bordered');

	var thead, tbody, tr;
	thead = $('<thead>');
	tr = $('<tr class="info">');
	tr.append('<th>Topic</th>');
	tr.append('<th class="_center">Partition</th>');
	tr.append('<th class="_right">Log Size</th>');
	tr.append('<th class="_center">Leader</th>');
	thead.append(tr);
	$('#data-tb').append(thead);

	var list = result.data;
	var len = list ? list.length : 0;
	if(len > 0) {
		for(var i = 0; i < len; i++) {
			tbody = $('<tbody>');
			tr = $('<tr class="success topic">');
			tr.append('<td>'+list[i].topic+'</td>');
			tr.append('<td class="_center">-</td>');
			tr.append('<td class="_right">'+list[i].logSize.toLocaleString()+'</td>');
			tr.append('<td class="_center">-</td>');
			tbody.append(tr);

			var parts = list[i].partitions;
			for(var j = 0; j < parts.length; j++) {
				tr = $('<tr class="partition">');
				tr.append('<td></td>');
				tr.append('<td class="_center">'+parts[j].partition+'</td>');
				tr.append('<td class="_right">'+parts[j].logSize.toLocaleString()+'</td>');
				tr.append('<td class="_center">'+parts[j].broker+'</td>');
				tbody.append(tr);
			}
			$('#data-tb').append(tbody);
		}
	} else {
		$('#data-tb').append('<tbody><tr><td colspan="4" class="_center"><strong>Topic list not found</strong></td></tr></tbody>');
	}
}

function setTopicConsumerList(result) {
	$('#content-title').text('Topic '+result.name);
	$('#data-tb').removeClass('table-bordered');

	var thead, tbody, tr;

	thead = $('<thead>');
	tr = $('<tr class="info">');
	tr.append('<th>Consumer</th>');
	tr.append('<th class="_center">Partition</th>');
	tr.append('<th class="_right">Offset</th>');
	tr.append('<th class="_right">Log Size</th>');
	tr.append('<th class="_right">Lag</th>');
	tr.append('<th class="_center">Owner</th>');
	tr.append('<th class="_center">Created</th>');
	tr.append('<th class="_center">Last Seen</th>');
	thead.append(tr);
	$('#data-tb').append(thead);

	var list = result.data;
	var len = list ? list.length : 0;
	if(len > 0) {
		for(var i = 0; i < len; i++) {
			tbody = $('<tbody>');
			tr = $('<tr class="success consumer">');
			tr.append('<td><a href="#" class="chart-link">'+list[i].consumer+'</a></td>');
			tr.append('<td></td>');
			tr.append('<td class="_right">'+list[i].offset.toLocaleString()+'</td>');
			tr.append('<td class="_right">'+list[i].logSize.toLocaleString()+'</td>');
			tr.append('<td class="_right">'+list[i].lag.toLocaleString()+'</td>');
			tr.append('<td></td>');
			tr.append('<td></td>');
			tr.append('<td></td>');
			tbody.append(tr);
			var parts = list[i].partitions;
			for(var j = 0; j < parts.length; j++) {
				tr = $('<tr class="partition">');
				tr.append('<td></td>');
				tr.append('<td class="_center">'+parts[j].partition+'</td>');
				tr.append('<td class="_right">'+parts[j].offset.toLocaleString()+'</td>');
				tr.append('<td class="_right">'+parts[j].logSize.toLocaleString()+'</td>');
				tr.append('<td class="_right">'+parts[j].lag.toLocaleString()+'</td>');
				tr.append('<td class="_center">'+(parts[j].owner ? parts[j].owner : '')+'</td>');
				tr.append('<td class="_center">'+(parts[j].ctime ? moment(parts[j].ctime).format('YYYY-MM-DD HH:mm:ss') : '')+'</td>');
				tr.append('<td class="_center">'+(parts[j].mtime ? moment(parts[j].mtime).format('YYYY-MM-DD HH:mm:ss') : '')+'</td>');
				tbody.append(tr);
			}
			$('#data-tb').append(tbody);
		}

		$('.chart-link').on('click', function(e) {
			e.preventDefault();
			var url = '/chart/'+result.name+'/'+$(this).text();
			showChart(url);
		});
	} else {
		$('#data-tb').append('<tbody><tr><td colspan="8" class="_center"><strong>Consumer list not found</strong></td></tr></tbody>');
	}
}

function setConsumerList(result) {
	$('#content-title').text('Consumer List');
	$('#data-tb').removeClass('table-bordered');
	// result.data = [ { consumer: '', topics: [ { topic: '', offset: 0, partitions: [ partition: 0, offset: 0 ] } ] } ]

	$('#data-tb').append('<colgroup><col width="5%" /><col /><col width="8%"/><col width="8%"/><col width="18%"/><col width="18%"/></colgroup>');

	var thead, tbody, tr;

	thead = $('<thead>');
	tr = $('<tr class="info">');
	tr.append('<th>Consumer</th>');
	tr.append('<th>Topic</th>');
	tr.append('<th class="_center">Partition</th>');
	tr.append('<th class="_right">Offset</th>');
	tr.append('<th class="_center">Created</th>');
	tr.append('<th class="_center">Last Seen</th>');
	thead.append(tr);
	$('#data-tb').append(thead);

	var list = result.data;
	var len = list ? list.length : 0;
	if(len > 0) {
		for(var i = 0; i < len; i++) {
			tbody = $('<tbody>');
			tr = $('<tr class="success consumer">');
			tr.append('<td colspan="7">'+list[i].consumer+'</td>');
			tbody.append(tr);
			var topics = list[i].topics;
			if(topics && topics.length > 0) {
				for(var j = 0; j < topics.length; j++) {
					tr = $('<tr class="active topic">');
					tr.append('<td></td>');
					tr.append('<td>'+topics[j].topic+'</td>');
					tr.append('<td></td>');
					tr.append('<td class="_right">'+topics[j].offset.toLocaleString()+'</td>');
					tr.append('<td></td>');
					tr.append('<td></td>');
					tbody.append(tr);
					var parts = topics[j].partitions;
					for(var x = 0; x < parts.length; x++) {
						tr = $('<tr class="partition">');
						tr.append('<td></td>');
						tr.append('<td></td>');
						tr.append('<td class="_center">'+parts[x].partition+'</td>');
						tr.append('<td class="_right">'+parts[x].offset.toLocaleString()+'</td>');
						tr.append('<td class="_center">'+(parts[x].ctime ? moment(parts[x].ctime).format('YYYY-MM-DD HH:mm:ss') : '')+'</td>');
						tr.append('<td class="_center">'+(parts[x].mtime ? moment(parts[x].mtime).format('YYYY-MM-DD HH:mm:ss') : '')+'</td>');
						tbody.append(tr);
					}
				}
			} else {
				tr = $('<tr class="topic">');
				tr.append('<td colspan="6">&nbsp;&nbsp;Topic list not found</td>');
				tbody.append(tr);
			}
			$('#data-tb').append(tbody);
		}
	} else {
		$('#data-tb').append('<tbody><tr><td colspan="6">&nbsp;&nbsp;<strong>Consumer list not found</strong></td></tr></tbody>');
	}
}

function setConsumerTopicList(result) {
	$('#content-title').text('Consumer '+result.name);
	$('#data-tb').removeClass('table-bordered');

	var thead, tbody, tr;

	thead = $('<thead>');
	tr = $('<tr class="info">');
	tr.append('<th>Topic</th>');
	tr.append('<th class="_center">Partition</th>');
	tr.append('<th class="_right">Offset</th>');
	tr.append('<th class="_right">Log Size</th>');
	tr.append('<th class="_right">Lag</th>');
	tr.append('<th class="_center">Created</th>');
	tr.append('<th class="_center">Last Seen</th>');
	thead.append(tr);
	$('#data-tb').append(thead);

	var list = result.data;
	var len = list ? list.length : 0;
	if(len > 0) {
		for(var i = 0; i < len; i++) {
			tbody = $('<tbody>');
			tr = $('<tr class="success topic">');
			tr.append('<td><a href="#" class="chart-link">'+list[i].topic+'</a></td>');
			tr.append('<td></td>');
			tr.append('<td class="_right">'+list[i].offset.toLocaleString()+'</td>');
			tr.append('<td class="_right">'+list[i].logSize.toLocaleString()+'</td>');
			tr.append('<td class="_right">'+list[i].lag.toLocaleString()+'</td>');
			tr.append('<td></td>');
			tr.append('<td></td>');
			tbody.append(tr);
			var parts = list[i].partitions;
			for(var j = 0; j < parts.length; j++) {
				tr = $('<tr class="partition">');
				tr.append('<td></td>');
				tr.append('<td class="_center">'+parts[j].partition+'</td>');
				tr.append('<td class="_right">'+parts[j].offset.toLocaleString()+'</td>');
				tr.append('<td class="_right">'+parts[j].logSize.toLocaleString()+'</td>');
				tr.append('<td class="_right">'+parts[j].lag.toLocaleString()+'</td>');
				tr.append('<td class="_center">'+(parts[j].ctime ? moment(parts[j].ctime).format('YYYY-MM-DD HH:mm:ss') : '')+'</td>');
				tr.append('<td class="_center">'+(parts[j].mtime ? moment(parts[j].mtime).format('YYYY-MM-DD HH:mm:ss') : '')+'</td>');
				tbody.append(tr);
			}
			$('#data-tb').append(tbody);
		}

		$('.chart-link').on('click', function(e) {
			e.preventDefault();
			var url = '/chart/'+$(this).text()+'/'+result.name;
			showChart(url);
		});

	} else {
		$('#data-tb').append('<tbody><tr><td colspan="7" class="_center">&nbsp;&nbsp;<strong>Topic list not found</strong></td></tr></tbody>');
	}
}

function showChart(url) {
	var popWnd;
	var status = "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes";
	/*
	 if(self.screen) {
	 popWnd = window.open(url, '_blank', status);
	 popWnd.resizeTo(screen.width, screen.height);
	 popWnd.moveTo(0, 0);
	 } else {
	 status += ", fullscreen=yes, resizable=yes";
	 popWnd = window.open(url, '_blank', status);
	 }
	 */
	popWnd = window.open(url, '_blank', status);
}
