let MAIN_CATEGORIES = [{
  value: "women",
  label: "নারীদের পোশাক",
  labelEn: "Women's Fashion",
  icon: "👗"
}, {
  value: "men",
  label: "পুরুষদের পোশাক",
  labelEn: "Men's Fashion",
  icon: "👔"
}, {
  value: "bags",
  label: "ব্যাগ কালেকশন",
  labelEn: "Bag Collection",
  icon: "👜"
}, {
  value: "seasonal",
  label: "সিজনাল প্রোডাক্ট",
  labelEn: "Seasonal Products",
  icon: "🎉"
}];
function mainCategoryLabel(_0x225c93) {
  const _0x5d1c86 = MAIN_CATEGORIES.find(_0xcae9d8 => _0xcae9d8.value === _0x225c93);
  if (_0x5d1c86) {
    return _0x5d1c86.label;
  } else {
    return _0x225c93;
  }
}
let cart = JSON.parse(localStorage.getItem("openshop_cart") || "[]");
let wishlist = JSON.parse(localStorage.getItem("openshop_wishlist") || "[]");
let activeMainCategory = "সব";
let activeCategory = "সব";
let searchQuery = "";
let selectedSize = null;
let selectedImage = null;
let sortOrder = "default";
let minPriceFilter = null;
let maxPriceFilter = null;
let minRatingFilter = 0;
let appliedCoupons = [];
let COUPONS = [];
let REVIEWS = [];
let LIKES = [];
let likedProducts = JSON.parse(localStorage.getItem("openshop_liked") || "[]");
let SITE_LIKES_COUNT = 0;
let _db = null;
function firebaseIsConfigured() {
  return typeof FIREBASE_CONFIG !== "undefined" && FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.includes("আপনার");
}
function getDb() {
  if (!firebaseIsConfigured()) {
    return null;
  }
  try {
    if (typeof firebase === "undefined") {
      return null;
    }
    if (!_db) {
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      _db = firebase.firestore();
    }
    return _db;
  } catch (_0x5d7921) {
    console.warn("Firebase চালু করা যায়নি, স্ট্যাটিক ডেটা ব্যবহার হচ্ছে:", _0x5d7921.message);
    return null;
  }
}
async function loadLiveProducts() {
  const _0x2c4cfe = getDb();
  if (!_0x2c4cfe) {
    return;
  }
  try {
    const _0x1eb0ab = await _0x2c4cfe.collection("products").orderBy("updatedAt", "desc").get();
    if (!_0x1eb0ab.empty) {
      PRODUCTS = _0x1eb0ab.docs.map(_0x238bab => ({
        id: _0x238bab.id,
        ..._0x238bab.data()
      }));
    }
  } catch (_0x79a5f5) {
    console.warn("Firestore থেকে প্রোডাক্ট লোড করা যায়নি, স্ট্যাটিক তালিকা ব্যবহার হচ্ছে:", _0x79a5f5.message);
  }
}
async function loadCoupons() {
  const _0x5c5227 = getDb();
  if (!_0x5c5227) {
    return;
  }
  try {
    const _0x43abc2 = await _0x5c5227.collection("coupons").get();
    COUPONS = _0x43abc2.docs.map(_0x48ecde => ({
      id: _0x48ecde.id,
      ..._0x48ecde.data()
    }));
  } catch (_0x1af195) {
    console.warn("কুপন লোড করা যায়নি:", _0x1af195.message);
  }
}
async function countCouponUsage(_0x4312a3) {
  const _0x7d727 = getDb();
  if (!_0x7d727) {
    return 0;
  }
  try {
    const _0x450cc6 = await _0x7d727.collection("orders").where("couponCode", "==", _0x4312a3).get();
    return _0x450cc6.size;
  } catch (_0x14f4f7) {
    console.warn("কুপন ব্যবহারের সংখ্যা গোনা যায়নি:", _0x14f4f7.message);
    return 0;
  }
}
function getProductLineSubtotal(_0x875f81, _0x53f89d) {
  return _0x875f81.filter(_0x5ad311 => _0x5ad311.id === _0x53f89d).reduce((_0x56cafa, _0x5b18fd) => _0x56cafa + _0x5b18fd.price * _0x5b18fd.qty, 0);
}
async function validateCoupon(_0x139dd7, _0x424c13) {
  const _0x7fc8c7 = (_0x139dd7 || "").trim().toUpperCase();
  if (!_0x7fc8c7) {
    return {
      ok: false,
      reason: "একটা কুপন কোড লিখুন।"
    };
  }
  if (!COUPONS.length) {
    await loadCoupons();
  }
  const _0x4a71b5 = COUPONS.find(_0x5ede38 => (_0x5ede38.code || "").toUpperCase() === _0x7fc8c7);
  if (!_0x4a71b5) {
    return {
      ok: false,
      reason: "কুপন কোডটি সঠিক নয়।"
    };
  }
  if (_0x4a71b5.active === false) {
    return {
      ok: false,
      reason: "এই কুপনটি বর্তমানে বন্ধ আছে।"
    };
  }
  if (_0x4a71b5.expiry) {
    const _0x24ff44 = new Date().toISOString().slice(0, 10);
    if (_0x4a71b5.expiry < _0x24ff44) {
      return {
        ok: false,
        reason: "এই কুপনের মেয়াদ শেষ হয়ে গেছে।"
      };
    }
  }
  let _0x5d0b40;
  if (_0x4a71b5.productId) {
    _0x5d0b40 = getProductLineSubtotal(_0x424c13, _0x4a71b5.productId);
    if (_0x5d0b40 <= 0) {
      return {
        ok: false,
        reason: "এই কুপনটি \"" + (_0x4a71b5.productName || "একটি নির্দিষ্ট প্রোডাক্ট") + "\"-এর জন্য — আগে সেই প্রোডাক্টটা কার্টে যোগ করুন।"
      };
    }
  } else {
    _0x5d0b40 = _0x424c13.reduce((_0x37be81, _0x316bb7) => _0x37be81 + _0x316bb7.price * _0x316bb7.qty, 0);
  }
  const _0x4dd201 = Number(_0x4a71b5.minOrder || 0);
  if (_0x4dd201 > 0 && _0x5d0b40 < _0x4dd201) {
    return {
      ok: false,
      reason: "এই কুপন ব্যবহার করতে কমপক্ষে " + formatTaka(_0x4dd201) + " টাকার " + (_0x4a71b5.productId ? "ওই প্রোডাক্টের" : "") + " অর্ডার লাগবে।"
    };
  }
  if (_0x4a71b5.maxUses) {
    const _0x687551 = await countCouponUsage(_0x4a71b5.code);
    if (_0x687551 >= Number(_0x4a71b5.maxUses)) {
      return {
        ok: false,
        reason: "এই কুপনের ব্যবহারের সীমা শেষ হয়ে গেছে।"
      };
    }
  }
  return {
    ok: true,
    coupon: _0x4a71b5
  };
}
function getProductCoupon(_0x3d8098) {
  if (!COUPONS || !COUPONS.length) {
    return null;
  }
  const _0x4993a9 = new Date().toISOString().slice(0, 10);
  return COUPONS.find(_0x2d6460 => _0x2d6460.productId === _0x3d8098 && _0x2d6460.active !== false && (!_0x2d6460.expiry || _0x2d6460.expiry >= _0x4993a9)) || null;
}
function offerTagHtml(_0x4cab76) {
  const _0x191486 = getProductCoupon(_0x4cab76);
  if (!_0x191486) {
    return "";
  }
  return "<span class=\"offer-tag\">🏷️ " + (_0x191486.label || "বিশেষ অফার") + "</span>";
}
function couponChipHtml(_0x5f3eb6) {
  const _0x32edbd = getProductCoupon(_0x5f3eb6);
  if (!_0x32edbd) {
    return "";
  }
  const _0x5fa926 = _0x32edbd.type === "free_delivery" ? "🚚 ফ্রি ডেলিভারি" : _0x32edbd.type === "fixed" ? formatTaka(_0x32edbd.value) + " ছাড়" : _0x32edbd.value + "% ছাড়";
  return "\n    <div class=\"coupon-chip\" title=\"এই প্রোডাক্টে অফার আছে — কোড কপি করুন অথবা বাটনে চাপলেই কার্টে যোগ হয়ে ছাড় প্রয়োগ হয়ে যাবে\">\n      <div class=\"coupon-chip-top\">\n        <span class=\"coupon-chip-code\">🏷️ " + (_0x32edbd.label || "বিশেষ অফার") + "</span>\n        <span class=\"coupon-chip-discount\">" + _0x5fa926 + "</span>\n      </div>\n      <div class=\"coupon-code-row\">\n        <span class=\"coupon-code-mini\">" + _0x32edbd.code + "</span>\n        <button type=\"button\" class=\"coupon-copy-btn\" data-code=\"" + _0x32edbd.code + "\" data-pid=\"" + _0x5f3eb6 + "\">কপি করুন</button>\n      </div>\n    </div>";
}
async function applyProductCouponFromChip(_0x551a9e, _0xc27b39, _0x476f63) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(_0x551a9e);
    } catch (_0x47d33d) {}
  }
  if (couponInput) {
    couponInput.value = _0x551a9e;
  }
  const _0x370acd = _0x476f63 ? _0x476f63.textContent : "";
  if (_0x476f63) {
    _0x476f63.disabled = true;
    _0x476f63.textContent = "কপি হয়েছে ✓";
  }
  if (_0xc27b39 && !cart.some(_0x2201b9 => _0x2201b9.id === _0xc27b39)) {
    addToCart(_0xc27b39, null, 1);
  }
  const _0x106d5e = await validateCoupon(_0x551a9e, cart);
  if (_0x476f63) {
    setTimeout(() => {
      _0x476f63.disabled = false;
      _0x476f63.textContent = _0x370acd;
    }, 1200);
  }
  if (_0x106d5e.ok) {
    const _0x4765c1 = _0x106d5e.coupon;
    appliedCoupons = appliedCoupons.filter(_0x1195b9 => _0x1195b9.productId ? _0x1195b9.productId !== _0x4765c1.productId : !!_0x4765c1.productId);
    appliedCoupons.push(_0x4765c1);
    showSiteToast("কোড কপি হয়েছে ও \"" + (_0x4765c1.label || "অফার") + "\" প্রয়োগ হয়ে গেছে 🎉");
    renderCart();
    openCart();
  } else {
    showSiteToast("কোড কপি হয়েছে — " + (_0x106d5e.reason || "তবে এখন কুপনটি প্রয়োগ করা যাচ্ছে না।"));
  }
}
async function loadReviews() {
  const _0x1616d1 = getDb();
  if (!_0x1616d1) {
    return;
  }
  try {
    const _0xd3bc83 = await _0x1616d1.collection("reviews").get();
    REVIEWS = _0xd3bc83.docs.map(_0xf86d11 => ({
      id: _0xf86d11.id,
      ..._0xf86d11.data()
    })).sort((_0x9555d9, _0x332022) => (_0x332022.ts || 0) - (_0x9555d9.ts || 0));
  } catch (_0x2a10b5) {
    console.warn("রিভিউ লোড করা যায়নি:", _0x2a10b5.message);
  }
}
function getProductRating(_0x164ce5) {
  const _0x1b22d2 = REVIEWS.filter(_0x4674ab => _0x4674ab.productId === _0x164ce5);
  if (!_0x1b22d2.length) {
    return {
      avg: 0,
      count: 0
    };
  }
  const _0x3f2388 = _0x1b22d2.reduce((_0x4b381d, _0x4cf475) => _0x4b381d + (Number(_0x4cf475.rating) || 0), 0);
  return {
    avg: _0x3f2388 / _0x1b22d2.length,
    count: _0x1b22d2.length
  };
}
function starsHtml(_0xaf315b, _0x35d232) {
  const _0x5554c3 = Math.round(_0xaf315b);
  let _0x4ac9e3 = "";
  for (let _0x5ac82c = 1; _0x5ac82c <= 5; _0x5ac82c++) {
    _0x4ac9e3 += "<span class=\"star " + (_0x5ac82c <= _0x5554c3 ? "filled" : "") + "\" style=\"" + (_0x35d232 ? "font-size:" + _0x35d232 + "px;" : "") + "\">★</span>";
  }
  return _0x4ac9e3;
}
function ratingBadgeHtml(_0x265d8d) {
  const {
    avg: _0x55912e,
    count: _0x432792
  } = getProductRating(_0x265d8d);
  if (_0x432792 === 0) {
    return "";
  }
  return "<div class=\"rating-badge\"><span class=\"stars-mini\">" + starsHtml(_0x55912e) + "</span><span class=\"rating-num\">" + _0x55912e.toFixed(1) + " (" + _0x432792 + ")</span></div>";
}
async function loadLikes() {
  const _0x2102df = getDb();
  if (!_0x2102df) {
    return;
  }
  try {
    const _0x8b9d3 = await _0x2102df.collection("likes").get();
    LIKES = _0x8b9d3.docs.map(_0x25733c => ({
      id: _0x25733c.id,
      ..._0x25733c.data()
    }));
  } catch (_0x5a4e00) {
    console.warn("লাইক লোড করা যায়নি:", _0x5a4e00.message);
  }
}
function isLiked(_0x411168) {
  return likedProducts.includes(_0x411168);
}
function getLikeCount(_0x1845f0) {
  return LIKES.filter(_0x9cb115 => _0x9cb115.productId === _0x1845f0).length;
}
function saveLikedProducts() {
  localStorage.setItem("openshop_liked", JSON.stringify(likedProducts));
}
function likeSvg() {
  return "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M7 10v11M2 13v6a2 2 0 0 0 2 2h13.4a2 2 0 0 0 2-1.6l1.3-7A2 2 0 0 0 18.7 10H14V5a2 2 0 0 0-2-2l-3 7v11\"/></svg>";
}
function likeButtonHtml(_0x486d69) {
  const _0x355021 = isLiked(_0x486d69);
  const _0x158210 = getLikeCount(_0x486d69);
  return "<button class=\"like-btn " + (_0x355021 ? "active" : "") + "\" data-id=\"" + _0x486d69 + "\" " + (_0x355021 ? "disabled" : "") + ">" + likeSvg() + " <span>লাইক</span> <span class=\"like-count\">" + _0x158210 + "</span></button>";
}
function likeProduct(_0x49802d) {
  if (isLiked(_0x49802d)) {
    return;
  }
  likedProducts.push(_0x49802d);
  saveLikedProducts();
  LIKES.push({
    productId: _0x49802d,
    ts: Date.now()
  });
  document.querySelectorAll(".like-btn[data-id=\"" + _0x49802d + "\"]").forEach(_0x1e3caf => {
    _0x1e3caf.classList.add("active");
    _0x1e3caf.disabled = true;
    const _0x46adfa = _0x1e3caf.querySelector(".like-count");
    if (_0x46adfa) {
      _0x46adfa.textContent = getLikeCount(_0x49802d);
    }
  });
  const _0x5b288f = getDb();
  if (_0x5b288f) {
    _0x5b288f.collection("likes").add({
      productId: _0x49802d,
      ts: Date.now()
    }).catch(() => {});
  }
}
const SITE_LIKE_BASE = 435;
async function loadSiteLikesCount() {
  const _0x12ea17 = localStorage.getItem("openshop_site_likes_count_cache");
  if (_0x12ea17 !== null) {
    SITE_LIKES_COUNT = parseInt(_0x12ea17, 10) || 0;
  }
  const _0xfe79e9 = getDb();
  if (!_0xfe79e9) {
    return;
  }
  try {
    const _0xef1b85 = await _0xfe79e9.collection("siteLikes").get();
    SITE_LIKES_COUNT = _0xef1b85.size;
    localStorage.setItem("openshop_site_likes_count_cache", String(SITE_LIKES_COUNT));
  } catch (_0x55cb73) {
    console.warn("সাইট লাইক কাউন্ট লোড করা যায়নি (ক্যাশ করা সংখ্যা দেখানো হচ্ছে):", _0x55cb73.message);
  }
}
function getSiteLikeCount() {
  return SITE_LIKE_BASE + SITE_LIKES_COUNT;
}
function isSiteLiked() {
  return localStorage.getItem("openshop_site_liked") === "1";
}
function renderSiteLikeUI() {
  const _0x3a0eca = getSiteLikeCount();
  const _0x2b8f89 = isSiteLiked();
  const _0x50932b = document.getElementById("siteLikeCount");
  if (_0x50932b) {
    bumpBadge(_0x50932b, _0x3a0eca);
  }
  const _0x4b5f76 = document.getElementById("siteLikeBtn");
  if (_0x4b5f76) {
    _0x4b5f76.classList.toggle("site-liked", _0x2b8f89);
  }
}
function toggleSiteLike() {
  if (isSiteLiked()) {
    return;
  }
  localStorage.setItem("openshop_site_liked", "1");
  SITE_LIKES_COUNT += 1;
  renderSiteLikeUI();
  showSiteToast("ওয়েবসাইটটি লাইক করার জন্য ধন্যবাদ! 👍");
  const _0x4eadbb = getDb();
  if (_0x4eadbb) {
    _0x4eadbb.collection("siteLikes").add({
      ts: Date.now()
    }).catch(() => {});
  }
}
const utilShareBtn = document.getElementById("utilShareSite");
if (utilShareBtn) {
  utilShareBtn.addEventListener("click", async () => {
    const _0x259325 = {
      title: document.title,
      text: "Openshop-এ ভালো দামে পছন্দের সব প্রোডাক্ট পাবেন — দেখে আসুন!",
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(_0x259325);
      } catch (_0x2f711b) {}
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(_0x259325.url).then(() => {
        showSiteToast("ওয়েবসাইটের লিংক কপি হয়েছে! এখন যেকোনো জায়গায় পেস্ট করে শেয়ার করুন 🔗");
      });
    } else {
      showSiteToast(_0x259325.url);
    }
  });
}
const utilLikeBtn = document.getElementById("siteLikeBtn");
if (utilLikeBtn) {
  utilLikeBtn.addEventListener("click", _0x14edcf => {
    _0x14edcf.preventDefault();
    toggleSiteLike();
  });
}
function syncWhatsappLinks() {
  const _0x1f7dd3 = window.WHATSAPP_NUMBER_OVERRIDE || WHATSAPP_NUMBER;
  const _0x4c82af = document.getElementById("waFloat");
  if (_0x4c82af) {
    _0x4c82af.href = "https://wa.me/" + _0x1f7dd3;
  }
  const _0x3167a5 = document.getElementById("footerWhatsapp");
  if (_0x3167a5) {
    _0x3167a5.href = "https://wa.me/" + _0x1f7dd3;
  }
}
function syncMessengerLinks() {
  const _0xc13b01 = window.MESSENGER_PAGE_ID_OVERRIDE || (typeof MESSENGER_PAGE_ID !== "undefined" ? MESSENGER_PAGE_ID : "");
  if (!_0xc13b01) {
    return;
  }
  const _0x47f745 = document.getElementById("messengerFloat");
  if (_0x47f745) {
    _0x47f745.href = "https://m.me/" + _0xc13b01;
  }
  const _0x1cb3b3 = document.getElementById("footerMessenger");
  if (_0x1cb3b3) {
    _0x1cb3b3.href = "https://m.me/" + _0xc13b01;
  }
  const _0x4ea56d = "https://www.facebook.com/" + _0xc13b01;
  const _0x12150c = document.getElementById("utilFacebookPage");
  if (_0x12150c) {
    _0x12150c.href = _0x4ea56d;
  }
  const _0x2735cd = document.getElementById("utilCustomerCare");
  if (_0x2735cd) {
    _0x2735cd.href = "https://m.me/" + _0xc13b01;
    _0x2735cd.target = "_blank";
    _0x2735cd.rel = "noopener";
  }
}
async function loadSiteSettings() {
  syncWhatsappLinks();
  syncMessengerLinks();
  const _0xf1cffd = getDb();
  let _0x1e0f2c = null;
  const _0x987ccf = localStorage.getItem("openshop_site_settings_cache");
  const _0x4dbf3c = _0x987ccf ? JSON.parse(_0x987ccf) : null;
  if (_0xf1cffd) {
    try {
      const _0xa3d283 = await _0xf1cffd.collection("settings").doc("main").get();
      if (_0xa3d283.exists) {
        _0x1e0f2c = _0xa3d283.data();
        localStorage.setItem("openshop_site_settings_cache", JSON.stringify(_0x1e0f2c));
      }
    } catch (_0x3eace3) {
      console.warn("সাইট সেটিংস লোড করা যায়নি (ক্যাশ করা তথ্য দেখানো হচ্ছে):", _0x3eace3.message);
    }
  }
  if (!_0x1e0f2c) {
    _0x1e0f2c = _0x4dbf3c;
  }
  if (!_0x1e0f2c) {
    return;
  }
  try {
    if (_0x1e0f2c.coverImage) {
      const _0x2b0519 = document.getElementById("heroSlideBg0");
      if (_0x2b0519) {
        _0x2b0519.style.backgroundImage = "url('" + _0x1e0f2c.coverImage + "')";
      }
    }
    if (_0x1e0f2c.logoImage) {
      const _0x47c3f1 = document.getElementById("headerLogo");
      if (_0x47c3f1) {
        _0x47c3f1.src = _0x1e0f2c.logoImage;
      }
    }
    if (_0x1e0f2c.heroEyebrow) {
      document.getElementById("heroEyebrow").textContent = _0x1e0f2c.heroEyebrow;
    }
    if (_0x1e0f2c.heroTitle) {
      document.getElementById("heroTitle").innerHTML = _0x1e0f2c.heroTitle;
    }
    if (_0x1e0f2c.heroDesc) {
      document.getElementById("heroDesc").textContent = _0x1e0f2c.heroDesc;
    }
    if (_0x1e0f2c.address) {
      document.getElementById("footerAddress").textContent = _0x1e0f2c.address;
    }
    if (_0x1e0f2c.phone) {
      const _0x103277 = document.getElementById("footerPhone");
      if (_0x103277) {
        _0x103277.textContent = _0x1e0f2c.phone;
        _0x103277.href = "tel:+" + _0x1e0f2c.phone.replace(/\D/g, "");
      }
    }
    if (_0x1e0f2c.email) {
      const _0x1acdfd = document.getElementById("footerEmail");
      if (_0x1acdfd) {
        _0x1acdfd.textContent = _0x1e0f2c.email;
        _0x1acdfd.href = "mailto:" + _0x1e0f2c.email;
      }
    }
    if (_0x1e0f2c.facebookLink) {
      const _0x489d3e = document.getElementById("fbLink");
      if (_0x489d3e) {
        _0x489d3e.href = _0x1e0f2c.facebookLink;
      }
    }
    if (_0x1e0f2c.whatsapp) {
      window.WHATSAPP_NUMBER_OVERRIDE = _0x1e0f2c.whatsapp.replace(/\D/g, "");
    }
    if (_0x1e0f2c.messengerId) {
      window.MESSENGER_PAGE_ID_OVERRIDE = _0x1e0f2c.messengerId.trim();
    }
    syncWhatsappLinks();
    syncMessengerLinks();
    if (_0x1e0f2c.siteName && _0x1e0f2c.siteName.trim()) {
      const _0x3152b5 = document.getElementById("brandNameHeader");
      const _0x554e2e = document.getElementById("brandNameFooter");
      if (_0x3152b5) {
        _0x3152b5.textContent = _0x1e0f2c.siteName;
      }
      if (_0x554e2e) {
        _0x554e2e.textContent = _0x1e0f2c.siteName;
      }
      document.title = document.title.replace(/^[^|]+/, _0x1e0f2c.siteName + " ");
    }
    const _0x25414d = {
      sLogoSize: "--logo-size",
      sContainerWidth: "--container-width",
      sCardRadius: "--radius",
      sBtnRadius: "--btn-radius",
      sHeroPad: "--hero-extra-pad",
      sBodyFontSize: "--body-font-size",
      sProductNameSize: "--product-name-size",
      sPriceSize: "--price-size",
      sSectionTitleSize: "--section-title-size"
    };
    const _0x607545 = document.documentElement.style;
    Object.keys(_0x25414d).forEach(_0x26c428 => {
      if (_0x1e0f2c[_0x26c428] !== undefined && _0x1e0f2c[_0x26c428] !== null && _0x1e0f2c[_0x26c428] !== "") {
        _0x607545.setProperty(_0x25414d[_0x26c428], _0x1e0f2c[_0x26c428] + "px");
      }
    });
    const _0x2b6af9 = {
      brandTagline: "brandTagline",
      footerTagline: "footerTagline",
      navProducts: "navProducts",
      navCategories: "navCategories",
      navAbout: "navAbout",
      navContact: "navContact",
      trustBar1: "trustBar1",
      trustBar2: "trustBar2",
      trustBar3: "trustBar3",
      productsTitle: "productsTitle",
      productsDesc: "productsDesc",
      emptyStateText: "emptyState",
      aboutTitle: "aboutTitle",
      about1Title: "about1Title",
      about1Desc: "about1Desc",
      about2Title: "about2Title",
      about2Desc: "about2Desc",
      about3Title: "about3Title",
      about3Desc: "about3Desc",
      footerContactTitle: "footerContactTitle",
      footerHoursTitle: "footerHoursTitle",
      footerHoursText: "footerHoursText",
      footerHotline: "footerHotline",
      copyrightText: "copyrightText",
      cartTitle: "cartTitle",
      cartNote: "cartNote",
      checkoutBtnText: "checkoutBtn",
      orderConfirmTitle: "orderConfirmTitle",
      orderConfirmDesc: "orderConfirmDesc",
      bnHome: "bnHome",
      bnCategories: "bnCategories",
      bnSearch: "bnSearch",
      bnCart: "bnCart",
      bnProfile: "bnProfile"
    };
    Object.keys(_0x2b6af9).forEach(_0x7ada48 => {
      if (_0x1e0f2c[_0x7ada48] && _0x1e0f2c[_0x7ada48].trim()) {
        const _0x209b25 = document.getElementById(_0x2b6af9[_0x7ada48]);
        if (_0x209b25) {
          _0x209b25.textContent = _0x1e0f2c[_0x7ada48];
        }
      }
    });
    if (_0x1e0f2c.searchPlaceholder && _0x1e0f2c.searchPlaceholder.trim() && searchInput) {
      searchInput.placeholder = _0x1e0f2c.searchPlaceholder;
    }
    if (_0x1e0f2c.primaryColor || _0x1e0f2c.accentColor || _0x1e0f2c.backgroundColor || _0x1e0f2c.textColor || _0x1e0f2c.headerBg || _0x1e0f2c.footerBg) {
      const _0x276a83 = document.documentElement.style;
      if (_0x1e0f2c.primaryColor) {
        _0x276a83.setProperty("--teal", _0x1e0f2c.primaryColor);
        _0x276a83.setProperty("--teal-dark", _0x1e0f2c.primaryColor);
      }
      if (_0x1e0f2c.accentColor) {
        _0x276a83.setProperty("--amber", _0x1e0f2c.accentColor);
        _0x276a83.setProperty("--coral", _0x1e0f2c.accentColor);
      }
      if (_0x1e0f2c.backgroundColor) {
        _0x276a83.setProperty("--cream", _0x1e0f2c.backgroundColor);
      }
      if (_0x1e0f2c.textColor) {
        _0x276a83.setProperty("--ink", _0x1e0f2c.textColor);
      }
      if (_0x1e0f2c.headerBg) {
        _0x276a83.setProperty("--header-bg", _0x1e0f2c.headerBg);
      }
      if (_0x1e0f2c.footerBg) {
        _0x276a83.setProperty("--footer-bg", _0x1e0f2c.footerBg);
      }
    }
    if (_0x1e0f2c.fontFamily && _0x1e0f2c.fontFamily.trim()) {
      document.documentElement.style.setProperty("--font-body", "'" + _0x1e0f2c.fontFamily + "', sans-serif");
    }
    const _0x147e34 = document.getElementById("top");
    if (_0x147e34) {
      _0x147e34.classList.toggle("hidden", _0x1e0f2c.showHero === false);
    }
    const _0x4d7221 = document.getElementById("trustBarWrap");
    if (_0x4d7221) {
      _0x4d7221.classList.toggle("hidden", _0x1e0f2c.showTrustBar === false);
    }
    const _0x123ef6 = document.getElementById("about");
    if (_0x123ef6) {
      _0x123ef6.classList.toggle("hidden", _0x1e0f2c.showAbout === false);
    }
    if (Array.isArray(_0x1e0f2c.mainCategories) && _0x1e0f2c.mainCategories.length) {
      MAIN_CATEGORIES = _0x1e0f2c.mainCategories;
    }
    const _0x2f2866 = document.getElementById("offerBanner");
    if (_0x2f2866) {
      if (_0x1e0f2c.offerBannerText && _0x1e0f2c.offerBannerText.trim()) {
        _0x2f2866.textContent = _0x1e0f2c.offerBannerText;
        _0x2f2866.classList.remove("hidden");
      } else {
        _0x2f2866.classList.add("hidden");
      }
    }
  } catch (_0x39139d) {
    console.warn("সাইট সেটিংস লোড করা যায়নি:", _0x39139d.message);
  }
}
function logEvent(_0x469751, _0x5e0e8b) {
  const _0x6529a3 = getDb();
  if (!_0x6529a3) {
    return;
  }
  _0x6529a3.collection("events").add({
    type: _0x469751,
    ..._0x5e0e8b,
    ts: Date.now(),
    day: new Date().toISOString().slice(0, 10)
  }).catch(() => {});
}
let visitorLocation = null;
function saveLocationCache(_0x33a2d5) {
  try {
    localStorage.setItem("openshop_geo_cache", JSON.stringify({
      ..._0x33a2d5,
      ts: Date.now()
    }));
  } catch (_0x45843d) {}
}
function loadLocationCache() {
  try {
    const _0xd2f5c = localStorage.getItem("openshop_geo_cache");
    if (!_0xd2f5c) {
      return null;
    }
    const _0xe3b5b4 = JSON.parse(_0xd2f5c);
    if (!_0xe3b5b4.ts || Date.now() - _0xe3b5b4.ts > 21600000) {
      return null;
    }
    return _0xe3b5b4;
  } catch (_0x3d6f3e) {
    return null;
  }
}
async function reverseGeocode(_0x2d0f97, _0x1b905e) {
  try {
    const _0x2fb9f4 = await fetch("https://nominatim.openstreetmap.org/reverse?format=json&lat=" + _0x2d0f97 + "&lon=" + _0x1b905e + "&zoom=16&addressdetails=1", {
      headers: {
        "Accept-Language": "bn,en"
      }
    });
    if (!_0x2fb9f4.ok) {
      return null;
    }
    const _0x22ab29 = await _0x2fb9f4.json();
    if (_0x22ab29 && _0x22ab29.display_name) {
      return _0x22ab29.display_name;
    } else {
      return null;
    }
  } catch (_0x25b272) {
    return null;
  }
}
function captureVisitorLocation(_0x2eb10c, _0x324f90) {
  if (!("geolocation" in navigator)) {
    if (_0x324f90) {
      _0x324f90("no-geolocation");
    }
    return;
  }
  const _0x195af8 = loadLocationCache();
  if (_0x195af8) {
    visitorLocation = _0x195af8;
    if (_0x2eb10c) {
      _0x2eb10c(visitorLocation);
    }
    return;
  }
  navigator.geolocation.getCurrentPosition(async _0x5a9e33 => {
    const _0x2dfb06 = _0x5a9e33.coords.latitude;
    const _0x2eed37 = _0x5a9e33.coords.longitude;
    const _0x3e3574 = _0x5a9e33.coords.accuracy;
    const _0x2d8b32 = "https://www.google.com/maps?q=" + _0x2dfb06 + "," + _0x2eed37;
    const _0x5ec069 = await reverseGeocode(_0x2dfb06, _0x2eed37);
    visitorLocation = {
      lat: _0x2dfb06,
      lng: _0x2eed37,
      accuracy: _0x3e3574,
      mapsUrl: _0x2d8b32,
      address: _0x5ec069
    };
    saveLocationCache(visitorLocation);
    logEvent("visitor_location", {
      lat: _0x2dfb06,
      lng: _0x2eed37,
      accuracy: _0x3e3574,
      mapsUrl: _0x2d8b32,
      address: _0x5ec069 || null
    });
    if (_0x2eb10c) {
      _0x2eb10c(visitorLocation);
    }
  }, _0x1816ed => {
    if (_0x324f90) {
      _0x324f90(_0x1816ed && _0x1816ed.code === 1 ? "denied" : "error");
    }
  }, {
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 21600000
  });
}
const catPills = document.getElementById("catPills");
const productGrid = document.getElementById("productGrid");
const productModal = document.getElementById("productModal");
const modalContent = document.getElementById("modalContent");
const modalClose = document.getElementById("modalClose");
const cartBtn = document.getElementById("cartBtn");
function flyToCart(_0x98e5ab) {
  if (!_0x98e5ab || !cartBtn) {
    return;
  }
  const _0x5177e8 = _0x98e5ab.getBoundingClientRect();
  const _0x3c1f08 = cartBtn.getBoundingClientRect();
  if (!_0x5177e8.width || !_0x3c1f08.width) {
    return;
  }
  const _0x1f7c4e = _0x98e5ab.cloneNode(true);
  _0x1f7c4e.removeAttribute("id");
  _0x1f7c4e.className = "fly-to-cart-clone";
  Object.assign(_0x1f7c4e.style, {
    position: "fixed",
    left: _0x5177e8.left + "px",
    top: _0x5177e8.top + "px",
    width: _0x5177e8.width + "px",
    height: _0x5177e8.height + "px",
    margin: "0"
  });
  document.body.appendChild(_0x1f7c4e);
  const _0x45c3bd = _0x3c1f08.left + _0x3c1f08.width / 2 - (_0x5177e8.left + _0x5177e8.width / 2);
  const _0x2741bc = _0x3c1f08.top + _0x3c1f08.height / 2 - (_0x5177e8.top + _0x5177e8.height / 2);
  requestAnimationFrame(() => {
    _0x1f7c4e.style.transform = "translate(" + _0x45c3bd + "px, " + _0x2741bc + "px) scale(0.12) rotate(18deg)";
    _0x1f7c4e.style.opacity = "0.25";
  });
  const _0x2175a9 = () => {
    if (_0x1f7c4e.parentNode) {
      _0x1f7c4e.remove();
    }
    cartBtn.classList.add("cart-bump");
    setTimeout(() => cartBtn.classList.remove("cart-bump"), 500);
  };
  _0x1f7c4e.addEventListener("transitionend", _0x2175a9, {
    once: true
  });
  setTimeout(_0x2175a9, 1150);
}
document.addEventListener("click", _0x197fc4 => {
  const _0x3c8906 = _0x197fc4.target.closest(".btn, .add-btn, .buy-now-btn, .coupon-copy-btn, .icon-btn, .qty-btn, .cat-pill, .hero-dot");
  if (!_0x3c8906 || _0x3c8906.disabled) {
    return;
  }
  const _0x139f3c = _0x3c8906.classList.contains("icon-btn") ? _0x3c8906.querySelector(".icon-btn-clip") || _0x3c8906 : _0x3c8906;
  const _0x13593e = _0x139f3c.getBoundingClientRect();
  const _0xaab6e1 = Math.max(_0x13593e.width, _0x13593e.height) * 1.4;
  const _0x1315e4 = document.createElement("span");
  _0x1315e4.className = "ripple-effect";
  _0x1315e4.style.width = _0x1315e4.style.height = _0xaab6e1 + "px";
  _0x1315e4.style.left = _0x197fc4.clientX - _0x13593e.left - _0xaab6e1 / 2 + "px";
  _0x1315e4.style.top = _0x197fc4.clientY - _0x13593e.top - _0xaab6e1 / 2 + "px";
  _0x139f3c.appendChild(_0x1315e4);
  setTimeout(() => _0x1315e4.remove(), 600);
});
const revealObserver = "IntersectionObserver" in window ? new IntersectionObserver(_0x146bc9 => {
  _0x146bc9.forEach(_0x575296 => {
    if (_0x575296.isIntersecting) {
      _0x575296.target.classList.add("revealed");
      revealObserver.unobserve(_0x575296.target);
    }
  });
}, {
  threshold: 0.12,
  rootMargin: "0px 0px -40px 0px"
}) : null;
function markReveal(_0x262779, _0x483c7) {
  if (!revealObserver) {
    _0x262779.forEach(_0x244e65 => _0x244e65.classList.add("reveal-on-scroll", "revealed"));
    return;
  }
  _0x262779.forEach((_0x2dc403, _0x20a9d3) => {
    _0x2dc403.classList.add("reveal-on-scroll");
    if (_0x483c7) {
      _0x2dc403.style.transitionDelay = _0x20a9d3 % 10 * _0x483c7 + "s";
    }
    revealObserver.observe(_0x2dc403);
  });
}
const topStickyGroup = document.querySelector(".top-sticky-group");
if (topStickyGroup) {
  window.addEventListener("scroll", () => {
    topStickyGroup.classList.toggle("is-scrolled", window.scrollY > 8);
  }, {
    passive: true
  });
}
function popNumberChange(_0x231eaf) {
  if (!_0x231eaf) {
    return;
  }
  _0x231eaf.classList.remove("count-pop");
  _0x231eaf.offsetWidth;
  _0x231eaf.classList.add("count-pop");
}
function fireConfetti() {
  const _0x18578f = ["#0F6E5D", "#FF7A59", "#F6C453", "#4C7BD9", "#E2136E"];
  const _0x41d0ab = 26;
  for (let _0x4328b7 = 0; _0x4328b7 < _0x41d0ab; _0x4328b7++) {
    const _0x235bbd = document.createElement("span");
    _0x235bbd.className = "confetti-piece";
    const _0x4cfdee = 6 + Math.random() * 6;
    _0x235bbd.style.width = _0x4cfdee + "px";
    _0x235bbd.style.height = _0x4cfdee * 0.4 + "px";
    _0x235bbd.style.left = Math.random() * 100 + "vw";
    _0x235bbd.style.background = _0x18578f[_0x4328b7 % _0x18578f.length];
    _0x235bbd.style.setProperty("--rot", (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360) + "deg");
    _0x235bbd.style.animationDuration = 1.4 + Math.random() * 1.1 + "s";
    _0x235bbd.style.animationDelay = Math.random() * 0.25 + "s";
    document.body.appendChild(_0x235bbd);
    setTimeout(() => _0x235bbd.remove(), 3000);
  }
}
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const cartClose = document.getElementById("cartClose");
const cartItemsEl = document.getElementById("cartItems");
const cartCountEl = document.getElementById("cartCount");
const cartSubtotalEl = document.getElementById("cartSubtotal");
const checkoutBtn = document.getElementById("checkoutBtn");
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
const searchInput = document.getElementById("searchInput");
document.getElementById("year").textContent = new Date().getFullYear();
let searchDebounceTimer = null;
const searchClearBtn = document.getElementById("searchClearBtn");
const searchSuggestEl = document.getElementById("searchSuggest");
searchInput.addEventListener("input", () => {
  if (searchClearBtn) {
    searchClearBtn.classList.toggle("hidden", !searchInput.value);
  }
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    searchQuery = searchInput.value;
    renderProducts();
    renderSearchSuggestions(searchQuery);
  }, 180);
});
searchInput.addEventListener("focus", () => {
  if (searchInput.value.trim()) {
    renderSearchSuggestions(searchInput.value);
  } else {
    renderTrendingSearches();
  }
});
if (searchClearBtn) {
  searchClearBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    searchClearBtn.classList.add("hidden");
    renderProducts();
    hideSearchSuggestions();
    searchInput.focus();
  });
}
function hideSearchSuggestions() {
  if (searchSuggestEl) {
    searchSuggestEl.classList.add("hidden");
  }
}
function renderSearchSuggestions(_0x507c08) {
  if (!searchSuggestEl) {
    return;
  }
  const _0x25189d = (_0x507c08 || "").trim().toLowerCase();
  if (!_0x25189d) {
    hideSearchSuggestions();
    return;
  }
  const _0x428ba4 = PRODUCTS.filter(_0x21772b => (_0x21772b.name || "").toLowerCase().includes(_0x25189d) || (_0x21772b.category || "").toLowerCase().includes(_0x25189d) || (_0x21772b.description || "").toLowerCase().includes(_0x25189d));
  if (!_0x428ba4.length) {
    searchSuggestEl.innerHTML = "<p class=\"search-suggest-empty\">\"" + _0x25189d + "\" এর জন্য কোনো প্রোডাক্ট পাওয়া যায়নি</p>";
    searchSuggestEl.classList.remove("hidden");
    return;
  }
  const _0x2466e3 = _0x428ba4.slice(0, 6);
  searchSuggestEl.innerHTML = _0x2466e3.map(_0x41e158 => "\n    <div class=\"search-suggest-item\" data-id=\"" + _0x41e158.id + "\">\n      <img src=\"" + getFirstImage(_0x41e158) + "\" alt=\"" + _0x41e158.name + "\" " + imgFallbackAttr() + ">\n      <div class=\"search-suggest-info\">\n        <span class=\"search-suggest-name\">" + _0x41e158.name + "</span>\n        <span class=\"search-suggest-price\">" + formatTaka(_0x41e158.price) + "</span>\n      </div>\n    </div>\n  ").join("") + (_0x428ba4.length > _0x2466e3.length ? "<button type=\"button\" class=\"search-suggest-more\" id=\"searchSuggestMore\">সব " + _0x428ba4.length + "টি ফলাফল দেখুন</button>" : "");
  searchSuggestEl.querySelectorAll(".search-suggest-item").forEach(_0x5c70c4 => {
    _0x5c70c4.addEventListener("click", () => {
      hideSearchSuggestions();
      openModal(_0x5c70c4.dataset.id);
    });
  });
  const _0x3ca30c = document.getElementById("searchSuggestMore");
  if (_0x3ca30c) {
    _0x3ca30c.addEventListener("click", () => {
      hideSearchSuggestions();
      document.getElementById("products").scrollIntoView({
        behavior: "smooth"
      });
    });
  }
  searchSuggestEl.classList.remove("hidden");
}
document.addEventListener("click", _0x38939a => {
  if (!_0x38939a.target.closest(".search-wrap")) {
    hideSearchSuggestions();
  }
});
document.addEventListener("keydown", _0x50b0bc => {
  if (_0x50b0bc.key === "Escape") {
    hideSearchSuggestions();
  }
});
const sortSelect = document.getElementById("sortSelect");
if (sortSelect) {
  sortSelect.addEventListener("change", () => {
    sortOrder = sortSelect.value;
    renderProducts();
  });
}
const filterToggleBtn = document.getElementById("filterToggleBtn");
const filterPanel = document.getElementById("filterPanel");
if (filterToggleBtn && filterPanel) {
  filterToggleBtn.addEventListener("click", () => filterPanel.classList.toggle("open"));
}
const minPriceInput = document.getElementById("minPriceInput");
const maxPriceInput = document.getElementById("maxPriceInput");
const ratingFilterSelect = document.getElementById("ratingFilterSelect");
const applyFilterBtn = document.getElementById("applyFilterBtn");
const clearFilterBtn = document.getElementById("clearFilterBtn");
if (applyFilterBtn) {
  applyFilterBtn.addEventListener("click", () => {
    minPriceFilter = minPriceInput.value ? Number(minPriceInput.value) : null;
    maxPriceFilter = maxPriceInput.value ? Number(maxPriceInput.value) : null;
    minRatingFilter = ratingFilterSelect ? Number(ratingFilterSelect.value) : 0;
    renderProducts();
  });
}
if (clearFilterBtn) {
  clearFilterBtn.addEventListener("click", () => {
    if (minPriceInput) {
      minPriceInput.value = "";
    }
    if (maxPriceInput) {
      maxPriceInput.value = "";
    }
    if (ratingFilterSelect) {
      ratingFilterSelect.value = "0";
    }
    minPriceFilter = null;
    maxPriceFilter = null;
    minRatingFilter = 0;
    renderProducts();
  });
}
const PLACEHOLDER_IMG = "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' fill='#eef3f0'/><path d='M55 130l30-38 22 26 20-24 30 36H55z' fill='#c7d6cf'/><circle cx='75' cy='75' r='14' fill='#c7d6cf'/></svg>");
function formatTaka(_0x4618a6) {
  return "৳ " + _0x4618a6.toLocaleString("en-BD");
}
const DELIVERY_CHARGE = 150;
function saveCart() {
  localStorage.setItem("openshop_cart", JSON.stringify(cart));
  renderCartCount();
}
function getFirstImage(_0x15c1da) {
  if (_0x15c1da.images && _0x15c1da.images.length) {
    return _0x15c1da.images[0];
  } else {
    return _0x15c1da.image || PLACEHOLDER_IMG;
  }
}
function getAllImages(_0x477c70) {
  const _0xae9534 = _0x477c70.images && _0x477c70.images.length ? _0x477c70.images : _0x477c70.image ? [_0x477c70.image] : [];
  if (_0xae9534.length) {
    return _0xae9534;
  } else {
    return [PLACEHOLDER_IMG];
  }
}
function imgFallbackAttr() {
  return "onerror=\"this.onerror=null;this.src='" + PLACEHOLDER_IMG + "'\"";
}
function isOutOfStock(_0x41aeb0) {
  return _0x41aeb0.stock !== undefined && _0x41aeb0.stock !== null && _0x41aeb0.stock !== "" && Number(_0x41aeb0.stock) <= 0;
}
function isLowStock(_0x469100) {
  return _0x469100.stock !== undefined && _0x469100.stock !== null && _0x469100.stock !== "" && Number(_0x469100.stock) > 0 && Number(_0x469100.stock) <= 5;
}
function saveWishlist() {
  localStorage.setItem("openshop_wishlist", JSON.stringify(wishlist));
  renderWishlistCount();
}
function isWished(_0x3c962a) {
  return wishlist.includes(_0x3c962a);
}
function toggleWishlist(_0x14d0f5) {
  if (isWished(_0x14d0f5)) {
    wishlist = wishlist.filter(_0x26512e => _0x26512e !== _0x14d0f5);
  } else {
    wishlist.push(_0x14d0f5);
  }
  saveWishlist();
  const _0x2c3d14 = isWished(_0x14d0f5);
  document.querySelectorAll(".wish-heart[data-id=\"" + _0x14d0f5 + "\"]").forEach(_0x2690aa => {
    _0x2690aa.classList.toggle("active", _0x2c3d14);
    if (_0x2c3d14) {
      heartPopBurst(_0x2690aa);
    }
  });
}
function heartPopBurst(_0x4d276a) {
  _0x4d276a.classList.remove("pop");
  _0x4d276a.offsetWidth;
  _0x4d276a.classList.add("pop");
  const _0x1f3cc0 = _0x4d276a.getBoundingClientRect();
  const _0x3cff16 = _0x1f3cc0.left + _0x1f3cc0.width / 2;
  const _0x52f2d7 = _0x1f3cc0.top + _0x1f3cc0.height / 2;
  const _0x584428 = ["❤️", "💗", "✨"];
  for (let _0x5beb1e = 0; _0x5beb1e < 5; _0x5beb1e++) {
    const _0x124bad = document.createElement("span");
    _0x124bad.className = "heart-particle";
    _0x124bad.textContent = _0x584428[_0x5beb1e % _0x584428.length];
    _0x124bad.style.left = _0x3cff16 + "px";
    _0x124bad.style.top = _0x52f2d7 + "px";
    const _0x4df457 = (Math.random() * 100 - 50) * (Math.PI / 180);
    const _0x34f4a1 = 34 + Math.random() * 22;
    _0x124bad.style.setProperty("--hx", Math.sin(_0x4df457) * _0x34f4a1 + "px");
    _0x124bad.style.setProperty("--hy", -Math.cos(_0x4df457) * _0x34f4a1 - 20 + "px");
    _0x124bad.style.animationDelay = _0x5beb1e * 0.03 + "s";
    document.body.appendChild(_0x124bad);
    setTimeout(() => _0x124bad.remove(), 750);
  }
}
function renderWishlistCount() {
  const _0x522f91 = document.getElementById("wishlistCount");
  if (!_0x522f91) {
    return;
  }
  bumpBadge(_0x522f91, wishlist.length);
  _0x522f91.classList.toggle("hidden", wishlist.length === 0);
}
function heartSvg() {
  return "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M12 20s-7.5-4.6-9.8-9.1C.6 7.6 2 4 5.6 4c2 0 3.4 1.1 4.4 2.6C11 5.1 12.4 4 14.4 4 18 4 19.4 7.6 21.8 10.9 19.5 15.4 12 20 12 20z\"/></svg>";
}
function renderWishlistDrawer() {
  const _0x262f7a = document.getElementById("wishlistItems");
  if (!_0x262f7a) {
    return;
  }
  const _0xd545dd = wishlist.map(_0x4af582 => PRODUCTS.find(_0x20da39 => _0x20da39.id === _0x4af582)).filter(Boolean);
  if (_0xd545dd.length === 0) {
    _0x262f7a.innerHTML = "<div class=\"empty-cart\">আপনার পছন্দের তালিকা খালি<br>প্রোডাক্টের ❤️ আইকনে ক্লিক করে যোগ করুন</div>";
    return;
  }
  _0x262f7a.innerHTML = _0xd545dd.map(_0x4a7146 => "\n    <div class=\"cart-item\">\n      <img src=\"" + getFirstImage(_0x4a7146) + "\" alt=\"" + _0x4a7146.name + "\" " + imgFallbackAttr() + ">\n      <div class=\"cart-item-info\">\n        <h4>" + _0x4a7146.name + "</h4>\n        <div class=\"cart-item-meta\">" + formatTaka(_0x4a7146.price) + "</div>\n        <div class=\"qty-row\">\n          <button class=\"btn btn-primary\" data-openid=\"" + _0x4a7146.id + "\" style=\"padding:5px 12px; font-size:11px;\">দেখুন</button>\n          <button class=\"remove-btn\" data-removeid=\"" + _0x4a7146.id + "\">সরান</button>\n        </div>\n      </div>\n    </div>\n  ").join("");
  _0x262f7a.querySelectorAll("[data-openid]").forEach(_0x32b5d4 => _0x32b5d4.addEventListener("click", () => {
    closeWishlist();
    openModal(_0x32b5d4.dataset.openid);
  }));
  _0x262f7a.querySelectorAll("[data-removeid]").forEach(_0x25dc7c => _0x25dc7c.addEventListener("click", () => {
    toggleWishlist(_0x25dc7c.dataset.removeid);
    renderWishlistDrawer();
  }));
}
const wishlistDrawer = document.getElementById("wishlistDrawer");
const wishlistBtn = document.getElementById("wishlistBtn");
const wishlistClose = document.getElementById("wishlistClose");
function openWishlist() {
  renderWishlistDrawer();
  wishlistDrawer.classList.add("open");
  cartOverlay.classList.add("open");
  updateBodyScrollLock();
}
function closeWishlist() {
  wishlistDrawer.classList.remove("open");
  cartOverlay.classList.remove("open");
  updateBodyScrollLock();
}
if (wishlistBtn) {
  wishlistBtn.addEventListener("click", openWishlist);
}
if (wishlistClose) {
  wishlistClose.addEventListener("click", closeWishlist);
}
function applyDarkMode(_0xc869d3) {
  document.body.classList.toggle("dark-mode", _0xc869d3);
  const _0x2b0148 = document.getElementById("darkModeToggle");
  if (_0x2b0148) {
    _0x2b0148.classList.toggle("active", _0xc869d3);
  }
  localStorage.setItem("openshop_dark_mode", _0xc869d3 ? "1" : "0");
}
const darkModeToggle = document.getElementById("darkModeToggle");
if (darkModeToggle) {
  darkModeToggle.addEventListener("click", () => applyDarkMode(!document.body.classList.contains("dark-mode")));
}
function renderCategories() {
  renderMainCategories();
  renderSubCategories();
}
function renderMainCategories() {
  const _0x24dfc3 = document.getElementById("mainCatPills");
  if (!_0x24dfc3) {
    return;
  }
  const _0x2ff443 = ["<button class=\"main-cat-card " + (activeMainCategory === "সব" ? "active" : "") + "\" data-main=\"সব\">\n       <span class=\"main-cat-icon\">🛍️</span><span class=\"main-cat-label\">সব</span>\n     </button>", ...MAIN_CATEGORIES.map(_0x276750 => "\n      <button class=\"main-cat-card " + (activeMainCategory === _0x276750.value ? "active" : "") + "\" data-main=\"" + _0x276750.value + "\">\n        <span class=\"main-cat-icon\">" + _0x276750.icon + "</span><span class=\"main-cat-label\">" + _0x276750.label + "</span>\n      </button>")];
  _0x24dfc3.innerHTML = _0x2ff443.join("");
  _0x24dfc3.querySelectorAll(".main-cat-card").forEach(_0x32995e => {
    _0x32995e.addEventListener("click", () => {
      activeMainCategory = _0x32995e.dataset.main;
      activeCategory = "সব";
      renderCategories();
      renderProducts();
    });
  });
}
function renderSubCategories() {
  const _0x213fba = document.getElementById("subCatWrap");
  const _0x5d6916 = document.getElementById("catPills");
  if (!_0x213fba || !_0x5d6916) {
    return;
  }
  if (activeMainCategory === "সব") {
    _0x213fba.classList.add("hidden");
    _0x5d6916.innerHTML = "";
    return;
  }
  const _0x5aeb63 = PRODUCTS.filter(_0x33633d => _0x33633d.mainCategory === activeMainCategory);
  const _0x2d5bb5 = [...new Set(_0x5aeb63.map(_0x53af4f => _0x53af4f.category).filter(Boolean))];
  if (_0x2d5bb5.length === 0) {
    _0x213fba.classList.add("hidden");
    _0x5d6916.innerHTML = "";
    return;
  }
  _0x213fba.classList.remove("hidden");
  _0x5d6916.innerHTML = _0x2d5bb5.map(_0x40a996 => "<button class=\"cat-pill " + (_0x40a996 === activeCategory ? "active" : "") + "\" data-cat=\"" + _0x40a996 + "\">" + _0x40a996 + "</button>").join("");
  _0x5d6916.querySelectorAll(".cat-pill").forEach(_0x1cfb48 => {
    _0x1cfb48.addEventListener("click", () => {
      activeCategory = _0x1cfb48.dataset.cat;
      renderSubCategories();
      renderProducts();
    });
  });
}
function sortProducts(_0x230b74) {
  const _0x4c5fab = [..._0x230b74];
  if (sortOrder === "price_asc") {
    _0x4c5fab.sort((_0x3f096, _0x28b691) => (_0x3f096.price || 0) - (_0x28b691.price || 0));
  } else if (sortOrder === "price_desc") {
    _0x4c5fab.sort((_0x345d1a, _0x515b4d) => (_0x515b4d.price || 0) - (_0x345d1a.price || 0));
  } else if (sortOrder === "name_asc") {
    _0x4c5fab.sort((_0x374da9, _0x10d1f1) => (_0x374da9.name || "").localeCompare(_0x10d1f1.name || "", "bn"));
  }
  return _0x4c5fab;
}
let heroSlideTimer = null;
let heroSlideIndex = 0;
function initHeroSlider() {
  const _0x2e9a64 = document.getElementById("heroSlider");
  const _0x2f3075 = document.getElementById("heroDots");
  if (!_0x2e9a64) {
    return;
  }
  _0x2e9a64.querySelectorAll(".hero-slide[data-generated]").forEach(_0x53e0e8 => _0x53e0e8.remove());
  const _0x34f8f8 = PRODUCTS.filter(_0x1673f5 => _0x1673f5.oldPrice && Number(_0x1673f5.oldPrice) > Number(_0x1673f5.price)).slice(0, 3);
  _0x34f8f8.forEach(_0x7b1ce5 => {
    const _0x2c142b = Math.round((1 - _0x7b1ce5.price / _0x7b1ce5.oldPrice) * 100);
    const _0x3f1eb3 = document.createElement("div");
    _0x3f1eb3.className = "hero-slide";
    _0x3f1eb3.setAttribute("data-generated", "1");
    _0x3f1eb3.innerHTML = "\n      <div class=\"hero-slide-bg\" style=\"background-image:url('" + getFirstImage(_0x7b1ce5) + "')\"></div>\n      <div class=\"hero-overlay\" aria-hidden=\"true\"></div>\n      <div class=\"container hero-inner\">\n        <p class=\"eyebrow\">🔥 সীমিত সময়ের অফার — " + _0x2c142b + "% ছাড়</p>\n        <h1>" + _0x7b1ce5.name + "</h1>\n        <p class=\"hero-desc\">এখন মাত্র " + formatTaka(_0x7b1ce5.price) + " <span style=\"text-decoration:line-through; opacity:.7; font-size:.85em;\">" + formatTaka(_0x7b1ce5.oldPrice) + "</span> — স্টক ফুরানোর আগেই অর্ডার করুন।</p>\n        <div class=\"hero-cta\">\n          <button type=\"button\" class=\"btn btn-primary hero-shop-btn\" data-pid=\"" + _0x7b1ce5.id + "\">এখনই দেখুন</button>\n          <a href=\"#products\" class=\"btn btn-ghost\">সব প্রোডাক্ট</a>\n        </div>\n      </div>\n    ";
    _0x2e9a64.appendChild(_0x3f1eb3);
  });
  const _0x1bc634 = _0x2e9a64.querySelectorAll(".hero-slide");
  clearInterval(heroSlideTimer);
  heroSlideTimer = null;
  heroSlideIndex = 0;
  if (_0x2f3075) {
    _0x2f3075.innerHTML = "";
  }
  _0x1bc634.forEach((_0x293acb, _0x57419c) => _0x293acb.classList.toggle("active", _0x57419c === 0));
  if (_0x1bc634.length <= 1) {
    if (_0x2f3075) {
      _0x2f3075.classList.add("hidden");
    }
    return;
  }
  _0x2e9a64.querySelectorAll(".hero-shop-btn").forEach(_0x4ec11d => {
    _0x4ec11d.addEventListener("click", _0x4ac790 => {
      _0x4ac790.preventDefault();
      openModal(_0x4ec11d.dataset.pid);
    });
  });
  if (_0x2f3075) {
    _0x2f3075.classList.remove("hidden");
    _0x2f3075.innerHTML = Array.from(_0x1bc634).map((_0x510794, _0x23b13e) => "<button type=\"button\" class=\"hero-dot " + (_0x23b13e === 0 ? "active" : "") + "\" data-idx=\"" + _0x23b13e + "\" aria-label=\"স্লাইড " + (_0x23b13e + 1) + "\"></button>").join("");
    _0x2f3075.querySelectorAll(".hero-dot").forEach(_0x19c7c8 => {
      _0x19c7c8.addEventListener("click", () => goToHeroSlide(Number(_0x19c7c8.dataset.idx)));
    });
  }
  heroSlideTimer = setInterval(() => goToHeroSlide((heroSlideIndex + 1) % _0x1bc634.length), 5000);
}
function goToHeroSlide(_0x1d3ded) {
  const _0x5e7c8c = document.getElementById("heroSlider");
  const _0x5e01fb = document.getElementById("heroDots");
  if (!_0x5e7c8c) {
    return;
  }
  const _0x1b43df = _0x5e7c8c.querySelectorAll(".hero-slide");
  if (!_0x1b43df.length) {
    return;
  }
  _0x1b43df.forEach((_0x523f75, _0x1f7187) => _0x523f75.classList.toggle("active", _0x1f7187 === _0x1d3ded));
  if (_0x5e01fb) {
    _0x5e01fb.querySelectorAll(".hero-dot").forEach((_0x3bd8f9, _0x3f3286) => _0x3bd8f9.classList.toggle("active", _0x3f3286 === _0x1d3ded));
  }
  heroSlideIndex = _0x1d3ded;
  if (heroSlideTimer) {
    clearInterval(heroSlideTimer);
    heroSlideTimer = setInterval(() => goToHeroSlide((heroSlideIndex + 1) % _0x1b43df.length), 5000);
  }
}
/* ===== Flash Sale (Daraz-style discounted items + countdown) ===== */
let flashCountdownTimer = null;
function renderFlashSale() {
  const _fsSection = document.getElementById("flashSaleSection");
  const _fsScroll = document.getElementById("flashSaleScroll");
  if (!_fsSection || !_fsScroll) return;
  const _fsItems = PRODUCTS.filter(_p => _p.oldPrice && Number(_p.oldPrice) > Number(_p.price))
    .sort((_a, _b) => (1 - _a.price / _a.oldPrice) < (1 - _b.price / _b.oldPrice) ? 1 : -1)
    .slice(0, 10);
  if (!_fsItems.length) {
    _fsSection.classList.add("hidden");
    return;
  }
  _fsSection.classList.remove("hidden");
  _fsScroll.innerHTML = _fsItems.map(_p => {
    const _disc = Math.round((1 - _p.price / _p.oldPrice) * 100);
    return "\n    <div class=\"flash-card\" data-id=\"" + _p.id + "\">\n      <span class=\"flash-badge\">-" + _disc + "%</span>\n      <img src=\"" + getFirstImage(_p) + "\" alt=\"" + _p.name + "\" loading=\"lazy\" " + imgFallbackAttr() + ">\n      <span class=\"flash-name\">" + _p.name + "</span>\n      <div class=\"flash-price-row\">\n        <span class=\"flash-price-now\">" + formatTaka(_p.price) + "</span>\n        <span class=\"flash-price-old\">" + formatTaka(_p.oldPrice) + "</span>\n      </div>\n    </div>\n  ";
  }).join("");
  _fsScroll.querySelectorAll(".flash-card").forEach(_card => {
    _card.addEventListener("click", () => openModal(_card.dataset.id));
  });
  startFlashCountdown();
}
function startFlashCountdown() {
  if (flashCountdownTimer) return;
  const _cdH = document.getElementById("cdHours");
  const _cdM = document.getElementById("cdMinutes");
  const _cdS = document.getElementById("cdSeconds");
  if (!_cdH || !_cdM || !_cdS) return;
  const _pad = _n => String(_n).padStart(2, "0");
  const _tick = () => {
    const _now = new Date();
    const _midnight = new Date(_now);
    _midnight.setHours(24, 0, 0, 0);
    const _diff = Math.max(0, _midnight - _now);
    const _h = Math.floor(_diff / 3600000);
    const _m = Math.floor(_diff % 3600000 / 60000);
    const _s = Math.floor(_diff % 60000 / 1000);
    _cdH.textContent = _pad(_h);
    _cdM.textContent = _pad(_m);
    _cdS.textContent = _pad(_s);
  };
  _tick();
  flashCountdownTimer = setInterval(_tick, 1000);
}

