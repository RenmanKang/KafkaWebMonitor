function addZkHosts(zkHosts) {
	$('#zk-hosts').prepend(''
		+ '<tr id="'+zkHosts.id+'">'
		+ '	<td class="host-td" style="vertical-align: middle;"><a href="/?id='+zkHosts.id+'">'+zkHosts.hosts+'</a></td>'
		+ '	<td class="chroot-td" style="vertical-align: middle;">'+zkHosts.chroot+'</td>'
		+ '	<td style="vertical-align: middle; text-align: center;">'
		+ '		<span class="input-group-btn">'
		+ '			<button type="button" class="btn btn-warning btn-sm btn-edit" data-id="'+zkHosts.id+'">'
		+ '				<i class="glyphicon glyphicon-edit"></i>'
		+ '			</button>'
		+ '		</span>'
		+ '		<span class="input-group-btn">'
		+ '			<button type="button" class="btn btn-danger btn-sm btn-del" data-id="'+zkHosts.id+'">'
		+ '				<i class="glyphicon glyphicon-trash"></i>'
		+ '			</button>'
		+ '		</span>'
		+ '	</td>'
		+ '</tr>'
	);
	$('#'+zkHosts.id).find('.btn-edit').on('click', function(e) {
		setEditBtnEvent(this);
	});
	$('#'+zkHosts.id).find('.btn-del').on('click', function(e) {
		setDelBtnEvent(this);
	});
	$('#hosts').val('');
	$('#chroot').val('');
	$('#hosts').focus();
}

function setAddBtnEvent() {
	var hosts = $('#hosts').val().trim();
	if(isEmpty(hosts)) {
		BSAlert('danger', "<%= __('Zookeeper connection string input required') %>", '#alert-div', true);
		return;
	}
	var chroot = $('#chroot').val().trim();
	$.ajax({
		type: 'post',
		url: '/zkHosts',
		dataType: 'json',
		data: {hosts: hosts, chroot: chroot },
		success: function(result) {
			if(result.status === 200) {
				BSAlert('info', 'Successfully added!', '#alert-div');
				addZkHosts(result.zkHosts);
			} else {
				BSAlert('danger', result.message, '#alert-div', true);
			}
		},
		error: function(err) {
			console.log(err);
			BSAlert('danger', err, '#alert-div', true);
		}
	});
}

function setEditBtnEvent(elm) {
	var id = $(elm).attr('data-id');
	var hosts = $('#'+id).find('.host-td a').text();
	var chroot = $('#'+id).find('.chroot-td').text();
	console.log(hosts+','+chroot);
	$('#'+id).find('.host-td').empty().append('<input type="text" class="form-control input-sm" name="hosts" value="'+hosts+'" />');
	$('#'+id).find('.chroot-td').empty().append('<input type="text" class="form-control input-sm" name="chroot" value="'+chroot+'" />');
	$(elm).unbind('click');
	$(elm).removeClass('btn-warning').addClass('btn-info');
	$(elm).find('i').removeClass('glyphicon-edit').addClass('glyphicon-send');
	$(elm).on('click', function() {
		var id = $(this).attr('data-id');
		var hosts = $('#'+id).find('[name=hosts]').val();
		var chroot = $('#'+id).find('[name=chroot]').val();
		$.ajax({
			type: 'put',
			url: '/zkHosts/'+id,
			dataType: 'json',
			data: {hosts: hosts, chroot: chroot },
			success: function(result) {
				if(result.status === 200) {
					BSAlert('info', 'Successfully updated!', '#alert-div');
				} else {
					BSAlert('danger', result.message, '#alert-div', true);
				}
			},
			error: function(err) {
				console.log(err);
				BSAlert('danger', err, '#alert-div', true);
			}
		});
	});
}

function setDelBtnEvent(elm) {
	var id = $(elm).attr('data-id');
	$.ajax({
		type: 'delete',
		url: '/zkHosts/'+id,
		dataType: 'json',
		success: function(result) {
			if(result.status === 200) {
				BSAlert('info', 'Successfully deleted!', '#alert-div');
				$('#'+id).remove();
			} else {
				BSAlert('danger', result.message, '#alert-div', true);
			}
		},
		error: function(err) {
			console.log(err);
			BSAlert('danger', err, '#alert-div', true);
		}
	});
}
