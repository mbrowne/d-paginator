module.exports = Paginator;

//Pagination class

function Paginator(model, collectionName, requestParams, queryParams /* database query parameters */, paginatorModelPath) {
	this._ready = false;
	
	this.model = model;
	this.collectionName = collectionName;
	this.requestParams = requestParams;
	this.queryParams = queryParams;

	this.currentPage = 1;
	this.totalRecordCount = null;
	this.paginatorModelPath = paginatorModelPath;
	
	this.recordsPerPageOptions = [10,20,30,40,50,100];	
	//If allowShowAllRecords is true, an 'All' option will also be created.
	//In the future maybe this could default to true, but currently Derby sometimes crashes with large
	//datasets, so best to have the default be false for now...
	this.allowShowAllRecords = false;
	this.recordsPerPage = parseInt(this.requestParams.query.recordsPerPage) || 30;

	this.mongoError = false;
	
	var self = this;
	self.calculateTotalRecordCount(function(err) {  //calculateTotalRecordCount is asynchronous
		//TODO figure out how to best handle errors; throwing them is problematic
		//in case this method is called via an asynchronous one
		if (err) {
			self.totalRecordCount = -1;
			return false;
		}

		//we set this to true here rather than after the updateModel() call because
		//updateModel() calls _checkReady()
		self._ready = true;
		if (paginatorModelPath) self.updateModel();
		self._onReady.call(self);
	});
}

Paginator.prototype = {
	ready: function(callback) {
		this._onReady = callback;
	}

  , _onReady: function() {}
	
  , _checkReady: function() {
  		if (!this._ready)
  		    //TODO should we return this error in a callback to all the asynchronous methods rather than throwing an exception here?
	  		throw new Error('Paginator methods should be called within a ready() callback');
	}

	//this is asynchronous because it needs to query the database
  , calculateTotalRecordCount: function(callback) {
		var self = this;
		if (!this.queryParams) return;
		var queryParams = this._shallowCopy(this.queryParams);
		
		delete queryParams.$orderby;
		var params = {$count: true, $query: queryParams};

		var query = this.model.query(this.collectionName, params);

 		query.fetch(function(err) {
 			if (err) return callback(err);
 			self.totalRecordCount = query.get().extra;
 			callback(null, self.totalRecordCount);
 		});
	}

  , getQueryForCurrentPage: function() {
		var params = this._shallowCopy(this.queryParams);
  		if (this.recordsPerPage && this.recordsPerPage != -1) {   
			var currentPage = this.requestParams.query.page || 1;
			//TODO
			//We can't check this here without requiring this method be asynchronous...
			//is it sufficient to just have the default MongoDB behavior when getting invalid $skip or $limit?
			//Probably not...MongoDB throws errors like "bad skip value in query"
// 			var totalPages = this.getTotalPages();
// 			if (currentPage > totalPages || currentPage < 0) {
// 				throw new Error("Pagination error: invalid page: "+currentPage);
// 			}
			this.currentPage = currentPage;
		
			params.$skip = this.recordsPerPage * (this.currentPage - 1);
			if (params.$skip < 0) {
				this.currentPage = null;
				throw new Error("Pagination error: invalid page: "+currentPage);
			}
			params.$limit = this.recordsPerPage;
		}
		//console.log('paginator query:');
		//console.log(params);

		return this.model.query(this.collectionName, params);
	}

  , updateModel: function(modelPath) {
  		this._checkReady();
  		
  		if (!modelPath) modelPath = this.paginatorModelPath;
  		
  		var model = this.model;
  		model.set(modelPath, this.toJson());
  	}

  , getTotalPages: function(recalculate) {
		this._checkReady();
  		if (!this._totalPages || recalculate) {
  			//if recordsPerPage is set to "All"
  			if (this.recordsPerPage == -1) this._totalPages = 1;
  			else this._totalPages =  Math.ceil(this.totalRecordCount / this.recordsPerPage);
  		}
		return this._totalPages;
	}
	
	//Used by the view
  , getPages: function() {
  		this._checkReady();
  		var pages = [];
  		for (i=1; i<=this.getTotalPages(); i++) {
  			pages.push({
  				num: i,
  				isCurrent: i==this.currentPage
  			});
  		}
  		return pages;
  	}
  	
  , getNextPage: function() {
  		if (this.currentPage==this.getTotalPages()) return false;
  		return parseInt(this.currentPage) + 1;
	}
	
  , getPrevPage: function() {
  		if (this.currentPage==1) return false;
  		return parseInt(this.currentPage) - 1;
	}

	//get number of first row on this page
  , getStartNum: function() {
  		if (this.totalRecordCount==0) return 0;
  		return ((this.currentPage - 1) * this.recordsPerPage) + 1;
	}
	
	//get number of last row on this page
  , getEndNum: function() {
  		//if recordsPerPage is set to "All"
  		if (this.recordsPerPage == -1) return this.totalRecordCount;
  		var endNum = this.currentPage * this.recordsPerPage;
  		return (this.totalRecordCount < endNum ? this.totalRecordCount: endNum);
	}

  , toJson: function() {
  		this._checkReady();
  		var self = this;
  		
		var json = {};
		for (var key in self) {
			if (key != 'requestParams' && key != 'model' && typeof self[key] != 'function') {
				json[key] = self[key];
			}
		}
		
		json.totalPages = self.getTotalPages();
		json.nextPage = self.getNextPage();
		json.prevPage = self.getPrevPage();
		json.startNum = self.getStartNum();
		json.endNum = self.getEndNum();
		json.currentBaseUrl = self.getCurrentBaseUrl();
		json.pages = self.getPages();
		
		return json;
  	}

	/**
 	 * TODO
	 * @param {array} paramsToExclude (optional)   These parameters will be stripped out of the URL before returning it
	 */
  , getCurrentBaseUrl: function(paramsToExclude) {
        var self = this;
		var url = self.requestParams.url,
			getParams = self.requestParams.query,
			currentBaseUrl;

		//note: we are assuming that page= will always be the first pagination-related parameter in the URL
		var pos = url.search(/(\?|&)page=/);
		if (pos != -1) {
			currentBaseUrl = url.substr(0, pos || undefined);
		}
		else {
			currentBaseUrl = url;
		}
		currentBaseUrl += (currentBaseUrl.indexOf('?') == -1  ?  '?': '&');

		//TODO
//		if (paramsToExclude) {
//			paramsToExclude.forEach(function(param) {
//				for
//			});
//		}

		return currentBaseUrl;

		//commenting (replaced by above code)
		//keep any other GET params in the current URL besides paginator-related ones
		/*
		var glue = '?';
		for (key in getParams) {
			if (key=='page' || key=='recordsPerPage') continue;
			json.currentBaseUrl += glue + key;
			glue = '&';
		}
		json.currentBaseUrl += glue;
		*/
	}
  	
	//Copy just the top level properties of an object.
	//We use this to copy the query parameters since we modify the object, e.g. to add $skip and $limit,
	//but nothing more than 1 level deep.
	//We can't just use Object.create() for this because it seems MongoDB doesn't see the prototype properties
  , _shallowCopy: function(obj) {
		var copy = {},
			keys = Object.keys(obj),
			len = keys.length;

		for (var i=0; i < len; i++) {
			copy[keys[i]] = obj[keys[i]];
		}
		return copy;
	}
}