# Architecture & Technology Stack

## Technology Stack
- **Runtime**: Node.js
- **Language**: TypeScript
- **WhatsApp Library**: `whatsapp-web.js` (Headless Chrome automation)
- **Database**: `better-sqlite3` (Serverless, local SQL database)
- **QR Code**: `qrcode-terminal`

## Architecture Overview
The application follows a layered architecture to separate concerns:

### 1. Entry Point (`src/index.ts`)
- Initializes the WhatsApp Client.
- Connects to the SQLite database.
- Listens for events (`qr`, `ready`, `message`).

### 2. Message Handler (`src/handler.ts`)
- Acts as the controller.
- **Session Management**: Maintains in-memory state for multi-step flows (e.g., adding a property).
- **Command Routing**: Parses messages and routes them to the appropriate logic based on User Role (Host/Client).
- **Interactive UI**: Uses `Buttons` for menus.

### 3. Service Layer (`src/services/`)
- Contains business logic.
- Abstracts database operations from the handler.
- `userService.ts`: User registration and retrieval.
- `propertyService.ts`: Property listing and search.
- `bookingService.ts`: Booking management.

### 4. Data Layer (`src/db.ts`)
- Manages the SQLite connection.
- Defines the schema (`users`, `properties`, `bookings`).

## Data Flow
1.  **Incoming**: `User Message` -> `Client Event` -> `Handler`
2.  **Processing**: `Handler` checks Session/Command -> Calls `Service`
3.  **Persistence**: `Service` executes SQL -> `Database`
4.  **Response**: `Database` returns data -> `Service` -> `Handler` formats reply -> `User`
