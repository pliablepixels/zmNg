Building for Mobile & Desktop
=============================

zmNg can be built as a native mobile app (Android, iOS) or a desktop app
(macOS, Windows, Linux). The same source code is used across all platforms.

Prerequisites
-------------

- Node.js ^20.19.0 or >=22.12.0 and npm
- For desktop builds: Rust toolchain (for Tauri)
- For Android: Android Studio, JDK 17+
- For iOS: Xcode, macOS, Apple Developer account

Web Build
---------

The simplest target. Produces static files you can host anywhere.

.. code-block:: bash

   cd app
   npm install
   npm run build    # Output: dist/
   npm run preview  # Preview locally

Deploy the ``dist/`` folder to Netlify, Vercel, GitHub Pages, AWS S3, or
any static host.

Desktop Build (Tauri)
---------------------

Produces a native desktop app that is lighter than Electron-based alternatives.

.. code-block:: bash

   cd app
   npm install
   npm run tauri:dev     # Development with HMR
   npm run tauri:build   # Production build -> src-tauri/target/release/bundle/

Mobile Builds
-------------

.. toctree::
   :maxdepth: 2

   ANDROID
   IOS

Automated Releases
------------------

zmNg uses GitHub Actions to build release binaries automatically. See
`make_release.sh <https://github.com/pliablepixels/zmNg/blob/main/scripts/make_release.sh>`_
for the release workflow.

To enable automated builds on your fork:

1. Go to **Settings > Actions > General** in your GitHub repository
2. Under **Workflow permissions**, select **Read and write permissions**
3. Click **Save**

Pushing a version tag triggers builds for all platforms.
