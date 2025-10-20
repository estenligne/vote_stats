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

struct get_locations
{
	Charray *ids;
	JsonObject *locations;
	char parent_id[INT_STORE];
};

static void add_to_locations(struct get_locations *x, const char *id, const char *name, const char *parent_id)
{
	if (str_empty(id))
		return;

	JsonObject *item = json_get_node(x->locations, id);
	if (item != NULL)
		return;

	item = json_new_object();
	json_put_string(item, "name", name, 0);

	char *key = array_to_str(x->ids) + x->ids->length;
	charray_append(x->ids, NS(id));

	if (key == NULL) // if was first time
		key = array_to_str(x->ids);

	json_put_node(x->locations, key, item, 0);

	// add to parent's children
	JsonObject *parent = json_get_node(x->locations, parent_id);
	if (parent == NULL)
		return;

	JsonArray *children = json_get_node(parent, "children");
	if (children == NULL)
	{
		children = json_new_array();
		json_put_node(parent, "children", children, 0);
	}
	json_array_add(children, cJSON_CreateNumber(str_to_double(id)));
}

static errno_t get_locations_callback(DbResult r)
{
	CHECK_SQL_CALLBACK(2);

	struct get_locations *x = (struct get_locations *)r.context;
	assert(x->locations != NULL);

	add_to_locations(x, r.argv[0], r.argv[1], x->parent_id);
	add_to_locations(x, r.argv[2], r.argv[3], r.argv[0]);
	add_to_locations(x, r.argv[4], r.argv[5], r.argv[2]);

	return 0;
}

struct elec_info
{
	HttpContext *c;
	int id;
	char title[128];
	char description[1024];
	row_id_t countryId;
};

static errno_t elec_info_callback(DbResult r)
{
	struct elec_info *elec = (struct elec_info *)r.context;
	str_copy(elec->title, sizeof(elec->title), r.argv[0]);
	str_copy(elec->description, sizeof(elec->description), r.argv[1]);
	elec->countryId = str_to_long(r.argv[2]);
	return 0;
}

static apr_status_t get_election_title(struct elec_info *elec)
{
	strcpy(elec->title, "Vote Stats");
	if (elec->id == 0)
		return OK;

	DbQuery query = {.dbc = &elec->c->dbc};
	query.sql = "select Title, Description, CountryId from Elections where Id = ?";

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
	while((x = get_next_url_query_argument(args, '&', true)).key != NULL)
	{
		KVP_TO_INT(x, elec->id, "id");
	}
}

static apr_status_t get_home_info(HttpContext *c)
{
	// Close the connection:
	c->request->connection->keepalive = AP_CONN_CLOSE;
	apr_table_set(c->request->headers_out, "Connection", "close");

	char buf[1024];

	struct elec_info elec;
	elec.c = c;
	get_election_id(&elec);

	apr_status_t status = get_election_title(&elec);
	if (status != OK) return status;

	vm_add_number(c, "id", elec.id, 0);
	vm_add(c, "title", elec.title, 0);

	vm_add_number(c, "countryId", (double)elec.countryId, 0);

	DbQuery query = {.dbc = &c->dbc};
	query.sql =
		"select c.Id, c.Name, c.Party, SUM(sv.Votes) as Votes\n"
		"from Candidates c\n"
		"left join StationVotes sv on sv.CandidateId = c.Id\n"
		"where c.ElectionId = ?\n"
		"group by c.Id, c.Name\n"
		"order by Votes desc, Name\n";

	JsonValue argv[1];
	argv[query.argc++] = json_new_int(elec.id, false);

	JsonArray *result = json_new_array();
	vm_add_node(c, "candidates", result, 0);

	query.callback_context = result;
	query.callback = get_votes_callback;

	errno_t e = sql_exec(&query, argv);
	if (e != 0)
	{
		strcpy(buf, tl("SQL error"));
		goto finish;
	}

	query.sql =
		"select l0.Id, l0.Name, l1.Id, l1.Name, l2.Id, l2.Name\n"
		"from Locations l0\n"
		"left join Locations l1 on l1.ParentId = l0.Id\n"
		"left join Locations l2 on l2.ParentId = l1.Id\n"
		"where l0.ParentId = ?\n";

	argv[0] = json_new_long(elec.countryId, false);
	assert(query.argc == 1);

	struct get_locations x = {0};
	x.ids = &c->request_body;
	clear_char_array(x.ids);

	x.locations = json_new_object();
	vm_add_node(c, "locations", x.locations, 0);

	sprintf(x.parent_id, "%lld", elec.countryId);
	add_to_locations(&x, x.parent_id, NULL, NULL);

	query.callback_context = &x;
	query.callback =  get_locations_callback;

	e = sql_exec(&query, argv);
	if (e != 0)
		strcpy(buf, tl("SQL error"));

finish:
	if (e != 0)
		return http_problem(c, NULL, buf, 500);
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
