-- Create a news-chat/db/chat.db database

CREATE TABLE "CONVERSATION" (
	"ID"	TEXT NOT NULL,
	"TIMESTAMP"	INTEGER NOT NULL,
	"ROLE"	TEXT NOT NULL,
	"MESSAGE"	TEXT
);