
exports.changeRecordsPerPage = function(e, el) {
	//TODO figure out why e.get('recordsPerPage') always returns the previous selection
	//rather than the number that was just selected.
	//We just do it manually for now
	var recordsPerPage = el.options[el.selectedIndex].value;

	var paginator = e.get(':paginator');
	//re-query the current page
	app.history.push(paginator.currentBaseUrl + 'page=1&recordsPerPage='+recordsPerPage);
}
