/*
  ============================================================
  এই ফাইলে আপনার Firebase প্রজেক্টের কনফিগারেশন বসাতে হবে।
  README.md এ ধাপে ধাপে দেখানো আছে কীভাবে ফ্রি Firebase প্রজেক্ট বানাবেন।

  Firebase Console (console.firebase.google.com) থেকে
  Project Settings > General > Your apps > SDK setup and configuration
  এ গিয়ে এরকম একটা অবজেক্ট পাবেন — সেটা এখানে হুবহু বসিয়ে দিন।
  ============================================================
*/
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBrSe4RpvN8fSmxICsqpXmu8rJCHXMqjU0",
  authDomain: "sonali-fashion-92baf.firebaseapp.com",
  projectId: "sonali-fashion-92baf",
  storageBucket: "sonali-fashion-92baf.firebasestorage.app",
  messagingSenderId: "400250524624",
  appId: "1:400250524624:web:aa48fbfa7c7c6f3ae6dfd5"
};

// শুধু এই ইমেইল দিয়ে লগইন করলেই এডমিন প্যানেল খুলবে
const ADMIN_EMAIL = "sonalifashionbarishal@gmail.com";

// গ্যালারি থেকে ছবি আপলোডের জন্য ImgBB API key (ফ্রি) — README.md এ নেওয়ার নিয়ম আছে
const IMGBB_API_KEY = "d6d855fe42af090cbf506db20ee25af8";
