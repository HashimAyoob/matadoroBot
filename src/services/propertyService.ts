import db from '../db';
import { Property } from '../models';

export const addProperty = (hostPhone: string, location: string, description: string, price: number) => {
    const stmt = db.prepare('INSERT INTO properties (host_phone, location, description, price) VALUES (?, ?, ?, ?)');
    return stmt.run(hostPhone, location, description, price);
};

export const getPropertiesByHost = (hostPhone: string): Property[] => {
    const stmt = db.prepare('SELECT * FROM properties WHERE host_phone = ?');
    return stmt.all(hostPhone) as Property[];
};

export const searchProperties = (location: string): Property[] => {
    const stmt = db.prepare('SELECT * FROM properties WHERE location LIKE ? AND is_available = 1');
    return stmt.all(`%${location}%`) as Property[];
};

export const getPropertyById = (id: number): Property | undefined => {
    const stmt = db.prepare('SELECT * FROM properties WHERE id = ?');
    return stmt.get(id) as Property | undefined;
};
