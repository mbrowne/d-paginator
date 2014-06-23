# derby-ui-paginator
Pagination Component for [Derby](http://derbyjs.com)

## Example Usage

In your route:
	
	var Paginator = require('derby-ui-paginator/Paginator');
	
	var category = 'News';
	model.set('_page.category', category);
	var queryParams = {categories: {$in: [category]}},
		paginatorPath = '_session.articles.paginator',
		paginator = new Paginator(model, 'articles', params, queryParams, paginatorPath),
		query = paginator.getQueryForCurrentPage();
		
	model.ref('_page.paginator', '_session.articles.paginator');

	// Get the inital data and subscribe to any updates
	model.subscribe(query, function(err) {
        if (err) return next(err);
        query.ref('_page.articles');
		page.render('articles');
	});

In your view:
	
	{#if articles.length}
		<paginator:info paginator="{_page.paginator}">
	
		{#each _page.articles}
		<article>
			<h1>{title}</h1>
			<p>{introText}</p>
		</article>
		{/each}
		
		<paginator:links paginator="{_page.paginator}">
	{else}
		No articles found in the {_page.category} category.
	{/if}


## License

MIT License