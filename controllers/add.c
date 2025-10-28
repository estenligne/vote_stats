#include "base.h"

#define SIZEOF(x) (sizeof(x) / sizeof((x)[0]))

struct submit
{
	HttpContext *c;
	row_id_t region;
	const char *division;
	const char *district;

	int centerNumber;
	const char *pollingCenter;
	const char *pollingStation;

	int numberOfVoters;
	int invalidVotes;
	FormData resultsDocument;

	int centerId;
	int stationId;
	row_id_t locationId;
	row_id_t submissionId;
};

struct results
{
	int candidateId;
	int votes;
};

struct location
{
	row_id_t countryId, regionId, divisionId, districtId;
};

static errno_t location_callback(DbResult r)
{
	CHECK_SQL_CALLBACK(4);
	struct location *loc = r.context;
	loc->countryId = str_to_long(r.argv[0]);
	loc->regionId = str_to_long(r.argv[1]);
	loc->divisionId = str_to_long(r.argv[2]);
	loc->districtId = str_to_long(r.argv[3]);
	return ERR_NONE;
}

enum StringNormalizeOptions
{
	StringNormalize_Lowercase,
	StringNormalize_Uppercase,
	StringNormalize_Capitalize,
};

void str_normalize(char *output, size_t capacity, const char *input, enum StringNormalizeOptions options)
{
	(void)options;
	str_copy(output, capacity, input);
}

static errno_t _sql_exec(DbQuery *query, JsonValue *argv, Charray *buffer)
{
	errno_t e = sql_exec(query, argv);
	if (!FINE(e))
		bprintf(buffer, tl("SQL error"), NULL);
	return e;
}

static errno_t get_station_location(Charray *buffer, struct submit *s, int electionId)
{
	DbQuery query = {.dbc = &s->c->dbc};
	query.sql =
		"SELECT co.Id, re.Id, de.Id, di.Id\n"
		"FROM Elections el\n"
		"JOIN Locations co ON co.Id = el.CountryId AND el.Id = ?\n"
		"JOIN Locations re ON re.ParentId = co.Id AND re.Id = ?\n"
		"LEFT JOIN Locations de ON de.ParentId = re.Id AND de.Name = ?\n"
		"LEFT JOIN Locations di ON di.ParentId = de.Id AND di.Name = ?\n";

	struct location loc = {0};
	query.callback = location_callback;
	query.callback_context = &loc;

	JsonValue argv[5];
	argv[query.argc++] = json_new_int(electionId, false);
	argv[query.argc++] = json_new_long(s->region, false);
	argv[query.argc++] = json_new_str(s->division, false);
	argv[query.argc++] = json_new_str(s->district, false);

	errno_t e = _sql_exec(&query, argv, buffer);
	if (!FINE(e))
		return e;

	if (loc.regionId == 0) // cannot be false
	{
		APP_LOG(LOG_ERROR, "Got loc.regionId == 0. How comes?!");
		return ERR_INVAL;
	}

	char name[128];
	enum StringNormalizeOptions opt = StringNormalize_Capitalize;
	query.sql = "INSERT INTO Locations (Type, ParentId, Name) VALUES (?, ?, ?)";

	if (loc.divisionId == 0)
	{
		str_normalize(name, sizeof(name), s->division, opt);
		query.insert_id = &loc.divisionId;

		query.argc = 0;
		argv[query.argc++] = json_new_int(LocationType_Division, false);
		argv[query.argc++] = json_new_long(loc.regionId, false);
		argv[query.argc++] = json_new_str(name, false);

		e = _sql_exec(&query, argv, buffer);
		if (!FINE(e))
			return e;
	}

	if (loc.districtId == 0)
	{
		str_normalize(name, sizeof(name), s->district, opt);
		query.insert_id = &loc.districtId;

		query.argc = 0;
		argv[query.argc++] = json_new_int(LocationType_District, false);
		argv[query.argc++] = json_new_long(loc.divisionId, false);
		argv[query.argc++] = json_new_str(name, false);

		e = _sql_exec(&query, argv, buffer);
		if (!FINE(e))
			return e;
	}

	s->locationId = loc.districtId;
	return ERR_NONE;
}

static errno_t int_result_callback(DbResult r)
{
	CHECK_SQL_CALLBACK(1);
	int *id = r.context;
	*id = str_to_int(r.argv[0]);
	return ERR_NONE;
}

static errno_t get_polling_center(Charray *buffer, struct submit *s, int electionId)
{
	DbQuery query = {.dbc = &s->c->dbc};
	query.sql = "SELECT id FROM PollingCenters WHERE ElectionId = ? AND Number = ?";
	query.callback = int_result_callback;
	query.callback_context = &s->centerId;

	JsonValue argv[4];
	argv[query.argc++] = json_new_int(electionId, false);
	argv[query.argc++] = json_new_int(s->centerNumber, false);

	errno_t e = _sql_exec(&query, argv, buffer);
	if (!FINE(e))
		return e;

	if (s->centerId != 0)
		return ERR_NONE;

	query.sql = "INSERT INTO PollingCenters (ElectionId, Number, Name) VALUES (?, ?, ?)";
	argv[query.argc++] = json_new_str(s->pollingCenter, false);

	query.callback = NULL;
	query.int_insert_id = &s->centerId;

	e = _sql_exec(&query, argv, buffer);
	return e;
}

