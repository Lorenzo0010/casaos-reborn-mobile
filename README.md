# 📱 CasaOS Reborn Mobile

Welcome to the official mobile client repository for **CasaOS Reborn**! 
This React Native application (built with Expo) allows you to manage, monitor, and update your containers and CasaOS server resources directly from the palm of your hand, with a modern and cohesive interface.

---

## 💖 Support the Project

This app is entirely open-source and developed in my free time to bring the power of your homelab to your smartphone. If you appreciate the effort and want to support the ongoing development, updates, and bug fixes, please consider making a donation!

<div align="center">
  <a href="https://paypal.me/LorenzoCassano77" target="_blank">
    <img src="https://img.shields.io/badge/Donate-PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white" height="50" alt="Donate via PayPal">
  </a>
</div>

*Your donations keep motivation high and the project alive. Thank you!*

---

## ✨ How it works (Features)

- **📊 Interactive Dashboard:** Monitor CPU, RAM, Disk, and Network traffic in real-time.
- **🐳 Container Management:** View the status of all your Docker containers, start/stop them, or check their logs.
- **🔄 One-Tap Updates:** Quickly check and update the Docker images of your containers.
- **⚙️ Advanced Settings:** Customize app themes, configure Telegram bots for notifications, and monitor your server's health.
- **🎨 Cohesive Modern Design:** A beautifully crafted interface with automatic Light/Dark themes and standardized typography for maximum readability.

---

## 📦 Installation & Dependencies

### For End Users (No external dependencies)

**Dependencies:**
To *use* the final app on your smartphone, **no external dependencies are required** (you don't need Node.js, Expo, or anything on your PC). All you need is an Android smartphone.

**Installation Method:**
1. Navigate to the **[Releases](https://github.com/Lorenzo0010/casaos-reborn-mobile/releases)** section of this GitHub repository.
2. Download the latest available `.apk` file (e.g., `app-release.apk`).
3. Open the downloaded file on your Android smartphone. You may be asked to enable installation from "Unknown sources" in your phone's security settings.
4. Click **Install** and launch the app!

### 🔗 Backend Server Login
When you start the app for the first time, you will be prompted for your backend server IP (`casaos-reborn`) and credentials. 
Default credentials (set in the backend's `docker-compose.yml`) are:
- **Username:** `admin`
- **Password:** `casaos`

*(Ensure you enter the full IP and port, e.g., `192.168.1.50:1111`)*

---

## 🛠 For Developers

**Tech Stack:**
- **Framework:** React Native & Expo (SDK 51)
- **Navigation:** React Navigation (Stack & Bottom Tabs)
- **Icons:** Lucide React Native
- **Storage:** AsyncStorage
- **API Calls:** Axios

### 🚀 Quick Start: Development & Testing
Thanks to **Expo**, you don't need to build an APK to test the app. You can run it directly on your physical phone in seconds!

1. Download the free **Expo Go** app on your smartphone ([Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) or [Apple App Store](https://apps.apple.com/app/expo-go/id982107779)).
2. Make sure you have Node.js installed on your PC.
3. Open a terminal in this directory (`casaos-reborn-mobile`).
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start the development server:
   ```bash
   npm start
   ```
6. A giant **QR Code** will appear in your terminal. Scan it using **Expo Go** (Android) or the Camera app (iOS). The app will open instantly!

### 🔧 Troubleshooting Expo Go
- **"Something went wrong" (Metro stuck on 127.0.0.1):** Your Windows firewall is likely blocking the connection. While the terminal is running, press **`t`** to activate **Tunnel mode**. This bypasses local Wi-Fi blocks.
- **"Failed to download remote update":** The Tunnel connection might be stuck. Close Expo Go on your phone, press `Ctrl + C` in the terminal, and restart with `npm start -- -c`.
- **The bulletproof alternative (USB Cable):** Enable USB Debugging on your phone, connect it to the PC, and press **`a`** in the terminal to open the app via USB.

### 📦 Building the Final APK
When you are ready to build the official APK using **EAS Build** (Expo's cloud service):
```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

---

## ⚖️ License & Disclaimer

This project is open-source and distributed under the **MIT License**.

> [!WARNING]
> **DISCLAIMER OF LIABILITY**
> This software is provided "AS IS", without warranty of any kind, express or implied. The author (Lorenzo Cassano) assumes no responsibility for any data loss, server malfunctions, security breaches, or any other damages arising from the use of this application. Managing containers remotely carries inherent risks. **Use the application at your own risk.** Always ensure you have updated backups of your critical data.

For more details, consult the [LICENSE](./LICENSE) file included in the repository.
