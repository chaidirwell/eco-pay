// ==========================================
// GLOBAL SCOPE — variabel global tunggal
// ==========================================
var SUPABASE_URL = 'https://emlwchpnkruibboxviqv.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_srQXJ1lskqDWST8vVb0VFg_0NHCRgxB';

// Inisialisasi instance client Supabase global tanpa bentrok identifier
var supabase = (window.supabase && typeof window.supabase.createClient === 'function' && SUPABASE_URL !== 'ISI_SUPABASE_URL_ANDA')
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    })
    : (window.supabase || null);

var currentUser = null;

// Helper aman untuk mendapatkan ID/kunci user saat ini (mencegah error [object Object])
function getCurrentUserKey() {
    if (!currentUser) return 'guest';
    if (typeof currentUser === 'string') return currentUser;
    return currentUser.id || currentUser.email || 'user';
}

// Helper aman membaca localStorage tanpa potensi crash JSON
function safeGetStorageJSON(key, fallback = {}) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.warn(`Error parsing localStorage for ${key}:`, e);
        return fallback;
    }
}

// Helper aman menyimpan localStorage
function safeSetStorageJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn(`Error saving localStorage for ${key}:`, e);
    }
}

// Fungsi global logout: membersihkan seluruh sesi aktif Supabase & data lokal
window.logout = async function () {
    try {
        if (supabase && supabase.auth) {
            await supabase.auth.signOut();
        }
    } catch (err) {
        console.warn('Supabase signOut notice:', err);
    } finally {
        currentUser = null;
        const savedPromoted = localStorage.getItem('ecopay_promoted_ids');
        const savedAllAssets = localStorage.getItem('ecopay_all_assets');
        try { localStorage.clear(); } catch (e) {}
        try { sessionStorage.clear(); } catch (e) {}
        if (savedPromoted) localStorage.setItem('ecopay_promoted_ids', savedPromoted);
        if (savedAllAssets) localStorage.setItem('ecopay_all_assets', savedAllAssets);

        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.reset();

        showLoginScreen();
        window.location.reload();
    }
};

// Helper: tampilkan dashboard, sembunyikan login
function showAppInterface() {
    const loginScreen = document.getElementById('login-screen');
    const appInterface = document.getElementById('app-interface');
    if (loginScreen) {
        loginScreen.classList.add('hidden');
        loginScreen.style.display = 'none';
    }
    if (appInterface) {
        appInterface.classList.remove('hidden');
        appInterface.classList.add('flex');
        appInterface.style.display = 'flex';
    }
}

// Helper: tampilkan login screen, sembunyikan dashboard
function showLoginScreen() {
    const loginScreen = document.getElementById('login-screen');
    const appInterface = document.getElementById('app-interface');
    if (appInterface) {
        appInterface.classList.add('hidden');
        appInterface.classList.remove('flex');
        appInterface.style.display = 'none';
    }
    if (loginScreen) {
        loginScreen.classList.remove('hidden');
        loginScreen.style.display = 'flex';
    }
}

