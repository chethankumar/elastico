# Elastico

Elastico is a modern, user-friendly Elasticsearch GUI client built with Tauri, React, and TypeScript. It provides an intuitive interface for interacting with Elasticsearch clusters, similar to how Postico works for PostgreSQL.

## Features

- **Connection Management**: Save and manage multiple Elasticsearch connections
- **Index Browser**: View and manage Elasticsearch indices
- **Query Interface**: Execute queries with a simple interface
- **Authentication**: Support for various authentication methods (none, basic auth, API key)
- **Cross-platform**: Works on macOS, Windows, and Linux

## Development

### Prerequisites

- Node.js (v16 or higher)
- Rust (for Tauri)
- An Elasticsearch instance for testing

### Getting Started

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run tauri dev
```

### Building for Production

To build the application for production:

```bash
npm run tauri build
```

This will create platform-specific installers in the `src-tauri/target/release/bundle` directory.

## Project Structure

- `/src` - React frontend code
  - `/components` - Reusable UI components
  - `/pages` - Application pages
  - `/services` - Services for interacting with Elasticsearch
  - `/types` - TypeScript type definitions
  - `/hooks` - Custom React hooks
  - `/utils` - Utility functions
- `/src-tauri` - Tauri/Rust backend code

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
