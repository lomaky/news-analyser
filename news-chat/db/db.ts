import { CONVERSATION } from "../models/conversation";

const sqlite3 = require("sqlite3").verbose();

export class ChatDb {
  sqliteDB = "/chat.db";
  db = "";

  constructor() {
    this.db = __dirname + this.sqliteDB;
    console.log({ ChatDatabase: this.db });
  }

  async getConversationById(uuid: string): Promise<CONVERSATION[]> {
    try {
      const db = new sqlite3.Database(this.db);
      try {
        const sql = "SELECT * FROM CONVERSATION WHERE ID = ?";
        const result = await this.fetchAll(db, sql, [uuid]);
        if (result) {
          return result as CONVERSATION[];
        }
      } catch (err) {
        console.error(err);
      } finally {
        db.close();
      }
    } catch (error) {
      console.error(error);
    }
    return [];
  }

  async saveConversationMessage(
    conversation: CONVERSATION
  ): Promise<CONVERSATION> {
    try {
      const db = new sqlite3.Database(this.db);
      const sql = `INSERT INTO CONVERSATION (ID, TIMESTAMP, ROLE, MESSAGE) VALUES (?, ?, ?, ?)`;
      try {
        await this.execute(db, sql, [conversation.ID, conversation.TIMESTAMP.toString(), conversation.ROLE, conversation.MESSAGE]);
      } catch (err) {
        console.log(err);
      } finally {
        db.close();
      }
    } catch (error) {
      console.error(error);
    }
    return conversation;
  }

  fetchAll = async (db, sql, params) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  };

  execute = async (db, sql, params:string[] = []) => {
    if (params && params.length > 0) {
      return new Promise<void>((resolve, reject) => {
        db.run(sql, params, (err) => {
          if (err) reject(err);
          resolve();
        });
      });
    }
    return new Promise<void>((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  };
}
