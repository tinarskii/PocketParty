import {Database} from "bun:sqlite";

const db = new Database("pocketparty.db");

export function initializeDatabase(): boolean {
  try {
    db.run(`
        CREATE TABLE IF NOT EXISTS rooms
        (
            id      TEXT PRIMARY KEY NOT NULL,
            name    TEXT UNIQUE,
            password TEXT,
            queue   TEXT
        )
    `)
    return true;
  } catch (error) {
    console.error("Error initializing database:", error);
    return false;
  }
}

export function getRoomByName(name: string): { id: string, name: string, password: string, queue: string, preferences: string } | null {
  const stmt = db.prepare("SELECT * FROM rooms WHERE name = ?");
  const room = stmt.get(name);
  return room || null;
}

export function createRoom(id: string, name: string, password: string): boolean {
  try {
    const stmt = db.prepare("INSERT INTO rooms (id, name, password, queue) VALUES (?, ?, ?, ?)");
    stmt.run(id, name, password, JSON.stringify([]));
    return true;
  } catch (error) {
    console.error("Error creating room:", error);
    return false;
  }
}

export function updateRoomQueue(name: string, queue: Array<any>): boolean | any {
  try {
    const stmt = db.prepare("UPDATE rooms SET queue = ? WHERE name = ?");
    stmt.run(JSON.stringify(queue), name);
    return getRoomQueue(name);
  } catch (error) {
    console.error("Error updating room queue:", error);
    return false;
  }
}

export function getRoomQueue(name: string): Array<any> | null {
  const stmt = db.prepare("SELECT queue FROM rooms WHERE name = ?");
  const result = stmt.get(name);
  if (result && result.queue) {
    return JSON.parse(result.queue);
  }
  return null;
}

export function deleteRoom(room: string): boolean {
  try {
    const stmt = db.prepare("DELETE FROM rooms WHERE name = ?");
    stmt.run(room);
    return true;
  } catch (error) {
    console.error("Error deleting room:", error);
    return false;
  }
}

export function queueShift(room: string): boolean | any {
  try {
    const queue = getRoomQueue(room);
    if (queue && queue.length > 0) {
      queue.shift();
      return updateRoomQueue(room, queue);
    }
    return false;
  } catch (error) {
    console.error("Error shifting room queue:", error);
    return false;
  }
}