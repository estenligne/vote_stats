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
	c->dbc = db_context_init(DBMS_MySQL, NULL);

	startup_init(c, prepare_database, prepare_process);

	apr_status_t status = get_endpoint(c);

	if (status == OK)
		status = authenticate_access(c);

	if (status == OK)
		status = authorize_endpoint(c);

	if (status == OK)
		status = execute_endpoint(c);

	if (0 < status && status < 200) // should never happen
		APP_LOG(LOG_ERROR, "Invalid status code: %d", status);

	http_context_cleanup(c);
	return status;
}
