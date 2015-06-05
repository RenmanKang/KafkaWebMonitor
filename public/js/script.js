String.prototype.trim = function() {
	return this.replace(/(^\s*)|(\s*$)/gi, '');
};

String.prototype.endsWith = function(suffix) {
	return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

String.prototype.endsWith = function(suffix) {
	return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

function isEmpty(str) {
	return !(str && str.trim().length > 0);
}

function BSAlert(type, msg, target, keep) {
	$("#bs-alert").remove();
	var elm = '<div id="bs-alert" style="z-index:999999;display:none;" class="alert alert-'+type+'">'
		+ '<a href="#" class="close" data-dismiss="alert">&times;</a>' + msg + '</div>';

	if(target) {
		$(target).append(elm);
	} else {
		$('body').prepend(elm);
	}

	$("#bs-alert").slideDown(500, function() {
		$(this).alert();
	});
	if(!keep) {
		$("#bs-alert").delay(4000).slideUp(500, function() {
			$(this).alert('close');
		});
	}
}

function showAlert(msg) {
	$('#alertModalBody').html(msg);
	$('#alertModel').modal('show');
}

function hideAlert() {
	$('#alertModel').modal('hide');
}

$(function() {
	$('body').tooltip({ selector: '[data-toggle=tooltip]' });
});
