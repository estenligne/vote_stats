-- Location types: Continent, Country, Region, Department, District, City
SET @regionType = 3;

INSERT INTO Locations (Type, Name) VALUES (2, 'Cameroun');
SET @countryId = LAST_INSERT_ID();

INSERT INTO Countries (Id, ISOCode2, ISOCode3, CallingCode, PhoneFormat) VALUES
(@countryId, 'CM', 'CMR', '237', '6 [0-9]{2} [0-9]{2} [0-9]{2} [0-9]{2}');

INSERT INTO Locations (Type, ParentId, Name) VALUES
(@regionType, @countryId, 'Adamaoua'),
(@regionType, @countryId, 'Centre'),
(@regionType, @countryId, 'Est'),
(@regionType, @countryId, 'Extrême-Nord'),
(@regionType, @countryId, 'Littoral'),
(@regionType, @countryId, 'Nord'),
(@regionType, @countryId, 'Nord-Ouest'),
(@regionType, @countryId, 'Ouest'),
(@regionType, @countryId, 'Sud'),
(@regionType, @countryId, 'Sud-Ouest'),
(@regionType, @countryId, 'Abroad');

INSERT INTO Elections (CountryId, Title, StartDate) VALUES
(@countryId, 'Cameroun: Elections Presidentielles 2025', '2025-10-12 18:00:00');
SET @electionId = LAST_INSERT_ID();

INSERT INTO Candidates (ElectionId, Name, Party) VALUES
(@electionId, 'Paul Biya', 'RDPC'),
(@electionId, 'Joshua Osih', 'SDF'),
(@electionId, 'Cabral Libii', 'PCRN'),
(@electionId, 'Issa Tchiroma Bakary', 'FSNC'),
(@electionId, 'Bello Bouba Maïgari', 'UNDP'),
(@electionId, 'Akere Muna', 'UNIVERS'),
(@electionId, 'Ateki Seta Caxton', 'PAL'),
(@electionId, 'Jacques Bouhga-Hagbe', 'MCNC'),
(@electionId, 'Hiram Samuel Iyodi', 'FDC'),
(@electionId, 'Pierre Kwemo', 'UMS'),
(@electionId, 'Serge Espoir Matomba', 'PURS'),
(@electionId, 'Hermine Patricia Tomaino', 'UDC');
