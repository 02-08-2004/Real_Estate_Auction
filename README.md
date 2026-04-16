# EstateAuction — Premium Real Estate Bidding Platform

A full-featured real estate auction app built with React + Vite + Firebase.

---

## 🚀 Quick Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Firebase

Open `src/firebase/config.js` and replace the placeholder values with your **own** Firebase project credentials:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

**How to get credentials:**
1. Go to https://console.firebase.google.com
2. Create a new project (or use existing)
3. Go to **Project Settings → Web App → Add App**
4. Copy the `firebaseConfig` object

### 3. Enable Firebase Services

In your Firebase console:

- **Authentication** → Sign-in methods → Enable:
  - Email/Password ✅
  - Google ✅

- **Firestore Database** → Create database (Start in test mode for development)

### 4. Create your first Admin user

After registering a user via the app, go to **Firestore Console → users collection** and manually change:
```
role: "admin"
```
for the user you want to be admin.

### 5. Run the app
```bash
npm run dev
```
Visit: http://localhost:5173

---

## 🗂 Project Structure

```
src/
├── firebase/
│   └── config.js          # Firebase credentials (YOU MUST FILL THIS)
├── context/
│   └── AuthContext.jsx     # Auth state, login, register, Google OAuth
├── components/
│   ├── ProtectedRoute.jsx  # Role-based route guard
│   ├── PropertyCard.jsx    # Card with live bid, countdown, bid history
│   └── AddPropertyModal.jsx # Admin modal to add new properties
├── pages/
│   ├── Login.jsx           # Split-screen login (matches your design)
│   ├── Register.jsx        # Split-screen register with password strength
│   ├── AdminLogin.jsx      # Admin-only login portal
│   ├── ForgotPassword.jsx  # Password reset via email
│   ├── BuyerDashboard.jsx  # User view: live auctions, search, bidding
│   └── AdminDashboard.jsx  # Admin: stats, add/delete properties, tabs
├── hooks/
│   └── useCountdown.js     # Real-time countdown timer hook
├── App.jsx                 # All routes
├── main.jsx                # Entry point
└── index.css               # Global styles (dark luxury theme)
```

---

## ✅ Features Included

### Authentication
- [x] Email + Password register/login
- [x] Email verification (must verify before login)
- [x] Google OAuth login
- [x] Password strength indicator (5 rules)
- [x] Show/hide password toggle
- [x] Forgot password (email reset)
- [x] Role-based redirect (user → dashboard, admin → admin panel)
- [x] Admin-only portal at `/admin-login`
- [x] Protected routes with role enforcement

### Bidding System
- [x] Real-time property listing via `onSnapshot()`
- [x] Place bid with validation (must be > currentBid)
- [x] Atomic bid update using Firestore `runTransaction()`
- [x] Live countdown timer per property
- [x] Bidding disabled after auction ends
- [x] Highest bidder display
- [x] Bid history per property (expandable)

### Admin Dashboard
- [x] Analytics stats (total properties, active, bids, bid volume)
- [x] Add new property via modal
- [x] Delete property
- [x] Active / Ended auction tabs

### UI / Design
- [x] Split-screen auth layout (matches your screenshot exactly)
- [x] Dark luxury aesthetic with red accents
- [x] Cormorant Garamond + DM Sans typography
- [x] Fade-in-up staggered animations
- [x] Fully responsive

---

## 🔮 Next Features (not yet built)

- [ ] Cloudinary image upload for properties
- [ ] Razorpay / UPI payment on auction win
- [ ] "You've been outbid" notifications
- [ ] Auto-extend auction (last 1 min bid adds 1 min)
- [ ] Admin user management panel

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + Custom CSS |
| Routing | React Router v6 |
| Auth | Firebase Authentication |
| Database | Firebase Firestore |
| Fonts | Google Fonts (Cormorant Garamond, DM Sans) |

---

## 📦 Build for Production

```bash
npm run build
```

Output goes to `dist/`. Deploy to Firebase Hosting, Vercel, or Netlify.
