#ifndef _ENUMS_H_
#define _ENUMS_H_

enum LocationType
{
	LocationType_Unknown = 0,
	LocationType_Continent = 1,
	LocationType_Country = 2,
	LocationType_Region = 3,
	LocationType_Division = 4,
	LocationType_District = 5,
	LocationType_City = 6,
};

enum PlatformType
{
	PlatformType_Unknown = 0,
	PlatformType_Server = 1,
	PlatformType_Mobile = 2,
	PlatformType_Desktop = 3,
	PlatformType_Browser = 4,
};

enum UserType
{
	UserType_Unknown,
	UserType_Normal,
	UserType_Anonymous,
	UserType_Server,
};

enum UserStatus
{
	UserStatus_Unknown,
	UserStatus_Active,
	UserStatus_Deleted,
	UserStatus_Blocked,
};

enum SessionStatus
{
	SessionStatus_Unknown = 0,
	SessionStatus_Active = 1,
	SessionStatus_LoggedOut = 2,
	SessionStatus_Blocked = 3,
};

#endif
