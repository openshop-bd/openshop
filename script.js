// ============ STATE ============
// সাইটের ৪টি ফিক্সড মেইন ক্যাটাগরি — এডমিন প্যানেলে এই তালিকা থেকে বাছাই করতে হয় (ফ্রি-টেক্সট টাইপ করা যায় না)
// ডিফল্ট মেইন ক্যাটাগরি — অ্যাডমিন প্যানেলের "মেইন ক্যাটাগরি ম্যানেজমেন্ট" থেকে এটা
// কাস্টমাইজ করা থাকলে loadSiteSettings() এই ডিফল্ট তালিকাটা রিপ্লেস করে দেবে
let MAIN_CATEGORIES = [
  { value: 'women',    label: 'নারীদের পোশাক', labelEn: "Women's Fashion", icon: '👗' },
  { value: 'men',      label: 'পুরুষদের পোশাক', labelEn: "Men's Fashion",   icon: '👔' },
  { value: 'bags',     label: 'ব্যাগ কালেকশন',   labelEn: 'Bag Collection', icon: '👜' },
  { value: 'seasonal', label: 'সিজনাল প্রোডাক্ট', labelEn: 'Seasonal Products', icon: '🎉' }
];
function mainCategoryLabel(value){
  const m = MAIN_CATEGORIES.find(c => c.value === value);
  return m ? m.label : value;
}

let cart = JSON.parse(localStorage.getItem('openshop_cart') || '[]');
let wishlist = JSON.parse(localStorage.getItem('openshop_wishlist') || '[]');
let activeMainCategory = 'সব'; // 'সব' অথবা MAIN_CATEGORIES-এর একটা value
let activeCategory = 'সব'; // নির্বাচিত মেইন ক্যাটাগরির ভিতরের সাব-ক্যাটাগরি
let searchQuery = '';
let selectedSize = null;
let sortOrder = 'default';
let minPriceFilter = null;
let maxPriceFilter = null;
let minRatingFilter = 0;
let appliedCoupons = []; // প্রয়োগ করা কুপনগুলোর তালিকা (একাধিক প্রোডাক্ট-নির্দিষ্ট কুপন + সর্বোচ্চ ১টা সাধারণ কুপন একসাথে সক্রিয় থাকতে পারে)
let COUPONS = []; // Firestore-এর coupons কালেকশন থেকে আসা সব কুপন (ক্যাশ করা)
let REVIEWS = []; // Firestore-এর reviews কালেকশন থেকে আসা সব রিভিউ (ক্যাশ করা)
let LIKES = []; // Firestore-এর likes কালেকশন থেকে আসা সব লাইক (ক্যাশ করা, কাউন্ট বের করার জন্য)
let likedProducts = JSON.parse(localStorage.getItem('openshop_liked') || '[]'); // এই ব্রাউজারে কোন কোন প্রোডাক্টে লাইক দেওয়া হয়েছে
let SITE_LIKES_COUNT = 0; // Firestore-এর siteLikes কালেকশনে থাকা মোট ডকুমেন্ট সংখ্যা (সব ভিজিটর মিলিয়ে গ্লোবাল)
let _db = null;
// PRODUCTS আসে products.js থেকে (স্ট্যাটিক ফলব্যাক তালিকা)। Firebase কনফিগার করা থাকলে
// নিচের loadLiveProducts() ফাংশন লাইভ ডাটা দিয়ে এটা রিপ্লেস করে দেয়।

function firebaseIsConfigured(){
  return typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.includes('আপনার');
}

function getDb(){
  if(!firebaseIsConfigured()) return null;
  try{
    if(typeof firebase === 'undefined') return null; // SDK ব্লক হয়ে থাকলে/লোড না হলে গ্রেসফুলি ফলব্যাক
    if(!_db){
      if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      _db = firebase.firestore();
    }
    return _db;
  }catch(err){
    console.warn('Firebase চালু করা যায়নি, স্ট্যাটিক ডেটা ব্যবহার হচ্ছে:', err.message);
    return null;
  }
}

async function loadLiveProducts(){
  const db = getDb();
  if(!db) return; // no Firebase set up yet — keep using products.js
  try{
    const snap = await db.collection('products').orderBy('updatedAt', 'desc').get();
    if(!snap.empty){
      PRODUCTS = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  }catch(err){
    console.warn('Firestore থেকে প্রোডাক্ট লোড করা যায়নি, স্ট্যাটিক তালিকা ব্যবহার হচ্ছে:', err.message);
  }
}

// ============ COUPONS (অ্যাডমিন প্যানেল থেকে একাধিক কুপন ম্যানেজ করা যায়) ============
async function loadCoupons(){
  const db = getDb();
  if(!db) return;
  try{
    const snap = await db.collection('coupons').get();
    COUPONS = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }catch(err){
    console.warn('কুপন লোড করা যায়নি:', err.message);
  }
}

// একটা কুপন কোড এখন ব্যবহার করা যাবে কিনা — কতবার ব্যবহার হয়েছে সেটা orders কালেকশন থেকে
// গুনে বের করা হয় (কুপন ডকুমেন্টে সরাসরি কাউন্টার রাখলে সেটা পাবলিকভাবে লিখতে দিতে হতো,
// যেটা নিরাপদ না — তাই read-only orders কোয়েরি থেকেই ব্যবহারের সংখ্যা বের করা হচ্ছে)।
async function countCouponUsage(code){
  const db = getDb();
  if(!db) return 0;
  try{
    const snap = await db.collection('orders').where('couponCode', '==', code).get();
    return snap.size;
  }catch(err){
    console.warn('কুপন ব্যবহারের সংখ্যা গোনা যায়নি:', err.message);
    return 0;
  }
}

// কার্টে থাকা প্রোডাক্টগুলোর মধ্যে যেগুলো একটা নির্দিষ্ট প্রোডাক্ট আইডির সাথে মেলে,
// তাদের লাইন-সাবটোটাল (দাম × পরিমাণ, সবগুলো মিলিয়ে) বের করে
function getProductLineSubtotal(cartItems, productId){
  return cartItems.filter(i => i.id === productId).reduce((s,i) => s + i.price*i.qty, 0);
}

// কুপন কোড যাচাই করে — সঠিক থাকলে discount সহ কুপন অবজেক্ট, নাহলে কারণসহ এরর ফেরত দেয়
// cartItems পুরো কার্ট (প্রোডাক্ট-নির্দিষ্ট কুপন যাচাই করতে দরকার — নির্দিষ্ট প্রোডাক্টটা কার্টে আছে কিনা দেখতে হয়)
async function validateCoupon(code, cartItems){
  const cleanCode = (code || '').trim().toUpperCase();
  if(!cleanCode) return { ok:false, reason:'একটা কুপন কোড লিখুন।' };
  if(!COUPONS.length) await loadCoupons();
  const coupon = COUPONS.find(c => (c.code||'').toUpperCase() === cleanCode);
  if(!coupon) return { ok:false, reason:'কুপন কোডটি সঠিক নয়।' };
  if(coupon.active === false) return { ok:false, reason:'এই কুপনটি বর্তমানে বন্ধ আছে।' };
  if(coupon.expiry){
    const today = new Date().toISOString().slice(0,10);
    if(coupon.expiry < today) return { ok:false, reason:'এই কুপনের মেয়াদ শেষ হয়ে গেছে।' };
  }
  // এই কুপনটা একটা নির্দিষ্ট প্রোডাক্টের জন্য হলে, সেই প্রোডাক্টটা কার্টে আছে কিনা যাচাই করা হচ্ছে —
  // না থাকলে কুপনটা প্রযোজ্য না (এভাবেই একটা কুপন শুধু একটা প্রোডাক্টের উপর কাজ করে, পুরো কার্টে না)
  let relevantSubtotal;
  if(coupon.productId){
    relevantSubtotal = getProductLineSubtotal(cartItems, coupon.productId);
    if(relevantSubtotal <= 0){
      return { ok:false, reason:`এই কুপনটি "${coupon.productName || 'একটি নির্দিষ্ট প্রোডাক্ট'}"-এর জন্য — আগে সেই প্রোডাক্টটা কার্টে যোগ করুন।` };
    }
  } else {
    relevantSubtotal = cartItems.reduce((s,i) => s + i.price*i.qty, 0);
  }
  const minOrder = Number(coupon.minOrder || 0);
  if(minOrder > 0 && relevantSubtotal < minOrder){
    return { ok:false, reason:`এই কুপন ব্যবহার করতে কমপক্ষে ${formatTaka(minOrder)} টাকার ${coupon.productId ? 'ওই প্রোডাক্টের' : ''} অর্ডার লাগবে।` };
  }
  if(coupon.maxUses){
    const used = await countCouponUsage(coupon.code);
    if(used >= Number(coupon.maxUses)){
      return { ok:false, reason:'এই কুপনের ব্যবহারের সীমা শেষ হয়ে গেছে।' };
    }
  }
  return { ok:true, coupon };
}

// একটা নির্দিষ্ট প্রোডাক্টের জন্য সক্রিয় (ও মেয়াদ না ফুরানো) কুপন থাকলে সেটা খুঁজে বের করে —
// প্রোডাক্ট কার্ড/মোডালে কুপন চিপ দেখানোর জন্য ব্যবহৃত হয়
function getProductCoupon(productId){
  if(!COUPONS || !COUPONS.length) return null;
  const today = new Date().toISOString().slice(0,10);
  return COUPONS.find(c =>
    c.productId === productId &&
    c.active !== false &&
    (!c.expiry || c.expiry >= today)
  ) || null;
}

// প্রোডাক্টের সাথে যুক্ত কুপন থাকলে "কপি করুন" বাটনসহ একটা চিপ HTML রিটার্ন করে, না থাকলে খালি স্ট্রিং
function couponChipHtml(productId){
  const cpn = getProductCoupon(productId);
  if(!cpn) return '';
  const discountText = cpn.type === 'fixed' ? `${formatTaka(cpn.value)} ছাড়` : `${cpn.value}% ছাড়`;
  return `
    <div class="coupon-chip" title="এই প্রোডাক্টের জন্য কুপন — কোডটি কপি করে চেকআউটে পেস্ট করুন">
      <span class="coupon-chip-code">🏷️ ${cpn.code}</span>
      <span class="coupon-chip-discount">${discountText}</span>
      <button type="button" class="coupon-copy-btn" data-code="${cpn.code}">কপি করুন</button>
    </div>`;
}

// কুপন কোড ক্লিপবোর্ডে কপি করে + কার্টের কুপন ইনপুটে অটো-ফিল করে (থাকলে) যাতে সাথে সাথে পেস্ট করা যায়
function copyCouponCode(code, btnEl){
  const done = () => {
    showSiteToast(`কুপন কোড "${code}" কপি হয়েছে! চেকআউটে পেস্ট করুন 🎉`);
    const cartInput = document.getElementById('couponInput');
    if(cartInput) cartInput.value = code;
    if(btnEl){
      const original = btnEl.textContent;
      btnEl.textContent = 'কপি হয়েছে ✓';
      setTimeout(() => { btnEl.textContent = original; }, 1500);
    }
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(code).then(done).catch(done);
  } else {
    done();
  }
}

// ============ REVIEWS & RATINGS ============
async function loadReviews(){
  const db = getDb();
  if(!db) return;
  try{
    const snap = await db.collection('reviews').get();
    REVIEWS = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => (b.ts||0) - (a.ts||0));
  }catch(err){
    console.warn('রিভিউ লোড করা যায়নি:', err.message);
  }
}
function getProductRating(productId){
  const list = REVIEWS.filter(r => r.productId === productId);
  if(!list.length) return { avg: 0, count: 0 };
  const sum = list.reduce((s,r) => s + (Number(r.rating)||0), 0);
  return { avg: sum / list.length, count: list.length };
}
function starsHtml(avg, size){
  const full = Math.round(avg);
  let out = '';
  for(let i=1; i<=5; i++) out += `<span class="star ${i<=full ? 'filled' : ''}" style="${size ? 'font-size:'+size+'px;' : ''}">★</span>`;
  return out;
}
function ratingBadgeHtml(productId){
  const { avg, count } = getProductRating(productId);
  if(count === 0) return '';
  return `<div class="rating-badge"><span class="stars-mini">${starsHtml(avg)}</span><span class="rating-num">${avg.toFixed(1)} (${count})</span></div>`;
}

