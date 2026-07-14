# Digibouquet

This is an Expo React Native application for Digibouquet.

## Prerequisites

Before you begin, ensure you have the following installed on your new laptop:
- [Node.js](https://nodejs.org/) (LTS recommended)
- [Git](https://git-scm.com/)
- [EAS CLI](https://docs.expo.dev/build/setup/) (`npm install -g eas-cli`)

## Getting Started on a New Laptop

1. **Clone the repository:**
   ```bash
   git clone <YOUR_GITHUB_REPOSITORY_URL>
   cd digibouquet
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   *Note: If you face dependency issues, try `npm install --legacy-peer-deps`.*

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Environment Variables:**
   Make sure to create a `.env.local` or `.env` file in the root directory and add any required environment variables. The repository ignores `.env.local` by default to keep secrets safe.

   *Your `.env.local` should look like this:*
   ```env
   SENTRY_AUTH_TOKEN=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
   ```

5. **Native Android Code & Build Cache:**
   All of your custom native code (like the `BouquetWidget.java` and `MainActivity.kt`) is **already tracked and safely stored** in this repository. 
   When you clone this project, you will notice that the `android` folder is much smaller than it was on your previous machine. This is perfectly normal! The massive `android/app/build/` and `.gradle/` folders (which usually take up 4-5GB) are temporary caches that are intentionally ignored by Git to save space. 
   *You do not need to copy them manually.*

6. **Running on Devices:**
   - **Android:** Ensure Android Studio is installed and configured. Run `npm run android` or press `a` in the Expo terminal. *Note: Running this command for the first time will automatically regenerate the 5GB build cache.*
   - **iOS:** Ensure Xcode is installed (macOS only). Run `npm run ios` or press `i` in the Expo terminal.

## Building the App

To build the app using Expo Application Services (EAS):

```bash
eas build --profile development
# or for production
eas build --profile production
```

Make sure your EAS CLI is logged in using `eas login`.
