#include "base.h"

static errno_t get_votes_callback(DbResult r)
{
	CHECK_SQL_CALLBACK(3);
	JsonObject *item = json_new_object();

	json_put_number(item, "id", str_to_int(r.argv[0]), 0);
	json_put_string(item, "name", r.argv[1], 0);
	json_put_string(item, "party", r.argv[2], 0);
	json_put_number(item, "votes", str_to_double(r.argv[3]), 0);

	JsonArray *list = (JsonArray *)r.context;
	json_array_add(list, item);
	return 0;
}

static apr_status_t get_home_info(HttpContext *c)
{
	// Close the connection:
	c->request->connection->keepalive = AP_CONN_CLOSE;
	apr_table_set(c->request->headers_out, "Connection", "close");

	DbQuery query = {.dbc = &c->dbc};

	query.sql =
		"select c.Id, c.Name, c.Party, SUM(ov.Votes) as Votes\n"
		"from Candidates c\n"
		"left join OfficeVotes ov on ov.CandidateId = c.Id\n"
		"where c.ElectionId = ?\n"
		"group by c.Id, c.Name\n"
		"order by Votes desc, Name\n";

	JsonArray *result = json_new_array();
	vm_add_node(c, "data", result, 0);

	query.callback_context = result;
	query.callback = get_votes_callback;

	JsonValue argv[2];
	argv[query.argc++] = json_new_int(1, false);

	if (sql_exec(&query, argv) != 0)
		return http_problem(c, NULL, tl("Internal error: failed to get data"), 500);
	else
		return process_model(c, HTTP_OK);
}

static apr_status_t app_page(HttpContext *c)
{
	c->constants.layout_file = NO_LAYOUT_FILE;

	JsonObject *og = json_new_object();
	json_put_string(og, "Type", "website", 0);

	json_put_string(og, "Title", "Vote Stats", 0);
	set_page_title(c, "Vote Stats");

	json_put_string(og, "Description", tl("site description"), 0);

	JsonObject *page = json_get_node(c->view_model, "Page");
	json_put_node(page, "OpenGraph", og, 0);

	return process_view(c);
}

static apr_status_t home_page(HttpContext *c)
{
	return http_redirect(c, "/app", HTTP_MOVED_TEMPORARILY, true);
}

void register_home_controller(void)
{
	CHECK_ERRNO;
	add_endpoint(M_GET, "/", home_page, 0);
	add_endpoint(M_GET, "/app", app_page, 0);
	add_endpoint(M_GET, "/api/home/info", get_home_info, Endpoint_AuthWebAPI);
}