// ============ লাইক (প্রতিটা প্রোডাক্টের নিচে "লাইক" অপশন — সবার জন্য দেখা যায়) ============
async function loadLikes(){
  const db = getDb();
  if(!db) return;
  try{
    const snap = await db.collection('likes').get();
    LIKES = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }catch(err){
    console.warn('লাইক লোড করা যায়নি:', err.message);
  }
}
function isLiked(productId){ return likedProducts.includes(productId); }
function getLikeCount(productId){ return LIKES.filter(l => l.productId === productId).length; }
function saveLikedProducts(){ localStorage.setItem('openshop_liked', JSON.stringify(likedProducts)); }
function likeSvg(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 10v11M2 13v6a2 2 0 0 0 2 2h13.4a2 2 0 0 0 2-1.6l1.3-7A2 2 0 0 0 18.7 10H14V5a2 2 0 0 0-2-2l-3 7v11"/></svg>`;
}
function likeButtonHtml(productId){
  const liked = isLiked(productId);
  const count = getLikeCount(productId);
  return `<button class="like-btn ${liked ? 'active' : ''}" data-id="${productId}" ${liked ? 'disabled' : ''}>${likeSvg()} <span>লাইক</span> <span class="like-count">${count}</span></button>`;
}
// প্রতি ব্রাউজার থেকে একটা প্রোডাক্টে একবারই লাইক দেওয়া যায় (localStorage-এ ট্র্যাক হয়)।
// UI সাথে সাথেই আপডেট হয়ে যায় (অপটিমিস্টিক), Firestore-এ সেভ হয় ব্যাকগ্রাউন্ডে — ব্যর্থ হলেও শপিং এক্সপেরিয়েন্স আটকায় না।
function likeProduct(productId){
  if(isLiked(productId)) return;
  likedProducts.push(productId);
  saveLikedProducts();
  LIKES.push({ productId, ts: Date.now() });
  document.querySelectorAll(`.like-btn[data-id="${productId}"]`).forEach(btn => {
    btn.classList.add('active');
    btn.disabled = true;
    const countEl = btn.querySelector('.like-count');
    if(countEl) countEl.textContent = getLikeCount(productId);
  });
  const db = getDb();
  if(db) db.collection('likes').add({ productId, ts: Date.now() }).catch(() => {});
}

// ============ ওয়েবসাইট লাইক (ফেসবুক পেজ না, পুরো সাইটের নিজস্ব লাইক কাউন্টার) ============
// Firestore-এর siteLikes কালেকশনে প্রতিটা লাইক আলাদা ডকুমেন্ট হিসেবে জমা হয় (likes কালেকশনের
// প্যাটার্নই অনুসরণ করা হয়েছে) — তাই সব ভিজিটরের ব্রাউজার মিলিয়ে একটাই সত্যিকারের গ্লোবাল সংখ্যা।
// প্রদর্শিত সংখ্যা = ৪০০ (বেজ, সাইট নতুন শুরু হওয়ায়) + siteLikes কালেকশনের মোট ডকুমেন্ট।
const SITE_LIKE_BASE = 435;
async function loadSiteLikesCount(){
  const db = getDb();
  if(!db) return;
  try{
    const snap = await db.collection('siteLikes').get();
    SITE_LIKES_COUNT = snap.size;
  }catch(err){
    console.warn('সাইট লাইক কাউন্ট লোড করা যায়নি:', err.message);
  }
}
function getSiteLikeCount(){ return SITE_LIKE_BASE + SITE_LIKES_COUNT; }
function isSiteLiked(){ return localStorage.getItem('openshop_site_liked') === '1'; }
function renderSiteLikeUI(){
  const count = getSiteLikeCount();
  const liked = isSiteLiked();
  const countEl = document.getElementById('siteLikeCount');
  if(countEl) countEl.textContent = count;
  const btn = document.getElementById('siteLikeBtn');
  if(btn) btn.classList.toggle('site-liked', liked);
}
// প্রতি ব্রাউজার থেকে সাইটে একবারই লাইক দেওয়া যায় (localStorage-এ ট্র্যাক হয়, প্রোডাক্ট-লাইকের
// মতোই — আনলাইক করার অপশন নেই)। UI সাথে সাথেই আপডেট হয় (অপটিমিস্টিক), Firestore-এ সেভ হয়
// ব্যাকগ্রাউন্ডে — ব্যর্থ হলেও অভিজ্ঞতা আটকায় না।
function toggleSiteLike(){
  if(isSiteLiked()) return;
  localStorage.setItem('openshop_site_liked', '1');
  SITE_LIKES_COUNT += 1;
  renderSiteLikeUI();
  showSiteToast('ওয়েবসাইটটি লাইক করার জন্য ধন্যবাদ! 👍');
  const db = getDb();
  if(db) db.collection('siteLikes').add({ ts: Date.now() }).catch(() => {});
}

// ============ SITE SETTINGS (cover photo, logo, texts, contact info) ============
const utilShareBtn = document.getElementById('utilShareSite');
if(utilShareBtn){
  utilShareBtn.addEventListener('click', async () => {
    const shareData = {
      title: document.title,
      text: 'Openshop-এ ভালো দামে পছন্দের সব প্রোডাক্ট পাবেন — দেখে আসুন!',
      url: window.location.href
    };
    if(navigator.share){
      try{ await navigator.share(shareData); } catch(e){ /* ব্যবহারকারী শেয়ার বাতিল করলে কিছু করার দরকার নেই */ }
    } else if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(shareData.url).then(() => {
        showSiteToast('ওয়েবসাইটের লিংক কপি হয়েছে! এখন যেকোনো জায়গায় পেস্ট করে শেয়ার করুন 🔗');
      });
    } else {
      showSiteToast(shareData.url);
    }
  });
}
const utilLikeBtn = document.getElementById('siteLikeBtn');
if(utilLikeBtn){
  utilLikeBtn.addEventListener('click', (e) => { e.preventDefault(); toggleSiteLike(); });
}

function syncWhatsappLinks(){
  const num = window.WHATSAPP_NUMBER_OVERRIDE || WHATSAPP_NUMBER;
  const waFloat = document.getElementById('waFloat');
  if(waFloat) waFloat.href = 'https://wa.me/' + num;
  const footerWa = document.getElementById('footerWhatsapp');
  if(footerWa) footerWa.href = 'https://wa.me/' + num;
}

function syncMessengerLinks(){
  const pageId = window.MESSENGER_PAGE_ID_OVERRIDE || (typeof MESSENGER_PAGE_ID !== 'undefined' ? MESSENGER_PAGE_ID : '');
  if(!pageId) return;
  const mFloat = document.getElementById('messengerFloat');
  if(mFloat) mFloat.href = 'https://m.me/' + pageId;
  const footerM = document.getElementById('footerMessenger');
  if(footerM) footerM.href = 'https://m.me/' + pageId;
  const fbUrl = 'https://www.facebook.com/' + pageId;
  const utilFb = document.getElementById('utilFacebookPage');
  if(utilFb) utilFb.href = fbUrl;
  // কাস্টমার কেয়ার এখন Messenger খোলে (আগে WhatsApp খুলত)
  const utilCare = document.getElementById('utilCustomerCare');
  if(utilCare){ utilCare.href = 'https://m.me/' + pageId; utilCare.target = '_blank'; utilCare.rel = 'noopener'; }
}

async function loadSiteSettings(){
  // আগে ডিফল্ট নম্বর/পেজ আইডি দিয়ে ফ্লোটিং/ফুটার হোয়াটসঅ্যাপ ও মেসেঞ্জার বাটন সিঙ্ক করে দিই —
  // Firestore থেকে সেটিংস লোড না হলে বা এখনো সেভ না করা থাকলেও বাটনগুলো যেন কাজ করে
  syncWhatsappLinks();
  syncMessengerLinks();
  const db = getDb();
  if(!db) return;
  try{
    const doc = await db.collection('settings').doc('main').get();
    if(!doc.exists) return;
    const s = doc.data();
    if(s.coverImage){
      document.querySelector('.hero').style.backgroundImage = `url('${s.coverImage}')`;
    }
    if(s.logoImage){
      const logo = document.getElementById('headerLogo');
      if(logo) logo.src = s.logoImage;
    }
    if(s.heroEyebrow) document.getElementById('heroEyebrow').textContent = s.heroEyebrow;
    if(s.heroTitle) document.getElementById('heroTitle').innerHTML = s.heroTitle;
    if(s.heroDesc) document.getElementById('heroDesc').textContent = s.heroDesc;
    if(s.address) document.getElementById('footerAddress').textContent = s.address;
    if(s.phone){
      const el = document.getElementById('footerPhone');
      if(el){ el.textContent = s.phone; el.href = 'tel:+' + s.phone.replace(/\D/g,''); }
    }
    if(s.email){
      const el = document.getElementById('footerEmail');
      if(el){ el.textContent = s.email; el.href = 'mailto:' + s.email; }
    }
    if(s.facebookLink){
      const el = document.getElementById('fbLink');
      if(el) el.href = s.facebookLink;
    }
    if(s.whatsapp){
      window.WHATSAPP_NUMBER_OVERRIDE = s.whatsapp.replace(/\D/g,'');
    }
    if(s.messengerId){
      window.MESSENGER_PAGE_ID_OVERRIDE = s.messengerId.trim();
    }
    syncWhatsappLinks();
    syncMessengerLinks();
    // ---- সাইটের নাম (হেডার, ফুটার, ব্রাউজার ট্যাব) ----
    if(s.siteName && s.siteName.trim()){
      const nameHeader = document.getElementById('brandNameHeader');
      const nameFooter = document.getElementById('brandNameFooter');
      if(nameHeader) nameHeader.textContent = s.siteName;
      if(nameFooter) nameFooter.textContent = s.siteName;
      document.title = document.title.replace(/^[^|]+/, s.siteName + ' ');
    }
    // ---- ডিজাইন কাস্টমাইজেশন: সাইজ ও লেআউট (অ্যাডমিন প্যানেলের স্লাইডার থেকে) ----
    const sizeVarMap = {
      sLogoSize: '--logo-size', sContainerWidth: '--container-width', sCardRadius: '--radius',
      sBtnRadius: '--btn-radius', sHeroPad: '--hero-extra-pad', sBodyFontSize: '--body-font-size',
      sProductNameSize: '--product-name-size', sPriceSize: '--price-size', sSectionTitleSize: '--section-title-size'
    };
    const rootStyle = document.documentElement.style;
    Object.keys(sizeVarMap).forEach(key => {
      if(s[key] !== undefined && s[key] !== null && s[key] !== ''){
        rootStyle.setProperty(sizeVarMap[key], s[key] + 'px');
      }
    });
    // ---- সাইটের সব টেক্সট (হেডার, নেভ, ট্রাস্ট বার, সেকশন হেডিং, ফুটার, কার্ট, ইত্যাদি) ----
    // key -> element id ম্যাপিং। শুধু যেগুলো অ্যাডমিন প্যানেলে ভরা আছে সেগুলোই বদলাবে,
    // বাকি সব ডিফল্ট (হার্ডকোডেড) লেখা যেমন আছে তেমনই থেকে যাবে।
    const textFieldMap = {
      brandTagline: 'brandTagline', footerTagline: 'footerTagline',
      navProducts: 'navProducts', navCategories: 'navCategories', navAbout: 'navAbout', navContact: 'navContact',
      trustBar1: 'trustBar1', trustBar2: 'trustBar2', trustBar3: 'trustBar3',
      productsTitle: 'productsTitle', productsDesc: 'productsDesc', emptyStateText: 'emptyState',
      aboutTitle: 'aboutTitle',
      about1Title: 'about1Title', about1Desc: 'about1Desc',
      about2Title: 'about2Title', about2Desc: 'about2Desc',
      about3Title: 'about3Title', about3Desc: 'about3Desc',
      footerContactTitle: 'footerContactTitle', footerHoursTitle: 'footerHoursTitle',
      footerHoursText: 'footerHoursText', footerHotline: 'footerHotline', copyrightText: 'copyrightText',
      cartTitle: 'cartTitle', cartNote: 'cartNote', checkoutBtnText: 'checkoutBtn',
      orderConfirmTitle: 'orderConfirmTitle', orderConfirmDesc: 'orderConfirmDesc',
      bnHome: 'bnHome', bnCategories: 'bnCategories', bnSearch: 'bnSearch', bnCart: 'bnCart', bnProfile: 'bnProfile'
    };
    Object.keys(textFieldMap).forEach(key => {
      if(s[key] && s[key].trim()){
        const el = document.getElementById(textFieldMap[key]);
        if(el) el.textContent = s[key];
      }
    });
    if(s.searchPlaceholder && s.searchPlaceholder.trim() && searchInput){
      searchInput.placeholder = s.searchPlaceholder;
    }
    // ---- Theme colors (admin customizable) ----
    if(s.primaryColor || s.accentColor || s.backgroundColor || s.textColor || s.headerBg || s.footerBg){
      const root = document.documentElement.style;
      if(s.primaryColor){ root.setProperty('--teal', s.primaryColor); root.setProperty('--teal-dark', s.primaryColor); }
      if(s.accentColor){ root.setProperty('--amber', s.accentColor); root.setProperty('--coral', s.accentColor); }
      if(s.backgroundColor){ root.setProperty('--cream', s.backgroundColor); }
      if(s.textColor){ root.setProperty('--ink', s.textColor); }
      if(s.headerBg){ root.setProperty('--header-bg', s.headerBg); }
      if(s.footerBg){ root.setProperty('--footer-bg', s.footerBg); }
    }
    // ---- ফন্ট (অ্যাডমিন থেকে বাছাই করা) ----
    if(s.fontFamily && s.fontFamily.trim()){
      document.documentElement.style.setProperty('--font-body', `'${s.fontFamily}', sans-serif`);
    }
    // ---- হোমপেজের সেকশন দেখাবে/লুকাবে ----
    const heroSection = document.getElementById('top');
    if(heroSection) heroSection.classList.toggle('hidden', s.showHero === false);
    const trustBarEl = document.getElementById('trustBarWrap');
    if(trustBarEl) trustBarEl.classList.toggle('hidden', s.showTrustBar === false);
    const aboutSection = document.getElementById('about');
    if(aboutSection) aboutSection.classList.toggle('hidden', s.showAbout === false);
    // ---- মেইন ক্যাটাগরি (অ্যাডমিন থেকে যোগ/এডিট/ডিলিট/রিঅর্ডার করা থাকলে) ----
    if(Array.isArray(s.mainCategories) && s.mainCategories.length){
      MAIN_CATEGORIES = s.mainCategories;
    }
    // ---- Offer banner strip ----
    const bannerEl = document.getElementById('offerBanner');
    if(bannerEl){
      if(s.offerBannerText && s.offerBannerText.trim()){
        bannerEl.textContent = s.offerBannerText;
        bannerEl.classList.remove('hidden');
      } else {
        bannerEl.classList.add('hidden');
      }
    }
  }catch(err){
    console.warn('সাইট সেটিংস লোড করা যায়নি:', err.message);
  }
}

