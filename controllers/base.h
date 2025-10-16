#ifndef _BASE_CONTROLLER_H_
#define _BASE_CONTROLLER_H_

#include <http_context.h>
#include <file_upload.h>
#include "../includes/enums.h"

void register_account_controller(void);
void register_home_controller(void);

apr_status_t ensure_session_exists(HttpContext *c);

apr_status_t save_voting_results(HttpContext *c, int elecId);

#endif
