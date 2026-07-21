/* global __dirname, process, require, console */
const fs = require('fs');
const path = require('path');

// 1. Paths to files
const appJsonPath = path.join(__dirname, '../app.json');
const packageJsonPath = path.join(__dirname, '../package.json');
const buildGradlePath = path.join(__dirname, '../android/app/build.gradle');

// Helper to bump semantic version
function bumpPatchVersion(versionStr) {
  const parts = versionStr.split('.');
  if (parts.length === 3) {
    const patch = parseInt(parts[2], 10);
    if (!isNaN(patch)) {
      parts[2] = (patch + 1).toString();
      return parts.join('.');
    }
  }
  return versionStr; // fallback if not in standard format
}

// 2. Read app.json
if (!fs.existsSync(appJsonPath)) {
  console.error('Error: app.json not found!');
  process.exit(1);
}

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

if (!appJson.expo) {
  console.error('Error: app.json does not have "expo" object!');
  process.exit(1);
}

const currentVersion = appJson.expo.version || '1.0.0';
const currentVersionCode = appJson.expo.android?.versionCode || 1;

const newVersion = bumpPatchVersion(currentVersion);
const newVersionCode = currentVersionCode + 1;

console.log(`Bumping version:`);
console.log(`- Version Name: ${currentVersion} -> ${newVersion}`);
console.log(`- Version Code: ${currentVersionCode} -> ${newVersionCode}`);

// Update app.json
appJson.expo.version = newVersion;
if (!appJson.expo.android) {
  appJson.expo.android = {};
}
appJson.expo.android.versionCode = newVersionCode;

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
console.log('✓ Updated app.json');

// 3. Read package.json
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('✓ Updated package.json');
}

// 4. Read & Update android/app/build.gradle
if (fs.existsSync(buildGradlePath)) {
  let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

  // Regex replacement for versionCode
  const versionCodeRegex = /(versionCode\s+)\d+/;
  if (versionCodeRegex.test(buildGradle)) {
    buildGradle = buildGradle.replace(versionCodeRegex, `$1${newVersionCode}`);
  } else {
    console.warn('Warning: versionCode not found in build.gradle');
  }

  // Regex replacement for versionName
  const versionNameRegex = /(versionName\s+)"[^"]+"/;
  if (versionNameRegex.test(buildGradle)) {
    buildGradle = buildGradle.replace(versionNameRegex, `$1"${newVersion}"`);
  } else {
    console.warn('Warning: versionName not found in build.gradle');
  }

  fs.writeFileSync(buildGradlePath, buildGradle);
  console.log('✓ Updated android/app/build.gradle');
} else {
  console.warn('Warning: android/app/build.gradle not found');
}

console.log('Successfully bumped app versions!');