// ============ ANALYTICS EVENTS (visits & product views, shown in admin panel) ============
function logEvent(type, extra){
  const db = getDb();
  if(!db) return;
  db.collection('events').add({
    type,
    ...extra,
    ts: Date.now(),
    day: new Date().toISOString().slice(0,10)
  }).catch(() => {}); // fail silently — never block the shopper's experience
}

// ============ ভিজিটর লোকেশন (ডেলিভারির সুবিধার জন্য, ব্যাকগ্রাউন্ডে) ============
// পেজ লোড হওয়ার সাথে সাথেই এটা চালু হয়ে ব্রাউজারের Geolocation API ব্যবহার করে
// ইউজারের বর্তমান অবস্থান নেওয়ার চেষ্টা করে। ⚠️ ব্রাউজার নিজে থেকেই একটা
// পারমিশন পপআপ দেখাবে ("এই সাইটকে লোকেশন দেখতে দেবেন?") — এটা ব্রাউজারের
// নিরাপত্তা ফিচার, কোনোভাবেই সাইলেন্টলি বাইপাস করা যায় না বা করা উচিতও না।
// ইউজার Allow করলে lat/lng সংগ্রহ হয়ে অর্ডারের সাথে যুক্ত হয়ে যায় — কাস্টমারের
// সামনে এটা নিয়ে কোনো টেক্সট/বাটন দেখানো হয় না, পুরোটাই নীরবে ব্যাকগ্রাউন্ডে চলে।
// এডমিন প্যানেলে অর্ডার লিস্টে সেই অর্ডারের নিচে "🗺️ ম্যাপে লোকেশন দেখুন" লিংক
// আকারে দেখা যায় (শুধু যেসব অর্ডারে পারমিশন দেওয়া হয়েছিল, তাদের ক্ষেত্রে)।
// ইউজার Deny করলে বা কোনো এরর হলে — সাইট সম্পূর্ণ স্বাভাবিকভাবেই চলতে থাকে,
// কোনো এলার্ট/ব্লকিং হয় না।
let visitorLocation = null;

function saveLocationCache(loc){
  try{ localStorage.setItem('openshop_geo_cache', JSON.stringify({ ...loc, ts: Date.now() })); }catch(e){}
}
function loadLocationCache(){
  try{
    const raw = localStorage.getItem('openshop_geo_cache');
    if(!raw) return null;
    const data = JSON.parse(raw);
    if(!data.ts || Date.now() - data.ts > 6*60*60*1000) return null; // ৬ ঘন্টার পুরনো ক্যাশ বাতিল
    return data;
  }catch(e){ return null; }
}

// Nominatim (OpenStreetMap)-এর ফ্রি রিভার্স-জিওকোডিং API — কোনো API key লাগে না।
// এটা ব্যর্থ হলেও (নেটওয়ার্ক/রেট-লিমিট) lat/lng ডেটা ঠিকই থেকে যায়, শুধু
// মানুষের পড়ার মতো ঠিকানার লেখাটা পাওয়া যাবে না।
async function reverseGeocode(lat, lng){
  try{
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`, {
      headers: { 'Accept-Language': 'bn,en' }
    });
    if(!res.ok) return null;
    const data = await res.json();
    return (data && data.display_name) ? data.display_name : null;
  }catch(e){ return null; }
}

function captureVisitorLocation(){
  if(!('geolocation' in navigator)) return;

  const cached = loadLocationCache();
  if(cached){
    visitorLocation = cached;
    return;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude, lng = pos.coords.longitude, accuracy = pos.coords.accuracy;
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const address = await reverseGeocode(lat, lng);
    visitorLocation = { lat, lng, accuracy, mapsUrl, address };
    saveLocationCache(visitorLocation);
    logEvent('visitor_location', { lat, lng, accuracy, mapsUrl, address: address || null });
  }, () => {
    // পারমিশন দেননি বা এরর হয়েছে — কিছু করার দরকার নেই, চুপচাপ থেমে যাওয়া
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 6*60*60*1000 });
}

// ============ ELEMENTS ============
const catPills = document.getElementById('catPills');
const productGrid = document.getElementById('productGrid');
const productModal = document.getElementById('productModal');
const modalContent = document.getElementById('modalContent');
const modalClose = document.getElementById('modalClose');
const cartBtn = document.getElementById('cartBtn');
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose = document.getElementById('cartClose');
const cartItemsEl = document.getElementById('cartItems');
const cartCountEl = document.getElementById('cartCount');
const cartSubtotalEl = document.getElementById('cartSubtotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');
const searchInput = document.getElementById('searchInput');

document.getElementById('year').textContent = new Date().getFullYear();

let searchDebounceTimer = null;
const searchClearBtn = document.getElementById('searchClearBtn');
searchInput.addEventListener('input', () => {
  if(searchClearBtn) searchClearBtn.classList.toggle('hidden', !searchInput.value);
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    searchQuery = searchInput.value;
    renderProducts();
  }, 180);
});
if(searchClearBtn){
  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClearBtn.classList.add('hidden');
    renderProducts();
    searchInput.focus();
  });
}
const sortSelect = document.getElementById('sortSelect');
if(sortSelect){
  sortSelect.addEventListener('change', () => {
    sortOrder = sortSelect.value;
    renderProducts();
  });
}

// ============ ফিল্টার (দামের রেঞ্জ ও রেটিং) ============
const filterToggleBtn = document.getElementById('filterToggleBtn');
const filterPanel = document.getElementById('filterPanel');
if(filterToggleBtn && filterPanel){
  filterToggleBtn.addEventListener('click', () => filterPanel.classList.toggle('open'));
}
const minPriceInput = document.getElementById('minPriceInput');
const maxPriceInput = document.getElementById('maxPriceInput');
const ratingFilterSelect = document.getElementById('ratingFilterSelect');
const applyFilterBtn = document.getElementById('applyFilterBtn');
const clearFilterBtn = document.getElementById('clearFilterBtn');
if(applyFilterBtn){
  applyFilterBtn.addEventListener('click', () => {
    minPriceFilter = minPriceInput.value ? Number(minPriceInput.value) : null;
    maxPriceFilter = maxPriceInput.value ? Number(maxPriceInput.value) : null;
    minRatingFilter = ratingFilterSelect ? Number(ratingFilterSelect.value) : 0;
    renderProducts();
  });
}
if(clearFilterBtn){
  clearFilterBtn.addEventListener('click', () => {
    if(minPriceInput) minPriceInput.value = '';
    if(maxPriceInput) maxPriceInput.value = '';
    if(ratingFilterSelect) ratingFilterSelect.value = '0';
    minPriceFilter = null; maxPriceFilter = null; minRatingFilter = 0;
    renderProducts();
  });
}

// ============ HELPERS ============
// ছবি না থাকলে/লোড না হলে এই প্লেসহোল্ডারটা দেখাবে — ভাঙা ছবির আইকনের বদলে
const PLACEHOLDER_IMG = "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' fill='#eef3f0'/><path d='M55 130l30-38 22 26 20-24 30 36H55z' fill='#c7d6cf'/><circle cx='75' cy='75' r='14' fill='#c7d6cf'/></svg>`
);
function formatTaka(n){ return '৳ ' + n.toLocaleString('en-BD'); }

// প্রতিটা অর্ডারে ফ্ল্যাট ডেলিভারি চার্জ — প্রোডাক্টের সংখ্যা/দাম যাই হোক না কেন সবসময় এই একই পরিমাণ যোগ হবে
const DELIVERY_CHARGE = 150;
function saveCart(){ localStorage.setItem('openshop_cart', JSON.stringify(cart)); renderCartCount(); }
function getFirstImage(p){ return (p.images && p.images.length) ? p.images[0] : (p.image || PLACEHOLDER_IMG); }
function getAllImages(p){ const imgs = (p.images && p.images.length) ? p.images : (p.image ? [p.image] : []); return imgs.length ? imgs : [PLACEHOLDER_IMG]; }
function imgFallbackAttr(){ return `onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'"`; }
// প্রোডাক্টে stock ফিল্ড না থাকলে ধরে নেওয়া হয় স্টকে আছে (পুরনো প্রোডাক্টগুলোর জন্য ব্যাকওয়ার্ড-কম্প্যাটিবল)
function isOutOfStock(p){ return p.stock !== undefined && p.stock !== null && p.stock !== '' && Number(p.stock) <= 0; }
function isLowStock(p){ return p.stock !== undefined && p.stock !== null && p.stock !== '' && Number(p.stock) > 0 && Number(p.stock) <= 5; }

// ============ WISHLIST ============
function saveWishlist(){ localStorage.setItem('openshop_wishlist', JSON.stringify(wishlist)); renderWishlistCount(); }
function isWished(id){ return wishlist.includes(id); }
function toggleWishlist(id){
  if(isWished(id)) wishlist = wishlist.filter(x => x !== id);
  else wishlist.push(id);
  saveWishlist();
  document.querySelectorAll(`.wish-heart[data-id="${id}"]`).forEach(el => el.classList.toggle('active', isWished(id)));
}
function renderWishlistCount(){
  const el = document.getElementById('wishlistCount');
  if(!el) return;
  el.textContent = wishlist.length;
  el.classList.toggle('hidden', wishlist.length === 0);
}
function heartSvg(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20s-7.5-4.6-9.8-9.1C.6 7.6 2 4 5.6 4c2 0 3.4 1.1 4.4 2.6C11 5.1 12.4 4 14.4 4 18 4 19.4 7.6 21.8 10.9 19.5 15.4 12 20 12 20z"/></svg>`;
}
function renderWishlistDrawer(){
  const el = document.getElementById('wishlistItems');
  if(!el) return;
  const items = wishlist.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);
  if(items.length === 0){
    el.innerHTML = `<div class="empty-cart">আপনার পছন্দের তালিকা খালি<br>প্রোডাক্টের ❤️ আইকনে ক্লিক করে যোগ করুন</div>`;
    return;
  }
  el.innerHTML = items.map(p => `
    <div class="cart-item">
      <img src="${getFirstImage(p)}" alt="${p.name}" ${imgFallbackAttr()}>
      <div class="cart-item-info">
        <h4>${p.name}</h4>
        <div class="cart-item-meta">${formatTaka(p.price)}</div>
        <div class="qty-row">
          <button class="btn btn-primary" data-openid="${p.id}" style="padding:5px 12px; font-size:11px;">দেখুন</button>
          <button class="remove-btn" data-removeid="${p.id}">সরান</button>
        </div>
      </div>
    </div>
  `).join('');
  el.querySelectorAll('[data-openid]').forEach(btn => btn.addEventListener('click', () => { closeWishlist(); openModal(btn.dataset.openid); }));
  el.querySelectorAll('[data-removeid]').forEach(btn => btn.addEventListener('click', () => { toggleWishlist(btn.dataset.removeid); renderWishlistDrawer(); }));
}
const wishlistDrawer = document.getElementById('wishlistDrawer');
const wishlistBtn = document.getElementById('wishlistBtn');
const wishlistClose = document.getElementById('wishlistClose');
function openWishlist(){ renderWishlistDrawer(); wishlistDrawer.classList.add('open'); cartOverlay.classList.add('open'); updateBodyScrollLock(); }
function closeWishlist(){ wishlistDrawer.classList.remove('open'); cartOverlay.classList.remove('open'); updateBodyScrollLock(); }
if(wishlistBtn) wishlistBtn.addEventListener('click', openWishlist);
if(wishlistClose) wishlistClose.addEventListener('click', closeWishlist);

