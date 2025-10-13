
CREATE TABLE Elections (
	Id INT PRIMARY KEY AUTO_INCREMENT,
	CountryId BIGINT NOT NULL,
	Title VARCHAR(127) NOT NULL,
	Description TEXT NULL,
	StartDate TIMESTAMP NOT NULL,
	DateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (CountryId) REFERENCES Locations(Id) ON DELETE CASCADE
);

CREATE TABLE Candidates (
	Id INT PRIMARY KEY AUTO_INCREMENT,

	Name VARCHAR(127) NOT NULL,
	Party VARCHAR(127) NOT NULL,

	ElectionId INT NOT NULL,
	DateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

	UNIQUE KEY UQ_Canditates_CountryId_Name (ElectionId, Name),
	FOREIGN KEY (ElectionId) REFERENCES Elections(Id) ON DELETE CASCADE
);

CREATE TABLE VotingOffices (
	Id INT PRIMARY KEY AUTO_INCREMENT,

	ElectionId INT NOT NULL,
	Code INT NOT NULL,
	Room VARCHAR(15) NOT NULL,
	Name VARCHAR(127) NOT NULL,

	LocationId BIGINT NULL,
	DateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY (ElectionId) REFERENCES Elections(Id) ON DELETE CASCADE,
	FOREIGN KEY (LocationId) REFERENCES Locations(Id) ON DELETE SET NULL,
	UNIQUE KEY UQ_VotingOffices_ElectionId_Code_Room (ElectionId, Code, Room)
);

CREATE TABLE Submissions (
	Id BIGINT PRIMARY KEY AUTO_INCREMENT,

	VotingOfficeId INT NOT NULL,
	SessionId BIGINT NOT NULL, -- use Session.Location for Geolocation
	FileId BIGINT NOT NULL, -- a photo of the results being submitted

	DateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	DateUpdated TIMESTAMP NULL,
	DateDeleted TIMESTAMP NULL,

	FOREIGN KEY (FileId) REFERENCES Files(Id) ON DELETE CASCADE,
	FOREIGN KEY (SessionId) REFERENCES Sessions(Id) ON DELETE CASCADE,
	FOREIGN KEY (VotingOfficeId) REFERENCES VotingOffices(Id) ON DELETE CASCADE
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

CREATE VIEW OfficeVotes AS
SELECT vo.Id, sv.CandidateId, AVG(Votes) as Votes
FROM VotingOffices vo
JOIN Submissions s on s.VotingOfficeId = vo.Id
JOIN SubmittedVotes sv on sv.SubmissionId = s.Id
GROUP BY vo.Id, sv.CandidateId;

-- --------

INSERT INTO Users (Type, Name) VALUES (3, 'AI');
SET @userId = LAST_INSERT_ID();
INSERT INTO Sessions (UserId) VALUES (@userId);

