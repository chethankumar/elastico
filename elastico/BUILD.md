# Building Elastico for Multiple Architectures

This document provides instructions for building Elastico for different CPU architectures.

## Prerequisites

Before building, ensure you have the necessary tools installed:

1. **Rust and Cargo** - Install via [rustup](https://rustup.rs/)
2. **Node.js** (v16 or later) and npm
3. **Xcode** (for macOS builds)
4. **Rust targets** for the architectures you want to build for

To add the required Rust targets, run:

```bash
# For macOS Intel
rustup target add x86_64-apple-darwin

# For macOS ARM (Apple Silicon)
rustup target add aarch64-apple-darwin
```

## Building for macOS

### Universal Binary (Intel + ARM)

To build a universal binary that works on both Intel and Apple Silicon Macs:

```bash
npm run build:macos
```

This will create a single application bundle that runs natively on both architectures.

### ARM-only Build (Apple Silicon)

To build specifically for Apple Silicon (M1/M2/M3) Macs:

```bash
npm run build:macos-arm64
```

The build output will be optimized for the arm64 architecture.

### Intel-only Build

To build specifically for Intel Macs:

```bash
npm run build:macos-x64
```

The build output will be optimized for the x86_64 architecture.

## Build Output Locations

After running the build commands, you can find the built application at:

- `src-tauri/target/release/bundle/macos/Elastico.app` (for individual architecture builds)
- `src-tauri/target/universal-apple-darwin/release/bundle/macos/Elastico.app` (for universal builds)

## Verifying Architecture Support

To verify that your built application supports the intended architectures, you can use the `file` command:

```bash
file src-tauri/target/release/bundle/macos/Elastico.app/Contents/MacOS/Elastico
```

For a universal binary, the output should include something like:

```
Mach-O universal binary with 2 architectures: [x86_64:Mach-O 64-bit executable x86_64] [arm64:Mach-O 64-bit executable arm64]
```

## Troubleshooting

If you encounter issues with the build process:

1. Ensure all Rust dependencies are installed: `cargo check`
2. Make sure all Node.js dependencies are installed: `npm install`
3. Check that you have the required Rust targets installed: `rustup target list --installed`
4. Verify that your Xcode installation is complete, including command-line tools: `xcode-select --install`

For macOS-specific build issues, you might need to agree to Apple's license terms:

```bash
sudo xcodebuild -license accept
```