// ============ DARK MODE ============
function applyDarkMode(on){
  document.body.classList.toggle('dark-mode', on);
  const btn = document.getElementById('darkModeToggle');
  if(btn) btn.classList.toggle('active', on);
  localStorage.setItem('openshop_dark_mode', on ? '1' : '0');
}
const darkModeToggle = document.getElementById('darkModeToggle');
if(darkModeToggle){
  darkModeToggle.addEventListener('click', () => applyDarkMode(!document.body.classList.contains('dark-mode')));
}

// ============ CATEGORIES (মেইন ক্যাটাগরি -> সাব-ক্যাটাগরি, দুই ধাপে) ============
function renderCategories(){
  renderMainCategories();
  renderSubCategories();
}

function renderMainCategories(){
  const mainPills = document.getElementById('mainCatPills');
  if(!mainPills) return;
  const cards = [
    `<button class="main-cat-card ${activeMainCategory === 'সব' ? 'active' : ''}" data-main="সব">
       <span class="main-cat-icon">🛍️</span><span class="main-cat-label">সব</span>
     </button>`,
    ...MAIN_CATEGORIES.map(c => `
      <button class="main-cat-card ${activeMainCategory === c.value ? 'active' : ''}" data-main="${c.value}">
        <span class="main-cat-icon">${c.icon}</span><span class="main-cat-label">${c.label}</span>
      </button>`)
  ];
  mainPills.innerHTML = cards.join('');
  mainPills.querySelectorAll('.main-cat-card').forEach(btn => {
    btn.addEventListener('click', () => {
      activeMainCategory = btn.dataset.main;
      activeCategory = 'সব'; // মেইন ক্যাটাগরি বদলালে সাব-ক্যাটাগরি বাছাই রিসেট হয়ে যাবে
      renderCategories();
      renderProducts();
    });
  });
}

function renderSubCategories(){
  const subWrap = document.getElementById('subCatWrap');
  const subPills = document.getElementById('catPills');
  if(!subWrap || !subPills) return;
  // "সব" মেইন ক্যাটাগরি বাছাই করা থাকলে সাব-ক্যাটাগরি স্ট্রিপ দেখানোর দরকার নেই
  if(activeMainCategory === 'সব'){
    subWrap.classList.add('hidden');
    subPills.innerHTML = '';
    return;
  }
  const productsInMain = PRODUCTS.filter(p => p.mainCategory === activeMainCategory);
  const subCats = [...new Set(productsInMain.map(p => p.category).filter(Boolean))];
  if(subCats.length === 0){
    subWrap.classList.add('hidden');
    subPills.innerHTML = '';
    return;
  }
  subWrap.classList.remove('hidden');
  subPills.innerHTML = subCats.map(c =>
    `<button class="cat-pill ${c === activeCategory ? 'active' : ''}" data-cat="${c}">${c}</button>`
  ).join('');
  subPills.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderSubCategories();
      renderProducts();
    });
  });
}

// ============ PRODUCTS ============
function sortProducts(list){
  const arr = [...list];
  if(sortOrder === 'price_asc') arr.sort((a,b) => (a.price||0) - (b.price||0));
  else if(sortOrder === 'price_desc') arr.sort((a,b) => (b.price||0) - (a.price||0));
  else if(sortOrder === 'name_asc') arr.sort((a,b) => (a.name||'').localeCompare(b.name||'', 'bn'));
  return arr;
}

function renderProducts(){
  let list = PRODUCTS;
  if(activeMainCategory !== 'সব') list = list.filter(p => p.mainCategory === activeMainCategory);
  if(activeCategory !== 'সব') list = list.filter(p => p.category === activeCategory);
  if(searchQuery.trim()){
    const q = searchQuery.trim().toLowerCase();
    list = list.filter(p =>
      (p.name||'').toLowerCase().includes(q) ||
      (p.category||'').toLowerCase().includes(q) ||
      (p.description||'').toLowerCase().includes(q)
    );
  }
  if(minPriceFilter !== null) list = list.filter(p => (p.price||0) >= minPriceFilter);
  if(maxPriceFilter !== null) list = list.filter(p => (p.price||0) <= maxPriceFilter);
  if(minRatingFilter > 0) list = list.filter(p => getProductRating(p.id).avg >= minRatingFilter);
  list = sortProducts(list);
  const emptyState = document.getElementById('emptyState');
  if(list.length === 0){
    productGrid.innerHTML = '';
    if(emptyState) emptyState.classList.remove('hidden');
    return;
  }
  if(emptyState) emptyState.classList.add('hidden');
  productGrid.innerHTML = list.map(p => {
    const imgs = getAllImages(p);
    const hasMultiplePhotos = imgs.length > 1;
    const oos = isOutOfStock(p);
    return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-thumb">
        ${p.oldPrice ? `<span class="product-badge">-${Math.round((1 - p.price/p.oldPrice)*100)}% অফার</span>` : ''}
        <button class="wish-heart ${isWished(p.id) ? 'active' : ''}" data-id="${p.id}" aria-label="পছন্দের তালিকায় যোগ করুন">${heartSvg()}</button>
        <img src="${imgs[0]}" alt="${p.name}" loading="lazy" ${imgFallbackAttr()}>
        ${hasMultiplePhotos ? `<img src="${imgs[1]}" alt="${p.name} আরও ছবি" class="thumb-img-alt" loading="lazy" ${imgFallbackAttr()}>` : ''}
        ${hasMultiplePhotos ? `
          <span class="photo-count-badge">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h2l1.5-2h9L18 5h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg>
            ${imgs.length}
          </span>` : ''}
        ${oos ? `<div class="stock-badge">স্টকে নেই</div>` : ''}
      </div>
      <div class="product-body">
        <span class="product-cat">${p.category}</span>
        <span class="product-name">${p.name}</span>
        ${ratingBadgeHtml(p.id)}
        <div class="product-price">
          <span class="price-now">${formatTaka(p.price)}</span>
          ${p.oldPrice ? `<span class="price-old">${formatTaka(p.oldPrice)}</span>` : ''}
        </div>
        ${isLowStock(p) ? `<span class="low-stock-note">মাত্র ${p.stock}টি বাকি আছে!</span>` : ''}
        ${couponChipHtml(p.id)}
        <div class="card-actions">
          <button class="buy-now-btn ${oos ? 'out-of-stock' : ''}" data-id="${p.id}" ${oos ? 'disabled' : ''}>${oos ? 'স্টকে নেই' : 'এখনই কিনুন'}</button>
          <button class="add-btn ${oos ? 'out-of-stock' : ''}" data-id="${p.id}" ${oos ? 'disabled' : ''}>${oos ? 'স্টকে নেই' : 'কার্টে যোগ'}</button>
        </div>
      </div>
    </div>
  `;
  }).join('');

  productGrid.querySelectorAll('.product-thumb, .product-name').forEach(el => {
    el.addEventListener('click', (e) => {
      if(e.target.closest('.wish-heart')) return;
      const id = e.target.closest('.product-card').dataset.id;
      openModal(id);
    });
  });
  productGrid.querySelectorAll('.coupon-copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyCouponCode(btn.dataset.code, btn);
    });
  });
  productGrid.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if(btn.disabled) return;
      addToCart(btn.dataset.id, null, 1);
    });
  });
  productGrid.querySelectorAll('.buy-now-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if(btn.disabled) return;
      addToCart(btn.dataset.id, null, 1);
      openCart();
    });
  });
  productGrid.querySelectorAll('.wish-heart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWishlist(btn.dataset.id);
    });
  });
}

// ============ MODAL ============
function shareSvg(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.7 15.8 6.3M8.2 13.3l7.6 4.4"/></svg>`;
}
function relatedProductsHtml(p){
  const related = PRODUCTS.filter(x => x.id !== p.id && x.category === p.category).slice(0, 6);
  if(related.length === 0) return '';
  return `
    <div class="related-products">
      <h3>এগুলোও দেখতে পারেন</h3>
      <div class="related-grid">
        ${related.map(r => `
          <div class="related-card" data-relid="${r.id}">
            <img src="${getFirstImage(r)}" alt="${r.name}" loading="lazy" ${imgFallbackAttr()}>
            <span class="r-name">${r.name}</span>
            <span class="r-price">${formatTaka(r.price)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
function reviewCardHtml(r){
  const date = r.ts ? new Date(r.ts).toLocaleDateString('bn-BD') : '';
  return `
    <div class="review-card">
      <div class="review-card-head">
        <b>${(r.name || 'নাম গোপন').replace(/</g,'&lt;')}</b>
        <span class="stars-mini">${starsHtml(r.rating)}</span>
      </div>
      ${r.comment ? `<p>${r.comment.replace(/</g,'&lt;')}</p>` : ''}
      <span class="review-date">${date}</span>
    </div>`;
}
function reviewsSectionHtml(p){
  const list = REVIEWS.filter(r => r.productId === p.id);
  const { avg, count } = getProductRating(p.id);
  return `
    <div class="reviews-section">
      <h3>কাস্টমার রিভিউ ${count ? `(${avg.toFixed(1)} ★ — ${count}টি রিভিউ)` : ''}</h3>
      <div class="reviews-list" id="reviewsList">
        ${count ? list.map(reviewCardHtml).join('') : '<p class="reviews-empty">এখনো কোনো রিভিউ নেই — প্রথম রিভিউটা আপনিই দিন!</p>'}
      </div>
      <div class="review-form">
        <strong style="font-size:13px;">আপনার রিভিউ দিন</strong>
        <div class="star-picker" id="starPicker" data-value="0">
          ${[1,2,3,4,5].map(n => `<span class="star-pick" data-star="${n}">★</span>`).join('')}
        </div>
        <input type="text" id="reviewName" placeholder="আপনার নাম (ঐচ্ছিক)" class="lead-input">
        <textarea id="reviewComment" placeholder="প্রোডাক্ট নিয়ে আপনার মতামত লিখুন (ঐচ্ছিক)"></textarea>
        <button type="button" class="btn btn-outline" id="submitReviewBtn" data-pid="${p.id}">রিভিউ জমা দিন</button>
        <p class="msg" id="reviewMsg"></p>
      </div>
    </div>`;
}
async function submitReview(productId){
  const msgEl = document.getElementById('reviewMsg');
  const picker = document.getElementById('starPicker');
  const rating = Number(picker ? picker.dataset.value : 0);
  if(!rating){ msgEl.textContent = 'অনুগ্রহ করে একটা রেটিং (স্টার) বাছাই করুন।'; msgEl.className = 'msg error'; return; }
  const name = document.getElementById('reviewName').value.trim();
  const comment = document.getElementById('reviewComment').value.trim();
  const db = getDb();
  if(!db){ msgEl.textContent = 'রিভিউ সিস্টেম এখন উপলব্ধ নয়।'; msgEl.className = 'msg error'; return; }
  const submitBtn = document.getElementById('submitReviewBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'জমা হচ্ছে...';
  try{
    const review = { productId, name: name || null, rating, comment: comment || null, ts: Date.now(), day: new Date().toISOString().slice(0,10) };
    await db.collection('reviews').add(review);
    REVIEWS.unshift({ id: 'local-' + Date.now(), ...review });
    msgEl.textContent = 'ধন্যবাদ! আপনার রিভিউ জমা হয়েছে।';
    msgEl.className = 'msg ok';
    renderProducts();
    const p = PRODUCTS.find(x => x.id === productId);
    if(p) openModal(productId);
  }catch(err){
    msgEl.textContent = 'রিভিউ জমা করা যায়নি: ' + err.message;
    msgEl.className = 'msg error';
    submitBtn.disabled = false;
    submitBtn.textContent = 'রিভিউ জমা দিন';
  }
}
function openModal(id, opts){
  opts = opts || {};
  const p = PRODUCTS.find(x => x.id === id);
  if(!p) return;
  logEvent('product_view', { productId: id, productName: p.name });
  // প্রোডাক্টে ট্যাপ করলে এটা এখন সত্যিকারের "নতুন পেজ" এর মতো আচরণ করে —
  // URL-এ #product-<id> যোগ হয় (history-তে নতুন এন্ট্রি হিসেবে), তাই মোবাইল/ডেস্কটপ
  // দুই জায়গাতেই ব্যাক বাটন চাপলে পুরো সাইট থেকে বের না হয়ে প্রোডাক্ট পেজটাই বন্ধ হয়ে
  // আগের লিস্টিং পেজে ফিরে যায় — ঠিক যেমন আলাদা একটা পেজ থেকে ব্যাক করলে হয়।
  if(opts.updateUrl !== false){
    const newHash = '#product-' + id;
    if(window.location.hash !== newHash){
      history.pushState({ productId: id }, '', window.location.pathname + window.location.search + newHash);
    }
  }
  selectedSize = p.sizes && p.sizes.length ? p.sizes[0] : null;
  const images = getAllImages(p);
  const oos = isOutOfStock(p);
  modalContent.innerHTML = `
    <div class="modal-content-inner">
    <div class="modal-gallery">
      <img src="${images[0]}" alt="${p.name}" id="modalMainImg" ${imgFallbackAttr()}>
      ${images.length > 1 ? `
        <div class="modal-thumbs">
          ${images.map((im, idx) => `<img src="${im}" class="${idx===0?'active':''}" data-idx="${idx}" alt="${p.name} ছবি ${idx+1}" ${imgFallbackAttr()}>`).join('')}
        </div>` : ''}
    </div>
    <div class="modal-info">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <span class="product-cat">${p.category}</span>
        <div style="display:flex; gap:8px;">
          <button class="wish-heart ${isWished(p.id) ? 'active' : ''}" id="modalWishBtn" data-id="${p.id}">${heartSvg()} <span>পছন্দে যোগ করুন</span></button>
        </div>
      </div>
      <h2>${p.name}</h2>
      ${ratingBadgeHtml(p.id)}
      <div class="modal-action-row">
        <button class="share-btn" id="modalShareBtn">${shareSvg()} শেয়ার করুন</button>
        ${likeButtonHtml(p.id)}
      </div>
      <p>${p.description || ''}</p>
      <div class="product-price">
        <span class="price-now">${formatTaka(p.price)}</span>
        ${p.oldPrice ? `<span class="price-old">${formatTaka(p.oldPrice)}</span>` : ''}
      </div>
      ${oos ? `<p style="color:var(--coral); font-weight:700; font-size:13px;">এই প্রোডাক্টটি বর্তমানে স্টকে নেই।</p>` : ''}
      ${isLowStock(p) ? `<p class="low-stock-note">মাত্র ${p.stock}টি বাকি আছে!</p>` : ''}
      ${couponChipHtml(p.id)}
      ${p.sizes && p.sizes.length ? `
        <div>
          <strong style="font-size:13px;">ভ্যারিয়েন্ট বাছাই করুন:</strong>
          <div class="size-row" id="sizeRow">
            ${p.sizes.map((s,i) => `<span class="size-chip ${i===0?'selected':''}" data-size="${s}">${s}</span>`).join('')}
          </div>
        </div>` : ''}
      <button class="buy-now-btn modal-buy-now-btn btn-block" id="modalBuyNowBtn" ${oos ? 'disabled' : ''} style="width:100%; padding:13px;">${oos ? 'স্টকে নেই' : 'এখনই কিনুন'}</button>
      <button class="btn btn-primary btn-block" id="modalAddBtn" ${oos ? 'disabled' : ''} style="margin-top:8px;">${oos ? 'স্টকে নেই' : 'কার্টে যোগ করুন'}</button>
    </div>
    </div>
    ${relatedProductsHtml(p)}
    ${reviewsSectionHtml(p)}
  `;
  productModal.classList.add('open');
  updateBodyScrollLock();

  const modalMainImg = document.getElementById('modalMainImg');
  document.querySelectorAll('.modal-thumbs img').forEach(thumb => {
    thumb.addEventListener('click', () => {
      modalMainImg.src = thumb.src;
      document.querySelectorAll('.modal-thumbs img').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  const sizeRow = document.getElementById('sizeRow');
  if(sizeRow){
    sizeRow.querySelectorAll('.size-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        sizeRow.querySelectorAll('.size-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        selectedSize = chip.dataset.size;
      });
    });
  }
  const modalAddBtn = document.getElementById('modalAddBtn');
  if(modalAddBtn){
    modalAddBtn.addEventListener('click', () => {
      if(modalAddBtn.disabled) return;
      addToCart(id, selectedSize, 1);
      showSiteToast('কার্টে যোগ করা হয়েছে ✅');
    });
  }
  const modalBuyNowBtn = document.getElementById('modalBuyNowBtn');
  if(modalBuyNowBtn){
    modalBuyNowBtn.addEventListener('click', () => {
      if(modalBuyNowBtn.disabled) return;
      addToCart(id, selectedSize, 1);
      closeModal();
      openCart();
    });
  }
  const modalWishBtn = document.getElementById('modalWishBtn');
  modalContent.querySelectorAll('.coupon-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => copyCouponCode(btn.dataset.code, btn));
  });
  if(modalWishBtn){
    modalWishBtn.addEventListener('click', () => {
      toggleWishlist(id);
      modalWishBtn.classList.toggle('active', isWished(id));
    });
  }
  const modalShareBtn = document.getElementById('modalShareBtn');
  if(modalShareBtn){
    modalShareBtn.addEventListener('click', async () => {
      const shareUrl = window.location.origin + window.location.pathname + '#product-' + id;
      const shareData = { title: p.name, text: `${p.name} — ${formatTaka(p.price)} — Openshop-এ দেখুন`, url: shareUrl };
      if(navigator.share){
        try{ await navigator.share(shareData); }catch(err){ /* user cancelled — চুপচাপ থাকা ঠিক */ }
      } else {
        try{
          await navigator.clipboard.writeText(shareUrl);
          showSiteToast('লিংক কপি হয়েছে!');
        }catch(err){ showSiteToast('লিংক কপি করা যায়নি।'); }
      }
    });
  }
  const modalLikeBtn = modalContent.querySelector(`.like-btn[data-id="${id}"]`);
  if(modalLikeBtn){
    modalLikeBtn.addEventListener('click', () => likeProduct(id));
  }
  modalContent.querySelectorAll('.related-card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.relid));
  });
  const starPicker = document.getElementById('starPicker');
  if(starPicker){
    const paintStars = (val) => {
      starPicker.querySelectorAll('.star-pick').forEach(s => s.classList.toggle('selected', Number(s.dataset.star) <= val));
    };
    starPicker.querySelectorAll('.star-pick').forEach(star => {
      star.addEventListener('click', () => {
        starPicker.dataset.value = star.dataset.star;
        paintStars(Number(star.dataset.star));
      });
    });
  }
  const submitReviewBtn = document.getElementById('submitReviewBtn');
  if(submitReviewBtn){
    submitReviewBtn.addEventListener('click', () => submitReview(submitReviewBtn.dataset.pid));
  }
}
// ============ কোনো মডাল/ড্রয়ার খোলা থাকলে পেছনের পেজ স্ক্রল লক করে দেয় (মোবাইলে স্মুথ ফিল দেয়) ============
function updateBodyScrollLock(){
  const anyOpen = [productModal, orderConfirmModal, cartDrawer, profileDrawer, document.getElementById('couponsModal')]
    .some(el => el && el.classList.contains('open'));
  document.body.style.overflow = anyOpen ? 'hidden' : '';
}

function closeModal(){
  // এই মডালটা history-তে একটা এন্ট্রি হিসেবে খোলা হয়েছিল (#product-id), তাই বন্ধ করার
  // সময়ও history.back() দিয়ে করা হচ্ছে — ফোনের ব্যাক বাটন চাপলে যেমন হয়, ক্রস (X) বাটনে
  // চাপলেও ঠিক একই জিনিস হবে। আসল লুকানোর কাজটা popstate লিসেনার-এ হয়।
  if((window.location.hash || '').startsWith('#product-')){
    history.back();
  } else {
    productModal.classList.remove('open');
    updateBodyScrollLock();
  }
}
modalClose.addEventListener('click', closeModal);
productModal.addEventListener('click', (e) => { if(e.target === productModal) closeModal(); });

// ============ CART ============
function addToCart(id, size, qty){
  const p = PRODUCTS.find(x => x.id === id);
  if(!p) return;
  if(isOutOfStock(p)){ showSiteToast('দুঃখিত, এই প্রোডাক্টটি স্টকে নেই।'); return; }
  const key = id + '|' + (size || '');
  const existing = cart.find(i => i.key === key);
  if(existing){
    existing.qty += qty;
  } else {
    cart.push({ key, id, size, qty, name: p.name, price: p.price, image: getFirstImage(p) });
  }
  saveCart();
  renderCart();
}
function updateQty(key, delta){
  const item = cart.find(i => i.key === key);
  if(!item) return;
  item.qty += delta;
  if(item.qty <= 0) cart = cart.filter(i => i.key !== key);
  saveCart();
  renderCart();
}
function removeItem(key){
  cart = cart.filter(i => i.key !== key);
  saveCart();
  renderCart();
}
function renderCartCount(){
  const count = cart.reduce((s,i) => s + i.qty, 0);
  cartCountEl.textContent = count;
  const bnCount = document.getElementById('bnCartCount');
  if(bnCount){
    bnCount.textContent = count;
    bnCount.classList.toggle('hidden', count === 0);
  }
}
function renderCart(){
  if(cart.length === 0){
    cartItemsEl.innerHTML = `<div class="empty-cart">আপনার কার্ট খালি<br>প্রোডাক্ট যোগ করুন</div>`;
  } else {
    cartItemsEl.innerHTML = cart.map(i => `
      <div class="cart-item">
        <img src="${i.image || PLACEHOLDER_IMG}" alt="${i.name}" ${imgFallbackAttr()}>
        <div class="cart-item-info">
          <h4>${i.name}</h4>
          <div class="cart-item-meta">${i.size ? 'ভ্যারিয়েন্ট: ' + i.size + ' • ' : ''}${formatTaka(i.price)}</div>
          <div class="qty-row">
            <button class="qty-btn" data-key="${i.key}" data-d="-1">−</button>
            <span>${i.qty}</span>
            <button class="qty-btn" data-key="${i.key}" data-d="1">+</button>
            <button class="remove-btn" data-key="${i.key}">সরান</button>
          </div>
        </div>
      </div>
    `).join('');
    cartItemsEl.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => updateQty(btn.dataset.key, parseInt(btn.dataset.d)));
    });
    cartItemsEl.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => removeItem(btn.dataset.key));
    });
  }
  const subtotal = cart.reduce((s,i) => s + i.price * i.qty, 0);
  cartSubtotalEl.textContent = formatTaka(subtotal);
  renderCartCount();
  renderCouponDiscount(subtotal);
}

