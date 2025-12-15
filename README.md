# zmNg - Modern ZoneMinder Client

[View Comparison with zmNinja](notes/COMPARISON.md)

<img src="app/assets/logo.png" align="right" width="120" />

A modern web and mobile application for ZoneMinder home surveillance systems, providing a clean, intuitive interface for viewing live camera feeds, reviewing events, and managing multiple server profiles. It is a ground-up rewrite of the original [zmNinja](https://zmninja.zoneminder.com/) application, using modern web technologies and a more intuitive user interface. The code was 99% Claude CLI generated.

Watch a video of the demo [HERE](https://youtu.be/ces_2ap-htc)

### Screenshots
<sub><sup>frames courtesy [appleframer](https://appleframer.com/)</sup></sub>

<p align="center">
  <img src="images/1.png" width="32%" />
  <img src="images/2.png" width="32%" />
  <img src="images/3.png" width="32%" />
</p>
<p align="center">
  <img src="images/4.png" width="32%" />
  <img src="images/5.png" width="32%" />
  <img src="images/6.png" width="32%" />
</p>
<p align="center">
  <img src="images/7.png" width="32%" />
  <img src="images/8.png" width="32%" />
  <img src="images/9.png" width="32%" />
</p>


### Agentic AI, you and me

Agentic AI and me: I built the first version of zmNg over 2.5 days vs 4 months for the first bug ridden version of zmNinja. My agent of choice was Claude CLI (with Antigraviy and Copilot when tokens expired). Honestly, zmNg is better structured, more modern and easier to support than zmNinja (which uses tons of now deprecated tech and other code issues). I built it to learn how to effectively use agentic coding tools and wow, was I pleasantly surprised. zmNg has better tests, better release workflow (100% automated), easier to read code and better UX as well (imho).

Agentic AI and you: I don't plan to support zmNg at all. Please don't ping me and expect quick answers. 
Instead, treat this as "personal software" - i.e. download the code and fix it yourself. If you don't code, or do code, but aren't familiar with the environment of zmNg, I'd encourage you to use an agentic AI tool to help you along the way. Pick on you prefer. Remember, for mobile support, you'll need to generate your own FCM tokens. See mobile guides later for more.


#### Pull Requests

I am happy to accept PRs, but I don't want [AI slop](https://en.wikipedia.org/wiki/AI_slop). Funny I am saying this, given this repo is largely AI tools generated. The difference is I understand the code and know how to prompt it with directions that make the tools generate better quality code. Remember these tools are amazing but love to write a lot of code doing custom things when simpler/better means are available. So here are the rules:

- If you have not read and understood the code you generated, please don't PR it to my repo. Please continue to extend it yourself
- See my agent rules for [CLAUDE](CLAUDE.md) here - please make sure to use it in your agent
- Make sure your code is well written and generic. Use the tools to do code reviews

### Limitations & Notes
- Self signed/untrusted certificates are not supported. It's not worth the effort to support them. Please use LetsEncrypt or other free certs
- Push notifications won't work till you build the mobile apps yourself (web notifications, when the app is in foreground will work). See [Android](ANDROID_BUILD.md) and [iOS](IOS_BUILD.md) guides.
- If you want push notifications, you'll have to use a newer [Event Server](https://github.com/pliablepixels/zm_docker_macos) that has support for direct FCM (yep, you don't need the proxy cloud function anymore)


## Quick Start

### Binaries
- Download binaries from [zmNg Releases](https://github.com/pliablepixels/zmNg/releases)
- iOS is not uploaded - I don't have a dev account anymore

## Build from Source

### Prerequisites
- Node.js 18+ and npm ([download](https://nodejs.org/en/download))
- For desktop builds: Rust toolchain (for Tauri builds)

### GitHub Actions Setup (For Automated Releases)

If you're setting up automated builds via GitHub Actions, you need to enable write permissions:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Actions** → **General**
3. Scroll down to **Workflow permissions**
4. Select **"Read and write permissions"**
5. Check **"Allow GitHub Actions to create and approve pull requests"** (optional)
6. Click **Save**

This allows the workflows to create GitHub releases automatically when you push a tag.

### Desktop Development

```bash
git clone https://github.com/pliablepixels/zmNg
cd zmNg/app
npm install

# Desktop development (Tauri - native app)
npm run tauri:dev
```

### Desktop Production Builds

```bash
# Web production build
npm run build          # Output: dist/
npm run preview        # Preview production build

# Desktop production build (Tauri)
npm run tauri:build    # Output: src-tauri/target/release/bundle/
```

Deploy web build (`dist/`) to: Netlify, Vercel, GitHub Pages, AWS S3, etc.

### Mobile Builds

📱 **For Android setup and builds, see [ANDROID_BUILD.md](ANDROID_BUILD.md)**

📱 **For iOS setup and builds, see [IOS_BUILD.md](IOS_BUILD.md)**

## Testing

The project includes unit tests and end-to-end (E2E) tests to ensure code quality and reliability.

### Unit Tests

Run unit tests with Vitest:

```bash
cd zmNg/app

# Run all unit tests
npm run test:unit

# Run tests in watch mode
npm run test:unit -- --watch

# Run with coverage report
npm run test:coverage

# Run specific test file
npm run test:unit -- src/lib/__tests__/url-builder.test.ts
```

Coverage reports are generated in `coverage/` directory.

### End-to-End Tests

Run E2E tests with Playwright:

```bash
# Run E2E tests
npm run test:e2e

# Run with UI mode (visual debugging)
npm run test:e2e:ui

# Run specific test file
npm run test:e2e -- tests/monitors.spec.ts
```

**Note:** E2E tests require a running ZoneMinder server. Configure test credentials in `.env` file (see `.env.example`).

### Run All Tests

```bash
# Run both unit and E2E tests
npm run test:all
```