static errno_t get_polling_station(Charray *buffer, struct submit *s)
{
	DbQuery query = {.dbc = &s->c->dbc};
	query.sql = "SELECT id FROM PollingStations WHERE PollingCenterId = ? AND Name = ?";
	query.callback = int_result_callback;
	query.callback_context = &s->stationId;

	JsonValue argv[4];
	argv[query.argc++] = json_new_int(s->centerId, false);
	argv[query.argc++] = json_new_str(s->pollingStation, false);

	errno_t e = _sql_exec(&query, argv, buffer);
	if (!FINE(e))
		return e;

	if (s->stationId != 0)
		return ERR_NONE;

	query.sql = "INSERT INTO PollingStations (PollingCenterId, Name, LocationId) VALUES (?, ?, ?)";
	argv[query.argc++] = json_new_long(s->locationId, false);

	query.callback = NULL;
	query.int_insert_id = &s->stationId;

	e = _sql_exec(&query, argv, buffer);
	return e;
}

static errno_t submission_callback(DbResult r)
{
	CHECK_SQL_CALLBACK(1);
	row_id_t *id = r.context;
	*id = str_to_long(r.argv[0]);
	return ERR_NONE;
}

static errno_t save_submission(Charray *buffer, struct submit *s)
{
	row_id_t sessionId = str_to_long(s->c->identity.sid);

	UploadFile file = {.data = s->resultsDocument, .sessionId = sessionId, .folder = "submissions"};

	errno_t e = complete_file_upload(&s->c->dbc, &file, buffer);
	if (!FINE(e))
		return e;

	DbQuery query = {.dbc = &s->c->dbc};
	query.sql = "SELECT id FROM Submissions WHERE PollingStationId = ? AND SessionId = ?";

	query.callback = submission_callback;
	query.callback_context = &s->submissionId;

	JsonValue argv[6];
	argv[query.argc++] = json_new_int(s->stationId, false);
	argv[query.argc++] = json_new_long(sessionId, false);

	e = _sql_exec(&query, argv, buffer);
	if (!FINE(e))
		return e;

	if (s->submissionId == 0)
	{
		query.insert_id = &s->submissionId;
		query.sql = "INSERT INTO Submissions (PollingStationId, SessionId, FileId, NumberOfVoters, InvalidVotes) VALUES (?, ?, ?, ?, ?)";

		argv[query.argc++] = json_new_long(file.id, false);
		argv[query.argc++] = json_new_int(s->numberOfVoters, false);
		argv[query.argc++] = json_new_int(s->invalidVotes, false);
	}
	else
	{
		query.sql = "UPDATE Submissions SET FileId = ?, NumberOfVoters = ?, InvalidVotes = ? WHERE Id = ?";
		query.argc = 0;
		argv[query.argc++] = json_new_long(file.id, false);
		argv[query.argc++] = json_new_int(s->numberOfVoters, false);
		argv[query.argc++] = json_new_int(s->invalidVotes, false);
		argv[query.argc++] = json_new_long(s->submissionId, false);
	}

	e = _sql_exec(&query, argv, buffer);
	return e;
}

static errno_t save_submitted_votes(Charray *buffer, struct submit *s, struct results *res, unsigned int candidates)
{
	DbQuery query = {.dbc = &s->c->dbc};
	query.sql = "INSERT INTO SubmittedVotes (SubmissionId, CandidateId, Votes) VALUES (?, ?, ?)";
	query.argc = 3;

	JsonValue argv[3 * 80];
	while (query.rows < candidates)
	{
		unsigned int k = query.rows++;
		argv[k * 3 + 0] = json_new_long(s->submissionId, false);
		argv[k * 3 + 1] = json_new_int(res[k].candidateId, false);
		argv[k * 3 + 2] = json_new_int(res[k].votes, false);
	}

	errno_t e = _sql_exec(&query, argv, buffer);
	return e;
}

apr_status_t save_voting_results(HttpContext *c, int electionId)
{
	apr_status_t status = get_request_body(c);
	if (status != OK)
		return status;

	status = ensure_session_exists(c); // should come second
	if (status != OK)
		return status;

	struct results result[80];
	unsigned int candidates = 0;
	const unsigned int max = sizeof(result) / sizeof(result[0]);

	struct submit s = {.c = c};
	FormData fd;
	while (true)
	{
		fd = get_next_form_data_part(&c->request_body, NULL);
		if (fd.content.data == NULL) // no more items
			break;

		const_KVP x = {fd.disposition.name, fd.content.data};

		if (str_equal_ci(x.key, "resultsDocument"))
			s.resultsDocument = fd;

		KVP_TO_LONG(x, s.region, "region");
		KVP_TO_STR(x, s.division, "division");
		KVP_TO_STR(x, s.district, "district");

		KVP_TO_INT(x, s.centerNumber, "centerNumber");
		KVP_TO_STR(x, s.pollingCenter, "pollingCenter");
		KVP_TO_STR(x, s.pollingStation, "pollingStation");

		KVP_TO_INT(x, s.numberOfVoters, "numberOfVoters");
		KVP_TO_INT(x, s.invalidVotes, "invalidVotes");

		if (str_starts_with(x.key, "candidate_", 0) && candidates < max)
		{
			result[candidates].candidateId = str_to_int(x.key + 10);
			result[candidates].votes = str_to_int(x.value);
			candidates++;
		}
	}

	char buf[1024];
	Charray buffer = buffer_to_charray(buf, sizeof(buf));

	errno_t e = get_polling_center(&buffer, &s, electionId);

	if (FINE(e))
		e = get_station_location(&buffer, &s, electionId);

	if (FINE(e))
		e = get_polling_station(&buffer, &s);

	if (FINE(e))
		e = save_submission(&buffer, &s);

	if (FINE(e))
		e = save_submitted_votes(&buffer, &s, result, candidates);

	if (!FINE(e))
		return http_problem(c, NULL, charray_to_str(&buffer), errno_to_status_code(e));

	return HTTP_NO_CONTENT;
}