// ============ COUPON ============
// একাধিক কুপন একসাথে সক্রিয় থাকতে পারে — প্রতিটা প্রোডাক্ট-নির্দিষ্ট কুপন শুধু তার নিজের প্রোডাক্টের
// লাইন-সাবটোটালের উপর ছাড় দেয়, তাই ভিন্ন ভিন্ন প্রোডাক্টের কুপন একইসাথে ব্যবহার করা যাবে।
// পুরো কার্টের জন্য সাধারণ (প্রোডাক্ট-নির্দিষ্ট নয়) কুপন একসাথে একটাই সক্রিয় থাকতে পারবে —
// নতুন একটা প্রয়োগ করলে আগেরটা রিপ্লেস হবে।
function getSingleCouponDiscount(c, subtotal){
  const base = c.productId ? getProductLineSubtotal(cart, c.productId) : subtotal;
  return (c.type === 'fixed') ? Math.min(Number(c.value)||0, base) : Math.round(base * (Number(c.value)||0) / 100);
}
function getCouponDiscount(subtotal){
  if(!appliedCoupons.length) return 0;
  return appliedCoupons.reduce((sum, c) => sum + getSingleCouponDiscount(c, subtotal), 0);
}
function renderCouponDiscount(subtotal){
  const row = document.getElementById('cartDiscountRow');
  const amountEl = document.getElementById('cartDiscountAmount');
  const totalEl = document.getElementById('cartGrandTotal');
  const deliveryRow = document.getElementById('cartDeliveryRow');
  const deliveryAmountEl = document.getElementById('cartDeliveryAmount');
  const discount = getCouponDiscount(subtotal);
  // কার্ট খালি থাকলে ডেলিভারি চার্জ দেখানোর দরকার নেই — প্রোডাক্ট যোগ হলেই এটা চালু হবে
  const deliveryCharge = cart.length > 0 ? DELIVERY_CHARGE : 0;
  if(row && amountEl){
    if(discount > 0){
      row.classList.remove('hidden');
      amountEl.textContent = '- ' + formatTaka(discount);
    } else {
      row.classList.add('hidden');
    }
  }
  if(deliveryRow && deliveryAmountEl){
    if(deliveryCharge > 0){
      deliveryRow.classList.remove('hidden');
      deliveryAmountEl.textContent = formatTaka(deliveryCharge);
    } else {
      deliveryRow.classList.add('hidden');
    }
  }
  if(totalEl) totalEl.textContent = formatTaka(subtotal - discount + deliveryCharge);
  renderAppliedCouponsList();
}
function renderAppliedCouponsList(){
  const listEl = document.getElementById('appliedCouponsList');
  if(!listEl) return;
  listEl.innerHTML = appliedCoupons.map(c => `
    <span class="applied-coupon-chip">
      🏷️ ${c.code}${c.productId ? ` (${c.productName || 'নির্দিষ্ট প্রোডাক্ট'})` : ''}
      <button type="button" data-remove-coupon="${c.code}" title="এই কুপনটি সরিয়ে ফেলুন">×</button>
    </span>`).join('');
  listEl.querySelectorAll('[data-remove-coupon]').forEach(btn => {
    btn.addEventListener('click', () => {
      appliedCoupons = appliedCoupons.filter(c => c.code !== btn.dataset.removeCoupon);
      renderCart();
    });
  });
}
const applyCouponBtn = document.getElementById('applyCouponBtn');
const couponInput = document.getElementById('couponInput');
const couponMsgEl = document.getElementById('couponMsg');
if(applyCouponBtn){
  applyCouponBtn.addEventListener('click', async () => {
    const code = (couponInput.value || '').trim().toUpperCase();
    couponMsgEl.classList.remove('hidden');
    couponMsgEl.textContent = 'যাচাই করা হচ্ছে...';
    couponMsgEl.className = 'coupon-msg';
    applyCouponBtn.disabled = true;
    const result = await validateCoupon(code, cart);
    applyCouponBtn.disabled = false;
    if(result.ok){
      const newCoupon = result.coupon;
      if(appliedCoupons.some(c => c.code === newCoupon.code)){
        couponMsgEl.textContent = 'এই কুপনটি ইতিমধ্যেই প্রয়োগ করা আছে।';
        couponMsgEl.className = 'coupon-msg error';
        renderCart();
        return;
      }
      // একই প্রোডাক্টের জন্য আগের কুপন থাকলে সেটা রিপ্লেস হবে; সাধারণ কুপনও একটাই সক্রিয় থাকবে —
      // কিন্তু ভিন্ন প্রোডাক্টের কুপনগুলো একসাথে জমা থাকবে (রিপ্লেস হবে না)
      appliedCoupons = appliedCoupons.filter(c => c.productId ? c.productId !== newCoupon.productId : !!newCoupon.productId);
      appliedCoupons.push(newCoupon);
      const subtotalNow = cart.reduce((s,i) => s + i.price * i.qty, 0);
      const discountAmt = getCouponDiscount(subtotalNow);
      const finalTotal = subtotalNow - discountAmt + (cart.length > 0 ? DELIVERY_CHARGE : 0);
      const discountText = newCoupon.type === 'fixed' ? formatTaka(newCoupon.value) : `${newCoupon.value}%`;
      const targetText = newCoupon.productId ? `"${newCoupon.productName || 'প্রোডাক্টটি'}"-তে ` : '';
      const countText = appliedCoupons.length > 1 ? ` (মোট ${appliedCoupons.length}টি কুপন সক্রিয়)` : '';
      couponMsgEl.textContent = `কুপন প্রয়োগ হয়েছে! ${targetText}${discountText} ছাড়${countText} — ${formatTaka(discountAmt)} বাঁচবে। ছাড়ের পর সর্বমোট: ${formatTaka(finalTotal)}`;
      couponMsgEl.className = 'coupon-msg ok';
      couponInput.value = '';
    } else {
      couponMsgEl.textContent = result.reason;
      couponMsgEl.className = 'coupon-msg error';
    }
    renderCart();
  });
}

