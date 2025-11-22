#include "controllers/base.h"

/* Called only once after the server starts. */
static void prepare_database(HttpContext *c)
{
	database_apply_migrations(&c->dbc, NULL);
}

/* Called only once per child process. Use to register endpoints. */
static void prepare_process(HttpContext *c)
{
	(void)c; // unused for now
	register_account_controller();
	register_home_controller();
	register_file_upload_controller();
}

apr_status_t http_request_handler(const module_rec *m, request_rec *r)
{
	HttpContext c[1]; // no need to clear
	http_context_init(c, m, r, NULL);

	// below must come right after above
	c->dbc.dbms = DBMS_MySQL;
	db_context_init(&c->dbc);

	startup_init(c, prepare_database, prepare_process);

	apr_status_t status = get_endpoint(c);

	if (status == OK)
		status = authenticate_access(c);

	if (status == OK)
		status = authorize_endpoint(c);

	if (status == OK)
		status = execute_endpoint(c);

	return http_context_cleanup(c, status);
}

apr_status_t child_process_cleanup(const module_rec *m)
{
	return finish_process_cleanup(m, OK);
}
