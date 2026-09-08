// আগে এই সার্ভিস ওয়ার্কার কোনো ক্যাশিং করতো না, শুধু "Add to Home Screen"/PWA ইনস্টল
// ফিচারটা কাজ করানোর জন্য প্রয়োজন ছিল। এখন হালকা অফলাইন সাপোর্ট যোগ করা হলো:
// - ছবি (jpg/png/webp ইত্যাদি): cache-first — একবার লোড হলে পরেরবার সাথে সাথে দেখাবে, ইন্টারনেট স্লো হলেও কাজ করবে
// - বাকি সব (HTML/JS/CSS/Firestore ডেটা): network-first — সবসময় সবচেয়ে নতুন তথ্য আগে চেষ্টা করবে
//   (প্রোডাক্ট/সেটিংস আপডেট করলে সাথে সাথেই সবার কাছে দেখা যায়), নেট না থাকলে ক্যাশ থেকে ফলব্যাক দেখাবে
const CACHE_NAME = 'openshop-cache-v2';
const STATIC_IMG_RE = /\.(png|jpg|jpeg|webp|gif|svg|ico)$/i;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if(req.method !== 'GET') return;

  // নিজের সাইটের বাইরের (Firestore realtime "Listen" স্ট্রিম, imgbb, Google API ইত্যাদি)
  // রিকোয়েস্টে সার্ভিস ওয়ার্কার হাত দেয় না — এগুলো ব্রাউজার সরাসরি হ্যান্ডেল করবে।
  // Firestore-এর রিয়েলটাইম চ্যানেল স্ট্রিমিং/লং-পোলিং রিকোয়েস্ট, cache করতে গেলে বা
  // মাঝে আটকে দিলে "ServiceWorker intercepted... unexpected error" এই ধরনের এরর দেয়।
  let sameOrigin = false;
  try{ sameOrigin = new URL(req.url).origin === self.location.origin; }catch(err){ /* ignore */ }
  if(!sameOrigin) return;

  let isImage = false;
  try{ isImage = STATIC_IMG_RE.test(new URL(req.url).pathname); }catch(err){ /* malformed URL হলে উপেক্ষা করা হচ্ছে */ }

  if(isImage){
    event.respondWith(
      caches.match(req).then(cached => {
        if(cached) return cached;
        return fetch(req).then(res => {
          if(res && res.ok){
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => cached);
      })
    );
  } else {
    event.respondWith(
      fetch(req).then(res => {
        if(res && res.ok){
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req))
    );
  }
});