function openCart(){
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('open');
  updateBodyScrollLock();
  clearCheckoutError();
  // আগে যে নম্বর দিয়ে অর্ডার/ট্র্যাক করা হয়েছে, সেটা থাকলে ফোন ফিল্ডে আগে থেকেই বসিয়ে দিচ্ছি
  const savedPhone = localStorage.getItem('openshop_profile_phone');
  const leadPhoneEl = document.getElementById('leadPhone');
  if(savedPhone && leadPhoneEl && !leadPhoneEl.value) leadPhoneEl.value = savedPhone;
  // (লোকেশন এখন আর কাস্টমারের ঠিকানার ঘরে দেখানো হয় না — শুধু ব্যাকগ্রাউন্ডে
  //  ক্যাপচার হয়ে অর্ডারের সাথে সেভ থাকে, এডমিন প্যানেলে অর্ডার লিস্টে লিংক আকারে দেখা যায়)
  // কার্ট/চেকআউট খোলার সময় লোকেশন আবার চাওয়া হয় — পেজ লোডের সময় কাস্টমার
  // পারমিশন মিস করে থাকলে বা তখনো ঠিক না করে থাকলে, অর্ডার করার আগমুহূর্তে
  // আরেকবার সুযোগ দেওয়া হয় (ক্যাশ থাকলে আবার পপআপ দেখাবে না, চুপচাপ ক্যাশ ব্যবহার করবে)
  captureVisitorLocation();
}
function closeCart(){ cartDrawer.classList.remove('open'); cartOverlay.classList.remove('open'); updateBodyScrollLock(); }
cartBtn.addEventListener('click', () => { renderCart(); openCart(); });
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', () => { closeCart(); closeProfile(); });

// ============ ORDER ID GENERATOR ============
function generateOrderId(){
  const rand = Math.floor(100000 + Math.random()*900000);
  return 'OS' + rand;
}

// ============ HELPER: cart-এর প্রোডাক্ট ছবিগুলো File আকারে আনা (নেটিভ শেয়ারে পাঠানোর জন্য) ============
async function buildOrderImageFiles(items){
  const files = [];
  const seen = new Set();
  for(const i of items){
    const url = i.image;
    if(!url || seen.has(url)) continue;
    seen.add(url);
    try{
      const res = await fetch(url, { mode: 'cors' });
      if(!res.ok) continue;
      const blob = await res.blob();
      if(!blob.type.startsWith('image/')) continue;
      const ext = (blob.type.split('/')[1] || 'jpg').split('+')[0];
      const safeName = (i.name || 'product').replace(/[^a-zA-Z0-9\u0980-\u09FF]/g, '_').slice(0, 30);
      files.push(new File([blob], `${safeName}.${ext}`, { type: blob.type }));
    }catch(err){
      console.warn('এই ছবিটা শেয়ারে যোগ করা যায়নি (CORS/নেটওয়ার্ক সমস্যা):', url, err.message);
    }
  }
  return files;
}

// ============ অর্ডার-সম্পন্ন মডাল (কপি-করা-যায় এমন অর্ডার আইডি + ঐচ্ছিক ছবি-শেয়ার বাটন) ============
const orderConfirmModal = document.getElementById('orderConfirmModal');
const orderIdField = document.getElementById('orderIdField');
const copyOrderIdBtn = document.getElementById('copyOrderIdBtn');
const reopenWaBtn = document.getElementById('reopenWaBtn');
const shareWithImagesBtn = document.getElementById('shareWithImagesBtn');
const orderConfirmClose = document.getElementById('orderConfirmClose');
let lastOrder = null; // { orderId, waUrl, msg, cartSnapshot }

function openOrderConfirmModal(orderId, waUrl, msg, cartSnapshot){
  lastOrder = { orderId, waUrl, msg, cartSnapshot };
  orderIdField.value = orderId;
  copyOrderIdBtn.textContent = 'কপি করুন';
  shareWithImagesBtn.classList.toggle('hidden', !navigator.share);
  shareWithImagesBtn.textContent = '📸 ছবিসহ শেয়ার করুন (ঐচ্ছিক)';
  shareWithImagesBtn.disabled = false;
  orderConfirmModal.classList.add('open');
  updateBodyScrollLock();
}
function closeOrderConfirmModal(){ orderConfirmModal.classList.remove('open'); updateBodyScrollLock(); }
orderConfirmClose.addEventListener('click', closeOrderConfirmModal);
orderConfirmModal.addEventListener('click', (e) => { if(e.target === orderConfirmModal) closeOrderConfirmModal(); });

copyOrderIdBtn.addEventListener('click', async () => {
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(orderIdField.value);
    } else {
      orderIdField.removeAttribute('readonly');
      orderIdField.select();
      document.execCommand('copy');
      orderIdField.setAttribute('readonly', 'true');
    }
    copyOrderIdBtn.textContent = 'কপি হয়েছে ✅';
    setTimeout(() => { copyOrderIdBtn.textContent = 'কপি করুন'; }, 1800);
  }catch(err){
    orderIdField.removeAttribute('readonly');
    orderIdField.select();
    alert('অটো-কপি কাজ করেনি, উপরে নম্বরটা সিলেক্ট করে ম্যানুয়ালি কপি করুন।');
  }
});

reopenWaBtn.addEventListener('click', () => {
  if(lastOrder) window.open(lastOrder.waUrl, '_blank');
});

// এটা আলাদা, একদম তাজা (fresh) ক্লিকের ওপর চলে — তাই ছবি fetch করার async কাজ থাকলেও
// ব্রাউজার এটাকে ব্লক করে না (WhatsApp টেক্সট অর্ডার ততক্ষণে আগেই পাঠানো হয়ে গেছে)
shareWithImagesBtn.addEventListener('click', async () => {
  if(!lastOrder || !navigator.share) return;
  shareWithImagesBtn.disabled = true;
  shareWithImagesBtn.textContent = 'ছবি প্রস্তুত হচ্ছে...';
  try{
    const files = await buildOrderImageFiles(lastOrder.cartSnapshot);
    const shareData = { title: 'Openshop অর্ডার #' + lastOrder.orderId, text: lastOrder.msg };
    if(files.length && (!navigator.canShare || navigator.canShare({ files }))){
      shareData.files = files;
    }
    await navigator.share(shareData);
  }catch(err){
    if(err.name !== 'AbortError'){
      alert('এই ব্রাউজারে ছবিসহ শেয়ার করা গেল না। WhatsApp চ্যাটে অর্ডারের মেসেজটা তো চলে গেছে, চাইলে ছবি ম্যানুয়ালি অ্যাটাচ করে পাঠাতে পারেন।');
    }
  }
  shareWithImagesBtn.disabled = false;
  shareWithImagesBtn.textContent = '📸 ছবিসহ শেয়ার করুন (ঐচ্ছিক)';
});

// ============ জেলা → উপজেলা (দারাজ-স্টাইল লোকেশন সিলেক্টর) ============
const leadDistrictEl = document.getElementById('leadDistrict');
const leadUpazilaEl = document.getElementById('leadUpazila');
if(leadDistrictEl && typeof BD_LOCATIONS !== 'undefined'){
  Object.keys(BD_LOCATIONS).sort((a,b) => a.localeCompare(b, 'bn')).forEach(district => {
    const opt = document.createElement('option');
    opt.value = district;
    opt.textContent = district;
    leadDistrictEl.appendChild(opt);
  });
  leadDistrictEl.addEventListener('change', () => {
    const district = leadDistrictEl.value;
    leadUpazilaEl.innerHTML = '<option value="">উপজেলা নির্বাচন করুন *</option>';
    if(district && BD_LOCATIONS[district]){
      leadUpazilaEl.disabled = false;
      BD_LOCATIONS[district].forEach(upazila => {
        const opt = document.createElement('option');
        opt.value = upazila;
        opt.textContent = upazila;
        leadUpazilaEl.appendChild(opt);
      });
    } else {
      leadUpazilaEl.disabled = true;
    }
    leadDistrictEl.classList.remove('invalid');
  });
  leadUpazilaEl.addEventListener('change', () => leadUpazilaEl.classList.remove('invalid'));
}

