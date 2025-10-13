#include "base.h"

struct submit
{
	const char *region;
	const char *department;
	const char *district;

	int centerNumber;
	const char *pollingCenter;
	const char *pollingStation;

	int numberOfVoters;
	int invalidVoters;
	FormData resultsDocument;
};

struct results
{
	int candidateId;
	int votes;
};

#define SIZEOF(x) (sizeof(x) / sizeof((x)[0]))

apr_status_t save_voting_results(HttpContext *c, int elecId)
{
	long sessionId = str_to_long(c->identity.sid);

	if (get_request_body(c) != 0)
		return http_problem(c, NULL, tl("Failed to read the request body"), 500);

	struct results res[80];
	int candidates = 0;
	struct submit s = {0};
	FormData fd;
	while (true)
	{
		fd = get_next_form_data_part(&c->request_body, NULL);
		if (fd.content.data == NULL) // no more items
			break;

		const_KVP x = {fd.disposition.name, fd.content.data};

		if (str_equal_ci(x.key, "resultsDocument"))
			s.resultsDocument = fd;

		KVP_TO_STR(x, s.region, "region");
		KVP_TO_STR(x, s.department, "department");
		KVP_TO_STR(x, s.district, "district");

		KVP_TO_INT(x, s.centerNumber, "centerNumber");
		KVP_TO_STR(x, s.pollingCenter, "pollingCenter");
		KVP_TO_STR(x, s.pollingStation, "pollingStation");

		KVP_TO_INT(x, s.numberOfVoters, "numberOfVoters");
		KVP_TO_INT(x, s.invalidVoters, "invalidVoters");

		if (str_starts_with(x.key, "candidate_", 0) && candidates < SIZEOF(res))
		{
			res[candidates].candidateId = atoi(x.key + 10);
			KVP_TO_INT(x, res[candidates].votes, x.value);
			candidates++;
		}
	}

	return OK;
}