/* ===== Voucher strip (Daraz-style coupon carousel on homepage) ===== */
function renderVoucherStrip() {
  const _vsSection = document.getElementById("voucherStripSection");
  const _vsScroll = document.getElementById("voucherStripScroll");
  if (!_vsSection || !_vsScroll) return;
  if (!COUPONS || !COUPONS.length) {
    _vsSection.classList.add("hidden");
    return;
  }
  const _today = new Date().toISOString().slice(0, 10);
  const _active = COUPONS.filter(_c => _c.active !== false && (!_c.expiry || _c.expiry >= _today)).slice(0, 8);
  if (!_active.length) {
    _vsSection.classList.add("hidden");
    return;
  }
  _vsSection.classList.remove("hidden");
  _vsScroll.innerHTML = _active.map(_c => {
    const _valueText = _c.type === "free_delivery" ? "ফ্রি\nডেলিভারি" : _c.type === "fixed" ? formatTaka(_c.value) : _c.value + "%";
    const _hasProduct = !!_c.productId && PRODUCTS.some(_p => _p.id === _c.productId);
    return "\n    <div class=\"voucher-card" + (_hasProduct ? " voucher-card-clickable" : "") + "\" " + (_hasProduct ? "data-pid=\"" + _c.productId + "\" role=\"button\" tabindex=\"0\"" : "") + " title=\"" + (_hasProduct ? "প্রোডাক্টটি দেখতে ট্যাপ করুন" : "") + "\">\n      <div class=\"voucher-card-value\">" + _valueText + " ছাড়</div>\n      <div class=\"voucher-card-body\">\n        <span class=\"voucher-card-label\">" + (_c.label || "বিশেষ অফার") + "</span>\n        " + (_c.minOrder ? "<span class=\"voucher-card-min\">সর্বনিম্ন " + formatTaka(_c.minOrder) + "</span>" : "") + "\n        <button type=\"button\" class=\"voucher-card-copy\" data-code=\"" + _c.code + "\">কোড: " + _c.code + " (কপি করুন)</button>\n      </div>\n    </div>\n  ";
  }).join("");
  _vsScroll.querySelectorAll(".voucher-card-copy").forEach(_btn => {
    _btn.addEventListener("click", _evt => {
      _evt.stopPropagation();
      const _code = _btn.dataset.code;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(_code).catch(() => {});
      }
      showSiteToast("কুপন কোড \"" + _code + "\" কপি হয়েছে", "🏷️");
    });
  });
  _vsScroll.querySelectorAll(".voucher-card-clickable").forEach(_card => {
    _card.addEventListener("click", () => openModal(_card.dataset.pid));
    _card.addEventListener("keydown", _evt => {
      if (_evt.key === "Enter" || _evt.key === " ") {
        _evt.preventDefault();
        openModal(_card.dataset.pid);
      }
    });
  });
}