// ============ ছোট টোস্ট নোটিফিকেশন (অর্ডার-কনফার্ম মডালের পাশাপাশি, তাৎক্ষণিক ভিজ্যুয়াল কনফার্মেশনের জন্য) ============
const toastHost = document.getElementById('toastHost');
function showSiteToast(text, icon){
  if(!toastHost) return;
  const toast = document.createElement('div');
  toast.className = 'site-toast';
  toast.innerHTML = `<span class="toast-icon">${icon || '✅'}</span><span>${text}</span>`;
  toastHost.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

// ============ CHECKOUT VIA WHATSAPP (ছবিসহ, + order created for tracking) ============
// ============ চেকআউট এরর দেখানো (alert() না ব্যবহার করে — অনেক ইন-অ্যাপ ব্রাউজারে/এমবেডেড ভিউতে alert() নীরবে ব্লক হয়ে যায়, ইউজার তখন বুঝতেই পারে না কী ভুল হলো) ============
const checkoutErrorEl = document.getElementById('checkoutError');
function showCheckoutError(msg, fieldId){
  checkoutErrorEl.textContent = msg;
  checkoutErrorEl.classList.remove('hidden');
  document.querySelectorAll('.lead-input.invalid').forEach(el => el.classList.remove('invalid'));
  const field = fieldId ? document.getElementById(fieldId) : null;
  if(field){
    field.classList.add('invalid');
    field.focus();
    field.scrollIntoView({ behavior:'smooth', block:'center' });
  }
}
function clearCheckoutError(){
  checkoutErrorEl.classList.add('hidden');
  checkoutErrorEl.textContent = '';
  document.querySelectorAll('.lead-input.invalid').forEach(el => el.classList.remove('invalid'));
}
['leadName','leadPhone','leadAddress','leadDistrict','leadUpazila'].forEach(id => {
  const el = document.getElementById(id);
  if(el) el.addEventListener('input', () => el.classList.remove('invalid'));
});

checkoutBtn.addEventListener('click', () => {
  clearCheckoutError();
  if(cart.length === 0){ showCheckoutError('আপনার কার্ট খালি — অর্ডার করার আগে প্রোডাক্ট যোগ করুন।'); return; }
  const leadName = document.getElementById('leadName').value.trim();
  const leadPhone = document.getElementById('leadPhone').value.trim();
  const leadDistrict = document.getElementById('leadDistrict').value.trim();
  const leadUpazila = document.getElementById('leadUpazila').value.trim();
  const leadAddressDetail = document.getElementById('leadAddress').value.trim();
  const subtotal = cart.reduce((s,i) => s + i.price*i.qty, 0);
  // চেকআউটের ঠিক আগমুহূর্তে কুপনটা এখনো বৈধ কিনা আবার (সিঙ্ক্রোনাসভাবে, ক্যাশ করা COUPONS থেকে) যাচাই করে নিচ্ছি —
  // যাতে কেউ কুপন প্রয়োগ করার পর অ্যাডমিন সেটা বন্ধ/মেয়াদোত্তীর্ণ করে দিলেও পুরনো ছাড় প্রয়োগ না হয়ে যায়।
  // ⚠️ এখানে ইচ্ছাকৃতভাবে কোনো নতুন Firestore কল (await) করা হচ্ছে না — তাহলে নিচের window.open()
  // ক্লিক-অ্যাকশন হিসেবে গণ্য হবে না ও WhatsApp ব্লক হয়ে যাবে (আগের বাগ, দেখুন নিচের নোট)।
  if(appliedCoupons.length){
    const today = new Date().toISOString().slice(0,10);
    const before = appliedCoupons.length;
    appliedCoupons = appliedCoupons.filter(ac => {
      const stillValid = COUPONS.some(c => (c.code||'').toUpperCase() === ac.code && c.active !== false);
      const notExpired = !ac.expiry || ac.expiry >= today;
      const relevantSubtotal = ac.productId ? getProductLineSubtotal(cart, ac.productId) : subtotal;
      const productStillInCart = !ac.productId || relevantSubtotal > 0;
      const meetsMin = relevantSubtotal >= Number(ac.minOrder || 0);
      return stillValid && notExpired && productStillInCart && meetsMin;
    });
    if(appliedCoupons.length < before){
      if(couponMsgEl){
        couponMsgEl.textContent = 'একটি বা একাধিক কুপন আর প্রযোজ্য নয়, তাই বাদ দেওয়া হয়েছে — চাইলে আবার চেক করে প্রয়োগ করুন।';
        couponMsgEl.className = 'coupon-msg error';
      }
      renderCart();
    }
  }
  const discount = getCouponDiscount(subtotal);
  const grandTotal = subtotal - discount + DELIVERY_CHARGE;

  if(!isValidLeadName(leadName)){ showCheckoutError('অনুগ্রহ করে আপনার সঠিক নাম দিন (শুধু অক্ষর, অন্তত ২ অক্ষর — সংখ্যা বা ভুয়া লেখা চলবে না)।', 'leadName'); return; }
  if(!isValidBDPhone(leadPhone)){ showCheckoutError('অনুগ্রহ করে সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন 01712345678)। ভুল/ভুয়া নম্বর দিয়ে অর্ডার করা যাবে না।', 'leadPhone'); return; }
  if(!leadDistrict){ showCheckoutError('অনুগ্রহ করে আপনার জেলা নির্বাচন করুন — এই জায়গাটি খালি।', 'leadDistrict'); return; }
  if(!leadUpazila){ showCheckoutError('অনুগ্রহ করে আপনার উপজেলা নির্বাচন করুন — এই জায়গাটি খালি।', 'leadUpazila'); return; }
  if(!isValidLeadAddress(leadAddressDetail)){ showCheckoutError('অনুগ্রহ করে বাসা/রোড/গ্রামের নাম দিন — অন্তত ৬ অক্ষর, শুধু সংখ্যা/সিম্বল দিয়ে হবে না।', 'leadAddress'); return; }
  const leadAddress = `${leadAddressDetail}, ${leadUpazila}, ${leadDistrict}`;

  // ফোন নম্বরটা সাথে সাথেই সেভ করে দিচ্ছি — এতে পরে "প্রোফাইল"-এ গেলে
  // ইউজারকে আর কিছু টাইপ করতে হবে না, অটোমেটিক তার অর্ডারগুলো দেখতে পাবে (Firestore সেভ সফল হোক বা না হোক)
  localStorage.setItem('openshop_profile_phone', normalizePhone(leadPhone));

  const orderId = generateOrderId();
  const cartSnapshot = cart.map(i => ({ ...i }));

  let msg = `আসসালামু আলাইকুম, আমি Openshop থেকে অর্ডার করতে চাই:\n`;
  msg += `অর্ডার আইডি: ${orderId}\n\n`;
  if(leadName) msg += `নাম: ${leadName}\n`;
  msg += `ফোন: ${leadPhone}\n`;
  if(leadAddress) msg += `ঠিকানা: ${leadAddress}\n`;
  if(visitorLocation && visitorLocation.mapsUrl) msg += `📍 লোকেশন পিন: ${visitorLocation.mapsUrl}\n`;
  msg += '\n';
  cart.forEach((i, idx) => {
    msg += `${idx+1}. ${i.name}${i.size ? ' (ভ্যারিয়েন্ট: '+i.size+')' : ''} — ${i.qty} পিস — ${formatTaka(i.price*i.qty)}\n`;
  });
  msg += `\nসাবটোটাল: ${formatTaka(subtotal)}`;
  if(discount > 0){
    appliedCoupons.forEach(c => {
      const couponLabel = c.type === 'fixed' ? `-${formatTaka(c.value)}` : `-${c.value}%`;
      const cDiscount = getSingleCouponDiscount(c, subtotal);
      msg += `\nকুপন (${c.code}${c.productId ? ', '+(c.productName||'নির্দিষ্ট প্রোডাক্ট') : ''}, ${couponLabel}): -${formatTaka(cDiscount)}`;
    });
  }
  msg += `\nডেলিভারি চার্জ: ${formatTaka(DELIVERY_CHARGE)}`;
  msg += `\nসর্বমোট: ${formatTaka(grandTotal)}`;

  // প্রোডাক্টের ছবির লিংকও মেসেজে জুড়ে দিচ্ছি
  const uniqueImages = [...new Set(cart.map(i => i.image).filter(Boolean))];
  if(uniqueImages.length){
    msg += `\n\nপ্রোডাক্টের ছবি:\n` + uniqueImages.map((u, idx) => `${idx+1}. ${u}`).join('\n');
  }

  const waNumber = window.WHATSAPP_NUMBER_OVERRIDE || WHATSAPP_NUMBER;
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;

  // ⚠️ গুরুত্বপূর্ণ: এই window.open ক্লিক হ্যান্ডলারের একদম শুরুতেই, কোনো await এর আগেই কল হচ্ছে —
  // মাঝে Firestore সেভ বা ছবি fetch করার মতো async কাজ করলে ব্রাউজার এই ক্লিককে
  // আর "ইউজারের অ্যাকশন" হিসেবে গণ্য করে না, ফলে WhatsApp/পপআপ ব্লক হয়ে যায় (আগের বাগ)।
  window.open(waUrl, '_blank');

  // বাকি কাজ (Firestore-এ অর্ডার সেভ) এখন ব্যাকগ্রাউন্ডে হবে — WhatsApp খোলার সাথে এর সম্পর্ক নেই
  const db = getDb();
  if(db){
    db.collection('orders').add({
      orderId,
      name: leadName || null,
      phone: normalizePhone(leadPhone),
      address: leadAddress || null,
      location: visitorLocation ? { lat: visitorLocation.lat, lng: visitorLocation.lng, mapsUrl: visitorLocation.mapsUrl } : null,
      items: cartSnapshot.map(i => ({ name: i.name, size: i.size, qty: i.qty, price: i.price, image: i.image })),
      subtotal,
      discount,
      couponCode: discount > 0 ? appliedCoupons.map(c => c.code).join(', ') : null,
      deliveryCharge: DELIVERY_CHARGE,
      total: grandTotal,
      status: 'pending',
      ts: Date.now(),
      day: new Date().toISOString().slice(0,10)
    }).catch(err => console.warn('অর্ডার সেভ করা যায়নি:', err.message));
  }

  openOrderConfirmModal(orderId, waUrl, msg, cartSnapshot);
  showSiteToast(`অর্ডার সম্পন্ন হয়েছে! অর্ডার আইডি: ${orderId}`);
  cart = [];
  appliedCoupons = [];
  if(couponInput) couponInput.value = '';
  if(couponMsgEl) couponMsgEl.classList.add('hidden');
  saveCart();
  renderCart();
  closeCart();
  clearCheckoutError();
});

// ============ PROFILE / ORDER TRACKING DRAWER ============
const profileDrawer = document.getElementById('profileDrawer');
const profileBody = document.getElementById('profileBody');
const profileClose = document.getElementById('profileClose');

const STATUS_LABELS = {
  pending: 'অপেক্ষমাণ', confirmed: 'নিশ্চিত হয়েছে', processing: 'প্রস্তুত হচ্ছে',
  shipped: 'পাঠানো হয়েছে', delivered: 'ডেলিভারি সম্পন্ন', cancelled: 'বাতিল হয়েছে'
};

function openProfile(){ profileDrawer.classList.add('open'); cartOverlay.classList.add('open'); updateBodyScrollLock(); renderProfile(); }
function closeProfile(){ profileDrawer.classList.remove('open'); cartOverlay.classList.remove('open'); updateBodyScrollLock(); }
profileClose.addEventListener('click', closeProfile);

function orderCardHtml(o){
  const st = o.status || 'pending';
  const date = new Date(o.ts).toLocaleDateString('bn-BD');
  const items = (o.items || []).map(i => `${i.name} x${i.qty}`).join(', ');
  return `
    <div class="order-card">
      <div class="oid">অর্ডার #${o.orderId || ''}</div>
      <span class="order-status-badge status-${st}">${STATUS_LABELS[st] || st}</span>
      <div class="order-items-mini">${items}</div>
      <div class="order-items-mini">তারিখ: ${date} • সর্বমোট: ${formatTaka(o.total != null ? o.total : (o.subtotal||0))}</div>
    </div>`;
}

function normalizePhone(p){ return (p || '').replace(/\D/g, ''); }

// ============ অর্ডার ফর্ম যাচাই (ভুয়া/উল্টাপাল্টা তথ্য দিয়ে অর্ডার আটকাতে) ============
// সঠিক বাংলাদেশি মোবাইল নম্বর কিনা চেক করে (+৮৮ সহ বা ছাড়া, ০১[৩-৯] দিয়ে শুরু ১১ ডিজিট)
function isValidBDPhone(phone){
  const digits = normalizePhone(phone);
  const local = digits.startsWith('88') ? digits.slice(2) : digits;
  return /^01[3-9]\d{8}$/.test(local);
}
// নাম শুধু অক্ষর/স্পেস/ডট/হাইফেন দিয়ে হতে হবে, অন্তত ২ অক্ষর — খালি সংখ্যা বা এলোমেলো ক্যারেক্টার আটকাবে
function isValidLeadName(name){
  const trimmed = (name || '').trim();
  if(trimmed.length < 2 || trimmed.length > 60) return false;
  return /^[A-Za-z\u0980-\u09FF][A-Za-z\u0980-\u09FF .'-]*$/.test(trimmed);
}
// ঠিকানায় অন্তত ৬ অক্ষর ও কমপক্ষে একটা প্রকৃত অক্ষর থাকতে হবে (শুধু সংখ্যা/সিম্বল হলে বাতিল)
function isValidLeadAddress(address){
  const trimmed = (address || '').trim();
  if(trimmed.length < 6 || trimmed.length > 200) return false;
  return /[A-Za-z\u0980-\u09FF]/.test(trimmed);
}

async function fetchOrdersByPhone(phone){
  const db = getDb();
  if(!db) return [];
  const cleanPhone = normalizePhone(phone);
  try{
    // এখানে ইচ্ছাকৃতভাবে orderBy ব্যবহার করা হয়নি — where + orderBy একসাথে ব্যবহার করলে
    // Firestore-এ একটা আলাদা কম্পোজিট ইনডেক্স বানাতে হয় (Firebase Console থেকে),
    // যেটা এখনো তৈরি না থাকায় আগে কোয়েরি চুপচাপ ফেইল করে "কোনো অর্ডার নেই" দেখাচ্ছিল।
    // তাই এখন সব রেজাল্ট আগে আনা হচ্ছে, তারপর তারিখ অনুযায়ী সাজানো হচ্ছে জাভাস্ক্রিপ্টে।
    const snap = await db.collection('orders').where('phone', '==', cleanPhone).limit(30).get();
    return snap.docs.map(d => d.data()).sort((a, b) => (b.ts||0) - (a.ts||0));
  }catch(err){ console.warn(err.message); return []; }
}
async function fetchOrderById(orderId){
  const db = getDb();
  if(!db) return [];
  try{
    const snap = await db.collection('orders').where('orderId', '==', orderId.trim().toUpperCase()).limit(1).get();
    return snap.docs.map(d => d.data());
  }catch(err){ console.warn(err.message); return []; }
}

function renderProfile(){
  const savedPhone = localStorage.getItem('openshop_profile_phone');
  if(savedPhone){
    profileBody.innerHTML = `<p style="font-size:13px; color:#66756f;">ফোন নম্বর: <b>${savedPhone}</b></p><div id="ordersList"><p class="msg">লোড হচ্ছে...</p></div><button class="profile-logout" id="profileLogoutBtn">ভিন্ন নম্বর দিয়ে দেখুন</button>`;
    document.getElementById('profileLogoutBtn').addEventListener('click', () => {
      localStorage.removeItem('openshop_profile_phone');
      renderProfile();
    });
    fetchOrdersByPhone(savedPhone).then(orders => {
      const el = document.getElementById('ordersList');
      if(!el) return;
      el.innerHTML = orders.length ? orders.map(orderCardHtml).join('') : '<p style="font-size:13px; color:#8a9791;">এই নম্বরে কোনো অর্ডার পাওয়া যায়নি।</p>';
    });
  } else {
    profileBody.innerHTML = `
      <div class="profile-guest">
        <div class="avatar-ph">👤</div>
        <p>আপনার ফোন নম্বর দিয়ে অর্ডার ট্র্যাক করুন, অথবা সরাসরি অর্ডার আইডি দিয়ে খুঁজুন।</p>
      </div>
      <div class="track-form">
        <input type="tel" id="trackPhone" placeholder="ফোন নম্বর দিয়ে খুঁজুন" class="lead-input">
        <button class="btn btn-primary btn-block" id="trackPhoneBtn">ফোন নম্বর দিয়ে দেখুন</button>
      </div>
      <div class="track-form">
        <input type="text" id="trackOrderId" placeholder="অর্ডার আইডি (যেমন OS123456)" class="lead-input">
        <button class="btn btn-ghost btn-block" id="trackOrderBtn" style="border-color:var(--teal); color:var(--teal);">অর্ডার আইডি দিয়ে খুঁজুন</button>
      </div>
      <div id="trackResult"></div>
    `;
    document.getElementById('trackPhoneBtn').addEventListener('click', async () => {
      const phone = document.getElementById('trackPhone').value.trim();
      if(!phone) return;
      localStorage.setItem('openshop_profile_phone', normalizePhone(phone));
      renderProfile();
    });
    document.getElementById('trackOrderBtn').addEventListener('click', async () => {
      const oid = document.getElementById('trackOrderId').value.trim();
      const resEl = document.getElementById('trackResult');
      if(!oid) return;
      resEl.innerHTML = '<p class="msg">খোঁজা হচ্ছে...</p>';
      const orders = await fetchOrderById(oid);
      resEl.innerHTML = orders.length ? orders.map(orderCardHtml).join('') : '<p style="font-size:13px; color:#8a9791;">এই আইডিতে কোনো অর্ডার পাওয়া যায়নি।</p>';
    });
  }
}

// ============ BOTTOM NAV ============
document.querySelectorAll('.bn-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bn-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.bn;
    if(target === 'home'){
      // মডাল/ড্রয়ার কিছু খোলা থাকলে আগে সেটা বন্ধ করে দিই, তারপর উপরে স্ক্রল করি —
      // যাতে শেয়ার করা প্রোডাক্ট লিংক থেকে ঢুকে থাকলেও হোম বাটনে সবসময় হোমপেজে ফেরা যায়।
      if(productModal.classList.contains('open')) closeModal();
      if(cartDrawer.classList.contains('open')) closeCart();
      if(profileDrawer.classList.contains('open')) closeProfile();
      window.scrollTo({top:0, behavior:'smooth'});
    }
    else if(target === 'categories'){ document.getElementById('categories').scrollIntoView({behavior:'smooth'}); }
    else if(target === 'search'){ document.getElementById('categories').scrollIntoView({behavior:'smooth'}); searchInput.focus(); }
    else if(target === 'cart'){ renderCart(); openCart(); }
    else if(target === 'profile'){ openProfile(); }
  });
});