document.addEventListener('DOMContentLoaded', function () {

    // ==========================================
    // 1. CEK SESSION AKTIF SAAT HALAMAN DIMUAT
    // ==========================================
    (async function checkExistingSession() {
        if (!supabase) {
            showLoginScreen();
            return;
        }
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error || !data || !data.session || !data.session.user) {
                showLoginScreen();
                return;
            }
            currentUser = data.session.user;
            showAppInterface();
            await updateCoinsUI();
            loadAllAssets();
            loadMyAssets();
            loadTransactions();
            loadNotifications();
            setTimeout(() => { if (typeof loadActiveRewards === 'function') loadActiveRewards(); }, 200);
            setTimeout(() => { if (typeof restoreRentalCountdowns === 'function') restoreRentalCountdowns(); }, 500);
        } catch (err) {
            console.error('Session check error:', err);
            showLoginScreen();
        }
    })();

    // ==========================================
    // 2. UPLOAD GAMBAR KE SUPABASE STORAGE
    // ==========================================

    async function uploadAssetImage(file) {

        if (!file) return null;

        const fileName = `${Date.now()}-${file.name}`;

        const { data, error } = await supabase.storage
            .from("assets-images")
            .upload(fileName, file);

        if (error) {
            console.error("UPLOAD STORAGE ERROR:", error);
            alert(error.message);
            return null;
        }

        const { data: publicUrl } = supabase.storage
            .from("assets-images")
            .getPublicUrl(fileName);
        console.log("URL GAMBAR:", publicUrl.publicUrl);
        console.log("IMAGE URL:", publicUrl.publicUrl);

        return publicUrl.publicUrl;
    }

    // ==========================================
    // 3. SISTEM LOGIN & AUTENTIKASI (ROMBAK TOTAL)
    // ==========================================
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    // Hindari state tombol nyangkut saat pengguna mengetik manual atau autofill berubah
    [usernameInput, passwordInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                const submitBtn = document.getElementById('btn-login-submit') || (loginForm ? loginForm.querySelector('button[type="submit"]') : null);
                if (submitBtn && submitBtn.disabled && !submitBtn.dataset.loggingIn) {
                    submitBtn.disabled = false;
                }
            });
        }
    });

    async function processLogin() {
        const submitBtn = document.getElementById('btn-login-submit') || (loginForm ? loginForm.querySelector('button[type="submit"]') : null);
        const email = (usernameInput ? usernameInput.value : '').trim();
        const password = passwordInput ? passwordInput.value : '';

        if (!email || !password) {
            alert('Email dan password tidak boleh kosong!');
            return;
        }

        const originalHTML = submitBtn ? submitBtn.innerHTML : 'Masuk';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.dataset.loggingIn = 'true';
            submitBtn.innerHTML = '<i class="ph-bold ph-spinner-gap animate-spin"></i> Masuk...';
        }

        try {
            if (!supabase || !supabase.auth) {
                throw new Error('Koneksi Supabase belum terinisialisasi. Silakan refresh halaman.');
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                let errorMsg = error.message || 'Login gagal.';
                if (errorMsg.toLowerCase().includes('invalid login credentials')) {
                    errorMsg = 'Email atau password salah. Jika belum punya akun, silakan klik "Daftar sekarang".';
                } else if (errorMsg.toLowerCase().includes('email not confirmed')) {
                    errorMsg = 'Email akun belum dikonfirmasi. Silakan periksa inbox email Anda.';
                }
                throw new Error(errorMsg);
            }

            if (!data || !data.user) {
                throw new Error('Data user tidak valid.');
            }

            // 1. Set currentUser dengan data user aktif
            currentUser = data.user;

            // 2. Langsung manipulasi style display tanpa delay/transisi bertahap
            const loginScreen = document.getElementById('login-screen');
            const appInterface = document.getElementById('app-interface');
            if (loginScreen) {
                loginScreen.classList.add('hidden');
                loginScreen.style.display = 'none';
            }
            if (appInterface) {
                appInterface.classList.remove('hidden');
                appInterface.classList.add('flex');
                appInterface.style.display = 'flex';
            }

            // 3. Bersihkan input password dari memori
            if (passwordInput) passwordInput.value = '';

            // 4. Muat data dashboard secara langsung
            try { await updateCoinsUI(); } catch (err) { console.error('Coins update error:', err); }
            try { loadAllAssets(); } catch (err) { console.error('Load assets error:', err); }
            try { loadMyAssets(); } catch (err) { console.error('Load my assets error:', err); }
            try { loadTransactions(); } catch (err) { console.error('Load transactions error:', err); }
            try { loadNotifications(); } catch (err) { console.error('Load notifications error:', err); }
            try { if (typeof loadActiveRewards === 'function') loadActiveRewards(); } catch (err) { console.error('Load rewards error:', err); }
            try { if (typeof restoreRentalCountdowns === 'function') restoreRentalCountdowns(); } catch (err) { console.error('Countdown restore error:', err); }

            const defaultTab = document.querySelector('[data-target="tab-content-cari"]');
            if (defaultTab) defaultTab.click();

        } catch (err) {
            console.error('Unhandled login error:', err);
            alert(err.message || err);
        } finally {
            if (submitBtn) {
                delete submitBtn.dataset.loggingIn;
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHTML;
            }
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            processLogin();
        });
    }

    const submitBtnEl = document.getElementById('btn-login-submit');
    if (submitBtnEl) {
        submitBtnEl.addEventListener('click', function (e) {
            if (loginForm) {
                e.preventDefault();
                processLogin();
            }
        });
    }

    // ==========================================
    // 4. UPDATE UI PROFIL & KOIN (RAPiKAN TOMBOL KELUAR)
    // ==========================================
    async function updateCoinsUI() {
        if (!currentUser || !supabase) return;
        const navName    = document.getElementById('nav-name');
        const navBalance = document.getElementById('nav-balance');
        const tabBalance = document.getElementById('tab-balance');

        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('nama, eco_points')
                .eq('id', currentUser.id)
                .single();

            const displayName = (!error && profile && profile.nama)
                ? profile.nama
                : (currentUser.user_metadata?.nama || currentUser.email?.split('@')[0] || 'Pengguna');

            const coins = (!error && profile && typeof profile.eco_points === 'number') ? profile.eco_points : 0;

            if (navName) {
                navName.innerHTML = `<span class="font-medium text-gray-300">${displayName}</span>`;
            }
            if (navBalance) navBalance.innerText = coins.toLocaleString('id-ID');
            if (tabBalance) tabBalance.innerText = coins.toLocaleString('id-ID');
        } catch (err) {
            console.error('PROFILE FETCH ERROR:', err);
            const fallbackName = currentUser.user_metadata?.nama || currentUser.email?.split('@')[0] || 'Pengguna';
            if (navName) {
                navName.innerHTML = `<span class="font-medium text-gray-300">${fallbackName}</span>`;
            }
        }
    }

    // ==========================================
    // 5. LOGIKA NAVIGASI MENU (TABS)
    // ==========================================
    const tabBtns = document.querySelectorAll(".app-menu-btn");
    const tabPanes = document.querySelectorAll(".tab-pane");

    tabBtns.forEach(btn => {
        btn.addEventListener("click", function () {
            tabBtns.forEach(b => {
                b.classList.remove("bg-white/10", "border-white/30", "tab-active");
                b.classList.add("bg-white/5", "border-white/10");
            });

            this.classList.remove("bg-white/5", "border-white/10");
            this.classList.add("bg-white/10", "border-white/30", "tab-active");

            tabPanes.forEach(pane => {
                pane.classList.add("hidden");
                pane.classList.remove("block");
            });

            const targetId = this.getAttribute("data-target");
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.remove("hidden");
                targetPane.classList.add("block");
            }

            // Render voucher aktif setiap kali tab Reward dibuka
            if (targetId === 'tab-content-reward') {
                if (typeof loadActiveRewards === 'function') loadActiveRewards();
            }
        });
    });

    // ==========================================
    // 6. MODAL DAFTAR ULASAN (REVIEWS LIST)
    // ==========================================
    window.openReviewsModal = async function (assetId) {
        const modal = document.getElementById('modal-reviews');
        const panel = document.getElementById('modal-reviews-panel');
        const backdrop = document.getElementById('modal-reviews-backdrop');
        const summary = document.getElementById('modal-reviews-summary');
        const list = document.getElementById('modal-reviews-list');
        if (!modal || !summary || !list) return;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            if (backdrop) backdrop.classList.remove('opacity-0');
            if (panel) panel.classList.remove('translate-y-full');
        }, 10);

        summary.innerHTML = '<i class="ph-bold ph-spinner-gap animate-spin text-gray-400 text-xl"></i>';
        list.innerHTML = '<p class="text-sm text-gray-500 text-center py-8">Memuat ulasan...</p>';

        let reviews = [];
        let profileMap = {};
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('reviews')
                    .select('*')
                    .eq('asset_id', assetId)
                    .order('created_at', { ascending: false });
                if (!error && data) {
                    reviews = data;
                    const userIds = [...new Set(reviews.map(r => r.user_id).filter(Boolean))];
                    if (userIds.length > 0) {
                        try {
                            const { data: profData, error: profErr } = await supabase
                                .from('profiles')
                                .select('*')
                                .in('id', userIds);
                            if (!profErr && profData && Array.isArray(profData)) {
                                profData.forEach(p => {
                                    const resolvedName = p.nama || p.full_name || p.name || p.username || (p.email ? p.email.split('@')[0] : '');
                                    if (resolvedName) {
                                        profileMap[p.id] = resolvedName;
                                    }
                                });
                            }
                        } catch (pErr) {
                            console.warn("Profile fetch notice:", pErr);
                        }
                    }
                }
            } catch (e) {
                console.warn("Reviews fetch error:", e);
            }
        }

        if (reviews.length === 0) {
            summary.innerHTML = '<span class="text-sm text-gray-400">Belum ada ulasan</span>';
            list.innerHTML = `
                <div class="flex flex-col items-center py-10 text-center">
                    <i class="ph-fill ph-star text-4xl text-gray-700 mb-3"></i>
                    <p class="text-sm text-gray-400 font-semibold">Belum ada ulasan untuk aset ini</p>
                    <p class="text-xs text-gray-500 mt-1">Jadilah yang pertama mencoba dan memberikan rating!</p>
                </div>`;
            return;
        }

        const avgRating = reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length;
        summary.innerHTML = `
            <i class="ph-fill ph-star text-yellow-500 text-lg"></i>
            <span class="text-xl font-bold text-white">${avgRating.toFixed(1)}</span>
            <span class="text-sm text-gray-400 ml-1">(${reviews.length} Ulasan)</span>
        `;

        list.innerHTML = reviews.map(r => {
            let authorName = r.reviewer_name || profileMap[r.user_id];
            if (!authorName && currentUser && (r.user_id === currentUser.id || String(r.user_id) === String(currentUser.id))) {
                authorName = currentUser.user_metadata?.nama || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0];
            }
            if (!authorName) {
                authorName = 'Peminjam Terverifikasi';
            }

            const initial = authorName[0].toUpperCase();
            return `
            <div class="bg-white/5 rounded-xl p-4 border border-white/10 mb-3">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald/40 to-cyan/40 flex items-center justify-center text-white font-bold text-sm">
                            ${initial}
                        </div>
                        <div>
                            <p class="text-xs font-bold text-white">${authorName}</p>
                            <div class="flex text-yellow-500 text-[10px] mt-0.5">${'★'.repeat(r.rating || 5)}${'☆'.repeat(5 - (r.rating || 5))}</div>
                        </div>
                    </div>
                    <span class="text-[9px] text-gray-500">${r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : 'Baru saja'}</span>
                </div>
                <p class="text-xs text-gray-300 mt-2 leading-relaxed">${r.comment ? '"' + r.comment + '"' : '<em class="text-gray-500">Tidak ada catatan ulasan</em>'}</p>
            </div>
        `;
        }).join('');
    };

    window.closeReviewsModal = function () {
        const modal = document.getElementById("modal-reviews");
        const panel = document.getElementById("modal-reviews-panel");
        const backdrop = document.getElementById("modal-reviews-backdrop");
        if (backdrop) backdrop.classList.add("opacity-0");
        if (panel) panel.classList.add("translate-y-full");
        setTimeout(() => {
            if (modal) {
                modal.classList.add("hidden");
                modal.classList.remove("flex");
            }
        }, 300);
    };

    // ==========================================
    // 7. RENDER KATALOG & ANTI SELF-BORROW
    // ==========================================
    const catalogGrid = document.getElementById("catalog-grid");

    function createAssetCardHTML(asset, isSlider = false) {
        const isOwner = (currentUser && (asset.owner_id === currentUser.id || String(asset.owner_id) === String(currentUser.id))) || asset.owner === currentUser;
        const isRented = asset.is_available === false || asset.is_available === 'false' || asset.status === 'rented' || asset.status === 'dipinjam';
        const sliderClass = isSlider ? 'w-[230px] min-w-[230px] sm:w-[260px] sm:min-w-[260px] flex-shrink-0' : '';

        let mediaHTML = asset.image_url
            ? `<img src="${asset.image_url}" alt="${asset.title}" class="w-full h-full object-cover">`
            : `<i class="ph-fill ${asset.icon || 'ph-package'} text-5xl text-gray-600"></i>`;

        let rentedOverlayHTML = isRented
            ? `<div class="absolute inset-0 bg-[#080d16]/75 backdrop-blur-[2px] flex items-center justify-center z-10"><span class="bg-red-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-red-400/40 shadow-lg">Sedang Disewa</span></div>`
            : '';

        let badgeHTML = isOwner
            ? `<div class="absolute top-2 right-2 bg-emerald/90 text-white text-[9px] font-bold px-2 py-1 rounded border border-emerald/50 uppercase tracking-widest animate-pulse z-20">Aset Anda</div>`
            : '';

        let categoryBadge = asset.is_promoted
            ? `<div class="absolute top-2 left-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-[9px] font-bold px-2 py-1 rounded border border-yellow-300/50 uppercase tracking-widest shadow-lg shadow-yellow-500/20 z-20"><i class="ph-fill ph-star text-[8px] mr-0.5"></i> Rekomendasi</div>`
            : `<div class="absolute top-2 left-2 bg-darkBg/80 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded border border-white/10 uppercase tracking-widest z-20">${asset.category || 'Umum'}</div>`;

        const conditionLabels = { 5: 'Seperti Baru', 4: 'Baik', 3: 'Cukup', 2: 'Kurang', 1: 'Agak Rusak' };
        const conditionColors = { 5: 'text-emerald', 4: 'text-cyan', 3: 'text-yellow-400', 2: 'text-orange-400', 1: 'text-red-400' };
        let conditionBadgeHTML = '';
        if (asset.condition_rating) {
            const stars = '★'.repeat(asset.condition_rating) + '☆'.repeat(5 - asset.condition_rating);
            const label = conditionLabels[asset.condition_rating] || '';
            const color = conditionColors[asset.condition_rating] || 'text-gray-400';
            conditionBadgeHTML = `<div class="flex items-center gap-1 mt-1 mb-1">
                <span class="${color} text-[11px] tracking-wider">${stars}</span>
                <span class="text-[9px] text-gray-500">${label}</span>
            </div>`;
        }

        let actionHTML;
        if (isOwner) {
            actionHTML = `<div class="bg-gray-800 text-gray-400 font-bold text-[10px] px-3 py-1.5 rounded-lg border border-gray-700 text-center w-full">${isRented ? 'Aset Anda (Disewa)' : 'Aset Anda'}</div>`;
        } else if (isRented) {
            actionHTML = `<div class="grid grid-cols-2 gap-1.5 w-full mt-1">
                <button disabled class="bg-gray-800 text-gray-500 border border-gray-700 font-bold text-[10px] py-1.5 rounded-md cursor-not-allowed opacity-75 text-center">
                    Disewa
                </button>
                <button onclick="openReview('${asset.id}')" class="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/20 active:scale-95 font-bold text-[10px] py-1.5 rounded-md transition-all cursor-pointer">
                    Review
                </button>
               </div>`;
        } else {
            actionHTML = `<div class="grid grid-cols-2 gap-1.5 w-full mt-1">
                <button class="btn-pinjam bg-cyan/20 text-cyan border border-cyan/30 hover:bg-cyan/30 active:scale-95 font-bold text-[10px] py-1.5 rounded-md transition-all cursor-pointer" data-id="${asset.id}">
                    Pinjam
                </button>
                <button onclick="openReview('${asset.id}')" class="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/20 active:scale-95 font-bold text-[10px] py-1.5 rounded-md transition-all cursor-pointer">
                    Review
                </button>
               </div>`;
        }

        let ratingHTML = '';
        let reviewBadgeHTML = `<div class="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5 text-xs text-yellow-400 cursor-pointer btn-lihat-ulasan" onclick="openReviewsModal('${asset.id}')">⭐ <span class="font-bold text-white">5.0</span> <span class="text-gray-400 text-[10px]">(Lihat ulasan)</span></div>`;

        if (asset.reviews && asset.reviews.length > 0) {
            const avgRating = asset.reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / asset.reviews.length;
            ratingHTML = `
                <div class="absolute bottom-2 left-2 bg-darkBg/90 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 flex items-center gap-1 shadow-lg z-20">
                    <i class="ph-fill ph-star text-yellow-500 text-[10px]"></i>
                    <span class="text-white text-[9px] font-bold">${avgRating.toFixed(1)}</span>
                    <span class="text-gray-400 text-[8px]">(${asset.reviews.length})</span>
                </div>
            `;
            reviewBadgeHTML = `
                <div class="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5 text-xs text-yellow-400 cursor-pointer btn-lihat-ulasan" onclick="openReviewsModal('${asset.id}')">
                    ⭐ <span class="font-bold text-white">${avgRating.toFixed(1)}</span> <span class="text-gray-400 text-[10px]">(${asset.reviews.length} Ulasan)</span>
                </div>
            `;
        }

        return `
        <div class="glass-card rounded-2xl overflow-hidden border border-white/5 flex flex-col asset-card bg-gray-900/40 relative ${sliderClass}" data-title="${(asset.title || "").toLowerCase()}">
            <div class="relative h-32 bg-gray-800 flex items-center justify-center overflow-hidden">
                ${mediaHTML}
                ${rentedOverlayHTML}
                ${categoryBadge}
                ${badgeHTML}
                ${ratingHTML}
            </div>
            <div class="p-3 flex flex-col flex-grow">
                <h3 class="text-sm font-bold text-white mb-0.5 leading-tight truncate">${asset.title}</h3>
                ${conditionBadgeHTML}
                <div class="flex items-center gap-1 mb-2">
                    <i class="ph-fill ph-map-pin text-gray-400 text-[10px]"></i>
                    <p class="text-[10px] text-gray-400 truncate">${asset.location || 'Lokasi Terdaftar'}</p>
                </div>
                <div class="mt-auto pt-2 border-t border-white/5 flex flex-col gap-1">
                    <div class="mb-1">
                        <p class="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Tarif Sewa</p>
                        <p class="text-cyan font-bold font-mono text-[13px] whitespace-nowrap overflow-hidden text-ellipsis">Rp ${parseInt(asset.price || 0).toLocaleString('id-ID')}<span class="text-[9px] text-gray-500 font-sans">/hr</span></p>
                    </div>
                    ${reviewBadgeHTML}
                    <div class="mt-1">
                        ${actionHTML}
                    </div>
                </div>
            </div>
        </div>`;
    }

    let _rekomendasiAutoScrollTimer = null;

    function initRekomendasiAutoScroll() {
        const grid = document.getElementById("rekomendasi-grid");
        if (!grid) return;

        if (_rekomendasiAutoScrollTimer) {
            clearInterval(_rekomendasiAutoScrollTimer);
            _rekomendasiAutoScrollTimer = null;
        }

        const cards = grid.querySelectorAll(".asset-card");
        // Aktifkan auto-scroll slider hanya jika item rekomendasi lebih dari 2
        if (cards.length <= 2) return;

        let isPaused = false;
        grid.onmouseenter = () => { isPaused = true; };
        grid.onmouseleave = () => { isPaused = false; };
        grid.ontouchstart = () => { isPaused = true; };
        grid.ontouchend = () => { setTimeout(() => { isPaused = false; }, 2000); };

        _rekomendasiAutoScrollTimer = setInterval(() => {
            if (isPaused) return;

            const firstCard = grid.querySelector(".asset-card");
            const stepWidth = firstCard ? (firstCard.offsetWidth + 16) : 260; // Lebar kartu + gap-4

            const maxScroll = grid.scrollWidth - grid.clientWidth;
            if (grid.scrollLeft >= maxScroll - 15) {
                // Berputar kembali ke awal secara mulus
                grid.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                grid.scrollBy({ left: stepWidth, behavior: 'smooth' });
            }
        }, 3200);
    }

    async function loadAllAssets() {
        if (!catalogGrid) return;

        let allAssets = [];

        try {
            if (supabase) {
                const { data, error } = await supabase
                    .from('assets')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error("Supabase Assets Error:", error);
                    allAssets = safeGetStorageJSON("ecopay_all_assets", []);
                } else {
                    allAssets = Array.isArray(data) ? data : [];

                    try {
                        const { data: reviewsData } = await supabase.from('reviews').select('*');
                        if (reviewsData && Array.isArray(reviewsData)) {
                            allAssets = allAssets.map(asset => ({
                                ...asset,
                                reviews: reviewsData.filter(r => String(r.asset_id) === String(asset.id))
                            }));
                        }
                    } catch (revErr) {
                        console.warn("Reviews fetch notice:", revErr);
                    }

                    safeSetStorageJSON("ecopay_all_assets", allAssets);
                }
            } else {
                allAssets = safeGetStorageJSON("ecopay_all_assets", []);
                const localReviews = safeGetStorageJSON("ecopay_reviews", []);
                allAssets = (Array.isArray(allAssets) ? allAssets : []).map(asset => ({
                    ...asset,
                    reviews: Array.isArray(localReviews) ? localReviews.filter(r => String(r.asset_id) === String(asset.id)) : []
                }));
            }

            if (!Array.isArray(allAssets)) allAssets = [];

            // 1. Ambil daftar ID promosi lokal dari localStorage (parse sebagai array string)
            let promotedIds = [];
            try {
                const parsed = JSON.parse(localStorage.getItem('ecopay_promoted_ids') || '[]');
                if (Array.isArray(parsed)) {
                    promotedIds = parsed.map(id => String(id));
                }
            } catch (e) {
                promotedIds = [];
            }

            const containerRekomendasi = document.getElementById("container-rekomendasi");
            const rekomendasiGrid = document.getElementById("rekomendasi-grid");

            catalogGrid.innerHTML = '';
            if (rekomendasiGrid) rekomendasiGrid.innerHTML = '';

            let hasPromoted = false;

            for (let i = 0; i < allAssets.length; i++) {
                const asset = allAssets[i];
                if (!asset) continue;

                // 1. Periksa kolom asset.is_promoted dari database
                let isPromoted = asset.is_promoted === true || asset.is_promoted === 'true';

                // 2. Jika false/null/undefined, lakukan pengecekan tambahan ke array localStorage
                if (!isPromoted && promotedIds.includes(String(asset.id))) {
                    isPromoted = true;
                }

                // 3. Set enrichedAsset.is_promoted = true secara otomatis sebelum dirender
                const enrichedAsset = { ...asset, is_promoted: isPromoted };

                // 4. Render ke #rekomendasi-grid jika berstatus promosi sebagai item slider
                if (enrichedAsset.is_promoted) {
                    hasPromoted = true;
                    if (rekomendasiGrid) {
                        const sliderHtml = createAssetCardHTML(enrichedAsset, true);
                        rekomendasiGrid.insertAdjacentHTML("beforeend", sliderHtml);
                    }
                }

                // Render SELURUH daftar aset ke katalog utama (#catalog-grid)
                const catalogHtml = createAssetCardHTML(enrichedAsset, false);
                catalogGrid.insertAdjacentHTML("beforeend", catalogHtml);
            }

            // Tampilkan atau sembunyikan container rekomendasi di bagian atas katalog
            if (containerRekomendasi) {
                if (hasPromoted && rekomendasiGrid && rekomendasiGrid.children.length > 0) {
                    containerRekomendasi.classList.remove("hidden");
                    initRekomendasiAutoScroll();
                } else {
                    containerRekomendasi.classList.add("hidden");
                    if (_rekomendasiAutoScrollTimer) {
                        clearInterval(_rekomendasiAutoScrollTimer);
                        _rekomendasiAutoScrollTimer = null;
                    }
                }
            }
        } catch (err) {
            console.error("Critical loadAllAssets error caught safely:", err);
        }
    }
    window.loadAllAssets = loadAllAssets;

    // ==========================================
    // REALTIME SUBSCRIPTION + POLLING FALLBACK
    // ==========================================
    if (supabase && typeof supabase.channel === 'function') {
        supabase.channel('ecopay-assets-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, (payload) => {
                console.log('Realtime change on assets:', payload);
                loadAllAssets();
                if (typeof loadMyAssets === 'function') loadMyAssets();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
                loadAllAssets();
            })
            .subscribe((status) => {
                console.log('Supabase realtime subscription status:', status);
            });

        // Polling fallback berkala
        setInterval(() => { if (currentUser) loadAllAssets(); }, 20000);
    }

    // Listener multi-tab dan sinkronisasi event lokal
    window.addEventListener('storage', (e) => {
        if (!e.key || e.key === 'ecopay_promoted_ids' || e.key === 'ecopay_all_assets') {
            loadAllAssets();
        }
    });

    window.addEventListener('ecopay:promoted', () => {
        loadAllAssets();
    });

    async function loadMyAssets() {
        if (!currentUser) return;
        const myAssetsGrid = document.getElementById("my-assets-list");
        if (!myAssetsGrid) return;

        try {
            let myAssets = [];
            if (supabase) {
                const { data, error } = await supabase
                    .from('assets')
                    .select('*')
                    .eq('owner_id', currentUser.id);

                if (!error && data) myAssets = data;
            }

            if (myAssets.length === 0) {
                const all = safeGetStorageJSON('ecopay_all_assets', []);
                if (Array.isArray(all)) {
                    myAssets = all.filter(a => a.owner_id === currentUser.id || a.owner === currentUser);
                }
            }

            myAssetsGrid.innerHTML = "";
            if (myAssets.length === 0) {
                myAssetsGrid.innerHTML = `
                <div class="col-span-full py-12 text-center text-gray-500">
                    <i class="ph-bold ph-package text-4xl mb-2 block text-gray-600"></i>
                    Belum ada aset yang diunggah. Tambahkan aset pertama Anda di form atas!
                </div>`;
                return;
            }

            myAssets.forEach(asset => {
                myAssetsGrid.insertAdjacentHTML("beforeend", createAssetCardHTML(asset));
            });
        } catch (err) {
            console.error("Load my assets error:", err);
        }
    }
    window.loadMyAssets = loadMyAssets;

    // ==========================================
    // 8. UPLOAD ASET SAYA & PETA LEAFLET
    // ==========================================
    const uploadFile = document.getElementById("upload-file");
    const uploadPreviewImg = document.getElementById("upload-preview-img");
    const formUpload = document.getElementById("form-upload-aset");
    let currentUploadImageSrc = "";

    if (uploadFile) {
        uploadFile.addEventListener("change", function (e) {
            if (this.files && this.files.length > 0) {
                document.getElementById("upload-filename").innerText = this.files[0].name;
                const reader = new FileReader();
                reader.onload = function (evt) {
                    currentUploadImageSrc = evt.target.result;
                    uploadPreviewImg.src = currentUploadImageSrc;
                    document.getElementById("upload-preview-container").classList.remove("hidden");
                }
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    const inputLokasi = document.getElementById("upload-lokasi");
    let uploadMap = null;

    if (document.getElementById("map-picker") && inputLokasi) {
        document.querySelector('[data-target="tab-content-saya"]')?.addEventListener("click", function () {
            setTimeout(() => {
                if (uploadMap) { uploadMap.invalidateSize(); return; }

                uploadMap = L.map('map-picker').setView([-5.147665, 119.432731], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { className: 'map-tiles' }).addTo(uploadMap);

                if (!document.getElementById('leaflet-dark-style')) {
                    const style = document.createElement('style');
                    style.id = 'leaflet-dark-style';
                    style.innerHTML = '.map-tiles { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }';
                    document.head.appendChild(style);
                }

                async function updateLocationName(lat, lng) {
                    inputLokasi.value = `Mendeteksi jalan... (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
                        const data = await response.json();
                        if (data && data.address) {
                            let jalan = data.address.road || data.address.neighbourhood || data.address.suburb || "Lokasi Terpilih";
                            let kota = data.address.city || data.address.town || data.address.village || data.address.county || "";
                            let alamatAsli = kota ? `${jalan}, ${kota}` : jalan;
                            inputLokasi.value = `${alamatAsli} - ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                        } else {
                            inputLokasi.value = `Koordinat Lokasi - ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                        }
                    } catch (e) {
                        inputLokasi.value = `Koordinat Peta (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
                    }
                }

                uploadMap.on('moveend', () => {
                    const center = uploadMap.getCenter();
                    updateLocationName(center.lat, center.lng);
                });

                const initCenter = uploadMap.getCenter();
                updateLocationName(initCenter.lat, initCenter.lng);
            }, 200);
        });

        document.getElementById("btn-current-location")?.addEventListener("click", function () {
            if (!uploadMap || !navigator.geolocation) return;
            const btn = this;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Mencari...';

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    uploadMap.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { animate: true, duration: 1.5 });
                    inputLokasi.value = `Lokasi GPS Anda (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`;
                    btn.innerHTML = '<i class="ph-bold ph-check text-emerald"></i> Lokasi Ditemukan';
                    showToast('Lokasi berhasil disematkan!');
                    setTimeout(() => btn.innerHTML = originalText, 2000);
                },
                () => {
                    btn.innerHTML = '<i class="ph-fill ph-warning-circle text-yellow-500"></i> Akses Ditolak';
                    setTimeout(() => btn.innerHTML = originalText, 2000);
                }
            );
        });
    }

    if (formUpload) {
        formUpload.addEventListener("submit", async function (e) {
            e.preventDefault();
            if (!currentUploadImageSrc) return alert("Mohon pilih foto barang!");

            const titleInput = document.getElementById("upload-nama").value;
            const categoryInput = document.getElementById("upload-kategori").value;

            const btnSubmit = formUpload.querySelector("button[type='submit']");
            const originalText = btnSubmit.innerText;
            btnSubmit.innerHTML = "Mengunggah...";
            btnSubmit.disabled = true;
            const imageFile = document.getElementById("upload-file").files[0];

            let imageUrl = null;
            if (imageFile) {
                imageUrl = await uploadAssetImage(imageFile);
            }
            if (!currentUser) {
                alert("User belum login");
                return;
            }

            const conditionRating = parseInt(document.getElementById('upload-star-container')?.getAttribute('data-selected') || '0');

            const supabasePayload = {
                title: titleInput,
                category: categoryInput,
                location: document.getElementById("upload-lokasi").value,
                price: parseInt(document.getElementById("upload-tarif").value),
                icon: "ph-package",
                image_url: imageUrl || currentUploadImageSrc,
                owner_id: currentUser.id,
                condition_rating: conditionRating || null,
                is_promoted: false
            };

            if (supabase) {
                const { error } = await supabase.from('assets').insert([supabasePayload]);
                if (error) {
                    console.error("Supabase Insert Error:", error);
                    alert("Gagal mengunggah ke server: " + error.message);
                    btnSubmit.innerHTML = originalText;
                    btnSubmit.disabled = false;
                    return;
                }
            } else {
                const allAssets = safeGetStorageJSON("ecopay_all_assets", []);
                allAssets.push({
                    id: "usr_" + new Date().getTime(),
                    ...supabasePayload
                });
                safeSetStorageJSON("ecopay_all_assets", allAssets);
            }

            loadAllAssets();
            loadMyAssets();
            showToast(`Aset berhasil dipublikasikan!`);

            addNotification("Aset Publikasi Sukses", `Berhasil! Aset "${titleInput}" Anda berhasil dipublikasikan ke katalog.`, "success");

            formUpload.reset();
            document.getElementById("upload-preview-container")?.classList.add("hidden");
            currentUploadImageSrc = "";
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
            document.querySelector('[data-target="tab-content-cari"]')?.click();
        });
    }

    // ==========================================
    // 9. PEMINJAMAN & TRANSAKSI (EVENT DELEGATION RESILIENT)
    // ==========================================
    let currentTargetCard = null;
    let currentRatePerDay = 0;
    let currentItemName = "";
    let currentAssetId = null;

    function getBorrowModal() {
        return document.getElementById("modal-container") || document.getElementById("modal-pinjam");
    }

    function closeBorrowModal() {
        const modal = getBorrowModal();
        const backdrop = document.getElementById("modal-backdrop");
        const panel = document.getElementById("modal-panel");
        if (backdrop) backdrop.classList.add("opacity-0");
        if (panel) panel.classList.add("translate-y-full");
        setTimeout(() => {
            if (modal) {
                modal.classList.add("hidden");
                modal.classList.remove("flex");
            }
            const durationEl = document.getElementById("modal-duration");
            if (durationEl) durationEl.value = 1;
        }, 300);
    }
    window.closeBorrowModal = closeBorrowModal;

    document.getElementById("modal-backdrop")?.addEventListener("click", closeBorrowModal);
    document.getElementById("modal-close-icon")?.addEventListener("click", closeBorrowModal);

    document.getElementById("modal-duration")?.addEventListener("input", function () {
        const total = (parseInt(this.value) || 1) * currentRatePerDay;
        const totalEl = document.getElementById("modal-total");
        const cashbackEl = document.getElementById("modal-cashback");
        if (totalEl) totalEl.innerText = total.toLocaleString('id-ID');
        if (cashbackEl) cashbackEl.innerText = `${Math.floor(total * 0.05).toLocaleString('id-ID')} Coins`;
    });

    // Event delegation tombol pinjam ke seluruh dokumen
    document.addEventListener("click", function (e) {
        const btn = e.target.closest(".btn-pinjam");
        if (!btn) return;

        const assetId = btn.getAttribute("data-id");
        if (!assetId) return;

        const allAssets = safeGetStorageJSON("ecopay_all_assets", []);
        const assetData = Array.isArray(allAssets) ? allAssets.find(a => String(a.id) === String(assetId)) : null;

        if (!assetData) {
            console.error("Data aset tidak ditemukan untuk ID:", assetId);
            alert("Data barang tidak ditemukan di sistem. Silakan refresh.");
            return;
        }

        currentTargetCard = btn.closest(".glass-card");
        currentItemName = assetData.title || "Barang Sewa";
        currentRatePerDay = parseInt(assetData.price) || 0;
        currentAssetId = assetData.id;

        const titleEl = document.getElementById("modal-title");
        const rateEl = document.getElementById("modal-rate");
        const totalEl = document.getElementById("modal-total");
        const locLink = document.getElementById("modal-location-link");
        const locTextEl = document.getElementById("modal-location-text");
        const cashbackEl = document.getElementById("modal-cashback");
        const coverEl = document.getElementById("modal-cover");
        const durationEl = document.getElementById("modal-duration");

        if (titleEl) titleEl.innerText = currentItemName;
        if (rateEl) rateEl.innerText = currentRatePerDay.toLocaleString('id-ID');
        if (totalEl) totalEl.innerText = currentRatePerDay.toLocaleString('id-ID');

        const locationString = assetData.location || "Lokasi Terdaftar";
        if (locTextEl) {
            locTextEl.innerText = locationString;
        } else if (locLink) {
            locLink.innerText = locationString;
        }

        if (locLink) {
            locLink.setAttribute("target", "_blank");
            locLink.setAttribute("rel", "noopener noreferrer");

            // Buat URL Google Maps berdasarkan koordinat atau nama lokasi
            const mapsUrl = (assetData.lat && assetData.lng)
                ? `https://www.google.com/maps/search/?api=1&query=${assetData.lat},${assetData.lng}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationString)}`;

            locLink.setAttribute("href", mapsUrl);
        }

        if (cashbackEl) cashbackEl.innerText = `${Math.floor(currentRatePerDay * 0.05).toLocaleString('id-ID')} Coins`;
        if (durationEl) durationEl.value = 1;

        if (coverEl) {
            coverEl.innerHTML = assetData.image_url
                ? `<img src="${assetData.image_url}" class="w-full h-full object-contain">`
                : `<i class="ph-fill ${assetData.icon || 'ph-package'} text-5xl text-gray-600"></i>`;
        }

        const modal = getBorrowModal();
        if (modal) {
            modal.classList.remove("hidden");
            modal.classList.add("flex");
            setTimeout(() => {
                document.getElementById("modal-backdrop")?.classList.remove("opacity-0");
                document.getElementById("modal-panel")?.classList.remove("translate-y-full");
            }, 10);
        }
    });

    // Konfirmasi transaksi sewa
    document.getElementById("modal-btn-confirm")?.addEventListener("click", async function () {
        if (!currentUser) {
            alert("Silakan login terlebih dahulu.");
            return;
        }

        const submitBtn = this;
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Memproses...';

        try {
            const duration = parseInt(document.getElementById("modal-duration")?.value) || 1;
            const totalCost = duration * currentRatePerDay;
            const cashback = Math.floor(totalCost * 0.05);

            const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value || "qris";

            let transactionId = Date.now();

            if (supabase) {
                // Update koin user
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("eco_points")
                    .eq("id", currentUser.id)
                    .single();

                const newPoints = ((profile && profile.eco_points) || 0) + cashback;
                await supabase
                    .from("profiles")
                    .update({ eco_points: newPoints })
                    .eq("id", currentUser.id);

                // Insert transaksi
                const { data: trx, error: trxErr } = await supabase
                    .from("transactions")
                    .insert({
                        user_id: currentUser.id,
                        asset_id: currentAssetId,
                        duration: duration,
                        total_price: totalCost,
                        payment_method: paymentMethod,
                        status: "active"
                    })
                    .select()
                    .single();

                if (!trxErr && trx) transactionId = trx.id;

                // Update status ketersediaan aset di database Supabase
                try {
                    await supabase
                        .from("assets")
                        .update({ is_available: false, status: 'rented' })
                        .eq("id", currentAssetId);
                } catch (astErr) {
                    console.warn("Asset availability update notice:", astErr);
                }
            }

            // Update status ketersediaan di cache lokal
            let allAssets = safeGetStorageJSON('ecopay_all_assets', []);
            if (Array.isArray(allAssets)) {
                allAssets = allAssets.map(a => String(a.id) === String(currentAssetId) ? { ...a, is_available: false, status: 'rented' } : a);
                safeSetStorageJSON('ecopay_all_assets', allAssets);
            }

            await updateCoinsUI();

            // Simpan riwayat transaksi ke localStorage
            const userKey = getCurrentUserKey();
            let txs = safeGetStorageJSON("ecopay_transactions", {});
            if (!Array.isArray(txs[userKey])) txs[userKey] = [];
            txs[userKey].unshift({
                id: transactionId,
                assetId: currentAssetId,
                itemName: currentItemName,
                days: duration,
                totalCost: totalCost,
                cashback: cashback,
                date: new Date().toISOString()
            });
            safeSetStorageJSON("ecopay_transactions", txs);

            loadTransactions();
            await loadAllAssets();

            closeBorrowModal();
            showToast(`Berhasil! Sewa ${currentItemName} aktif & Cashback ${cashback} Coins ditambahkan.`);

            // Mulai countdown sewa
            const DEMO_FACTOR = 60 * 1000; // 60 detik per hari demo
            const rentalEndTime = Date.now() + duration * DEMO_FACTOR;

            let activeRentals = safeGetStorageJSON('ecopay_active_rentals', []);
            if (!Array.isArray(activeRentals)) activeRentals = [];
            activeRentals.push({
                id: transactionId,
                assetId: currentAssetId,
                itemName: currentItemName,
                durationDays: duration,
                endTime: rentalEndTime,
                userId: currentUser.id
            });
            safeSetStorageJSON('ecopay_active_rentals', activeRentals);

            startRentalCountdown(currentItemName, rentalEndTime, transactionId, currentAssetId);

            addNotification('Sewa Berhasil', `Transaksi sewa "${currentItemName}" selama ${duration} hari berhasil. Selamat menggunakan barang!`, 'success');

        } catch (err) {
            console.error("Rental error:", err);
            alert("Terjadi kesalahan saat memproses sewa: " + (err.message || err));
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    function loadTransactions() {
        const trxList = document.getElementById("transaction-list");
        if (!trxList) return;
        if (!currentUser) {
            trxList.innerHTML = '<p class="text-xs text-gray-500 text-center py-4">Silakan login untuk melihat transaksi.</p>';
            return;
        }

        trxList.innerHTML = '';
        const userKey = getCurrentUserKey();
        const allTxs = safeGetStorageJSON("ecopay_transactions", {});
        const userTxs = Array.isArray(allTxs[userKey]) ? allTxs[userKey] : [];

        if (userTxs.length === 0) {
            trxList.innerHTML = '<p class="text-xs text-gray-500 text-center py-4">Belum ada transaksi.</p>';
            return;
        }

        userTxs.forEach(tx => {
            trxList.insertAdjacentHTML("beforeend", `
            <div class="glass-card p-4 border border-cyan/20 flex justify-between relative overflow-hidden mt-3">
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-cyan"></div>
                <div class="flex gap-3">
                    <div class="w-10 h-10 bg-[#030712] rounded-lg flex items-center justify-center border border-white/5"><i class="ph-fill ph-check-circle text-cyan"></i></div>
                    <div><h4 class="font-bold text-white text-[11px]">Sewa ${tx.itemName}</h4><p class="text-[10px] text-gray-400 mt-0.5">${tx.days} Hari</p></div>
                </div>
                <div class="text-right flex flex-col items-end">
                    <p class="text-gray-300 font-bold font-mono text-xs mb-0.5">Rp ${(tx.totalCost || 0).toLocaleString('id-ID')}</p>
                    <p class="text-yellow-500 font-bold font-mono text-[9px] bg-yellow-500/10 px-1 rounded">+${tx.cashback || 0} Coins</p>
                </div>
            </div>`);
        });
    }

    // ==========================================
    // 10. PENCARIAN KATALOG REAL-TIME
    // ==========================================
    document.getElementById('searchInput')?.addEventListener('input', function (e) {
        const keyword = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.asset-card').forEach(card => {
            card.style.display = card.getAttribute('data-title').includes(keyword) ? 'flex' : 'none';
        });
    });

    // ==========================================
    // 11. SISTEM NOTIFIKASI & PERINGATAN
    // ==========================================
    function addNotification(notifTitle, message, type = "success") {
        if (!currentUser) return;
        const userKey = getCurrentUserKey();
        let notifs = safeGetStorageJSON("ecopay_notifications", {});
        if (!Array.isArray(notifs[userKey])) notifs[userKey] = [];

        notifs[userKey].unshift({
            id: Date.now(),
            title: notifTitle,
            message: message,
            type: type,
            read: false,
            timestamp: new Date().toISOString()
        });

        safeSetStorageJSON("ecopay_notifications", notifs);
        loadNotifications();
    }
    window.addNotification = addNotification;

    function loadNotifications() {
        const notifList = document.getElementById("notif-list");
        const notifBadge = document.getElementById("notif-badge");
        if (!notifList || !notifBadge) return;

        if (!currentUser) {
            notifList.innerHTML = '<p class="text-[11px] text-gray-500 text-center py-6">Silakan login terlebih dahulu.</p>';
            notifBadge.classList.add("hidden");
            return;
        }

        notifList.innerHTML = '';
        const userKey = getCurrentUserKey();
        const allNotifs = safeGetStorageJSON("ecopay_notifications", {});
        const userNotifs = Array.isArray(allNotifs[userKey]) ? allNotifs[userKey] : [];

        let unreadCount = 0;

        if (userNotifs.length === 0) {
            notifList.innerHTML = '<p class="text-[11px] text-gray-500 text-center py-6">Belum ada notifikasi baru.</p>';
        } else {
            userNotifs.forEach(n => {
                if (!n.read) unreadCount++;

                let iconHTML = '<div class="w-8 h-8 rounded-full bg-emerald/20 flex items-center justify-center flex-shrink-0 border border-emerald/50"><i class="ph-bold ph-check text-emerald text-sm"></i></div>';
                if (n.type === 'warning') {
                    iconHTML = '<div class="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 border border-red-500/50"><i class="ph-bold ph-warning-circle text-red-500 text-sm animate-pulse"></i></div>';
                } else if (n.type === 'info') {
                    iconHTML = '<div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 border border-blue-500/50"><i class="ph-bold ph-info text-blue-400 text-sm"></i></div>';
                }

                let badgeHTML = !n.read
                    ? '<span class="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase">Baru</span>'
                    : '';

                let timeObj = new Date(n.timestamp);
                let timeStr = `${timeObj.getHours().toString().padStart(2, '0')}:${timeObj.getMinutes().toString().padStart(2, '0')}`;

                let cardClass = n.read ? 'border-white/5 bg-white/5 opacity-60' : (n.type === 'warning' ? 'border-red-500/40 bg-red-500/10' : 'border-blue-500/30 bg-blue-500/5');

                notifList.insertAdjacentHTML("beforeend", `
                <div class="p-4 glass-card border ${cardClass} flex gap-4 transition-all">
                    ${iconHTML}
                    <div class="flex-grow">
                        <div class="flex items-center justify-between mb-1">
                            <div class="flex items-center gap-2">
                                <h4 class="text-xs font-bold text-white">${n.title}</h4>
                                ${badgeHTML}
                            </div>
                            <span class="text-[9px] text-gray-500">${timeStr}</span>
                        </div>
                        <p class="text-[11px] text-gray-300 leading-relaxed">${n.message}</p>
                    </div>
                </div>`);
            });
        }

        if (unreadCount > 0) {
            notifBadge.classList.remove("hidden");
        } else {
            notifBadge.classList.add("hidden");
        }
    }

    document.getElementById("btn-read-all")?.addEventListener("click", function () {
        if (!currentUser) return;
        const userKey = getCurrentUserKey();
        let notifs = safeGetStorageJSON("ecopay_notifications", {});
        if (Array.isArray(notifs[userKey])) {
            notifs[userKey].forEach(n => n.read = true);
            safeSetStorageJSON("ecopay_notifications", notifs);
            loadNotifications();
            showToast("Semua notifikasi ditandai sudah dibaca");
        }
    });

    document.getElementById("btn-nav-notif")?.addEventListener("click", () => {
        loadNotifications();
    });

    // ==========================================
    // 12. LOGIKA PENUKARAN REWARD & VOUCHER
    // ==========================================
    function loadActiveRewards() {
        const section = document.getElementById("active-rewards-section");
        const list = document.getElementById("active-rewards-list");
        if (!section || !list) return;

        if (!currentUser) {
            list.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8 text-center">
                <div class="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <i class="ph-bold ph-ticket text-2xl text-gray-600"></i>
                </div>
                <p class="text-sm font-semibold text-gray-400">Silakan login terlebih dahulu</p>
            </div>`;
            return;
        }

        const userKey = getCurrentUserKey();
        const allRewards = safeGetStorageJSON("ecopay_active_rewards", {});
        const rewards = Array.isArray(allRewards[userKey]) ? allRewards[userKey] : [];

        if (rewards.length === 0) {
            section.classList.remove("hidden");
            list.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8 text-center">
                <div class="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <i class="ph-bold ph-ticket text-2xl text-gray-600"></i>
                </div>
                <p class="text-sm font-semibold text-gray-400">Belum ada voucher aktif</p>
                <p class="text-[11px] text-gray-600 mt-1">Tukar koin Anda di Katalog Reward di bawah</p>
            </div>`;
            return;
        }

        section.classList.remove("hidden");
        list.innerHTML = "";

        rewards.forEach(r => {
            let bgClass = "bg-white/10";
            let borderClass = "border-white/30";
            let textClass = "text-white";

            if (r.color === "yellow") { bgClass = "bg-yellow-500/10"; borderClass = "border-yellow-500/30"; textClass = "text-yellow-500"; }
            else if (r.color === "purple") { bgClass = "bg-purple-500/10"; borderClass = "border-purple-500/30"; textClass = "text-purple-500"; }
            else if (r.color === "cyan") { bgClass = "bg-cyan/10"; borderClass = "border-cyan/30"; textClass = "text-cyan"; }
            else if (r.color === "emerald") { bgClass = "bg-emerald/10"; borderClass = "border-emerald/30"; textClass = "text-emerald"; }

            let pakaiBtn;
            if (r.title === 'Promosi Produk') {
                pakaiBtn = `<button class="btn-pakai-promosi bg-purple-500/20 text-purple-400 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 transition-colors" data-reward-id="${r.id}">Pakai</button>`;
            } else {
                pakaiBtn = `<button class="btn-pakai-voucher bg-white/10 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/20 active:scale-95 transition-all" data-reward-id="${r.id}" data-reward-title="${r.title}">Pakai</button>`;
            }

            list.insertAdjacentHTML("beforeend", `
            <div class="p-4 border ${borderClass} ${bgClass} rounded-2xl flex items-center justify-between transition-all" id="reward-card-${r.id}">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 ${bgClass.replace('/10', '/20')} rounded-full flex items-center justify-center ${textClass}">
                        <i class="ph-fill ${r.icon} text-lg"></i>
                    </div>
                    <div>
                        <h4 class="text-sm font-bold text-white">${r.title}</h4>
                        <p class="text-[10px] text-gray-400 mt-0.5">Berlaku s/d ${new Date(r.expiry).toLocaleDateString('id-ID')}</p>
                    </div>
                </div>
                ${pakaiBtn}
            </div>`);
        });

        // Wire event buttons
        list.querySelectorAll('.btn-pakai-promosi').forEach(btn => {
            btn.addEventListener('click', function () {
                openPromosiModal(this.getAttribute('data-reward-id'));
            });
        });

        list.querySelectorAll('.btn-pakai-voucher').forEach(btn => {
            btn.addEventListener('click', function () {
                const rewardId = this.getAttribute('data-reward-id');
                const rewardTitle = this.getAttribute('data-reward-title');

                if (rewardTitle && (rewardTitle.toLowerCase().includes('token') || rewardTitle.toLowerCase().includes('listrik') || rewardTitle.toLowerCase().includes('air'))) {
                    openUtilitasModal(rewardTitle, () => {
                        useVoucher(rewardId, rewardTitle);
                    });
                } else {
                    useVoucher(rewardId, rewardTitle);
                }
            });
        });
    }

    function useVoucher(rewardId, rewardTitle) {
        const card = document.getElementById(`reward-card-${rewardId}`);
        if (card) {
            card.classList.add('opacity-0', 'scale-95', 'transition-all', 'duration-300');
        }

        setTimeout(() => {
            const userKey = getCurrentUserKey();
            let allRewards = safeGetStorageJSON("ecopay_active_rewards", {});
            if (Array.isArray(allRewards[userKey])) {
                allRewards[userKey] = allRewards[userKey].filter(r => String(r.id) !== String(rewardId));
                safeSetStorageJSON("ecopay_active_rewards", allRewards);
            }

            loadActiveRewards();
            showToast(`Voucher "${rewardTitle}" berhasil digunakan!`);
            addNotification(
                'Voucher Digunakan',
                `Voucher "${rewardTitle}" telah berhasil dipakai. Nikmati manfaatnya!`,
                'success'
            );
        }, 300);
    }

    // ==========================================
    // 13. MODAL PROMOSI PRODUK ANTAR DEVICE
    // ==========================================
    let activeRewardIdForPromosi = null;

    function openPromosiModal(rewardId) {
        activeRewardIdForPromosi = rewardId;
        const modal = document.getElementById('modal-promosi');
        const list = document.getElementById('promosi-asset-list');
        if (!modal || !list) return;

        const allAssets = safeGetStorageJSON('ecopay_all_assets', []);
        const myAssets = Array.isArray(allAssets) ? allAssets.filter(a => a.owner === currentUser || a.owner_id === (currentUser?.id || currentUser)) : [];

        list.innerHTML = '';

        if (myAssets.length === 0) {
            list.innerHTML = `<div class="text-center text-gray-500 text-sm py-10">
                <i class="ph-bold ph-package text-4xl mb-2 block text-gray-700"></i>
                Anda belum memiliki aset yang bisa dipromosikan.<br>
                <span class="text-[11px]">Upload aset terlebih dahulu di menu <strong class="text-white">Aset Saya</strong>.</span>
            </div>`;
        } else {
            myAssets.forEach(asset => {
                const isAlreadyPromoted = asset.is_promoted === true;
                list.insertAdjacentHTML('beforeend', `
                <div class="flex items-center gap-3 p-3 rounded-2xl border ${isAlreadyPromoted ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/10 bg-white/5'} hover:border-purple-500/40 hover:bg-purple-500/5 transition-all cursor-pointer btn-pilih-aset" data-asset-id="${asset.id}" data-asset-title="${asset.title}">
                    <div class="w-12 h-12 rounded-xl overflow-hidden bg-gray-800 flex items-center justify-center flex-shrink-0">
                        ${asset.image_url
                        ? `<img src="${asset.image_url}" class="w-full h-full object-cover">`
                        : `<i class="ph-fill ${asset.icon || 'ph-package'} text-2xl text-gray-600"></i>`
                    }
                    </div>
                    <div class="flex-grow min-w-0">
                        <h4 class="text-sm font-bold text-white truncate">${asset.title}</h4>
                        <p class="text-[10px] text-gray-400">${asset.category || 'Umum'}</p>
                    </div>
                    <div class="flex-shrink-0">
                        ${isAlreadyPromoted
                        ? `<span class="text-yellow-500 text-[10px] font-bold border border-yellow-500/30 px-2 py-1 rounded-lg"><i class="ph-fill ph-star"></i> Aktif</span>`
                        : `<div class="w-6 h-6 rounded-full border-2 border-gray-600 flex items-center justify-center"><div class="w-3 h-3 rounded-full bg-transparent"></div></div>`
                    }
                    </div>
                </div>`);
            });
        }

        list.querySelectorAll('.btn-pilih-aset').forEach(item => {
            item.addEventListener('click', function () {
                const assetId = this.getAttribute('data-asset-id');
                const assetTitle = this.getAttribute('data-asset-title');
                promoteAsset(assetId, assetTitle);
            });
        });

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            document.getElementById('modal-promosi-backdrop')?.classList.remove('opacity-0');
            document.getElementById('modal-promosi-panel')?.classList.remove('translate-y-full');
        }, 10);
    }

    function closePromosiModal() {
        const backdrop = document.getElementById('modal-promosi-backdrop');
        const panel = document.getElementById('modal-promosi-panel');
        if (backdrop) backdrop.classList.add('opacity-0');
        if (panel) panel.classList.add('translate-y-full');
        setTimeout(() => {
            const modal = document.getElementById('modal-promosi');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        }, 300);
    }

    document.getElementById('modal-promosi-close')?.addEventListener('click', closePromosiModal);
    document.getElementById('modal-promosi-backdrop')?.addEventListener('click', closePromosiModal);

    async function promoteAsset(assetId, assetTitle) {
        try {
            // Update langsung ke Supabase (sinkron lintas device)
            if (supabase) {
                const { error } = await supabase
                    .from('assets')
                    .update({ is_promoted: true })
                    .eq('id', assetId);

                if (error) console.error("Update asset promote error:", error);
            }

            let promotedIds = safeGetStorageJSON('ecopay_promoted_ids', []);
            if (!Array.isArray(promotedIds)) promotedIds = [];
            if (!promotedIds.includes(String(assetId))) {
                promotedIds.push(String(assetId));
                safeSetStorageJSON('ecopay_promoted_ids', promotedIds);
            }

            let allAssets = safeGetStorageJSON('ecopay_all_assets', []);
            if (Array.isArray(allAssets)) {
                allAssets = allAssets.map(a => String(a.id) === String(assetId) ? { ...a, is_promoted: true } : a);
                safeSetStorageJSON('ecopay_all_assets', allAssets);
            }

            if (activeRewardIdForPromosi) {
                const userKey = getCurrentUserKey();
                let allRewards = safeGetStorageJSON('ecopay_active_rewards', {});
                if (Array.isArray(allRewards[userKey])) {
                    allRewards[userKey] = allRewards[userKey].filter(r => String(r.id) !== String(activeRewardIdForPromosi));
                    safeSetStorageJSON('ecopay_active_rewards', allRewards);
                }
            }

            closePromosiModal();
            loadActiveRewards();
            await loadAllAssets();

            // Pemicu event storage untuk sinkronisasi instan multi-tab
            try {
                window.dispatchEvent(new Event('storage'));
                window.dispatchEvent(new CustomEvent('ecopay:promoted', { detail: { assetId, assetTitle } }));
            } catch (evErr) {
                console.warn('Dispatch event notice:', evErr);
            }

            const cariTabBtn = document.querySelector('.app-menu-btn[data-target="tab-content-cari"]');
            if (cariTabBtn) cariTabBtn.click();

            showToast(`"${assetTitle}" kini tampil di Rekomendasi di seluruh perangkat!`);
            addNotification('Promosi Aktif', `Aset "${assetTitle}" berhasil dipromosikan dan kini tampil di bagian Produk Direkomendasikan di semua perangkat.`, 'success');
        } catch (err) {
            console.error("Promote asset error:", err);
            alert("Gagal mempromosikan aset: " + (err.message || err));
        }
    }

    // ==========================================
    // 14. PENUKARAN REWARD DENGAN INPUT TOKEN
    // ==========================================
    let utilitasCallback = null;

    window.openUtilitasModal = function (rewardTitle, onComplete) {
        utilitasCallback = onComplete;
        const modal = document.getElementById('modal-utilitas');
        const titleEl = document.getElementById('utilitas-title');
        const jenisEl = document.getElementById('utilitas-jenis');
        const nomorEl = document.getElementById('utilitas-nomor');

        if (!modal) return;
        if (titleEl && rewardTitle) titleEl.textContent = rewardTitle;
        if (jenisEl) {
            jenisEl.value = rewardTitle && rewardTitle.toLowerCase().includes('air') ? 'Air PDAM' : 'Listrik PLN';
        }
        if (nomorEl) nomorEl.value = '';

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            document.getElementById('modal-utilitas-backdrop')?.classList.remove('opacity-0');
            document.getElementById('modal-utilitas-panel')?.classList.remove('translate-y-full');
        }, 10);
    };

    window.closeUtilitasModal = function () {
        document.getElementById('modal-utilitas-backdrop')?.classList.add('opacity-0');
        document.getElementById('modal-utilitas-panel')?.classList.add('translate-y-full');
        setTimeout(() => {
            const modal = document.getElementById('modal-utilitas');
            if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
        }, 300);
    };

    // Form input nomor token/meter
    const formUtilitas = document.getElementById('form-utilitas');
    if (formUtilitas) {
        formUtilitas.addEventListener('submit', function (e) {
            e.preventDefault();
            const jenis = document.getElementById('utilitas-jenis')?.value || 'Listrik PLN';
            const nomor = document.getElementById('utilitas-nomor')?.value.trim();

            if (!nomor || nomor.length < 4) {
                alert('Silakan masukkan Nomor Meteran / ID Pelanggan yang valid!');
                return;
            }

            closeUtilitasModal();

            if (typeof utilitasCallback === 'function') {
                utilitasCallback(nomor, jenis);
                utilitasCallback = null;
            } else {
                showToast(`✅ ${jenis} untuk ID ${nomor} berhasil diproses!`);
                addNotification('Token Utilitas Berhasil', `Pengisian ${jenis} ke nomor ${nomor} berhasil diproses. Saldo/token Anda telah aktif.`, 'success');
            }
        });
    }

    // Tombol Tukar di Katalog Reward
    document.querySelectorAll(".btn-tukar-reward").forEach(btn => {
        btn.addEventListener("click", async function () {
            if (!currentUser) {
                showToast("Silakan login terlebih dahulu");
                return;
            }

            const cost = parseInt(this.getAttribute("data-cost")) || 0;
            const title = this.getAttribute("data-reward") || "Reward";
            const icon = this.getAttribute("data-icon") || "ph-ticket";
            const color = this.getAttribute("data-color") || "yellow";

            const navBalance = document.getElementById("nav-balance");
            let currentCoins = parseInt(navBalance ? navBalance.innerText.replace(/\./g, '') : '0') || 0;

            if (currentCoins < cost) {
                showToast(`Koin tidak cukup! (Butuh ${cost.toLocaleString('id-ID')} Coins)`);
                return;
            }

            const isUtility = title.toLowerCase().includes('token') || title.toLowerCase().includes('listrik') || title.toLowerCase().includes('air') || title.toLowerCase().includes('pdam');

            if (isUtility) {
                openUtilitasModal(title, async (nomorMeter, jenisLayanan) => {
                    // Potong koin
                    currentCoins -= cost;
                    if (navBalance) navBalance.innerText = currentCoins.toLocaleString('id-ID');
                    if (supabase) {
                        await supabase.from("profiles").update({ eco_points: currentCoins }).eq("id", currentUser.id);
                    }

                    showToast(`Berhasil! ${title} untuk No. ${nomorMeter} berhasil diklaim.`);
                    addNotification('Klaim Token Berhasil', `Pengisian ${jenisLayanan} sebesar Rp 50.000 ke nomor meter/pelanggan ${nomorMeter} telah berhasil diproses.`, 'success');
                });
                return;
            }

            // Potong koin langsung untuk reward non-utilitas
            currentCoins -= cost;
            if (navBalance) navBalance.innerText = currentCoins.toLocaleString('id-ID');
            if (supabase) {
                await supabase.from("profiles").update({ eco_points: currentCoins }).eq("id", currentUser.id);
            }

            const userKey = getCurrentUserKey();
            let allRewards = safeGetStorageJSON("ecopay_active_rewards", {});
            if (!Array.isArray(allRewards[userKey])) allRewards[userKey] = [];

            let expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 7);

            allRewards[userKey].unshift({
                id: Date.now(),
                title: title,
                icon: icon,
                color: color,
                expiry: expiryDate.toISOString()
            });

            safeSetStorageJSON("ecopay_active_rewards", allRewards);
            loadActiveRewards();

            const rewardTabBtn = document.querySelector('.app-menu-btn[data-target="tab-content-reward"]');
            if (rewardTabBtn && !rewardTabBtn.classList.contains("tab-active")) {
                rewardTabBtn.click();
            }

            document.getElementById("app-interface")?.scrollTo({ top: 0, behavior: 'smooth' });
            showToast("Berhasil! Koin Anda telah ditukar menjadi Reward");
            addNotification('Reward Diklaim', `Anda berhasil menukar ${cost.toLocaleString('id-ID')} Coins untuk "${title}".`, 'success');
        });
    });

    function showToast(message, type = 'success') {
        // Hapus toast sebelumnya agar tidak menumpuk
        document.querySelectorAll('.app-toast-notification').forEach(t => t.remove());

        const toast = document.createElement('div');
        const isError = type === 'error' || type === 'warning' || message.toLowerCase().includes('tidak cukup') || message.toLowerCase().includes('gagal');
        const bgClass = isError
            ? 'bg-red-500/95 border-red-400/50 shadow-[0_10px_30px_rgba(239,68,68,0.35)]'
            : 'bg-emerald/95 border-emerald/50 shadow-[0_10px_30px_rgba(16,185,129,0.35)]';
        const iconClass = isError
            ? 'ph-warning-circle text-red-100'
            : 'ph-check-circle text-emerald-100';

        toast.className = `app-toast-notification fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 z-[9999] max-w-[90vw] w-auto sm:max-w-md ${bgClass} text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm border backdrop-blur-md animate-fade-in flex items-center gap-2.5 pointer-events-none break-words text-left transition-all duration-300`;
        toast.innerHTML = `<i class="ph-bold ${iconClass} text-lg sm:text-xl flex-shrink-0"></i> <span class="flex-grow leading-tight break-words">${message}</span>`;
        
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('opacity-0', '-translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }
    window.showToast = showToast;

    // ==========================================
    // 15. COUNTDOWN TIMER SEWA & PERINGATAN OTOMATIS
    // ==========================================
    const _rentalTimers = {};

    window.startRentalCountdown = function startRentalCountdown(itemName, endTime, rentalId, assetId) {
        const section = document.getElementById('countdown-section');
        const list = document.getElementById('countdown-list');
        if (!section || !list) return;
        section.classList.remove('hidden');

        const cardId = `countdown-card-${rentalId}`;
        if (!document.getElementById(cardId)) {
            list.insertAdjacentHTML('beforeend', `
            <div id="${cardId}" class="p-4 bg-gradient-to-r from-cyan/10 to-[#030712] border border-cyan/30 rounded-2xl flex items-center justify-between gap-3 transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-cyan/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <i class="ph-fill ph-timer text-cyan text-lg"></i>
                    </div>
                    <div>
                        <p class="text-xs font-bold text-white truncate max-w-[150px]">${itemName}</p>
                        <p class="text-[10px] text-gray-400">Sisa waktu sewa</p>
                    </div>
                </div>
                <div id="countdown-display-${rentalId}" class="text-cyan font-bold font-mono text-sm text-right tabular-nums">--:--:--</div>
            </div>`);
        }

        if (_rentalTimers[rentalId]) clearInterval(_rentalTimers[rentalId]);

        _rentalTimers[rentalId] = setInterval(async () => {
            const remaining = endTime - Date.now();
            const display = document.getElementById(`countdown-display-${rentalId}`);
            const card = document.getElementById(cardId);

            if (remaining <= 0) {
                clearInterval(_rentalTimers[rentalId]);
                if (display) display.textContent = 'Selesai';
                if (card) { card.classList.remove('border-cyan/30'); card.classList.add('border-red-500/30', 'from-red-500/10'); }

                // Kembalikan status aset menjadi tersedia di Supabase
                if (supabase && assetId) {
                    try {
                        await supabase
                            .from('assets')
                            .update({ is_available: true, status: 'available' })
                            .eq('id', assetId);
                    } catch (e) {
                        console.warn('Restore asset availability notice:', e);
                    }
                }

                // Kembalikan status di cache lokal
                let allAssets = safeGetStorageJSON('ecopay_all_assets', []);
                if (Array.isArray(allAssets) && assetId) {
                    allAssets = allAssets.map(a => String(a.id) === String(assetId) ? { ...a, is_available: true, status: 'available' } : a);
                    safeSetStorageJSON('ecopay_all_assets', allAssets);
                }

                // Hapus dari active rentals
                let ar = safeGetStorageJSON('ecopay_active_rentals', []);
                if (Array.isArray(ar)) {
                    ar = ar.filter(r => String(r.id) !== String(rentalId));
                    safeSetStorageJSON('ecopay_active_rentals', ar);
                }

                await loadAllAssets();
                showRentalExpiredModal(itemName);

                addNotification('⏰ Masa Sewa Berakhir', `Masa sewa "${itemName}" telah berakhir. Harap segera kembalikan barang kepada pemilik tepat waktu.`, 'warning');
                return;
            }

            const h = Math.floor(remaining / 3600000);
            const m = Math.floor((remaining % 3600000) / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            if (display) display.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

            if (remaining < 300000 && card) card.classList.add('animate-pulse');
        }, 1000);
    };

    window.restoreRentalCountdowns = function () {
        const active = safeGetStorageJSON('ecopay_active_rentals', []);
        const uid = currentUser ? currentUser.id : null;
        if (Array.isArray(active) && uid) {
            active.filter(r => (r.userId === uid || String(r.userId) === String(uid)) && r.endTime > Date.now())
                  .forEach(r => startRentalCountdown(r.itemName, r.endTime, r.id, r.assetId));
        }
    };

    window.showRentalExpiredModal = function (itemName) {
        const modal = document.getElementById('modal-rental-expired');
        const nameEl = document.getElementById('rental-expired-name');
        if (!modal) return;
        if (nameEl) nameEl.textContent = itemName;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    window.closeRentalExpiredModal = function () {
        const modal = document.getElementById('modal-rental-expired');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    // ==========================================
    // 16. REVIEW BINTANG MODAL & EVENT LISTENER
    // ==========================================
    let currentReviewAssetId = null;
    let currentRating = 0;

    window.openReview = function (assetId) {
        currentReviewAssetId = assetId;
        currentRating = 0;

        const modalReview = document.getElementById("modal-review");
        if (!modalReview) return;

        const reviewTextEl = document.getElementById("review-text");
        if (reviewTextEl) reviewTextEl.value = "";

        const starRatingEls = document.querySelectorAll(".star-rating");
        starRatingEls.forEach(s => {
            s.classList.remove("text-yellow-400");
            s.classList.add("text-gray-700");
        });

        modalReview.classList.remove("hidden");
        modalReview.classList.add("flex");
        setTimeout(() => {
            document.getElementById("modal-review-backdrop")?.classList.remove("opacity-0");
            document.getElementById("modal-review-panel")?.classList.remove("translate-y-full");
        }, 10);
    };

    function closeReviewModal() {
        const modalReview = document.getElementById("modal-review");
        document.getElementById("modal-review-backdrop")?.classList.add("opacity-0");
        document.getElementById("modal-review-panel")?.classList.add("translate-y-full");
        setTimeout(() => {
            if (modalReview) {
                modalReview.classList.add("hidden");
                modalReview.classList.remove("flex");
            }
        }, 300);
    }

    document.getElementById("modal-review-backdrop")?.addEventListener("click", closeReviewModal);
    document.getElementById("modal-review-close")?.addEventListener("click", closeReviewModal);

    const starRatingEls = document.querySelectorAll(".star-rating");
    starRatingEls.forEach(star => {
        star.addEventListener("click", function () {
            const val = parseInt(this.getAttribute("data-val"));
            currentRating = val;
            starRatingEls.forEach(s => {
                if (parseInt(s.getAttribute("data-val")) <= val) {
                    s.classList.remove("text-gray-700");
                    s.classList.add("text-yellow-400");
                } else {
                    s.classList.remove("text-yellow-400");
                    s.classList.add("text-gray-700");
                }
            });
        });
    });

    document.getElementById("btn-submit-review")?.addEventListener("click", async function () {
        if (currentRating === 0) {
            alert("Mohon berikan rating bintang (1-5) terlebih dahulu.");
            return;
        }

        if (!currentUser) {
            alert("Anda harus login untuk memberikan ulasan.");
            return;
        }

        const reviewText = document.getElementById("review-text") ? document.getElementById("review-text").value : "";

        const submitBtn = document.getElementById("btn-submit-review");
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Mengirim...';
        submitBtn.disabled = true;

        try {
            const payload = {
                asset_id: currentReviewAssetId,
                user_id: currentUser.id,
                rating: currentRating,
                comment: reviewText
            };

            if (supabase) {
                const { error } = await supabase.from('reviews').insert([payload]);
                if (error) throw error;
            }

            closeReviewModal();
            showToast(`Ulasan ${currentRating} Bintang Terkirim!`);
            addNotification('Ulasan Berhasil', `Terima kasih! Ulasan ${currentRating} bintang Anda telah dipublikasikan.`, 'success');

            await loadAllAssets();

        } catch (error) {
            console.error("Gagal mengirim ulasan:", error);
            alert("Gagal mengirim ulasan: " + (error.message || error));
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    // Rating Bintang di Form Upload Aset
    const uploadStarLabels = {
        1: '⭐ Agak Rusak / Butuh Perbaikan',
        2: '⭐⭐ Kurang / Berfungsi Seadanya',
        3: '⭐⭐⭐ Cukup / Ada Lecet Pemakaian',
        4: '⭐⭐⭐⭐ Baik / Mulus Normal',
        5: '⭐⭐⭐⭐⭐ Sangat Baik / Seperti Baru'
    };
    const uploadStarColors = { 1: 'text-red-400', 2: 'text-orange-400', 3: 'text-yellow-400', 4: 'text-cyan', 5: 'text-emerald' };

    const uploadStars = document.querySelectorAll('.upload-star');
    const uploadStarContainer = document.getElementById('upload-star-container');
    const uploadStarLabelEl = document.getElementById('upload-star-label');

    uploadStars.forEach(star => {
        star.addEventListener('click', function () {
            const val = parseInt(this.getAttribute('data-val'));
            if (uploadStarContainer) uploadStarContainer.setAttribute('data-selected', val);

            uploadStars.forEach(s => {
                if (parseInt(s.getAttribute('data-val')) <= val) {
                    s.classList.remove('text-gray-700');
                    s.classList.add('text-yellow-400');
                } else {
                    s.classList.remove('text-yellow-400');
                    s.classList.add('text-gray-700');
                }
            });

            if (uploadStarLabelEl) {
                uploadStarLabelEl.textContent = uploadStarLabels[val] || '';
                uploadStarLabelEl.className = `text-center text-[11px] font-semibold ${uploadStarColors[val] || 'text-gray-400'}`;
            }
        });
    });

});

