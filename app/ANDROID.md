# Android Development Guide

## Overview

zmNg uses Capacitor to provide a native Android experience. The app uses native HTTP to bypass CORS restrictions when communicating with ZoneMinder servers.

## Prerequisites

1. **Android SDK**
   - Download from [Android Studio](https://developer.android.com/studio) or install SDK tools separately
   - Minimum SDK version: 22 (Android 5.1)
   - Target SDK version: 34 (Android 14)

2. **Environment Variables**
   ```bash
   export ANDROID_HOME=/path/to/android/sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
   ```

3. **Android Virtual Device (AVD)**
   - Create an emulator using Android Studio's AVD Manager
   - Or use command line: `avdmanager create avd -n my_avd -k "system-images;android-33;google_apis;x86_64"`

## Development Workflow

### Quick Start
```bash
npm run android
```

### Step-by-Step

1. **Build web app**
   ```bash
   npm run build
   ```

2. **Sync to Android**
   ```bash
   npx cap sync android
   ```

3. **Run on emulator/device**
   ```bash
   npx cap run android
   ```

### Live Reload During Development

For faster development, you can use live reload:

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Update `capacitor.config.ts` temporarily:
   ```typescript
   server: {
     url: 'http://10.0.2.2:5173', // For Android emulator
     cleartext: true
   }
   ```

3. Run the app:
   ```bash
   npx cap run android
   ```

**Note**: `10.0.2.2` is the special IP that Android emulator uses to access the host machine's localhost.

## Debugging

### View Logs
```bash
npm run android:logs

# Or use adb directly
adb logcat | grep -E '(Capacitor|Console|chromium)'
```

### Chrome DevTools
1. Open Chrome and navigate to `chrome://inspect`
2. Your device/emulator should appear under "Remote Target"
3. Click "inspect" to open DevTools

### Common Issues

#### CORS Errors
- **Symptom**: "Access to XMLHttpRequest has been blocked by CORS policy"
- **Solution**: The app should automatically use native HTTP. Check that you're not in dev mode with localhost URL in capacitor.config.ts

#### Network Request Failures
- **Check**: Network security config allows cleartext traffic
- **File**: `android/app/src/main/res/xml/network_security_config.xml`
- **Verify**: AndroidManifest.xml includes `android:networkSecurityConfig="@xml/network_security_config"`

#### Build Failures
```bash
# Clean build
cd android
./gradlew clean

# Rebuild
./gradlew assembleDebug
```

## Production Release

### 1. Create Keystore

```bash
keytool -genkey -v -keystore zmng-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias zmng-key
```

### 2. Configure Signing

Create `android/keystore.properties`:
```properties
storePassword=YourStorePassword
keyPassword=YourKeyPassword
keyAlias=zmng-key
storeFile=/absolute/path/to/zmng-release-key.jks
```

### 3. Update build.gradle

Edit `android/app/build.gradle`:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...

    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 4. Build Release

```bash
# Build web app
npm run build

# Sync to Android
npx cap sync android

# Build release APK
cd android
./gradlew assembleRelease

# Or build AAB for Play Store
./gradlew bundleRelease
```

### 5. Output Files

- **APK**: `android/app/build/outputs/apk/release/app-release.apk`
- **AAB**: `android/app/build/outputs/bundle/release/app-release.aab`

### 6. Test Release Build

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

## Architecture

### Native HTTP Implementation

The app uses Capacitor's native HTTP plugin to bypass CORS:

```typescript
// api/client.ts
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

if (isNative) {
  // Use custom axios adapter with CapacitorHttp
  adapter: async (config) => {
    const response = await CapacitorHttp.request({
      method: config.method,
      url: fullUrl,
      headers: config.headers,
      data: config.data,
    });
    return response;
  }
}
```

### Network Security

Android configuration allows HTTP traffic:

**AndroidManifest.xml**:
```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    android:usesCleartextTraffic="true">
```

**network_security_config.xml**:
```xml
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

## Performance Tips

1. **Use Snapshot Mode**: Better for mobile bandwidth
2. **Limit Concurrent Streams**: Mobile devices have more limited resources
3. **Enable Minification**: Always use release builds for production
4. **Monitor Memory**: Use Android Profiler to check for leaks

## Publishing to Play Store

1. Create a Google Play Developer account ($25 one-time)
2. Prepare store listing:
   - App name, description
   - Screenshots (phone, tablet, TV)
   - Feature graphic (1024x500)
   - App icon (512x512)
3. Upload AAB file
4. Fill out content rating questionnaire
5. Set up pricing and distribution
6. Submit for review

Review typically takes 1-3 days.

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [Material Design Guidelines](https://m3.material.io/)