// ============ Esc কী চাপলে খোলা মডাল/ড্রয়ার বন্ধ হয়ে যাবে ============
document.addEventListener('keydown', (e) => {
  if(e.key !== 'Escape') return;
  if(orderConfirmModal.classList.contains('open')) closeOrderConfirmModal();
  else if(productModal.classList.contains('open')) closeModal();
  else if(cartDrawer.classList.contains('open')) closeCart();
  else if(profileDrawer.classList.contains('open')) closeProfile();
  else {
    const cm = document.getElementById('couponsModal');
    if(cm && cm.classList.contains('open')){ cm.classList.remove('open'); updateBodyScrollLock(); }
  }
});

// ============ MOBILE MENU ============
menuToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
});
mainNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { mainNav.classList.remove('open'); menuToggle.setAttribute('aria-expanded', 'false'); }));
mainNav.querySelectorAll('button.nav-link-btn').forEach(b => b.addEventListener('click', () => { mainNav.classList.remove('open'); menuToggle.setAttribute('aria-expanded', 'false'); }));
document.addEventListener('click', (e) => {
  if(!mainNav.classList.contains('open')) return;
  if(mainNav.contains(e.target) || menuToggle.contains(e.target)) return;
  mainNav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
});
// ============ হ্যামবার্গার মেনু: কাস্টমার কেয়ার / শেয়ার / লাইক — উপরের ইউটিলিটি বারের একই বাটনে ক্লিক ঘটিয়ে দেয়, যাতে আচরণ একই থাকে ============
const navCustomerCare = document.getElementById('navCustomerCare');
if(navCustomerCare){
  navCustomerCare.addEventListener('click', (e) => {
    e.preventDefault();
    const utilCare = document.getElementById('utilCustomerCare');
    if(utilCare) utilCare.click();
  });
}
const navShareSite = document.getElementById('navShareSite');
if(navShareSite){
  navShareSite.addEventListener('click', () => {
    const utilShare = document.getElementById('utilShareSite');
    if(utilShare) utilShare.click();
  });
}

// ============ হ্যামবার্গার মেনু: ইনস্টল অ্যাপ (PWA) ============
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});
const navInstallApp = document.getElementById('navInstallApp');
if(navInstallApp){
  navInstallApp.addEventListener('click', async () => {
    if(deferredInstallPrompt){
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
    } else {
      showSiteToast('ব্রাউজার মেনু থেকে "হোম স্ক্রিনে যোগ করুন" / "Install App" অপশনে ট্যাপ করে অ্যাপটি ইনস্টল করুন।', '📲');
    }
  });
}

// ============ হ্যামবার্গার মেনু: কুপন — কোন কোন প্রোডাক্টে চালু কুপন আছে তার তালিকা, সরাসরি প্রয়োগও করা যায় ============
const couponsModal = document.getElementById('couponsModal');
const couponsModalClose = document.getElementById('couponsModalClose');
const couponsModalContent = document.getElementById('couponsModalContent');
function couponListItemHtml(c){
  const discountText = c.type === 'fixed' ? formatTaka(c.value) : `${c.value}%`;
  const target = c.productId ? (c.productName || 'একটি নির্দিষ্ট প্রোডাক্ট') : 'সব প্রোডাক্ট (পুরো কার্ট)';
  return `
    <div class="coupon-list-item">
      <span class="coupon-code">${c.code}</span>
      <span class="coupon-desc">${target} — ${discountText} ছাড়${c.minOrder ? `, সর্বনিম্ন অর্ডার ${formatTaka(c.minOrder)}` : ''}</span>
      <button type="button" class="btn btn-ghost coupon-use-btn" data-code="${c.code}" data-pid="${c.productId || ''}">ব্যবহার করুন</button>
    </div>`;
}
async function openCouponsModal(){
  if(!COUPONS.length) await loadCoupons();
  const today = new Date().toISOString().slice(0,10);
  const active = COUPONS.filter(c => c.active !== false && (!c.expiry || c.expiry >= today));
  couponsModalContent.innerHTML = active.length
    ? active.map(couponListItemHtml).join('')
    : '<p class="coupons-empty">এই মুহূর্তে চালু কোনো কুপন নেই।</p>';
  couponsModalContent.querySelectorAll('.coupon-use-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.code;
      const pid = btn.dataset.pid;
      couponsModal.classList.remove('open');
      updateBodyScrollLock();
      if(couponInput) couponInput.value = code;
      if(pid && PRODUCTS.find(x => x.id === pid)){
        // প্রোডাক্টটি নতুন উইন্ডো/ট্যাবে খুলবে, যাতে এই পেজে কার্ট/কুপন কোড হারিয়ে না যায়
        window.open(window.location.pathname + '#product-' + pid, '_blank');
      } else {
        renderCart();
        openCart();
      }
      showSiteToast(`কুপন কোড "${code}" বসানো হয়েছে — প্রোডাক্ট কার্টে যোগ করে "প্রয়োগ করুন" চাপুন।`, '🏷️');
    });
  });
  couponsModal.classList.add('open');
  updateBodyScrollLock();
}
const navCoupons = document.getElementById('navCoupons');
if(navCoupons){
  navCoupons.addEventListener('click', () => openCouponsModal());
}
if(couponsModalClose){
  couponsModalClose.addEventListener('click', () => { couponsModal.classList.remove('open'); updateBodyScrollLock(); });
}
if(couponsModal){
  couponsModal.addEventListener('click', (e) => { if(e.target === couponsModal){ couponsModal.classList.remove('open'); updateBodyScrollLock(); } });
}

// ============ INSTALL AS APP (PWA) ============
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// ============ INIT ============
(async function init(){
  applyDarkMode(localStorage.getItem('openshop_dark_mode') === '1');
  renderWishlistCount();
  renderSiteLikeUI();
  await Promise.all([loadLiveProducts(), loadSiteSettings(), loadCoupons(), loadReviews(), loadLikes(), loadSiteLikesCount()]);
  renderSiteLikeUI();
  renderCategories();
  renderProducts();
  renderCart();
  logEvent('pageview', { path: window.location.pathname });
  captureVisitorLocation(); // ব্যাকগ্রাউন্ডে চলবে — বাকি কিছুর জন্য অপেক্ষা করাবে না
  openProductFromHash(true); // শেয়ার করা লিংক (#product-xxx) দিয়ে সরাসরি ঢুকলে প্রোডাক্টের মডাল অটোমেটিক খুলে যাবে
})();

// ============ শেয়ার করা প্রোডাক্ট লিংক থেকে সরাসরি প্রোডাক্ট মডাল খোলা ============
// "শেয়ার করুন" বাটনে যে লিংক তৈরি হয় (#product-<id>) সেটাতে ক্লিক করে সাইটে ঢুকলে
// আগে শুধু হোমপেজ দেখাত, প্রোডাক্টটা খুলত না। এখন পেজ লোডের সময় ও হ্যাশ বদলালে
// (যেমন নতুন ট্যাবে লিংক খোলা, বা ব্যাক/ফরোয়ার্ড বাটন চাপা) — দুই ক্ষেত্রেই চেক করে
// সংশ্লিষ্ট প্রোডাক্টের মডাল অটোমেটিক খুলে দেওয়া হয়।
function openProductFromHash(isInitialLoad){
  const hash = window.location.hash || '';
  if(!hash.startsWith('#product-')) return;
  const id = hash.replace('#product-', '');
  if(!PRODUCTS.find(x => x.id === id)) return;
  if(isInitialLoad){
    // শেয়ার করা লিংক দিয়ে সরাসরি সাইটে ঢুকলে এই #product-xxx URL-টাই ব্রাউজারের
    // হিস্টোরিতে প্রথম (এবং একমাত্র) এন্ট্রি হয়ে যায়। তখন ক্রস (X) বা ব্যাক বাটন
    // চাপলে "ফিরে যাওয়ার" মতো কোনো আগের পেজ না থাকায় কিছুই হতো না, মডাল আটকে
    // থাকত। তাই এখানে প্রথমে একটা ক্লিন হোমপেজ URL হিস্টোরিতে বসিয়ে দিই, তারপর
    // প্রোডাক্ট হ্যাশ পুশ করি — যাতে ক্রস/ব্যাক বাটনে সবসময় হোমপেজে ফেরা যায়।
    history.replaceState(null, '', window.location.pathname + window.location.search);
    openModal(id);
  } else {
    openModal(id, { updateUrl: false });
  }
}
window.addEventListener('hashchange', () => openProductFromHash(false));

// ============ ব্যাক/ফরোয়ার্ড বাটন — প্রোডাক্ট পেজ থেকে "আসল পেজের মতো" ফেরা ============
// ইউজার ব্যাক বাটন চাপলে ব্রাউজার URL/hash বদলে ফেলে, কিন্তু মডাল বন্ধ করার কাজটা
// আমাদেরই করতে হয়। hash এখনো কোনো প্রোডাক্টের হলে সেটা খুলে দেওয়া হয় (ফরোয়ার্ড বাটন,
// বা দুটো প্রোডাক্ট পেজের মাঝে ব্যাক করলে), আর hash খালি হয়ে গেলে মডাল বন্ধ করে
// লিস্টিং পেজে ফিরিয়ে আনা হয়।
window.addEventListener('popstate', () => {
  const hash = window.location.hash || '';
  if(hash.startsWith('#product-')){
    const id = hash.replace('#product-', '');
    if(PRODUCTS.find(x => x.id === id)) openModal(id, { updateUrl: false });
  } else if(productModal.classList.contains('open')){
    productModal.classList.remove('open');
    updateBodyScrollLock();
  }
});
