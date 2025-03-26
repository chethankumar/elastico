# Installing Elastico on macOS

Since Elastico is not signed with an Apple Developer certificate, macOS will prevent it from running by default due to security restrictions. This guide shows you how to safely bypass these restrictions.

## Opening the App for the First Time

1. **Locate the application**:

   - If you built from source: Find `Elastico.app` in the `src-tauri/target/release/bundle/macos/` directory
   - If you downloaded a DMG: Mount the DMG and find `Elastico.app`

2. **Right-click (or Control-click) on Elastico.app** and select "Open" from the context menu
3. **In the security dialog** that appears, click "Open"

   > Note: If you simply double-click the app, macOS will show a message saying the app can't be opened because it's from an unidentified developer, without giving you the option to override.

## If the Right-Click Method Doesn't Work

If the above method doesn't work, you can:

1. **Open System Preferences** → **Security & Privacy** → **General** tab

2. **Look for a message** about Elastico being blocked near the bottom of the window

3. **Click "Open Anyway"** to allow the app to run

4. **Click "Open"** in the confirmation dialog

## Opening from the Terminal (Alternative Method)

If the above methods don't work, you can:

1. **Open Terminal**

2. **Run the following command** (adjust the path if your app is in a different location):

   ```bash
   xattr -cr /path/to/Elastico.app
   ```

   This removes the quarantine attribute from the app.

3. **Then try to open the app** by double-clicking it

## Once Opened Successfully

After you've successfully opened the app once using any of these methods, macOS will remember your decision, and you can open the app normally in the future by double-clicking it.

## Building with a Proper Certificate (For Developers)

For proper distribution, the app should be signed with an Apple Developer certificate:

1. Get an Apple Developer Program membership
2. Create a Developer ID certificate in Xcode
3. Update the `tauri.conf.json` file with your signing identity
4. Build using the proper signing configuration

## Security Note

When bypassing macOS security measures, always ensure you trust the source of the application. Only install applications from trusted developers or sources you've verified.
