import { Message } from 'whatsapp-web.js';
import * as userService from './services/userService';
import * as propertyService from './services/propertyService';
import * as bookingService from './services/bookingService';

// Simple in-memory session store
interface Session {
    step: 'IDLE' | 'ADD_PROP_LOCATION' | 'ADD_PROP_DESC' | 'ADD_PROP_PRICE';
    tempData: any;
}

const sessions: { [key: string]: Session } = {};

const getSession = (from: string): Session => {
    if (!sessions[from]) {
        sessions[from] = { step: 'IDLE', tempData: {} };
    }
    return sessions[from];
};

const resetSession = (from: string) => {
    sessions[from] = { step: 'IDLE', tempData: {} };
};

export const handleMessage = async (msg: Message) => {
    const from = msg.from.replace('@c.us', '');
    const userId = msg.from;
    const body = msg.body.trim();
    const session = getSession(userId);

    console.log(`Received message from ${userId}: ${body}`);

    // --- 1. Priority: Cancel ---
    if (body.toLowerCase() === '!cancel') {
        resetSession(userId);
        await msg.reply('Operation cancelled.');
        return;
    }

    // --- 2. Priority: Active Session (Data Entry) ---
    if (session.step !== 'IDLE') {
        switch (session.step) {
            case 'ADD_PROP_LOCATION':
                if (msg.type === 'location') {
                    // Handle WhatsApp Location Object
                    const loc = msg.location;
                    session.tempData.location = `Lat: ${loc.latitude}, Long: ${loc.longitude}`;
                    if (loc.description) {
                        session.tempData.location += ` (${loc.description})`;
                    }
                    session.step = 'ADD_PROP_DESC';
                    await msg.reply('Location received! Now enter a description for the property:');
                } else {
                    // Handle Text (Google Maps Link or Manual Address)
                    if (body.includes('maps.google.com') || body.includes('goo.gl')) {
                        session.tempData.location = `Maps Link: ${body}`;
                        session.step = 'ADD_PROP_DESC';
                        await msg.reply('Google Maps link received! Now enter a description for the property:');
                    } else {
                        session.tempData.location = body;
                        session.step = 'ADD_PROP_DESC';
                        await msg.reply('Got it. Now enter a description for the property:');
                    }
                }
                break;
            case 'ADD_PROP_DESC':
                session.tempData.description = body;
                session.step = 'ADD_PROP_PRICE';
                await msg.reply('Almost done. Enter the price per night (numbers only):');
                break;
            case 'ADD_PROP_PRICE':
                const price = parseFloat(body);
                if (isNaN(price)) {
                    await msg.reply('Invalid price. Please enter a number.');
                    return;
                }
                const { location, description } = session.tempData;
                try {
                    propertyService.addProperty(userId, location, description, price);
                    await msg.reply(`Property added successfully!\nLocation: ${location}\nPrice: ${price}`);
                    resetSession(userId);
                } catch (e) {
                    console.error(e);
                    await msg.reply('Error saving property.');
                    resetSession(userId);
                }
                break;
        }
        return;
    }

    const user = userService.getUser(userId);

    // --- 3. Priority: Menu / Greetings ---
    if (['hi', 'hello', '!menu', '!help', 'menu'].includes(body.toLowerCase())) {
        if (!user) {
            const menu = `*Welcome to Matadoro Bot!* 🏠\nPlease reply with a number to register:\n\n1. Register as Host\n2. Register as Client`;
            await msg.reply(menu);
            return;
        }

        if (user.role === 'HOST') {
            const menu = `*Host Dashboard* 🛠️\nReply with a number:\n\n1. Add Property\n2. My Properties\n3. Pending Requests`;
            await msg.reply(menu);
            return;
        }

        if (user.role === 'CLIENT') {
            await msg.reply('As a Client, you can search for properties.\nType "!search <location>" (e.g., "!search Mumbai").');
            return;
        }
    }

    // --- 4. Numbered Menu Responses ---
    if (['1', '2', '3'].includes(body)) {
        if (!user) {
            if (body === '1') {
                // Register Host
                try {
                    userService.createUser(userId, 'HOST', msg.timestamp ? 'User' : 'User');
                    await msg.reply(`Successfully registered as HOST. Type "menu" to see options.`);
                } catch (e) {
                    console.error(e);
                    await msg.reply('Error registering user.');
                }
                return;
            }
            if (body === '2') {
                // Register Client
                try {
                    userService.createUser(userId, 'CLIENT', msg.timestamp ? 'User' : 'User');
                    await msg.reply(`Successfully registered as CLIENT. Type "!search <loc>" to find properties.`);
                } catch (e) {
                    console.error(e);
                    await msg.reply('Error registering user.');
                }
                return;
            }
        }

        if (user && user.role === 'HOST') {
            if (body === '1') {
                session.step = 'ADD_PROP_LOCATION';
                await msg.reply('Starting new property listing.\nPlease enter the location:');
                return;
            }
            if (body === '2') {
                const props = propertyService.getPropertiesByHost(userId);
                if (props.length === 0) {
                    await msg.reply('You have no properties listed.');
                    return;
                }
                const list = props.map(p => `ID: ${p.id} | ${p.location} | $${p.price}`).join('\n');
                await msg.reply(`Your Properties:\n${list}`);
                return;
            }
            if (body === '3') {
                const bookings = bookingService.getPendingBookingsForHost(userId);
                if (bookings.length === 0) {
                    await msg.reply('No pending booking requests.');
                    return;
                }
                const list = bookings.map(b => `Booking ID: ${b.id} | Loc: ${b.location} | Date: ${b.date} | Client: ${b.client_name}`).join('\n');
                await msg.reply(`Pending Requests:\n${list}\n\nUse !approve <id> or !reject <id>`);
                return;
            }
        }
    }

    // --- 5. Legacy/Direct Commands ---
    if (body.startsWith('!register')) {
        const parts = body.split(' ');
        const role = parts[1]?.toUpperCase();
        if (role !== 'HOST' && role !== 'CLIENT') {
            await msg.reply('Usage: !register <host|client>');
            return;
        }

        try {
            if (user) {
                await msg.reply(`You are already registered as ${user.role}.`);
                return;
            }
            userService.createUser(userId, role as 'HOST' | 'CLIENT', msg.timestamp ? 'User' : 'User');
            await msg.reply(`Successfully registered as ${role}.`);
        } catch (e: any) {
            console.error(e);
            await msg.reply('Error registering user.');
        }
        return;
    }

    if (!user) {
        await msg.reply('Welcome! Please register first using !register <host|client> or say "hi" for options.');
        return;
    }

    // --- 6. Host Commands ---
    if (user.role === 'HOST') {
        if (body === '!add_property') {
            session.step = 'ADD_PROP_LOCATION';
            await msg.reply('Starting new property listing.\nPlease enter the location:');
            return;
        }

        if (body === '!my_properties') {
            const props = propertyService.getPropertiesByHost(userId);
            if (props.length === 0) {
                await msg.reply('You have no properties listed.');
                return;
            }
            const list = props.map(p => `ID: ${p.id} | ${p.location} | $${p.price}`).join('\n');
            await msg.reply(`Your Properties:\n${list}`);
            return;
        }

        if (body === '!pending') {
            const bookings = bookingService.getPendingBookingsForHost(userId);
            if (bookings.length === 0) {
                await msg.reply('No pending booking requests.');
                return;
            }
            const list = bookings.map(b => `Booking ID: ${b.id} | Loc: ${b.location} | Date: ${b.date} | Client: ${b.client_name}`).join('\n');
            await msg.reply(`Pending Requests:\n${list}\n\nUse !approve <id> or !reject <id>`);
            return;
        }

        if (body.startsWith('!approve') || body.startsWith('!reject')) {
            const parts = body.split(' ');
            const cmd = parts[0];
            const id = parseInt(parts[1]);

            if (isNaN(id)) {
                await msg.reply('Usage: !approve <booking_id> or !reject <booking_id>');
                return;
            }

            try {
                const status = cmd === '!approve' ? 'APPROVED' : 'REJECTED';
                const result = bookingService.updateBookingStatus(id, status);
                if (result.changes > 0) {
                    await msg.reply(`Booking ${id} ${status}.`);
                } else {
                    await msg.reply('Booking not found or already processed.');
                }
            } catch (e) {
                console.error(e);
                await msg.reply('Error updating booking.');
            }
            return;
        }
    }

    // --- 7. Client Commands ---
    if (user.role === 'CLIENT') {
        if (body.startsWith('!search')) {
            const location = body.replace('!search', '').trim();
            if (!location) {
                await msg.reply('Usage: !search <location>');
                return;
            }
            const results = propertyService.searchProperties(location);
            if (results.length === 0) {
                await msg.reply('No properties found directly matching that location.');
                return;
            }
            const list = results.map(p => `ID: ${p.id}\nLoc: ${p.location}\nDesc: ${p.description}\nPrice: ${p.price}\n`).join('----------------\n');
            await msg.reply(`Results:\n${list}`);
            return;
        }

        if (body.startsWith('!book')) {
            const parts = body.split(' ');
            const propId = parseInt(parts[1]);
            const date = parts.slice(2).join(' ');

            if (isNaN(propId) || !date) {
                await msg.reply('Usage: !book <property_id> <date>');
                return;
            }

            try {
                bookingService.createBooking(propId, userId, date);
                await msg.reply('Booking request sent! The host will be notified.');
            } catch (e) {
                console.error(e);
                await msg.reply('Error creating booking request.');
            }
            return;
        }
    }

    // Fallback
    await msg.reply('Unknown command. Type "menu" or "help" for options.');
};