/* ===== Recently viewed products ===== */
function trackRecentlyViewed(_id) {
  try {
    let _list = JSON.parse(localStorage.getItem("openshop_recent") || "[]");
    _list = _list.filter(_x => _x !== _id);
    _list.unshift(_id);
    _list = _list.slice(0, 12);
    localStorage.setItem("openshop_recent", JSON.stringify(_list));
  } catch (_e) {}
}
function renderRecentlyViewed() {
  const _rvSection = document.getElementById("recentlyViewedSection");
  const _rvScroll = document.getElementById("recentlyViewedScroll");
  if (!_rvSection || !_rvScroll) return;
  let _list = [];
  try {
    _list = JSON.parse(localStorage.getItem("openshop_recent") || "[]");
  } catch (_e) {}
  const _items = _list.map(_id => PRODUCTS.find(_p => _p.id === _id)).filter(Boolean).slice(0, 10);
  if (!_items.length) {
    _rvSection.classList.add("hidden");
    return;
  }
  _rvSection.classList.remove("hidden");
  _rvScroll.innerHTML = _items.map(_p => "\n    <div class=\"related-card\" data-relid=\"" + _p.id + "\">\n      <img src=\"" + getFirstImage(_p) + "\" alt=\"" + _p.name + "\" loading=\"lazy\" " + imgFallbackAttr() + ">\n      <span class=\"r-name\">" + _p.name + "</span>\n      <span class=\"r-price\">" + formatTaka(_p.price) + "</span>\n    </div>\n  ").join("");
  _rvScroll.querySelectorAll(".related-card").forEach(_card => {
    _card.addEventListener("click", () => openModal(_card.dataset.relid));
  });
}

