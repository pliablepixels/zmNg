# Release Notes

## Installation Notes

### macOS
- **Unsigned Build**: This app is not code-signed. On first launch, you may see a "damaged" error.
- **Solution**: Use [Sentinel](https://github.com/alienator88/Sentinel) to bypass Gatekeeper, or right-click the app and select "Open"

### Windows
- **Unsigned Build**: SmartScreen may warn about an unrecognized app
- **Solution**: Click "More info" → "Run anyway"

### Linux
- **AppImage**: Make executable with `chmod +x zmNg-*.AppImage`, then run
- **DEB Package**: Install with `sudo dpkg -i zmNg-*.deb`
- **RPM Package**: Install with `sudo rpm -i zmNg-*.rpm`

### Android
- **Unsigned APK**: Enable "Install from Unknown Sources" in device settings
- **AAB Bundle**: For Google Play Store (requires signing)

## Important Notes

- **Self-signed certificates are not supported**. Use Let's Encrypt or other trusted certificates.
- **Push notifications**: Require building the mobile apps yourself with your own FCM credentials. See [Android](ANDROID_BUILD.md) and [iOS](IOS_BUILD.md) build guides.
- **Event Server**: For push notifications, use a newer [Event Server](https://github.com/pliablepixels/zm_docker_macos) with direct FCM support.

## Support

This is personal software with no official support. For issues or contributions, see the [GitHub repository](https://github.com/pliablepixels/zmNg).

---

**Edit this file to customize your release notes. This content will appear at the top of every GitHub release.**
