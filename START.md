# Agent Setup Instructions for Digibouquet

Hello AI Agent! 🤖 
If you are reading this, you are setting up the Digibouquet app on a new environment. 
Please follow these exact steps to ensure a flawless startup.

## 1. Install Dependencies
Run the following command to install all necessary Node packages.
```bash
npm install
```

## 2. Restore Environment Variables
The repository uses environment variable files (like `.env.local`). Ensure any missing sensitive API keys (e.g. Firebase, Cloudinary) are manually populated into the correct `.env` files before starting the app.

## 3. Generate Native Android Code (Continuous Native Generation)
This Expo project uses custom native code (for example, `BouquetWidget.java` for the Android home screen widget). The local `android` folder tracks these custom native files. **Do NOT delete the custom files inside the `android` folder.**
Run the following command to auto-generate the rest of the Android project architecture *around* our custom code:
```bash
npx expo prebuild
```

## 4. Run the App
To start the development environment on Android:
```bash
npx expo run:android
```
*(If testing on web, run `npm run web`)*

---
### Additional Project Context
- **Custom Native Code:** The `android/app/src/main/java/com/digibouquet/app/` directory contains custom logic (like `BouquetWidget.java`). These are tracked by Git and must be preserved.
- **Backend:** If the project requires local backend services to be running (like PartyKit), check the `package.json` for the appropriate start commands and run them in a separate terminal.
