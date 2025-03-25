# Elastico - Elasticsearch GUI Client

A modern, user-friendly Elasticsearch client built with Tauri, React, and TypeScript.

## Features

- Connect to Elasticsearch clusters
- Browse and manage indices
- Query Elasticsearch using a JSON editor
- View document details and mappings
- Create, update, and delete documents
- View cluster health and stats

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites/)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/elastico.git
   cd elastico
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run tauri dev
   ```

### Building

#### Standard Build

To build the application for your current platform:

```bash
npm run tauri build
```

#### Multi-Architecture Builds for macOS

Elastico now supports building for both Intel and Apple Silicon Macs:

- **Universal Binary (Both Intel and ARM)**:

  ```bash
  npm run build:macos-universal
  ```

- **Intel-only Build**:

  ```bash
  npm run build:macos-intel
  ```

- **ARM-only Build**:
  ```bash
  npm run build:macos-arm
  ```

For detailed build instructions and troubleshooting, see [BUILD.md](./BUILD.md).

## License

[MIT](LICENSE)
