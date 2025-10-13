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

struct elec_info
{
	HttpContext *c;
	int id;
	char title[128];
	char description[1024];
};

static errno_t elec_info_callback(DbResult r)
{
	struct elec_info *elec = (struct elec_info *)r.context;
	str_copy(elec->title, sizeof(elec->title), r.argv[0]);
	str_copy(elec->description, sizeof(elec->description), r.argv[1]);
	return 0;
}

static apr_status_t get_election_title(struct elec_info *elec)
{
	strcpy(elec->title, "Vote Stats");
	if (elec->id == 0)
		return OK;

	DbQuery query = {.dbc = &elec->c->dbc};
	query.sql = "select Title, Description from Elections where Id = ?";

	query.callback = elec_info_callback;
	query.callback_context = elec;

	JsonValue argv[1];
	argv[query.argc++] = json_new_int(elec->id, false);

	if (sql_exec(&query, argv) != 0)
		return http_problem(elec->c, NULL, tl("SQL error"), 500);

	return OK;
}

static void get_election_id(struct elec_info *elec)
{
	elec->id = 0;
	elec->title[0] = '\0';
	elec->description[0] = '\0';

	Charray *args = &elec->c->request_args;
	KeyValuePair x;
	while((x = get_next_url_query_argument(args, ';', true)).key != NULL)
	{
		KVP_TO_INT(x, elec->id, "id");
	}
}

static apr_status_t get_home_info(HttpContext *c)
{
	// Close the connection:
	c->request->connection->keepalive = AP_CONN_CLOSE;
	apr_table_set(c->request->headers_out, "Connection", "close");

	struct elec_info elec;
	elec.c = c;
	get_election_id(&elec);

	apr_status_t status = get_election_title(&elec);
	if (status != OK) return status;

	vm_add_number(c, "id", elec.id, 0);
	vm_add(c, "title", elec.title, 0);

	DbQuery query = {.dbc = &c->dbc};
	query.sql =
		"select c.Id, c.Name, c.Party, SUM(ov.Votes) as Votes\n"
		"from Candidates c\n"
		"left join StationVotes ov on ov.CandidateId = c.Id\n"
		"where c.ElectionId = ?\n"
		"group by c.Id, c.Name\n"
		"order by Votes desc, Name\n";

	JsonValue argv[1];
	argv[query.argc++] = json_new_int(elec.id, false);

	JsonArray *result = json_new_array();
	vm_add_node(c, "candidates", result, 0);

	query.callback_context = result;
	query.callback = get_votes_callback;

	if (sql_exec(&query, argv) != 0)
		return http_problem(c, NULL, tl("SQL error"), 500);
	else
		return process_model(c, HTTP_OK);
}

static apr_status_t app_page(HttpContext *c)
{
	c->constants.layout_file = NO_LAYOUT_FILE;

	struct elec_info elec;
	elec.c = c;
	get_election_id(&elec);

	apr_status_t status = get_election_title(&elec);
	if (status != OK) return status;

	JsonObject *og = json_new_object();
	json_put_string(og, "Type", "website", 0);

	json_put_string(og, "Title", elec.title, 0);
	set_page_title(c, elec.title);

	json_put_string(og, "Description", tl("site description"), 0);

	JsonObject *page = json_get_node(c->view_model, "Page");
	json_put_node(page, "OpenGraph", og, 0);

	return process_view(c);
}

static apr_status_t home_page(HttpContext *c)
{
	return http_redirect(c, "/app", HTTP_MOVED_TEMPORARILY, true);
}

static apr_status_t voting_results(HttpContext *c)
{
	struct elec_info elec;
	elec.c = c;
	get_election_id(&elec);
	return save_voting_results(c, elec.id);
}

void register_home_controller(void)
{
	CHECK_ERRNO;
	add_endpoint(M_GET, "/", home_page, 0);
	add_endpoint(M_GET, "/app", app_page, 0);
	add_endpoint(M_GET, "/api/home-info", get_home_info, Endpoint_AuthWebAPI);
	add_endpoint(M_POST, "/api/voting-results", voting_results, Endpoint_AuthWebAPI);
}
