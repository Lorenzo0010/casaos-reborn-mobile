# 📱 CasaOS Reborn Mobile

Benvenuto nel repository ufficiale del client mobile di **CasaOS Reborn**! 
Questa applicazione React Native (costruita con Expo) ti permette di gestire, monitorare e aggiornare i tuoi container e le risorse del tuo server CasaOS direttamente dal palmo della tua mano, con un'interfaccia moderna e coerente.

<div align="center">
  <a href="https://paypal.me/LorenzoCassano77" target="_blank">
    <img src="https://img.shields.io/badge/Donate-PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white" height="50" alt="Donate via PayPal">
  </a>
</div>

---

## ✨ Funzionalità Principali

- **📊 Dashboard Interattiva:** Monitora l'utilizzo di CPU, RAM, Disco e Traffico di Rete in tempo reale.
- **🐳 Gestione Container:** Visualizza lo stato di tutti i tuoi container Docker, accendili, spegnili, o visualizzane i log.
- **🔄 Aggiornamenti:** Controlla e aggiorna rapidamente le immagini Docker dei tuoi container con un tap.
- **⚙️ Impostazioni Avanzate:** Personalizza i temi dell'app, configura bot Telegram per le notifiche e monitora il funzionamento del server.
- **🎨 Design Coerente e Moderno:** Un'interfaccia curata nei dettagli, con temi chiari/scuri e grandezze tipografiche standardizzate per la massima leggibilità.

---

## 🚀 Guida Rapida: Come Testare l'App (Senza compilare l'APK)

Grazie a **Expo**, non hai bisogno di compilare un APK per provare l'app. Puoi farla girare direttamente sul tuo telefono fisico in pochi secondi!

### Prerequisiti
1. Scarica l'app gratuita **Expo Go** sul tuo smartphone (disponibile su [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) e [Apple App Store](https://apps.apple.com/app/expo-go/id982107779)).
2. Assicurati di avere Node.js installato sul tuo computer.

### Avvio Veloce
1. Apri il terminale in questa cartella (`casaos-reborn-mobile`).
2. Installa le dipendenze (solo la prima volta):
   ```bash
   npm install
   ```
3. Avvia il server di sviluppo:
   ```bash
   npm start
   ```
4. Sul tuo computer apparirà un **Codice QR gigante**.
5. Apri **Expo Go** sul tuo telefono Android (o usa la Fotocamera su iOS) e scansiona il codice QR.
L'app si aprirà istantaneamente! Ogni modifica che farai al codice si rifletterà sul tuo telefono in tempo reale.

---

## 🛠 Risoluzione Problemi Comuni con Expo Go

### Errore: "Something went wrong" (o Metro fermo su 127.0.0.1)
Se vedi nel terminale `exp://127.0.0.1:8081`, significa che il firewall di Windows sta bloccando la rete e il telefono non riesce a comunicare col PC.
**Soluzione:**
Mentre il terminale è aperto, premi la lettera **`t`** sulla tastiera del computer. Questo attiverà la modalità **Tunnel**, generando un nuovo QR code che bypassa completamente i blocchi del Wi-Fi locale.

### Errore: "Failed to download remote update"
La connessione Tunnel potrebbe essersi bloccata. 
**Soluzione:** 
1. Chiudi completamente Expo Go dal telefono.
2. Nel terminale premi `Ctrl + C` per fermare il server.
3. Riavvia pulendo la cache con: `npm start -- -c`.

### L'Alternativa Infallibile: Connessione via Cavo USB
Se il Wi-Fi fa troppi capricci:
1. Collega il telefono al PC via USB.
2. Attiva il **Debug USB** nelle Opzioni Sviluppatore del telefono.
3. Nel terminale dove c'è il QR code, premi la lettera **`a`** ("Open on Android").
L'app si aprirà via cavo in modo fulmineo!

---

## 🔐 Login al Server Backend

Quando avvii l'app per la prima volta, ti verrà chiesto l'IP del tuo server backend (`casaos-reborn`) e le credenziali.
Di default, le credenziali del server di backend (impostate nel file `server.js` del backend) sono:

- **Username:** `admin`
- **Password:** `casaos`

*(Assicurati di inserire l'IP completo e la porta, ad esempio `192.168.1.50:3000`)*.

---

## 📦 Compilare l'APK Definitivo

Quando sarai pronto a installare l'app in via definitiva senza usare Expo Go, potrai compilare l'APK ufficiale usando **EAS Build** (il servizio cloud di Expo) o in locale.

**Per costruire un APK per Android nel cloud:**
```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```
(Assicurati di aver configurato un account Expo gratuito).

---

## 💻 Stack Tecnologico

- **Framework:** React Native & Expo (SDK 51)
- **Navigazione:** React Navigation (Stack & Bottom Tabs)
- **Icone:** Lucide React Native
- **Storage:** AsyncStorage
- **Chiamate API:** Axios

---

## ⚖️ Licenza ed Esenzione di Responsabilità

Questo progetto è open-source e distribuito sotto la **Licenza MIT**.

> [!WARNING]
> **ESCLUSIONE DI RESPONSABILITÀ (DISCLAIMER)**
> Questo software è fornito "COSÌ COM'È" (AS IS), senza alcuna garanzia esplicita o implicita. L'autore (Lorenzo Cassano) declina ogni responsabilità per eventuali perdite di dati, malfunzionamenti del server, violazioni di sicurezza o qualsiasi altro danno derivante dall'utilizzo di questa applicazione. Gestire i container in remoto comporta rischi intrinseci. **Utilizza l'applicazione a tuo rischio e pericolo.** Assicurati sempre di avere backup aggiornati dei tuoi dati critici.

Per maggiori dettagli, consulta il file [LICENSE](./LICENSE) incluso nel repository.
