export interface User {
    phone_number: string;
    role: 'HOST' | 'CLIENT';
    name?: string;
    created_at?: string;
}

export interface Property {
    id?: number;
    host_phone: string;
    location: string;
    description: string;
    price: number;
    is_available: number; // 0 or 1
    created_at?: string;
}

export interface Booking {
    id?: number;
    property_id: number;
    client_phone: string;
    date: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    created_at?: string;
}
