
CREATE TABLE Elections (
	Id INT PRIMARY KEY AUTO_INCREMENT,

	CountryId BIGINT NOT NULL,
	Title VARCHAR(127) NOT NULL,
	Description TEXT NULL,

	DateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	StartDate TIMESTAMP NOT NULL,

	FOREIGN KEY (CountryId) REFERENCES Countries(Id) ON DELETE CASCADE
);

CREATE TABLE Candidates (
	Id INT PRIMARY KEY AUTO_INCREMENT,

	ElectionId INT NOT NULL,
	Name VARCHAR(127) NOT NULL,
	Party VARCHAR(127) NOT NULL,

	DateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

	UNIQUE KEY UQ_Canditates_ElectionId_Name (ElectionId, Name),
	FOREIGN KEY (ElectionId) REFERENCES Elections(Id) ON DELETE CASCADE
);

CREATE TABLE PollingCenters (
	Id INT PRIMARY KEY AUTO_INCREMENT,

	ElectionId INT NOT NULL,
	Number INT NOT NULL,
	Name VARCHAR(127) NOT NULL,

	FOREIGN KEY (ElectionId) REFERENCES Elections(Id) ON DELETE CASCADE,
	UNIQUE KEY UQ_PollingCenters_ElectionId_Number (ElectionId, Number)
);

CREATE TABLE PollingStations (
	Id INT PRIMARY KEY AUTO_INCREMENT,

	PollingCenterId INT NOT NULL,
	Name VARCHAR(15) NOT NULL,

	LocationId BIGINT NOT NULL,
	DateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY (LocationId) REFERENCES Locations(Id),
	FOREIGN KEY (PollingCenterId) REFERENCES PollingCenters(Id) ON DELETE CASCADE,

	UNIQUE KEY UQ_PollingStations_PollingCenterId_Name (PollingCenterId, Name)
);

CREATE TABLE Submissions (
	Id BIGINT PRIMARY KEY AUTO_INCREMENT,

	PollingStationId INT NOT NULL,
	SessionId BIGINT NOT NULL, -- use Session.Location for Geolocation
	FileId BIGINT NOT NULL, -- a document of the results being submitted

	NumberOfVoters INT NOT NULL,
	InvalidVotes INT NOT NULL,

	DateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	DateUpdated TIMESTAMP NULL,
	DateDeleted TIMESTAMP NULL,

	DateValidated TIMESTAMP NULL, -- null means not yet validated
	ValidatorId BIGINT NULL, -- null means not yet validated
	ValidatorNotes TEXT NULL,

	FOREIGN KEY (PollingStationId) REFERENCES PollingStations(Id) ON DELETE CASCADE,
	FOREIGN KEY (SessionId) REFERENCES Sessions(Id) ON DELETE CASCADE,
	FOREIGN KEY (FileId) REFERENCES Files(Id),
	FOREIGN KEY (ValidatorId) REFERENCES Sessions(Id)
);

CREATE TABLE SubmittedVotes (
	Id BIGINT PRIMARY KEY AUTO_INCREMENT,

	SubmissionId BIGINT NOT NULL,
	CandidateId INT NOT NULL,
	Votes INT NOT NULL,

	FOREIGN KEY (CandidateId) REFERENCES Candidates(Id) ON DELETE CASCADE,
	FOREIGN KEY (SubmissionId) REFERENCES Submissions(Id) ON DELETE CASCADE,
	UNIQUE KEY UQ_SubmittedVotes_SubmissionId_CandidateId (SubmissionId, CandidateId)
);

CREATE VIEW StationVotes AS
SELECT vo.Id, sv.CandidateId, AVG(Votes) as Votes
FROM PollingStations vo
JOIN Submissions s on s.PollingStationId = vo.Id
JOIN SubmittedVotes sv on sv.SubmissionId = s.Id
GROUP BY vo.Id, sv.CandidateId;

-- --------

INSERT INTO Users (Type, Name) VALUES (3, 'AI');
SET @userId = LAST_INSERT_ID();
INSERT INTO Sessions (UserId) VALUES (@userId);

