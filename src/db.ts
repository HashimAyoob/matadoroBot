import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new Database(dbPath);

export const initDb = () => {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            phone_number TEXT PRIMARY KEY,
            role TEXT CHECK(role IN ('HOST', 'CLIENT')) NOT NULL,
            name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create Properties table
    db.exec(`
        CREATE TABLE IF NOT EXISTS properties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            host_phone TEXT NOT NULL,
            location TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            is_available INTEGER DEFAULT 1 CHECK(is_available IN (0, 1)),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (host_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
    `);

    // Create Bookings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            property_id INTEGER NOT NULL,
            client_phone TEXT NOT NULL,
            date TEXT NOT NULL,
            status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
            FOREIGN KEY (client_phone) REFERENCES users(phone_number) ON DELETE CASCADE
        )
    `);

    console.log('Database initialized successfully.');
};

export default db;