/* ===== Search trending chips (shown when search box is focused & empty) ===== */
const TRENDING_SEARCHES = ["শাড়ি", "পাঞ্জাবি", "জুতা", "মোবাইল এক্সেসরিজ", "হোম ডেকর", "কসমেটিক্স"];
function renderTrendingSearches() {
  if (!searchSuggestEl) return;
  const _today = new Date().toISOString().slice(0, 10);
  const _productChips = (COUPONS || [])
    .filter(_c => _c.productId && _c.active !== false && (!_c.expiry || _c.expiry >= _today))
    .map(_c => ({ c: _c, p: PRODUCTS.find(_p => _p.id === _c.productId) }))
    .filter(_x => !!_x.p)
    .slice(0, 4);
  const _termChips = TRENDING_SEARCHES.slice(0, Math.max(3, 6 - _productChips.length));
  const _productChipsHtml = _productChips.map(_x => "<button type=\"button\" class=\"search-trending-chip search-trending-chip-product\" data-pid=\"" + _x.p.id + "\" title=\"" + _x.p.name + " — এই প্রোডাক্টে অফার আছে\">🏷️ " + _x.p.name + "</button>").join("");
  const _termChipsHtml = _termChips.map(_t => "<button type=\"button\" class=\"search-trending-chip\" data-term=\"" + _t + "\">" + _t + "</button>").join("");
  searchSuggestEl.innerHTML = "<p class=\"search-trending-title\">🔥 জনপ্রিয় সার্চ</p><div class=\"search-trending-chips\">" + _productChipsHtml + _termChipsHtml + "</div>";
  searchSuggestEl.querySelectorAll(".search-trending-chip-product").forEach(_chip => {
    _chip.addEventListener("click", () => {
      hideSearchSuggestions();
      openModal(_chip.dataset.pid);
    });
  });
  searchSuggestEl.querySelectorAll(".search-trending-chip").forEach(_chip => {
    if (_chip.classList.contains("search-trending-chip-product")) return;
    _chip.addEventListener("click", () => {
      searchInput.value = _chip.dataset.term;
      searchQuery = _chip.dataset.term;
      if (searchClearBtn) searchClearBtn.classList.remove("hidden");
      renderProducts();
      hideSearchSuggestions();
      document.getElementById("products").scrollIntoView({
        behavior: "smooth"
      });
    });
  });
  searchSuggestEl.classList.remove("hidden");
}

