import db from '../db';
import { User } from '../models';

export const createUser = (phoneNumber: string, role: 'HOST' | 'CLIENT', name: string) => {
    const stmt = db.prepare('INSERT INTO users (phone_number, role, name) VALUES (?, ?, ?)');
    return stmt.run(phoneNumber, role, name);
};

export const getUser = (phoneNumber: string): User | undefined => {
    const stmt = db.prepare('SELECT * FROM users WHERE phone_number = ?');
    return stmt.get(phoneNumber) as User | undefined;
};
