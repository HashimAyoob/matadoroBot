import db from '../db';
import { Booking } from '../models';

export const createBooking = (propertyId: number, clientPhone: string, date: string) => {
    const stmt = db.prepare('INSERT INTO bookings (property_id, client_phone, date) VALUES (?, ?, ?)');
    return stmt.run(propertyId, clientPhone, date);
};

export const getPendingBookingsForHost = (hostPhone: string): (Booking & { location: string, client_name: string })[] => {
    const stmt = db.prepare(`
        SELECT b.*, p.location, u.name as client_name
        FROM bookings b
        JOIN properties p ON b.property_id = p.id
        JOIN users u ON b.client_phone = u.phone_number
        WHERE p.host_phone = ? AND b.status = 'PENDING'
    `);
    return stmt.all(hostPhone) as (Booking & { location: string, client_name: string })[];
};

export const updateBookingStatus = (bookingId: number, status: 'APPROVED' | 'REJECTED') => {
    const stmt = db.prepare('UPDATE bookings SET status = ? WHERE id = ?');
    return stmt.run(status, bookingId);
};