function brandTagHtml(_p) {
  return _p.brand ? "<span class=\"brand-tag\">" + _p.brand + "</span>" : "";
}
function freeDeliveryBadgeHtml(_p) {
  return _p.freeDelivery ? "<span class=\"free-delivery-tag\">🚚 ফ্রি ডেলিভারি</span>" : "";
}
function renderProducts() {
  let _0x3ca87b = PRODUCTS;
  if (activeMainCategory !== "সব") {
    _0x3ca87b = _0x3ca87b.filter(_0x180e9d => _0x180e9d.mainCategory === activeMainCategory);
  }
  if (activeCategory !== "সব") {
    _0x3ca87b = _0x3ca87b.filter(_0x13fc9e => _0x13fc9e.category === activeCategory);
  }
  if (searchQuery.trim()) {
    const _0x3de9c5 = searchQuery.trim().toLowerCase();
    _0x3ca87b = _0x3ca87b.filter(_0x34a060 => (_0x34a060.name || "").toLowerCase().includes(_0x3de9c5) || (_0x34a060.category || "").toLowerCase().includes(_0x3de9c5) || (_0x34a060.description || "").toLowerCase().includes(_0x3de9c5));
  }
  if (minPriceFilter !== null) {
    _0x3ca87b = _0x3ca87b.filter(_0x1e0b5f => (_0x1e0b5f.price || 0) >= minPriceFilter);
  }
  if (maxPriceFilter !== null) {
    _0x3ca87b = _0x3ca87b.filter(_0xf8a94 => (_0xf8a94.price || 0) <= maxPriceFilter);
  }
  if (minRatingFilter > 0) {
    _0x3ca87b = _0x3ca87b.filter(_0x311dfe => getProductRating(_0x311dfe.id).avg >= minRatingFilter);
  }
  _0x3ca87b = sortProducts(_0x3ca87b);
  const _0x499c93 = document.getElementById("emptyState");
  if (_0x3ca87b.length === 0) {
    productGrid.innerHTML = "";
    if (_0x499c93) {
      _0x499c93.classList.remove("hidden");
    }
    return;
  }
  if (_0x499c93) {
    _0x499c93.classList.add("hidden");
  }
  productGrid.innerHTML = _0x3ca87b.map(_0x35a1aa => {
    const _0x5ca910 = getAllImages(_0x35a1aa);
    const _0x4202ef = _0x5ca910.length > 1;
    const _0x48ca62 = isOutOfStock(_0x35a1aa);
    return "\n    <div class=\"product-card\" data-id=\"" + _0x35a1aa.id + "\">\n      <div class=\"product-thumb\">\n        " + (_0x35a1aa.oldPrice ? "<span class=\"product-badge\">-" + Math.round((1 - _0x35a1aa.price / _0x35a1aa.oldPrice) * 100) + "% অফার</span>" : "") + "\n        <button class=\"wish-heart " + (isWished(_0x35a1aa.id) ? "active" : "") + "\" data-id=\"" + _0x35a1aa.id + "\" aria-label=\"পছন্দের তালিকায় যোগ করুন\">" + heartSvg() + "</button>\n        <img src=\"" + _0x5ca910[0] + "\" alt=\"" + _0x35a1aa.name + "\" loading=\"lazy\" " + imgFallbackAttr() + ">\n        " + (_0x4202ef ? "<img src=\"" + _0x5ca910[1] + "\" alt=\"" + _0x35a1aa.name + " আরও ছবি\" class=\"thumb-img-alt\" loading=\"lazy\" " + imgFallbackAttr() + ">" : "") + "\n        " + (_0x4202ef ? "\n          <span class=\"photo-count-badge\">\n            <svg viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M4 5h2l1.5-2h9L18 5h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z\"/></svg>\n            " + _0x5ca910.length + "\n          </span>" : "") + "\n        " + (_0x48ca62 ? "<div class=\"stock-badge\">স্টকে নেই</div>" : "") + "\n        " + (_0x35a1aa.freeDelivery ? "<span class=\"free-delivery-corner\">🚚 ফ্রি</span>" : "") + "\n      </div>\n      <div class=\"product-body\">\n        <span class=\"product-cat\">" + _0x35a1aa.category + "</span>" + brandTagHtml(_0x35a1aa) + "\n        <div class=\"product-name-row\">\n          <span class=\"product-name\">" + _0x35a1aa.name + "</span>\n          <button type=\"button\" class=\"review-tag\" data-id=\"" + _0x35a1aa.id + "\">✍️ রিভিউ দিন</button>\n        </div>\n        " + ratingBadgeHtml(_0x35a1aa.id) + "\n        <div class=\"product-price\">\n          <span class=\"price-now\">" + formatTaka(_0x35a1aa.price) + "</span>\n          " + (_0x35a1aa.oldPrice ? "<span class=\"price-old\">" + formatTaka(_0x35a1aa.oldPrice) + "</span>" : "") + "\n        </div>\n        " + (isLowStock(_0x35a1aa) ? "<span class=\"low-stock-note\">মাত্র " + _0x35a1aa.stock + "টি বাকি আছে!</span>" : "") + "\n        " + couponChipHtml(_0x35a1aa.id) + "\n        <div class=\"card-actions\">\n          <button class=\"buy-now-btn " + (_0x48ca62 ? "out-of-stock" : "") + "\" data-id=\"" + _0x35a1aa.id + "\" " + (_0x48ca62 ? "disabled" : "") + ">" + (_0x48ca62 ? "স্টকে নেই" : "এখনই কিনুন") + "</button>\n          <button class=\"add-btn " + (_0x48ca62 ? "out-of-stock" : "") + "\" data-id=\"" + _0x35a1aa.id + "\" " + (_0x48ca62 ? "disabled" : "") + ">" + (_0x48ca62 ? "স্টকে নেই" : "কার্টে যোগ") + "</button>\n        </div>\n      </div>\n    </div>\n  ";
  }).join("");
  markReveal(productGrid.querySelectorAll(".product-card"), 0.05);
  productGrid.querySelectorAll(".product-thumb, .product-name").forEach(_0x5a3fa6 => {
    _0x5a3fa6.addEventListener("click", _0x2d3c7a => {
      if (_0x2d3c7a.target.closest(".wish-heart")) {
        return;
      }
      const _0x175c60 = _0x2d3c7a.target.closest(".product-card").dataset.id;
      openModal(_0x175c60);
    });
  });
  productGrid.querySelectorAll(".review-tag").forEach(_0x158931 => {
    _0x158931.addEventListener("click", _0x5aa9dc => {
      _0x5aa9dc.stopPropagation();
      openModal(_0x158931.dataset.id, {
        scrollToReview: true
      });
    });
  });
  productGrid.querySelectorAll(".coupon-copy-btn").forEach(_0x49a21d => {
    _0x49a21d.addEventListener("click", _0x4973f0 => {
      _0x4973f0.stopPropagation();
      applyProductCouponFromChip(_0x49a21d.dataset.code, _0x49a21d.dataset.pid, _0x49a21d);
    });
  });
  productGrid.querySelectorAll(".add-btn").forEach(_0x352ddd => {
    _0x352ddd.addEventListener("click", _0x413a38 => {
      _0x413a38.stopPropagation();
      if (_0x352ddd.disabled) {
        return;
      }
      const _0x25b3a9 = _0x352ddd.closest(".product-card").querySelector(".product-thumb img");
      flyToCart(_0x25b3a9);
      addToCart(_0x352ddd.dataset.id, null, 1);
    });
  });
  productGrid.querySelectorAll(".buy-now-btn").forEach(_0x47085c => {
    _0x47085c.addEventListener("click", _0x134dcd => {
      _0x134dcd.stopPropagation();
      if (_0x47085c.disabled) {
        return;
      }
      const _0x365236 = _0x47085c.closest(".product-card").querySelector(".product-thumb img");
      flyToCart(_0x365236);
      addToCart(_0x47085c.dataset.id, null, 1);
      openCart();
    });
  });
  productGrid.querySelectorAll(".wish-heart").forEach(_0x56db1b => {
    _0x56db1b.addEventListener("click", _0x1523d0 => {
      _0x1523d0.stopPropagation();
      toggleWishlist(_0x56db1b.dataset.id);
    });
  });
}
function shareSvg() {
  return "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><circle cx=\"18\" cy=\"5\" r=\"2.5\"/><circle cx=\"6\" cy=\"12\" r=\"2.5\"/><circle cx=\"18\" cy=\"19\" r=\"2.5\"/><path d=\"M8.2 10.7 15.8 6.3M8.2 13.3l7.6 4.4\"/></svg>";
}
function waSvg() {
  return "<svg viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.1c-.24.68-1.4 1.32-1.93 1.4-.5.08-1.13.11-1.82-.12-.42-.14-.96-.32-1.65-.62-2.9-1.25-4.8-4.16-4.94-4.35-.15-.19-1.18-1.57-1.18-2.99 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.78-.36l.55.01c.18.01.42-.07.65.5.24.58.82 2 .89 2.15.07.15.12.32.02.51-.1.19-.15.32-.29.49-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.25 1.62 2.02 1.12 1 2.06 1.31 2.35 1.46.29.15.46.13.63-.08.17-.2.72-.84.92-1.13.19-.29.39-.24.65-.14.27.1 1.68.79 1.97.94.29.14.48.21.55.33.07.13.07.72-.17 1.39z\"/></svg>";
}
function relatedProductsHtml(_0x51021a) {
  const _0x1c891a = PRODUCTS.filter(_0x143fc1 => _0x143fc1.id !== _0x51021a.id && _0x143fc1.category === _0x51021a.category).slice(0, 6);
  if (_0x1c891a.length === 0) {
    return "";
  }
  return "\n    <div class=\"related-products\">\n      <h3>এগুলোও দেখতে পারেন</h3>\n      <div class=\"related-grid\">\n        " + _0x1c891a.map(_0x23fe53 => "\n          <div class=\"related-card\" data-relid=\"" + _0x23fe53.id + "\">\n            <img src=\"" + getFirstImage(_0x23fe53) + "\" alt=\"" + _0x23fe53.name + "\" loading=\"lazy\" " + imgFallbackAttr() + ">\n            <span class=\"r-name\">" + _0x23fe53.name + "</span>\n            <span class=\"r-price\">" + formatTaka(_0x23fe53.price) + "</span>\n          </div>\n        ").join("") + "\n      </div>\n    </div>\n  ";
}
function reviewCardHtml(_0x557f98) {
  const _0xbdf206 = _0x557f98.ts ? new Date(_0x557f98.ts).toLocaleDateString("bn-BD") : "";
  return "\n    <div class=\"review-card\">\n      <div class=\"review-card-head\">\n        <b>" + (_0x557f98.name || "যাচাইকৃত ক্রেতা").replace(/</g, "&lt;") + "</b>\n        <span class=\"stars-mini\">" + starsHtml(_0x557f98.rating) + "</span>\n      </div>\n      " + (_0x557f98.comment ? "<p>" + _0x557f98.comment.replace(/</g, "&lt;") + "</p>" : "") + "\n      <span class=\"review-date\">" + _0xbdf206 + "</span>\n    </div>";
}
function reviewsSectionHtml(_0x46f5c7) {
  const _0x220735 = REVIEWS.filter(_0x411f8c => _0x411f8c.productId === _0x46f5c7.id);
  const {
    avg: _0x2c9fe8,
    count: _0x55a236
  } = getProductRating(_0x46f5c7.id);
  return "\n    <div class=\"reviews-section\">\n      <h3>কাস্টমার রিভিউ " + (_0x55a236 ? "(" + _0x2c9fe8.toFixed(1) + " ★ — " + _0x55a236 + "টি রিভিউ)" : "") + "</h3>\n      <div class=\"reviews-list\" id=\"reviewsList\">\n        " + (_0x55a236 ? _0x220735.map(reviewCardHtml).join("") : "<p class=\"reviews-empty\">এখনো কোনো রিভিউ নেই — প্রথম রিভিউটা আপনিই দিন!</p>") + "\n      </div>\n      <div class=\"review-form\">\n        <strong style=\"font-size:13px;\">আপনার রিভিউ দিন</strong>\n        <div class=\"star-picker\" id=\"starPicker\" data-value=\"0\">\n          " + [1, 2, 3, 4, 5].map(_0x4e8edb => "<span class=\"star-pick\" data-star=\"" + _0x4e8edb + "\">★</span>").join("") + "\n        </div>\n        <input type=\"text\" id=\"reviewName\" placeholder=\"আপনার নাম (ঐচ্ছিক)\" class=\"lead-input\">\n        <textarea id=\"reviewComment\" placeholder=\"প্রোডাক্ট নিয়ে আপনার মতামত লিখুন (ঐচ্ছিক)\"></textarea>\n        <button type=\"button\" class=\"btn btn-outline\" id=\"submitReviewBtn\" data-pid=\"" + _0x46f5c7.id + "\">রিভিউ জমা দিন</button>\n        <p class=\"msg\" id=\"reviewMsg\"></p>\n      </div>\n    </div>";
}
async function submitReview(_0x41b295) {
  const _0x3bafe0 = document.getElementById("reviewMsg");
  const _0x126b40 = document.getElementById("starPicker");
  const _0x3717df = Number(_0x126b40 ? _0x126b40.dataset.value : 0);
  if (!_0x3717df) {
    _0x3bafe0.textContent = "অনুগ্রহ করে একটা রেটিং (স্টার) বাছাই করুন।";
    _0x3bafe0.className = "msg error";
    return;
  }
  const _0x43b315 = document.getElementById("reviewName").value.trim();
  const _0x5ec521 = document.getElementById("reviewComment").value.trim();
  const _0x1a551c = getDb();
  if (!_0x1a551c) {
    _0x3bafe0.textContent = "রিভিউ সিস্টেম এখন উপলব্ধ নয়।";
    _0x3bafe0.className = "msg error";
    return;
  }
  const _0x232548 = document.getElementById("submitReviewBtn");
  _0x232548.disabled = true;
  _0x232548.textContent = "জমা হচ্ছে...";
  try {
    const _0x595837 = {
      productId: _0x41b295,
      name: _0x43b315 || null,
      rating: _0x3717df,
      comment: _0x5ec521 || null,
      ts: Date.now(),
      day: new Date().toISOString().slice(0, 10)
    };
    await _0x1a551c.collection("reviews").add(_0x595837);
    REVIEWS.unshift({
      id: "local-" + Date.now(),
      ..._0x595837
    });
    _0x3bafe0.textContent = "ধন্যবাদ! আপনার রিভিউ জমা হয়েছে।";
    _0x3bafe0.className = "msg ok";
    renderProducts();
    const _0x36f1b8 = PRODUCTS.find(_0x302893 => _0x302893.id === _0x41b295);
    if (_0x36f1b8) {
      openModal(_0x41b295);
    }
  } catch (_0x5e76c8) {
    _0x3bafe0.textContent = "রিভিউ জমা করা যায়নি: " + _0x5e76c8.message;
    _0x3bafe0.className = "msg error";
    _0x232548.disabled = false;
    _0x232548.textContent = "রিভিউ জমা দিন";
  }
}
function openModal(_0x5af9cc, _0x1b0636) {
  _0x1b0636 = _0x1b0636 || {};
  const _0xdbfbc6 = PRODUCTS.find(_0x6e352b => _0x6e352b.id === _0x5af9cc);
  if (!_0xdbfbc6) {
    return;
  }
  logEvent("product_view", {
    productId: _0x5af9cc,
    productName: _0xdbfbc6.name
  });
  trackRecentlyViewed(_0x5af9cc);
  if (_0x1b0636.updateUrl !== false) {
    const _0x52db0c = "#product-" + _0x5af9cc;
    if (window.location.hash !== _0x52db0c) {
      history.pushState({
        productId: _0x5af9cc
      }, "", window.location.pathname + window.location.search + _0x52db0c);
    }
  }
  selectedSize = _0xdbfbc6.sizes && _0xdbfbc6.sizes.length ? _0xdbfbc6.sizes[0] : null;
  const _0x3175cd = getAllImages(_0xdbfbc6);
  selectedImage = _0x3175cd[0];
  const _0x67b6c6 = isOutOfStock(_0xdbfbc6);
  modalContent.innerHTML = "\n    <div class=\"modal-content-inner\">\n    <div class=\"modal-gallery\">\n      <img src=\"" + _0x3175cd[0] + "\" alt=\"" + _0xdbfbc6.name + "\" id=\"modalMainImg\" " + imgFallbackAttr() + ">\n      " + (_0x3175cd.length > 1 ? "\n        <p class=\"modal-thumbs-hint\">যেই ছবিটা অর্ডার করবেন সেটাতে ট্যাপ করে বাছাই করুন:</p>\n        <div class=\"modal-thumbs\">\n          " + _0x3175cd.map((_0x4627b7, _0x12e3fd) => "<img src=\"" + _0x4627b7 + "\" class=\"" + (_0x12e3fd === 0 ? "active" : "") + "\" data-idx=\"" + _0x12e3fd + "\" alt=\"" + _0xdbfbc6.name + " ছবি " + (_0x12e3fd + 1) + "\" " + imgFallbackAttr() + ">").join("") + "\n        </div>" : "") + "\n    </div>\n    <div class=\"modal-info\">\n      <div style=\"display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;\">\n        <span class=\"product-cat\">" + _0xdbfbc6.category + "</span>" + brandTagHtml(_0xdbfbc6) + "\n        <div style=\"display:flex; gap:8px;\">\n          <button class=\"wish-heart " + (isWished(_0xdbfbc6.id) ? "active" : "") + "\" id=\"modalWishBtn\" data-id=\"" + _0xdbfbc6.id + "\">" + heartSvg() + " <span>পছন্দে যোগ করুন</span></button>\n        </div>\n      </div>\n      <h2>" + _0xdbfbc6.name + "</h2>\n      " + ratingBadgeHtml(_0xdbfbc6.id) + "\n      <div class=\"modal-action-row\">\n        <button class=\"share-btn\" id=\"modalShareBtn\">" + shareSvg() + " শেয়ার করুন</button>\n        " + likeButtonHtml(_0xdbfbc6.id) + "\n      </div>\n      <p>" + (_0xdbfbc6.description || "") + "</p>\n      <div class=\"product-price\">\n        <span class=\"price-now\">" + formatTaka(_0xdbfbc6.price) + "</span>\n        " + (_0xdbfbc6.oldPrice ? "<span class=\"price-old\">" + formatTaka(_0xdbfbc6.oldPrice) + "</span>" : "") + "\n      </div>\n      " + freeDeliveryBadgeHtml(_0xdbfbc6) + "\n      " + (_0x67b6c6 ? "<p style=\"color:var(--coral); font-weight:700; font-size:13px;\">এই প্রোডাক্টটি বর্তমানে স্টকে নেই।</p>" : "") + "\n      " + (isLowStock(_0xdbfbc6) ? "<p class=\"low-stock-note\">মাত্র " + _0xdbfbc6.stock + "টি বাকি আছে!</p>" : "") + "\n      " + couponChipHtml(_0xdbfbc6.id) + "\n      " + (_0xdbfbc6.sizes && _0xdbfbc6.sizes.length ? "\n        <div>\n          <strong style=\"font-size:13px;\">ভ্যারিয়েন্ট বাছাই করুন:</strong>\n          <div class=\"size-row\" id=\"sizeRow\">\n            " + _0xdbfbc6.sizes.map((_0x3514d8, _0x340088) => "<span class=\"size-chip " + (_0x340088 === 0 ? "selected" : "") + "\" data-size=\"" + _0x3514d8 + "\">" + _0x3514d8 + "</span>").join("") + "\n          </div>\n        </div>" : "") + "\n      <button class=\"buy-now-btn modal-buy-now-btn btn-block\" id=\"modalBuyNowBtn\" " + (_0x67b6c6 ? "disabled" : "") + " style=\"width:100%; padding:13px;\">" + (_0x67b6c6 ? "স্টকে নেই" : "এখনই কিনুন") + "</button>\n      <button class=\"btn btn-primary btn-block\" id=\"modalAddBtn\" " + (_0x67b6c6 ? "disabled" : "") + " style=\"margin-top:8px;\">" + (_0x67b6c6 ? "স্টকে নেই" : "কার্টে যোগ করুন") + "</button>\n    </div>\n    </div>\n    " + relatedProductsHtml(_0xdbfbc6) + "\n    " + reviewsSectionHtml(_0xdbfbc6) + "\n  ";
  productModal.classList.add("open");
  updateBodyScrollLock();
  const _0x3f0864 = document.getElementById("modalMainImg");
  document.querySelectorAll(".modal-thumbs img").forEach(_0x453876 => {
    _0x453876.addEventListener("click", () => {
      _0x3f0864.src = _0x453876.src;
      selectedImage = _0x3175cd[Number(_0x453876.dataset.idx)] || _0x453876.src;
      document.querySelectorAll(".modal-thumbs img").forEach(_0x1b2c19 => _0x1b2c19.classList.remove("active"));
      _0x453876.classList.add("active");
    });
  });
  const _0x279eff = document.getElementById("sizeRow");
  if (_0x279eff) {
    _0x279eff.querySelectorAll(".size-chip").forEach(_0x3484b5 => {
      _0x3484b5.addEventListener("click", () => {
        _0x279eff.querySelectorAll(".size-chip").forEach(_0x4512b8 => _0x4512b8.classList.remove("selected"));
        _0x3484b5.classList.add("selected");
        selectedSize = _0x3484b5.dataset.size;
      });
    });
  }
  const _0x4156cd = document.getElementById("modalAddBtn");
  if (_0x4156cd) {
    _0x4156cd.addEventListener("click", () => {
      if (_0x4156cd.disabled) {
        return;
      }
      flyToCart(document.getElementById("modalMainImg"));
      addToCart(_0x5af9cc, selectedSize, 1, selectedImage);
      showSiteToast("কার্টে যোগ করা হয়েছে ✅");
    });
  }
  const _0x17d122 = document.getElementById("modalBuyNowBtn");
  if (_0x17d122) {
    _0x17d122.addEventListener("click", () => {
      if (_0x17d122.disabled) {
        return;
      }
      flyToCart(document.getElementById("modalMainImg"));
      addToCart(_0x5af9cc, selectedSize, 1, selectedImage);
      closeModal();
      openCart();
    });
  }
  const _0x2f2524 = document.getElementById("modalWishBtn");
  modalContent.querySelectorAll(".coupon-copy-btn").forEach(_0x30303c => {
    _0x30303c.addEventListener("click", () => applyProductCouponFromChip(_0x30303c.dataset.code, _0x30303c.dataset.pid, _0x30303c));
  });
  if (_0x2f2524) {
    _0x2f2524.addEventListener("click", () => {
      toggleWishlist(_0x5af9cc);
      _0x2f2524.classList.toggle("active", isWished(_0x5af9cc));
    });
  }
  const _0x4ea94a = document.getElementById("modalShareBtn");
  if (_0x4ea94a) {
    _0x4ea94a.addEventListener("click", async () => {
      const _0x407205 = window.location.origin + window.location.pathname + "#product-" + _0x5af9cc;
      const _0x505663 = {
        title: _0xdbfbc6.name,
        text: _0xdbfbc6.name + " — " + formatTaka(_0xdbfbc6.price) + " — Openshop-এ দেখুন",
        url: _0x407205
      };
      if (navigator.share) {
        try {
          await navigator.share(_0x505663);
        } catch (_0xeed6dd) {}
      } else {
        try {
          await navigator.clipboard.writeText(_0x407205);
          showSiteToast("লিংক কপি হয়েছে!");
        } catch (_0x25f06c) {
          showSiteToast("লিংক কপি করা যায়নি।");
        }
      }
    });
  }
  const _0x7f58ff = modalContent.querySelector(".like-btn[data-id=\"" + _0x5af9cc + "\"]");
  if (_0x7f58ff) {
    _0x7f58ff.addEventListener("click", () => likeProduct(_0x5af9cc));
  }
  modalContent.querySelectorAll(".related-card").forEach(_0x24f5d9 => {
    _0x24f5d9.addEventListener("click", () => openModal(_0x24f5d9.dataset.relid));
  });
  const _0x4bc7e2 = document.getElementById("starPicker");
  if (_0x4bc7e2) {
    const _0x11f765 = _0x32bed3 => {
      _0x4bc7e2.querySelectorAll(".star-pick").forEach(_0x10a869 => _0x10a869.classList.toggle("selected", Number(_0x10a869.dataset.star) <= _0x32bed3));
    };
    _0x4bc7e2.querySelectorAll(".star-pick").forEach(_0x4a93ae => {
      _0x4a93ae.addEventListener("click", () => {
        _0x4bc7e2.dataset.value = _0x4a93ae.dataset.star;
        _0x11f765(Number(_0x4a93ae.dataset.star));
      });
    });
  }
  const _0x112488 = document.getElementById("submitReviewBtn");
  if (_0x112488) {
    _0x112488.addEventListener("click", () => submitReview(_0x112488.dataset.pid));
  }
  if (_0x1b0636.scrollToReview) {
    const _0x378035 = modalContent.querySelector(".review-form");
    if (_0x378035) {
      requestAnimationFrame(() => {
        _0x378035.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });
    }
  }
}
function updateBodyScrollLock() {
  const _0x2322fe = [productModal, orderConfirmModal, cartDrawer, profileDrawer, document.getElementById("couponsModal")].some(_0x279087 => _0x279087 && _0x279087.classList.contains("open"));
  document.body.style.overflow = _0x2322fe ? "hidden" : "";
}
function closeModal() {
  if ((window.location.hash || "").startsWith("#product-")) {
    history.back();
  } else {
    productModal.classList.remove("open");
    updateBodyScrollLock();
  }
}
modalClose.addEventListener("click", closeModal);
productModal.addEventListener("click", _0x661537 => {
  if (_0x661537.target === productModal) {
    closeModal();
  }
});
function addToCart(_0x401ae8, _0x2c9095, _0x54705d, _0x8f2c11) {
  const _0x17a3fe = PRODUCTS.find(_0x17ad9f => _0x17ad9f.id === _0x401ae8);
  if (!_0x17a3fe) {
    return;
  }
  if (isOutOfStock(_0x17a3fe)) {
    showSiteToast("দুঃখিত, এই প্রোডাক্টটি স্টকে নেই।");
    return;
  }
  const _0x9fc1a2 = _0x8f2c11 || getFirstImage(_0x17a3fe);
  const _0x32d692 = _0x401ae8 + "|" + (_0x2c9095 || "") + "|" + _0x9fc1a2;
  const _0x1cc00d = cart.find(_0x2c469b => _0x2c469b.key === _0x32d692);
  if (_0x1cc00d) {
    _0x1cc00d.qty += _0x54705d;
  } else {
    cart.push({
      key: _0x32d692,
      id: _0x401ae8,
      size: _0x2c9095,
      qty: _0x54705d,
      name: _0x17a3fe.name,
      price: _0x17a3fe.price,
      image: _0x9fc1a2
    });
  }
  saveCart();
  renderCart();
}
function updateQty(_0x1b58dd, _0x20eba4) {
  const _0x4a9d68 = cart.find(_0x5b41c2 => _0x5b41c2.key === _0x1b58dd);
  if (!_0x4a9d68) {
    return;
  }
  _0x4a9d68.qty += _0x20eba4;
  if (_0x4a9d68.qty <= 0) {
    cart = cart.filter(_0x2c8bd3 => _0x2c8bd3.key !== _0x1b58dd);
  }
  saveCart();
  renderCart();
}
function removeItem(_0x115dcd) {
  cart = cart.filter(_0x36c012 => _0x36c012.key !== _0x115dcd);
  saveCart();
  renderCart();
}
function bumpBadge(_0x48b88b, _0xac5fa8) {
  if (!_0x48b88b) {
    return;
  }
  const _0x186b97 = _0x48b88b.textContent !== String(_0xac5fa8);
  _0x48b88b.textContent = _0xac5fa8;
  if (_0x186b97) {
    _0x48b88b.classList.remove("badge-bump");
    _0x48b88b.offsetWidth;
    _0x48b88b.classList.add("badge-bump");
  }
}
function renderCartCount() {
  const _0x3caf75 = cart.reduce((_0x5597ad, _0x38a45c) => _0x5597ad + _0x38a45c.qty, 0);
  bumpBadge(cartCountEl, _0x3caf75);
  const _0x489447 = document.getElementById("bnCartCount");
  if (_0x489447) {
    bumpBadge(_0x489447, _0x3caf75);
    _0x489447.classList.toggle("hidden", _0x3caf75 === 0);
  }
}
function cartItemCouponHtml(_0x376166) {
  const _0x475919 = getProductCoupon(_0x376166.id);
  if (!_0x475919) {
    return "";
  }
  const _0x234255 = _0x475919.type === "free_delivery" ? "🚚 ফ্রি ডেলিভারি" : _0x475919.type === "fixed" ? formatTaka(_0x475919.value) + " ছাড়" : _0x475919.value + "% ছাড়";
  const _0x1a7a65 = appliedCoupons.some(_0x12e3fc => _0x12e3fc.code === _0x475919.code);
  if (_0x1a7a65) {
    return "\n      <div class=\"cart-item-coupon applied\">\n        <span>🏷️ " + (_0x475919.label || "বিশেষ অফার") + " — " + _0x234255 + "</span>\n        <button type=\"button\" class=\"cart-item-coupon-remove\" data-code=\"" + _0x475919.code + "\" title=\"কুপন সরিয়ে ফেলুন\">×</button>\n      </div>";
  }
  return "<button type=\"button\" class=\"cart-item-coupon-apply\" data-code=\"" + _0x475919.code + "\">🏷️ " + (_0x475919.label || "বিশেষ অফার") + " — " + _0x234255 + " প্রয়োগ করুন</button>";
}
async function applyCartItemCoupon(_0x363b92) {
  const _0x183572 = await validateCoupon(_0x363b92, cart);
  if (_0x183572.ok) {
    const _0x1e284e = _0x183572.coupon;
    appliedCoupons = appliedCoupons.filter(_0x1437af => _0x1437af.productId ? _0x1437af.productId !== _0x1e284e.productId : !!_0x1e284e.productId);
    appliedCoupons.push(_0x1e284e);
    showSiteToast("\"" + (_0x1e284e.label || "অফার") + "\" প্রয়োগ হয়ে গেছে 🎉");
  } else {
    showSiteToast(_0x183572.reason || "কুপনটি এখন প্রয়োগ করা যাচ্ছে না।");
  }
  renderCart();
}
function renderCart() {
  if (cart.length === 0) {
    cartItemsEl.innerHTML = "<div class=\"empty-cart\">আপনার কার্ট খালি<br>প্রোডাক্ট যোগ করুন</div>";
  } else {
    cartItemsEl.innerHTML = cart.map(_0x2631a7 => "\n      <div class=\"cart-item\">\n        <img src=\"" + (_0x2631a7.image || PLACEHOLDER_IMG) + "\" alt=\"" + _0x2631a7.name + "\" " + imgFallbackAttr() + ">\n        <div class=\"cart-item-info\">\n          <h4>" + _0x2631a7.name + "</h4>\n          <div class=\"cart-item-meta\">" + (_0x2631a7.size ? "ভ্যারিয়েন্ট: " + _0x2631a7.size + " • " : "") + formatTaka(_0x2631a7.price) + "</div>\n          <div class=\"qty-row\">\n            <button class=\"qty-btn\" data-key=\"" + _0x2631a7.key + "\" data-d=\"-1\">−</button>\n            <span>" + _0x2631a7.qty + "</span>\n            <button class=\"qty-btn\" data-key=\"" + _0x2631a7.key + "\" data-d=\"1\">+</button>\n            <button class=\"remove-btn\" data-key=\"" + _0x2631a7.key + "\">সরান</button>\n          </div>\n          " + cartItemCouponHtml(_0x2631a7) + "\n        </div>\n      </div>\n    ").join("");
    cartItemsEl.querySelectorAll(".qty-btn").forEach(_0x22b1c7 => {
      _0x22b1c7.addEventListener("click", () => updateQty(_0x22b1c7.dataset.key, parseInt(_0x22b1c7.dataset.d)));
    });
    cartItemsEl.querySelectorAll(".remove-btn").forEach(_0xb1a282 => {
      _0xb1a282.addEventListener("click", () => removeItem(_0xb1a282.dataset.key));
    });
    cartItemsEl.querySelectorAll(".cart-item-coupon-apply").forEach(_0x46dc57 => {
      _0x46dc57.addEventListener("click", () => applyCartItemCoupon(_0x46dc57.dataset.code));
    });
    cartItemsEl.querySelectorAll(".cart-item-coupon-remove").forEach(_0x3da62c => {
      _0x3da62c.addEventListener("click", () => {
        appliedCoupons = appliedCoupons.filter(_0x553ab1 => _0x553ab1.code !== _0x3da62c.dataset.code);
        renderCart();
      });
    });
  }
  const _0x5c8177 = cart.reduce((_0x1fcdfd, _0x2c5fcd) => _0x1fcdfd + _0x2c5fcd.price * _0x2c5fcd.qty, 0);
  cartSubtotalEl.textContent = formatTaka(_0x5c8177);
  popNumberChange(cartSubtotalEl);
  renderCartCount();
  renderCouponDiscount(_0x5c8177);
}
function getSingleCouponDiscount(_0x5345a9, _0x1b6b5b) {
  if (_0x5345a9.type === "free_delivery") {
    return 0;
  }
  const _0x57bd9d = _0x5345a9.productId ? getProductLineSubtotal(cart, _0x5345a9.productId) : _0x1b6b5b;
  if (_0x5345a9.type === "fixed") {
    return Math.min(Number(_0x5345a9.value) || 0, _0x57bd9d);
  } else {
    return Math.round(_0x57bd9d * (Number(_0x5345a9.value) || 0) / 100);
  }
}
function getCouponDiscount(_0x5c8532) {
  if (!appliedCoupons.length) {
    return 0;
  }
  return appliedCoupons.reduce((_0x5d01e9, _0x2c7274) => _0x5d01e9 + getSingleCouponDiscount(_0x2c7274, _0x5c8532), 0);
}
function hasActiveFreeDelivery() {
  return appliedCoupons.some(_0x2eb66 => _0x2eb66.type === "free_delivery" && (!_0x2eb66.productId || getProductLineSubtotal(cart, _0x2eb66.productId) > 0));
}
function getDeliveryCharge() {
  if (cart.length === 0) {
    return 0;
  }
  if (hasActiveFreeDelivery()) {
    return 0;
  } else {
    return DELIVERY_CHARGE;
  }
}
function renderCouponDiscount(_0x2b29f1) {
  const _0x4f1c37 = document.getElementById("cartDiscountRow");
  const _0x983e16 = document.getElementById("cartDiscountAmount");
  const _0x25eaa9 = document.getElementById("cartGrandTotal");
  const _0x269a84 = document.getElementById("cartDeliveryRow");
  const _0x4ac4a2 = document.getElementById("cartDeliveryAmount");
  const _0x28ff2f = getCouponDiscount(_0x2b29f1);
  const _0x3448a7 = getDeliveryCharge();
  const _0x178970 = cart.length > 0 && hasActiveFreeDelivery();
  if (_0x4f1c37 && _0x983e16) {
    if (_0x28ff2f > 0) {
      _0x4f1c37.classList.remove("hidden");
      _0x983e16.textContent = "- " + formatTaka(_0x28ff2f);
    } else {
      _0x4f1c37.classList.add("hidden");
    }
  }
  if (_0x269a84 && _0x4ac4a2) {
    if (_0x178970) {
      _0x269a84.classList.remove("hidden");
      _0x4ac4a2.textContent = "ফ্রি 🎉";
    } else if (_0x3448a7 > 0) {
      _0x269a84.classList.remove("hidden");
      _0x4ac4a2.textContent = formatTaka(_0x3448a7);
    } else {
      _0x269a84.classList.add("hidden");
    }
  }
  if (_0x25eaa9) {
    _0x25eaa9.textContent = formatTaka(_0x2b29f1 - _0x28ff2f + _0x3448a7);
    popNumberChange(_0x25eaa9);
  }
  renderAppliedCouponsList();
}
function renderAppliedCouponsList() {
  const _0x4896cc = document.getElementById("appliedCouponsList");
  if (!_0x4896cc) {
    return;
  }
  const _0x17c287 = appliedCoupons.filter(_0x28d57f => !_0x28d57f.productId);
  _0x4896cc.innerHTML = _0x17c287.map(_0x817945 => "\n    <span class=\"applied-coupon-chip\">\n      🏷️ " + (_0x817945.label || _0x817945.code) + (_0x817945.type === "free_delivery" ? " 🚚" : "") + "\n      <button type=\"button\" data-remove-coupon=\"" + _0x817945.code + "\" title=\"এই কুপনটি সরিয়ে ফেলুন\">×</button>\n    </span>").join("");
  _0x4896cc.querySelectorAll("[data-remove-coupon]").forEach(_0x4f9af2 => {
    _0x4f9af2.addEventListener("click", () => {
      appliedCoupons = appliedCoupons.filter(_0x11b279 => _0x11b279.code !== _0x4f9af2.dataset.removeCoupon);
      renderCart();
    });
  });
}
const applyCouponBtn = document.getElementById("applyCouponBtn");
const couponInput = document.getElementById("couponInput");
const couponMsgEl = document.getElementById("couponMsg");
if (applyCouponBtn) {
  applyCouponBtn.addEventListener("click", async () => {
    const _0x553fc8 = (couponInput.value || "").trim().toUpperCase();
    couponMsgEl.classList.remove("hidden");
    couponMsgEl.textContent = "যাচাই করা হচ্ছে...";
    couponMsgEl.className = "coupon-msg";
    applyCouponBtn.disabled = true;
    const _0x25d55f = await validateCoupon(_0x553fc8, cart);
    applyCouponBtn.disabled = false;
    if (_0x25d55f.ok) {
      const _0x44ee46 = _0x25d55f.coupon;
      if (appliedCoupons.some(_0xcb8eea => _0xcb8eea.code === _0x44ee46.code)) {
        couponMsgEl.textContent = "এই কুপনটি ইতিমধ্যেই প্রয়োগ করা আছে।";
        couponMsgEl.className = "coupon-msg error";
        renderCart();
        return;
      }
      appliedCoupons = appliedCoupons.filter(_0x5f12b4 => _0x5f12b4.productId ? _0x5f12b4.productId !== _0x44ee46.productId : !!_0x44ee46.productId);
      appliedCoupons.push(_0x44ee46);
      const _0x5d962f = cart.reduce((_0x42156e, _0x5dd23d) => _0x42156e + _0x5dd23d.price * _0x5dd23d.qty, 0);
      const _0x493bd2 = getCouponDiscount(_0x5d962f);
      const _0x11d8a8 = _0x5d962f - _0x493bd2 + getDeliveryCharge();
      const _0x58ceea = _0x44ee46.productId ? "\"" + (_0x44ee46.productName || "প্রোডাক্টটি") + "\"-তে " : "";
      const _0x8d59c4 = appliedCoupons.length > 1 ? " (মোট " + appliedCoupons.length + "টি কুপন সক্রিয়)" : "";
      if (_0x44ee46.appliedMsg) {
        couponMsgEl.textContent = _0x44ee46.appliedMsg.replace(/\{total\}/g, formatTaka(_0x11d8a8)).replace(/\{discount\}/g, formatTaka(_0x44ee46.type === "free_delivery" ? DELIVERY_CHARGE : _0x493bd2));
      } else if (_0x44ee46.type === "free_delivery") {
        couponMsgEl.textContent = "কুপন প্রয়োগ হয়েছে! " + _0x58ceea + "ডেলিভারি চার্জ সম্পূর্ণ ফ্রি হয়ে গেছে" + _0x8d59c4 + "। ছাড়ের পর সর্বমোট: " + formatTaka(_0x11d8a8);
      } else {
        const _0x32785d = _0x44ee46.type === "fixed" ? formatTaka(_0x44ee46.value) : _0x44ee46.value + "%";
        couponMsgEl.textContent = "কুপন প্রয়োগ হয়েছে! " + _0x58ceea + _0x32785d + " ছাড়" + _0x8d59c4 + " — " + formatTaka(_0x493bd2) + " বাঁচবে। ছাড়ের পর সর্বমোট: " + formatTaka(_0x11d8a8);
      }
      couponMsgEl.className = "coupon-msg ok";
      couponInput.value = "";
    } else {
      couponMsgEl.textContent = _0x25d55f.reason;
      couponMsgEl.className = "coupon-msg error";
    }
    renderCart();
  });
}
function openCart() {
  cartDrawer.classList.add("open");
  cartOverlay.classList.add("open");
  updateBodyScrollLock();
  clearCheckoutError();
  const _0x85240e = localStorage.getItem("openshop_profile_phone");
  const _0x39da90 = document.getElementById("leadPhone");
  if (_0x85240e && _0x39da90 && !_0x39da90.value) {
    _0x39da90.value = _0x85240e;
  }
  captureVisitorLocation();
}
function closeCart() {
  cartDrawer.classList.remove("open");
  cartOverlay.classList.remove("open");
  updateBodyScrollLock();
}
cartBtn.addEventListener("click", () => {
  renderCart();
  openCart();
});
cartClose.addEventListener("click", closeCart);
cartOverlay.addEventListener("click", () => {
  closeCart();
  closeProfile();
});
function generateOrderId() {
  const _0x34c1c4 = Math.floor(100000 + Math.random() * 900000);
  return "OS" + _0x34c1c4;
}
async function buildOrderImageFiles(_0x7db5d9) {
  const _0x22e6f8 = [];
  const _0x1a03b6 = new Set();
  for (const _0x59193b of _0x7db5d9) {
    const _0x183733 = _0x59193b.image;
    if (!_0x183733 || _0x1a03b6.has(_0x183733)) {
      continue;
    }
    _0x1a03b6.add(_0x183733);
    try {
      const _0x236a59 = await fetch(_0x183733, {
        mode: "cors"
      });
      if (!_0x236a59.ok) {
        continue;
      }
      const _0xcb7abd = await _0x236a59.blob();
      if (!_0xcb7abd.type.startsWith("image/")) {
        continue;
      }
      const _0x2cbbd5 = (_0xcb7abd.type.split("/")[1] || "jpg").split("+")[0];
      const _0xdfa15c = (_0x59193b.name || "product").replace(/[^a-zA-Z0-9\u0980-\u09FF]/g, "_").slice(0, 30);
      _0x22e6f8.push(new File([_0xcb7abd], _0xdfa15c + "." + _0x2cbbd5, {
        type: _0xcb7abd.type
      }));
    } catch (_0x238e8c) {
      console.warn("এই ছবিটা শেয়ারে যোগ করা যায়নি (CORS/নেটওয়ার্ক সমস্যা):", _0x183733, _0x238e8c.message);
    }
  }
  return _0x22e6f8;
}
const orderConfirmModal = document.getElementById("orderConfirmModal");
const orderIdField = document.getElementById("orderIdField");
const copyOrderIdBtn = document.getElementById("copyOrderIdBtn");
const reopenWaBtn = document.getElementById("reopenWaBtn");
const shareWithImagesBtn = document.getElementById("shareWithImagesBtn");
const orderConfirmClose = document.getElementById("orderConfirmClose");
let lastOrder = null;
function openOrderConfirmModal(_0x57d95e, _0x50eda3, _0x3b03ea, _0x3b74ec) {
  lastOrder = {
    orderId: _0x57d95e,
    waUrl: _0x50eda3,
    msg: _0x3b03ea,
    cartSnapshot: _0x3b74ec
  };
  orderIdField.value = _0x57d95e;
  copyOrderIdBtn.textContent = "কপি করুন";
  shareWithImagesBtn.classList.toggle("hidden", !navigator.share);
  shareWithImagesBtn.textContent = "📸 ছবিসহ শেয়ার করুন (ঐচ্ছিক)";
  shareWithImagesBtn.disabled = false;
  orderConfirmModal.classList.add("open");
  updateBodyScrollLock();
}
function closeOrderConfirmModal() {
  orderConfirmModal.classList.remove("open");
  updateBodyScrollLock();
}
orderConfirmClose.addEventListener("click", closeOrderConfirmModal);
orderConfirmModal.addEventListener("click", _0x4d162e => {
  if (_0x4d162e.target === orderConfirmModal) {
    closeOrderConfirmModal();
  }
});
copyOrderIdBtn.addEventListener("click", async () => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(orderIdField.value);
    } else {
      orderIdField.removeAttribute("readonly");
      orderIdField.select();
      document.execCommand("copy");
      orderIdField.setAttribute("readonly", "true");
    }
    copyOrderIdBtn.textContent = "কপি হয়েছে ✅";
    setTimeout(() => {
      copyOrderIdBtn.textContent = "কপি করুন";
    }, 1800);
  } catch (_0x6fc62a) {
    orderIdField.removeAttribute("readonly");
    orderIdField.select();
    alert("অটো-কপি কাজ করেনি, উপরে নম্বরটা সিলেক্ট করে ম্যানুয়ালি কপি করুন।");
  }
});
reopenWaBtn.addEventListener("click", () => {
  if (lastOrder) {
    window.open(lastOrder.waUrl, "_blank");
  }
});
shareWithImagesBtn.addEventListener("click", async () => {
  if (!lastOrder || !navigator.share) {
    return;
  }
  shareWithImagesBtn.disabled = true;
  shareWithImagesBtn.textContent = "ছবি প্রস্তুত হচ্ছে...";
  try {
    const _0x206c72 = await buildOrderImageFiles(lastOrder.cartSnapshot);
    const _0x53148c = {
      title: "Openshop অর্ডার #" + lastOrder.orderId,
      text: lastOrder.msg
    };
    if (_0x206c72.length && (!navigator.canShare || navigator.canShare({
      files: _0x206c72
    }))) {
      _0x53148c.files = _0x206c72;
    }
    await navigator.share(_0x53148c);
  } catch (_0x4de1a8) {
    if (_0x4de1a8.name !== "AbortError") {
      alert("এই ব্রাউজারে ছবিসহ শেয়ার করা গেল না। WhatsApp চ্যাটে অর্ডারের মেসেজটা তো চলে গেছে, চাইলে ছবি ম্যানুয়ালি অ্যাটাচ করে পাঠাতে পারেন।");
    }
  }
  shareWithImagesBtn.disabled = false;
  shareWithImagesBtn.textContent = "📸 ছবিসহ শেয়ার করুন (ঐচ্ছিক)";
});
const leadDistrictEl = document.getElementById("leadDistrict");
const leadUpazilaEl = document.getElementById("leadUpazila");
if (leadDistrictEl && typeof BD_LOCATIONS !== "undefined") {
  Object.keys(BD_LOCATIONS).sort((_0x2569f1, _0x3265dd) => _0x2569f1.localeCompare(_0x3265dd, "bn")).forEach(_0x1454e0 => {
    const _0x3e866f = document.createElement("option");
    _0x3e866f.value = _0x1454e0;
    _0x3e866f.textContent = _0x1454e0;
    leadDistrictEl.appendChild(_0x3e866f);
  });
  leadDistrictEl.addEventListener("change", () => {
    const _0x350fd3 = leadDistrictEl.value;
    leadUpazilaEl.innerHTML = "<option value=\"\">উপজেলা নির্বাচন করুন *</option>";
    if (_0x350fd3 && BD_LOCATIONS[_0x350fd3]) {
      leadUpazilaEl.disabled = false;
      BD_LOCATIONS[_0x350fd3].forEach(_0x50843a => {
        const _0x32dd0d = document.createElement("option");
        _0x32dd0d.value = _0x50843a;
        _0x32dd0d.textContent = _0x50843a;
        leadUpazilaEl.appendChild(_0x32dd0d);
      });
    } else {
      leadUpazilaEl.disabled = true;
    }
    leadDistrictEl.classList.remove("invalid");
  });
  leadUpazilaEl.addEventListener("change", () => leadUpazilaEl.classList.remove("invalid"));
}
const toastHost = document.getElementById("toastHost");
function showSiteToast(_0x1986b7, _0x84f857) {
  if (!toastHost) {
    return;
  }
  const _0x2122b9 = document.createElement("div");
  _0x2122b9.className = "site-toast";
  _0x2122b9.innerHTML = "<span class=\"toast-icon\">" + (_0x84f857 || "✅") + "</span><span>" + _0x1986b7 + "</span>";
  toastHost.appendChild(_0x2122b9);
  setTimeout(() => _0x2122b9.remove(), 4200);
}
const checkoutErrorEl = document.getElementById("checkoutError");
function showCheckoutError(_0x3d8557, _0x2a67cf) {
  checkoutErrorEl.textContent = _0x3d8557;
  checkoutErrorEl.classList.remove("hidden");
  document.querySelectorAll(".lead-input.invalid").forEach(_0x220cea => _0x220cea.classList.remove("invalid"));
  const _0x31c5db = _0x2a67cf ? document.getElementById(_0x2a67cf) : null;
  if (_0x31c5db) {
    _0x31c5db.classList.add("invalid");
    _0x31c5db.focus();
    _0x31c5db.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }
}
function clearCheckoutError() {
  checkoutErrorEl.classList.add("hidden");
  checkoutErrorEl.textContent = "";
  document.querySelectorAll(".lead-input.invalid").forEach(_0x2a3d91 => _0x2a3d91.classList.remove("invalid"));
}
["leadName", "leadPhone", "leadAddress", "leadDistrict", "leadUpazila"].forEach(_0x189e09 => {
  const _0x2a09db = document.getElementById(_0x189e09);
  if (_0x2a09db) {
    _0x2a09db.addEventListener("input", () => _0x2a09db.classList.remove("invalid"));
  }
});
function handleLocationRequiredForCheckout() {
  if (!("geolocation" in navigator)) {
    showCheckoutError("দুঃখিত, আপনার ব্রাউজার/ডিভাইস লোকেশন সাপোর্ট করে না, তাই এখান থেকে অর্ডার করা যাচ্ছে না — অন্য একটা ব্রাউজার বা ডিভাইস থেকে চেষ্টা করুন।");
    return;
  }
  showCheckoutError("📍 ভুয়া অর্ডার ঠেকাতে অর্ডার করার আগে আপনার আসল লোকেশন দেওয়া বাধ্যতামূলক — উপরে/ব্রাউজারে যে পারমিশন পপআপ এসেছে সেখানে \"Allow\" চাপুন, তারপর আবার এই বাটনে চাপুন।");
  captureVisitorLocation(() => {
    clearCheckoutError();
    showSiteToast("✅ লোকেশন পাওয়া গেছে — এখন আবার \"হোয়াটসঅ্যাপে অর্ডার করুন\" বাটনে চাপুন।");
  }, _0x20ca9f => {
    if (_0x20ca9f === "denied") {
      showCheckoutError("❌ লোকেশন অনুমতি বাতিল করা হয়েছে, তাই অর্ডার করা যাবে না। ব্রাউজারের ঠিকানা বারের পাশের 🔒/সাইট সেটিংস আইকনে গিয়ে এই সাইটের জন্য \"লোকেশন\" Allow করে দিন, তারপর পেজটা রিফ্রেশ করে আবার চেষ্টা করুন।");
    } else {
      showCheckoutError("লোকেশন পাওয়া যায়নি — নেটওয়ার্ক/GPS চেক করে আবার \"হোয়াটসঅ্যাপে অর্ডার করুন\" বাটনে চাপুন।");
    }
  });
}
checkoutBtn.addEventListener("click", () => {
  clearCheckoutError();
  if (cart.length === 0) {
    showCheckoutError("আপনার কার্ট খালি — অর্ডার করার আগে প্রোডাক্ট যোগ করুন।");
    return;
  }
  if (!visitorLocation) {
    handleLocationRequiredForCheckout();
    return;
  }
  const _0x38a4cd = document.getElementById("leadName").value.trim();
  const _0x476211 = document.getElementById("leadPhone").value.trim();
  const _0x4697c5 = document.getElementById("leadDistrict").value.trim();
  const _0x17fda1 = document.getElementById("leadUpazila").value.trim();
  const _0x165191 = document.getElementById("leadAddress").value.trim();
  const _0x363c46 = cart.reduce((_0x421b41, _0x11a966) => _0x421b41 + _0x11a966.price * _0x11a966.qty, 0);
  if (appliedCoupons.length) {
    const _0x40e9a3 = new Date().toISOString().slice(0, 10);
    const _0x2a5f6d = appliedCoupons.length;
    appliedCoupons = appliedCoupons.filter(_0x1e373c => {
      const _0x345f0e = COUPONS.some(_0x474b5f => (_0x474b5f.code || "").toUpperCase() === _0x1e373c.code && _0x474b5f.active !== false);
      const _0x2aa79c = !_0x1e373c.expiry || _0x1e373c.expiry >= _0x40e9a3;
      const _0x3ba75a = _0x1e373c.productId ? getProductLineSubtotal(cart, _0x1e373c.productId) : _0x363c46;
      const _0x8b3d3a = !_0x1e373c.productId || _0x3ba75a > 0;
      const _0x204b22 = _0x3ba75a >= Number(_0x1e373c.minOrder || 0);
      return _0x345f0e && _0x2aa79c && _0x8b3d3a && _0x204b22;
    });
    if (appliedCoupons.length < _0x2a5f6d) {
      if (couponMsgEl) {
        couponMsgEl.textContent = "একটি বা একাধিক কুপন আর প্রযোজ্য নয়, তাই বাদ দেওয়া হয়েছে — চাইলে আবার চেক করে প্রয়োগ করুন।";
        couponMsgEl.className = "coupon-msg error";
      }
      renderCart();
    }
  }
  const _0x22df64 = getCouponDiscount(_0x363c46);
  const _0x36c7e2 = getDeliveryCharge();
  const _0x47c533 = _0x363c46 - _0x22df64 + _0x36c7e2;
  if (!isValidLeadName(_0x38a4cd)) {
    showCheckoutError("অনুগ্রহ করে আপনার সঠিক নাম দিন (শুধু অক্ষর, অন্তত ২ অক্ষর — সংখ্যা বা ভুয়া লেখা চলবে না)।", "leadName");
    return;
  }
  if (!isValidBDPhone(_0x476211)) {
    showCheckoutError("অনুগ্রহ করে সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন 01712345678)। ভুল/ভুয়া নম্বর দিয়ে অর্ডার করা যাবে না।", "leadPhone");
    return;
  }
  if (!_0x4697c5) {
    showCheckoutError("অনুগ্রহ করে আপনার জেলা নির্বাচন করুন — এই জায়গাটি খালি।", "leadDistrict");
    return;
  }
  if (!_0x17fda1) {
    showCheckoutError("অনুগ্রহ করে আপনার উপজেলা নির্বাচন করুন — এই জায়গাটি খালি।", "leadUpazila");
    return;
  }
  if (!isValidLeadAddress(_0x165191)) {
    showCheckoutError("অনুগ্রহ করে বাসা/রোড/গ্রামের নাম দিন — অন্তত ৬ অক্ষর, শুধু সংখ্যা/সিম্বল দিয়ে হবে না।", "leadAddress");
    return;
  }
  const _0x9f27a2 = _0x165191 + ", " + _0x17fda1 + ", " + _0x4697c5;
  localStorage.setItem("openshop_profile_phone", normalizePhone(_0x476211));
  const _0x3c7502 = generateOrderId();
  const _0x5279df = cart.map(_0x289cc => ({
    ..._0x289cc
  }));
  let _0xe9505f = "আসসালামু আলাইকুম, আমি Openshop থেকে অর্ডার করতে চাই:\n";
  _0xe9505f += "অর্ডার আইডি: " + _0x3c7502 + "\n\n";
  if (_0x38a4cd) {
    _0xe9505f += "নাম: " + _0x38a4cd + "\n";
  }
  _0xe9505f += "ফোন: " + _0x476211 + "\n";
  if (_0x9f27a2) {
    _0xe9505f += "ঠিকানা: " + _0x9f27a2 + "\n";
  }
  if (visitorLocation && visitorLocation.mapsUrl) {
    _0xe9505f += "📍 লোকেশন পিন: " + visitorLocation.mapsUrl + "\n";
  }
  _0xe9505f += "\n";
  cart.forEach((_0x4dd0ab, _0x1bdfdd) => {
    _0xe9505f += _0x1bdfdd + 1 + ". " + _0x4dd0ab.name + (_0x4dd0ab.size ? " (ভ্যারিয়েন্ট: " + _0x4dd0ab.size + ")" : "") + " — " + _0x4dd0ab.qty + " পিস — " + formatTaka(_0x4dd0ab.price * _0x4dd0ab.qty) + "\n";
  });
  _0xe9505f += "\nসাবটোটাল: " + formatTaka(_0x363c46);
  if (_0x22df64 > 0) {
    appliedCoupons.filter(_0x3127fe => _0x3127fe.type !== "free_delivery").forEach(_0x4710ea => {
      const _0x400185 = _0x4710ea.type === "fixed" ? "-" + formatTaka(_0x4710ea.value) : "-" + _0x4710ea.value + "%";
      const _0xe14e03 = getSingleCouponDiscount(_0x4710ea, _0x363c46);
      _0xe9505f += "\nকুপন (" + _0x4710ea.code + (_0x4710ea.productId ? ", " + (_0x4710ea.productName || "নির্দিষ্ট প্রোডাক্ট") : "") + ", " + _0x400185 + "): -" + formatTaka(_0xe14e03);
    });
  }
  const _0x396ef0 = appliedCoupons.find(_0x1a4399 => _0x1a4399.type === "free_delivery");
  if (_0x396ef0) {
    _0xe9505f += "\nকুপন (" + _0x396ef0.code + (_0x396ef0.productId ? ", " + (_0x396ef0.productName || "নির্দিষ্ট প্রোডাক্ট") : "") + "): ফ্রি ডেলিভারি প্রযোজ্য";
  }
  _0xe9505f += "\nডেলিভারি চার্জ: " + (_0x36c7e2 > 0 ? formatTaka(_0x36c7e2) : "ফ্রি");
  _0xe9505f += "\nসর্বমোট: " + formatTaka(_0x47c533);
  const _0x4bc3fe = [...new Set(cart.map(_0x1d93c9 => _0x1d93c9.image).filter(Boolean))];
  if (_0x4bc3fe.length) {
    _0xe9505f += "\n\nপ্রোডাক্টের ছবি:\n" + _0x4bc3fe.map((_0x5eb396, _0x44df46) => _0x44df46 + 1 + ". " + _0x5eb396).join("\n");
  }
  const _0x1d0f65 = window.WHATSAPP_NUMBER_OVERRIDE || WHATSAPP_NUMBER;
  const _0x46be13 = "https://wa.me/" + _0x1d0f65 + "?text=" + encodeURIComponent(_0xe9505f);
  window.open(_0x46be13, "_blank");
  const _0x1ddfe2 = getDb();
  if (_0x1ddfe2) {
    _0x1ddfe2.collection("orders").add({
      orderId: _0x3c7502,
      name: _0x38a4cd || null,
      phone: normalizePhone(_0x476211),
      address: _0x9f27a2 || null,
      location: visitorLocation ? {
        lat: visitorLocation.lat,
        lng: visitorLocation.lng,
        mapsUrl: visitorLocation.mapsUrl
      } : null,
      items: _0x5279df.map(_0x574e85 => ({
        name: _0x574e85.name,
        size: _0x574e85.size,
        qty: _0x574e85.qty,
        price: _0x574e85.price,
        image: _0x574e85.image
      })),
      subtotal: _0x363c46,
      discount: _0x22df64,
      couponCode: appliedCoupons.length ? appliedCoupons.map(_0x187688 => _0x187688.code).join(", ") : null,
      deliveryCharge: _0x36c7e2,
      total: _0x47c533,
      status: "pending",
      ts: Date.now(),
      day: new Date().toISOString().slice(0, 10)
    }).catch(_0x2d566f => console.warn("অর্ডার সেভ করা যায়নি:", _0x2d566f.message));
  }
  openOrderConfirmModal(_0x3c7502, _0x46be13, _0xe9505f, _0x5279df);
  showSiteToast("অর্ডার সম্পন্ন হয়েছে! অর্ডার আইডি: " + _0x3c7502);
  fireConfetti();
  cart = [];
  appliedCoupons = [];
  if (couponInput) {
    couponInput.value = "";
  }
  if (couponMsgEl) {
    couponMsgEl.classList.add("hidden");
  }
  saveCart();
  renderCart();
  closeCart();
  clearCheckoutError();
});
const profileDrawer = document.getElementById("profileDrawer");
const profileBody = document.getElementById("profileBody");
const profileClose = document.getElementById("profileClose");
const STATUS_LABELS = {
  pending: "অপেক্ষমাণ",
  confirmed: "নিশ্চিত হয়েছে",
  processing: "প্রস্তুত হচ্ছে",
  shipped: "পাঠানো হয়েছে",
  delivered: "ডেলিভারি সম্পন্ন",
  cancelled: "বাতিল হয়েছে"
};
function openProfile() {
  profileDrawer.classList.add("open");
  cartOverlay.classList.add("open");
  updateBodyScrollLock();
  renderProfile();
}
function closeProfile() {
  profileDrawer.classList.remove("open");
  cartOverlay.classList.remove("open");
  updateBodyScrollLock();
}
profileClose.addEventListener("click", closeProfile);
function orderCardHtml(_0xcb4da6) {
  const _0x4006ea = _0xcb4da6.status || "pending";
  const _0x13589c = new Date(_0xcb4da6.ts).toLocaleDateString("bn-BD");
  const _0x563831 = (_0xcb4da6.items || []).map(_0x4ebf20 => _0x4ebf20.name + " x" + _0x4ebf20.qty).join(", ");
  return "\n    <div class=\"order-card\">\n      <div class=\"oid\">অর্ডার #" + (_0xcb4da6.orderId || "") + "</div>\n      <span class=\"order-status-badge status-" + _0x4006ea + "\">" + (STATUS_LABELS[_0x4006ea] || _0x4006ea) + "</span>\n      <div class=\"order-items-mini\">" + _0x563831 + "</div>\n      <div class=\"order-items-mini\">তারিখ: " + _0x13589c + " • সর্বমোট: " + formatTaka(_0xcb4da6.total ?? (_0xcb4da6.subtotal || 0)) + "</div>\n    </div>";
}
function normalizePhone(_0x4d01f4) {
  return (_0x4d01f4 || "").replace(/\D/g, "");
}
function isValidBDPhone(_0x4c8088) {
  const _0x46cad7 = normalizePhone(_0x4c8088);
  const _0x4f0808 = _0x46cad7.startsWith("88") ? _0x46cad7.slice(2) : _0x46cad7;
  return /^01[3-9]\d{8}$/.test(_0x4f0808);
}
function isValidLeadName(_0xc64f8b) {
  const _0x523027 = (_0xc64f8b || "").trim();
  if (_0x523027.length < 2 || _0x523027.length > 60) {
    return false;
  }
  return /^[A-Za-z\u0980-\u09FF][A-Za-z\u0980-\u09FF .'-]*$/.test(_0x523027);
}
function isValidLeadAddress(_0x43ed25) {
  const _0x4021ce = (_0x43ed25 || "").trim();
  if (_0x4021ce.length < 6 || _0x4021ce.length > 200) {
    return false;
  }
  return /[A-Za-z\u0980-\u09FF]/.test(_0x4021ce);
}
async function fetchOrdersByPhone(_0x557dda) {
  const _0x2dcfae = getDb();
  if (!_0x2dcfae) {
    return [];
  }
  const _0x2c72ae = normalizePhone(_0x557dda);
  try {
    const _0x13eb5e = await _0x2dcfae.collection("orders").where("phone", "==", _0x2c72ae).limit(30).get();
    return _0x13eb5e.docs.map(_0x3888f0 => _0x3888f0.data()).sort((_0x28efd9, _0x13eb0d) => (_0x13eb0d.ts || 0) - (_0x28efd9.ts || 0));
  } catch (_0x537e21) {
    console.warn(_0x537e21.message);
    return [];
  }
}
async function fetchOrderById(_0x1c9c4b) {
  const _0xa3ccb4 = getDb();
  if (!_0xa3ccb4) {
    return [];
  }
  try {
    const _0x6596d2 = await _0xa3ccb4.collection("orders").where("orderId", "==", _0x1c9c4b.trim().toUpperCase()).limit(1).get();
    return _0x6596d2.docs.map(_0x49e8e4 => _0x49e8e4.data());
  } catch (_0x247015) {
    console.warn(_0x247015.message);
    return [];
  }
}
function profileQuickMenuHtml() {
  return "\n    <div class=\"profile-quick-menu\">\n      <button type=\"button\" class=\"profile-quick-item\" id=\"pqWishlist\"><span class=\"profile-quick-icon\">❤️</span><span class=\"profile-quick-label\">পছন্দের তালিকা</span></button>\n      <button type=\"button\" class=\"profile-quick-item\" id=\"pqCoupons\"><span class=\"profile-quick-icon\">🏷️</span><span class=\"profile-quick-label\">কুপন</span></button>\n      <button type=\"button\" class=\"profile-quick-item\" id=\"pqDarkMode\"><span class=\"profile-quick-icon\">🌙</span><span class=\"profile-quick-label\">ডার্ক মোড</span></button>\n      <button type=\"button\" class=\"profile-quick-item\" id=\"pqCare\"><span class=\"profile-quick-icon\">🎧</span><span class=\"profile-quick-label\">কাস্টমার কেয়ার</span></button>\n      <button type=\"button\" class=\"profile-quick-item\" id=\"pqShare\"><span class=\"profile-quick-icon\">🔗</span><span class=\"profile-quick-label\">শেয়ার করুন</span></button>\n      <button type=\"button\" class=\"profile-quick-item\" id=\"pqInstall\"><span class=\"profile-quick-icon\">📲</span><span class=\"profile-quick-label\">অ্যাপ ইনস্টল</span></button>\n      <button type=\"button\" class=\"profile-quick-item\" id=\"pqFacebook\"><span class=\"profile-quick-icon\">📘</span><span class=\"profile-quick-label\">ফেসবুক পেজ</span></button>\n      <button type=\"button\" class=\"profile-quick-item\" id=\"pqWhatsapp\"><span class=\"profile-quick-icon\">💬</span><span class=\"profile-quick-label\">হোয়াটসঅ্যাপ</span></button>\n    </div>\n  ";
}
function wireProfileQuickMenu() {
  const _byId = _id => document.getElementById(_id);
  if (_byId("pqWishlist")) _byId("pqWishlist").addEventListener("click", () => {
    closeProfile();
    openWishlist();
  });
  if (_byId("pqCoupons")) _byId("pqCoupons").addEventListener("click", () => openCouponsModal());
  if (_byId("pqDarkMode")) _byId("pqDarkMode").addEventListener("click", () => applyDarkMode(!document.body.classList.contains("dark-mode")));
  if (_byId("pqCare")) _byId("pqCare").addEventListener("click", () => {
    const _careLink = document.getElementById("utilCustomerCare");
    if (_careLink && _careLink.href) window.open(_careLink.href, "_blank");
  });
  if (_byId("pqShare")) _byId("pqShare").addEventListener("click", () => {
    const _shareBtn = document.getElementById("navShareSite");
    if (_shareBtn) _shareBtn.click();
  });
  if (_byId("pqInstall")) _byId("pqInstall").addEventListener("click", () => {
    const _installBtn = document.getElementById("navInstallApp");
    if (_installBtn) _installBtn.click();
  });
  if (_byId("pqFacebook")) _byId("pqFacebook").addEventListener("click", () => {
    const _fbLink = document.getElementById("utilFacebookPage");
    if (_fbLink && _fbLink.href) window.open(_fbLink.href, "_blank");
  });
  if (_byId("pqWhatsapp")) _byId("pqWhatsapp").addEventListener("click", () => {
    const _waLink = document.getElementById("waFloat");
    if (_waLink && _waLink.href) window.open(_waLink.href, "_blank");
  });
}
function renderProfile() {
  const _0x287f5f = localStorage.getItem("openshop_profile_phone");
  if (_0x287f5f) {
    profileBody.innerHTML = profileQuickMenuHtml() + "<p style=\"font-size:13px; color:#66756f;\">ফোন নম্বর: <b>" + _0x287f5f + "</b></p><div id=\"ordersList\"><p class=\"msg\">লোড হচ্ছে...</p></div><button class=\"profile-logout\" id=\"profileLogoutBtn\">ভিন্ন নম্বর দিয়ে দেখুন</button>";
    wireProfileQuickMenu();
    document.getElementById("profileLogoutBtn").addEventListener("click", () => {
      localStorage.removeItem("openshop_profile_phone");
      renderProfile();
    });
    fetchOrdersByPhone(_0x287f5f).then(_0x5e5d9c => {
      const _0x205b5f = document.getElementById("ordersList");
      if (!_0x205b5f) {
        return;
      }
      _0x205b5f.innerHTML = _0x5e5d9c.length ? _0x5e5d9c.map(orderCardHtml).join("") : "<p style=\"font-size:13px; color:#8a9791;\">এই নম্বরে কোনো অর্ডার পাওয়া যায়নি।</p>";
    });
  } else {
    profileBody.innerHTML = profileQuickMenuHtml() + "\n      <div class=\"profile-guest\">\n        <div class=\"avatar-ph\">👤</div>\n        <p>আপনার ফোন নম্বর দিয়ে অর্ডার ট্র্যাক করুন, অথবা সরাসরি অর্ডার আইডি দিয়ে খুঁজুন।</p>\n      </div>\n      <div class=\"track-form\">\n        <input type=\"tel\" id=\"trackPhone\" placeholder=\"ফোন নম্বর দিয়ে খুঁজুন\" class=\"lead-input\">\n        <button class=\"btn btn-primary btn-block\" id=\"trackPhoneBtn\">ফোন নম্বর দিয়ে দেখুন</button>\n      </div>\n      <div class=\"track-form\">\n        <input type=\"text\" id=\"trackOrderId\" placeholder=\"অর্ডার আইডি (যেমন OS123456)\" class=\"lead-input\">\n        <button class=\"btn btn-ghost btn-block\" id=\"trackOrderBtn\" style=\"border-color:var(--teal); color:var(--teal);\">অর্ডার আইডি দিয়ে খুঁজুন</button>\n      </div>\n      <div id=\"trackResult\"></div>\n    ";
    wireProfileQuickMenu();
    document.getElementById("trackPhoneBtn").addEventListener("click", async () => {
      const _0x3a4580 = document.getElementById("trackPhone").value.trim();
      if (!_0x3a4580) {
        return;
      }
      localStorage.setItem("openshop_profile_phone", normalizePhone(_0x3a4580));
      renderProfile();
    });
    document.getElementById("trackOrderBtn").addEventListener("click", async () => {
      const _0x245f0f = document.getElementById("trackOrderId").value.trim();
      const _0x15c524 = document.getElementById("trackResult");
      if (!_0x245f0f) {
        return;
      }
      _0x15c524.innerHTML = "<p class=\"msg\">খোঁজা হচ্ছে...</p>";
      const _0x3c49a1 = await fetchOrderById(_0x245f0f);
      _0x15c524.innerHTML = _0x3c49a1.length ? _0x3c49a1.map(orderCardHtml).join("") : "<p style=\"font-size:13px; color:#8a9791;\">এই আইডিতে কোনো অর্ডার পাওয়া যায়নি।</p>";
    });
  }
}
document.querySelectorAll(".bn-item").forEach(_0x42ad89 => {
  _0x42ad89.addEventListener("click", () => {
    document.querySelectorAll(".bn-item").forEach(_0x3c8198 => _0x3c8198.classList.remove("active"));
    _0x42ad89.classList.add("active");
    const _0x17f58a = _0x42ad89.dataset.bn;
    if (_0x17f58a === "home") {
      if (productModal.classList.contains("open")) {
        closeModal();
      }
      if (cartDrawer.classList.contains("open")) {
        closeCart();
      }
      if (profileDrawer.classList.contains("open")) {
        closeProfile();
      }
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    } else if (_0x17f58a === "categories") {
      document.getElementById("categories").scrollIntoView({
        behavior: "smooth"
      });
    } else if (_0x17f58a === "search") {
      document.getElementById("categories").scrollIntoView({
        behavior: "smooth"
      });
      searchInput.focus();
    } else if (_0x17f58a === "cart") {
      renderCart();
      openCart();
    } else if (_0x17f58a === "profile") {
      openProfile();
    }
  });
});
document.addEventListener("keydown", _0x5d4087 => {
  if (_0x5d4087.key !== "Escape") {
    return;
  }
  if (orderConfirmModal.classList.contains("open")) {
    closeOrderConfirmModal();
  } else if (productModal.classList.contains("open")) {
    closeModal();
  } else if (cartDrawer.classList.contains("open")) {
    closeCart();
  } else if (profileDrawer.classList.contains("open")) {
    closeProfile();
  } else {
    const _0x36a720 = document.getElementById("couponsModal");
    if (_0x36a720 && _0x36a720.classList.contains("open")) {
      _0x36a720.classList.remove("open");
      updateBodyScrollLock();
    }
  }
});
menuToggle.addEventListener("click", _0x2d65f2 => {
  _0x2d65f2.stopPropagation();
  const _0x5c8118 = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", _0x5c8118 ? "true" : "false");
});
mainNav.querySelectorAll("a").forEach(_0x2aeac2 => _0x2aeac2.addEventListener("click", () => {
  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}));
mainNav.querySelectorAll("button.nav-link-btn").forEach(_0x2e24c5 => _0x2e24c5.addEventListener("click", () => {
  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}));
document.addEventListener("click", _0x1d3c62 => {
  if (!mainNav.classList.contains("open")) {
    return;
  }
  if (mainNav.contains(_0x1d3c62.target) || menuToggle.contains(_0x1d3c62.target)) {
    return;
  }
  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
});
const navCustomerCare = document.getElementById("navCustomerCare");
if (navCustomerCare) {
  navCustomerCare.addEventListener("click", _0x288590 => {
    _0x288590.preventDefault();
    const _0x1ebf30 = document.getElementById("utilCustomerCare");
    if (_0x1ebf30) {
      _0x1ebf30.click();
    }
  });
}
const navShareSite = document.getElementById("navShareSite");
if (navShareSite) {
  navShareSite.addEventListener("click", () => {
    const _0x5575b9 = document.getElementById("utilShareSite");
    if (_0x5575b9) {
      _0x5575b9.click();
    }
  });
}
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", _0x19fe26 => {
  _0x19fe26.preventDefault();
  deferredInstallPrompt = _0x19fe26;
});
const navInstallApp = document.getElementById("navInstallApp");
if (navInstallApp) {
  navInstallApp.addEventListener("click", async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
    } else {
      showSiteToast("ব্রাউজার মেনু থেকে \"হোম স্ক্রিনে যোগ করুন\" / \"Install App\" অপশনে ট্যাপ করে অ্যাপটি ইনস্টল করুন।", "📲");
    }
  });
}
const couponsModal = document.getElementById("couponsModal");
const couponsModalClose = document.getElementById("couponsModalClose");
const couponsModalContent = document.getElementById("couponsModalContent");
function couponListItemHtml(_0x13a234) {
  const _0x1cc2af = _0x13a234.type === "free_delivery" ? "🚚 ফ্রি ডেলিভারি" : _0x13a234.type === "fixed" ? formatTaka(_0x13a234.value) + " ছাড়" : _0x13a234.value + "% ছাড়";
  const _0x53e2a3 = _0x13a234.productId ? _0x13a234.productName || "একটি নির্দিষ্ট প্রোডাক্ট" : "সব প্রোডাক্ট (পুরো কার্ট)";
  return "\n    <div class=\"coupon-list-item\">\n      <span class=\"coupon-code\">🏷️ " + (_0x13a234.label || "বিশেষ অফার") + "</span>\n      <span class=\"coupon-desc\">" + _0x53e2a3 + " — " + _0x1cc2af + (_0x13a234.minOrder ? ", সর্বনিম্ন অর্ডার " + formatTaka(_0x13a234.minOrder) : "") + "</span>\n      <button type=\"button\" class=\"btn btn-ghost coupon-use-btn\" data-code=\"" + _0x13a234.code + "\" data-pid=\"" + (_0x13a234.productId || "") + "\">ব্যবহার করুন</button>\n    </div>";
}
async function openCouponsModal() {
  if (!COUPONS.length) {
    await loadCoupons();
  }
  const _0x1284ee = new Date().toISOString().slice(0, 10);
  const _0x1a6b0c = COUPONS.filter(_0x3453e7 => _0x3453e7.active !== false && (!_0x3453e7.expiry || _0x3453e7.expiry >= _0x1284ee));
  couponsModalContent.innerHTML = _0x1a6b0c.length ? _0x1a6b0c.map(couponListItemHtml).join("") : "<p class=\"coupons-empty\">এই মুহূর্তে চালু কোনো কুপন নেই।</p>";
  couponsModalContent.querySelectorAll(".coupon-use-btn").forEach(_0x510cf5 => {
    _0x510cf5.addEventListener("click", () => {
      const _0x2778bb = _0x510cf5.dataset.code;
      const _0x3f94c8 = _0x510cf5.dataset.pid;
      couponsModal.classList.remove("open");
      updateBodyScrollLock();
      applyProductCouponFromChip(_0x2778bb, _0x3f94c8 || null, null);
    });
  });
  couponsModal.classList.add("open");
  updateBodyScrollLock();
}
const navCoupons = document.getElementById("navCoupons");
if (navCoupons) {
  navCoupons.addEventListener("click", () => openCouponsModal());
}
if (couponsModalClose) {
  couponsModalClose.addEventListener("click", () => {
    couponsModal.classList.remove("open");
    updateBodyScrollLock();
  });
}
if (couponsModal) {
  couponsModal.addEventListener("click", _0x1c9254 => {
    if (_0x1c9254.target === couponsModal) {
      couponsModal.classList.remove("open");
      updateBodyScrollLock();
    }
  });
}
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
(async function init() {
  applyDarkMode(localStorage.getItem("openshop_dark_mode") === "1");
  renderWishlistCount();
  renderSiteLikeUI();
  await Promise.all([loadLiveProducts(), loadSiteSettings()]);
  renderCategories();
  renderProducts();
  initHeroSlider();
  renderCart();
  renderFlashSale();
  renderRecentlyViewed();
  markReveal(document.querySelectorAll(".about-card, .faq-item, .section-head"), 0.06);
  logEvent("pageview", {
    path: window.location.pathname
  });
  captureVisitorLocation();
  openProductFromHash(true);
  Promise.all([loadCoupons(), loadReviews(), loadLikes(), loadSiteLikesCount()]).then(() => {
    renderSiteLikeUI();
    renderProducts();
    renderVoucherStrip();
  });
})();
function openProductFromHash(_0x2eb41b) {
  const _0x1c14ee = window.location.hash || "";
  if (!_0x1c14ee.startsWith("#product-")) {
    return;
  }
  const _0x2bb581 = _0x1c14ee.replace("#product-", "");
  if (!PRODUCTS.find(_0x1d800d => _0x1d800d.id === _0x2bb581)) {
    return;
  }
  if (_0x2eb41b) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
    openModal(_0x2bb581);
  } else {
    openModal(_0x2bb581, {
      updateUrl: false
    });
  }
}
window.addEventListener("hashchange", () => openProductFromHash(false));
window.addEventListener("popstate", () => {
  const _0x2bc609 = window.location.hash || "";
  if (_0x2bc609.startsWith("#product-")) {
    const _0x3fadf5 = _0x2bc609.replace("#product-", "");
    if (PRODUCTS.find(_0x2b4ac9 => _0x2b4ac9.id === _0x3fadf5)) {
      openModal(_0x3fadf5, {
        updateUrl: false
      });
    }
  } else if (productModal.classList.contains("open")) {
    productModal.classList.remove("open");
    updateBodyScrollLock();
  }
});