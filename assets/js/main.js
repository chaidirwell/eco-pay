// ==========================================
// GLOBAL SCOPE — shared across all DOMContentLoaded blocks
// ==========================================
let supabase = null;
let currentUser = null;

// Inisialisasi Supabase segera saat skrip dimuat
(function initSupabase() {
    const SUPABASE_URL = 'https://emlwchpnkruibboxviqv.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_srQXJ1lskqDWST8vVb0VFg_0NHCRgxB';
    if (SUPABASE_URL && SUPABASE_URL !== 'ISI_SUPABASE_URL_ANDA') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
})();

document.addEventListener("DOMContentLoaded", function () {

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
    // 2. SISTEM AKUN & AUTENTIKASI
    // ==========================================
    const loginScreen = document.getElementById("login-screen");
    const appInterface = document.getElementById("app-interface");
    const loginForm = document.getElementById("login-form");

    if (loginForm) {
        loginForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            if (submitBtn.disabled) return;
            
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="ph-bold ph-spinner-gap animate-spin"></i> Loading...';

            const userInp = document.getElementById("username").value.trim();
            const passInp = document.getElementById("password").value;

            const { data, error } = await supabase.auth.signInWithPassword({
                    email: userInp,
                    password: passInp
                });

                if (error) {
                    alert(error.message);
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                    return;
                }
                
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                
                currentUser = data.user;
                console.log("CURRENT USER SUPABASE:", currentUser);
                console.log("USER ID:", currentUser.id);
   
            console.log("CURRENT USER:", currentUser);

    
            updateCoinsUI();
            loadAllAssets();
            loadMyAssets();
            loadTransactions();
            loadNotifications();
            // Selalu render voucher aktif setelah login
            setTimeout(() => { if (typeof loadActiveRewards === 'function') loadActiveRewards(); }, 100);

            loginScreen.classList.add("opacity-0");
            setTimeout(() => {
                loginScreen.classList.add("hidden");
                appInterface.classList.remove("hidden");
                appInterface.classList.add("flex");

                const defaultBtn = document.querySelector('[data-target="tab-content-cari"]');
                if (defaultBtn) defaultBtn.click();
            }, 700);
        });
    }
async function updateCoinsUI() {

    if (!currentUser) return;

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("nama, eco_points")
        .eq("id", currentUser.id)
        .single();

    if (error) {
        console.error("PROFILE ERROR:", error);
        return;
    }

    console.log("PROFILE USER:", profile);

    let coins = profile.eco_points || 0;
    const navName = document.getElementById("nav-name");

    if (navName) {
        navName.innerHTML = `${profile.nama} <span class="ml-2 text-[10px] text-red-500 hover:underline cursor-pointer" onclick="logout()">Keluar</span>`;
    }
    
    // Define global logout function
    window.logout = async function() {
        // Sign out dari backend Supabase
        await supabase.auth.signOut();
        // Bersihkan semua state lokal dan session
        localStorage.clear();
        sessionStorage.clear();
        // Paksa muat ulang halaman dari awal agar bersih tanpa sisa cache JS
        window.location.reload();
    };

    const navBalance = document.getElementById("nav-balance");
    const tabBalance = document.getElementById("tab-balance");

    if (navBalance) {
        navBalance.innerText = coins.toLocaleString('id-ID');
    }

    if (tabBalance) {
        tabBalance.innerText = coins.toLocaleString('id-ID');
    }
}

    // ==========================================
    // 3. LOGIKA NAVIGASI MENU (TABS)
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
            if (targetPane) targetPane.classList.remove("hidden"), targetPane.classList.add("block");

            // Render voucher aktif setiap kali tab Reward dibuka
            if (targetId === 'tab-content-reward') {
                if (typeof loadActiveRewards === 'function') loadActiveRewards();
            }
        });
    });

    // ==========================================
    // MODAL ULASAN
    // ==========================================
    window.openReviewsModal = function(assetId) {
        const modal = document.getElementById("modal-reviews");
        const panel = document.getElementById("modal-reviews-panel");
        const backdrop = document.getElementById("modal-reviews-backdrop");
        const summary = document.getElementById("modal-reviews-summary");
        const list = document.getElementById("modal-reviews-list");

        // Cari aset dari local storage
        const allAssets = JSON.parse(localStorage.getItem("ecopay_all_assets") || "[]");
        const asset = allAssets.find(a => String(a.id) === String(assetId));

        if (!asset || !asset.reviews || asset.reviews.length === 0) {
            showToast("Belum ada ulasan untuk aset ini.");
            return;
        }

        const avgRating = asset.reviews.reduce((acc, r) => acc + r.rating, 0) / asset.reviews.length;
        summary.innerHTML = `
            <i class="ph-fill ph-star text-yellow-500 text-lg"></i>
            <span class="text-xl font-bold text-white">${avgRating.toFixed(1)}</span>
            <span class="text-sm text-gray-400 ml-1">(${asset.reviews.length} Ulasan)</span>
        `;

        list.innerHTML = asset.reviews.map(r => `
            <div class="bg-white/5 rounded-xl p-4 border border-white/10 mb-3">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald to-cyan p-[1px]">
                            <div class="w-full h-full bg-[#080d16] rounded-full flex items-center justify-center">
                                <i class="ph-fill ph-user text-gray-400 text-sm"></i>
                            </div>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-white">${r.reviewer_name || 'Pengguna'}</p>
                            <div class="flex items-center text-yellow-500 text-[10px] mt-0.5">
                                ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
                            </div>
                        </div>
                    </div>
                    <span class="text-[9px] text-gray-500">${r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : 'Baru saja'}</span>
                </div>
                <p class="text-xs text-gray-300 mt-2 leading-relaxed">"${r.comment || 'Telah dinilai'}"</p>
            </div>
        `).join('');

        modal.classList.remove("hidden");
        modal.classList.add("flex");
        setTimeout(() => {
            backdrop.classList.remove("opacity-0");
            panel.classList.remove("translate-y-full");
        }, 10);
    };

    window.closeReviewsModal = function() {
        const modal = document.getElementById("modal-reviews");
        const panel = document.getElementById("modal-reviews-panel");
        const backdrop = document.getElementById("modal-reviews-backdrop");

        backdrop.classList.add("opacity-0");
        panel.classList.add("translate-y-full");
        setTimeout(() => {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
        }, 300);
    };

    // ==========================================
    // 4. RENDER KATALOG & ANTI SELF-BORROW
    // ==========================================
    const catalogGrid = document.getElementById("catalog-grid");

    function createAssetCardHTML(asset) {
        // Blokir aksi self-borrow dan self-review
        const isOwner = (currentUser && asset.owner_id === currentUser.id) || asset.owner === currentUser;

        let mediaHTML = asset.image_url
    ? `<img src="${asset.image_url}" 
        alt="${asset.title}" 
        class="w-full h-full object-cover">`
    : `<i class="ph-fill ${asset.icon || 'ph-package'} text-5xl text-gray-600"></i>`;

        let badgeHTML = isOwner
            ? `<div class="absolute top-2 right-2 bg-emerald/90 text-white text-[9px] font-bold px-2 py-1 rounded border border-emerald/50 uppercase tracking-widest animate-pulse">Aset Anda</div>`
                : '';

        let categoryBadge = asset.is_promoted
            ? `<div class="absolute top-2 left-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-[9px] font-bold px-2 py-1 rounded border border-yellow-300/50 uppercase tracking-widest shadow-lg shadow-yellow-500/20"><i class="ph-fill ph-star text-[8px] mr-0.5"></i> Rekomendasi</div>`
            : `<div class="absolute top-2 left-2 bg-darkBg/80 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded border border-white/10 uppercase tracking-widest">${asset.category}</div>`;

        // Badge kondisi
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
                let actionHTML = isOwner
    ? `<div class="bg-gray-800 text-gray-400 font-bold text-[10px] px-3 py-1.5 rounded-lg border border-gray-700 text-center w-full">
        Aset Anda
       </div>`
    : `<div class="grid grid-cols-2 gap-1.5 w-full mt-1">
        <button class="btn-pinjam bg-cyan/20 text-cyan border border-cyan/30 hover:bg-cyan/30 font-bold text-[10px] py-1.5 rounded-md transition-colors"
        data-id="${asset.id}">
        Pinjam
        </button>
        <button onclick="openReview(${asset.id})"
        class="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/20 font-bold text-[10px] py-1.5 rounded-md transition-colors">
        Review
        </button>
       </div>`;

        // Mengembalikan Badge Rating Bintang 1-5 yang hilang
        let ratingHTML = '';
        
        let reviewBadgeHTML = `<div class="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5 text-xs text-yellow-400 cursor-pointer btn-lihat-ulasan" onclick="openReviewsModal('${asset.id}')">⭐ <span class="font-bold text-white">5.0</span> <span class="text-gray-400 text-[10px]">(Ulasan tersedia)</span></div>`;

        if (asset.reviews && asset.reviews.length > 0) {
            const avgRating = asset.reviews.reduce((acc, r) => acc + r.rating, 0) / asset.reviews.length;
            ratingHTML = `
                <div class="absolute bottom-2 left-2 bg-darkBg/90 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 flex items-center gap-1 shadow-lg">
                    <i class="ph-fill ph-star text-yellow-500 text-[10px]"></i>
                    <span class="text-white text-[9px] font-bold">${avgRating.toFixed(1)}</span>
                    <span class="text-gray-400 text-[8px]">(${asset.reviews.length})</span>
                </div>
            `;

            reviewBadgeHTML = `
                <div class="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5 text-xs text-yellow-400 cursor-pointer btn-lihat-ulasan" data-asset-id="${asset.id}" onclick="openReviewsModal('${asset.id}')">
                    ⭐ <span class="font-bold text-white">${avgRating.toFixed(1)}</span> <span class="text-gray-400 text-[10px]">(${asset.reviews.length} Ulasan)</span>
                </div>
            `;
        }
            return `

        <div class="glass-card rounded-2xl overflow-hidden border border-white/5 flex flex-col asset-card bg-gray-900/40" data-title="${(asset.title || "").toLowerCase()}">
            <div class="relative h-32 bg-gray-800 flex items-center justify-center">
                ${mediaHTML}
                ${categoryBadge}
                ${badgeHTML}
                ${ratingHTML}
            </div>
            <div class="p-3 flex flex-col flex-grow">
                <h3 class="text-sm font-bold text-white mb-0.5 leading-tight truncate">${asset.title}</h3>
                ${conditionBadgeHTML}
                <div class="flex items-center gap-1 mb-2">
                    <i class="ph-fill ph-map-pin text-gray-400 text-[10px]"></i>
                    <p class="text-[10px] text-gray-400 truncate">${asset.location}</p>
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

    async function loadAllAssets() {
        if (!catalogGrid || !currentUser) return;

        let allAssets = [];

        if (supabase) {
            const { data, error } = await supabase.from('assets').select('*');
            if (error) {
                console.error("Supabase Error:", error);
                showToast("Gagal memuat katalog dari server.");
            } else {
                allAssets = data || [];
                
                // Fetch reviews
                const { data: reviewsData } = await supabase.from('reviews').select('*');
                if (reviewsData) {
                    allAssets = allAssets.map(asset => ({
                        ...asset,
                        reviews: reviewsData.filter(r => r.asset_id === asset.id || String(r.asset_id) === String(asset.id))
                    }));
                }

                console.log("DATA ASSETS:", allAssets);
                localStorage.setItem("ecopay_all_assets", JSON.stringify(allAssets));
            }
        } else {
            allAssets = JSON.parse(localStorage.getItem("ecopay_all_assets") || "[]");
            const localReviews = JSON.parse(localStorage.getItem("ecopay_reviews") || "[]");
            allAssets = allAssets.map(asset => ({
                ...asset,
                reviews: localReviews.filter(r => String(r.asset_id) === String(asset.id))
            }));
        }
        

        // Ambil daftar ID yang dipromosikan secara lokal (tidak tertimpa Supabase)
        const promotedIds = JSON.parse(localStorage.getItem("ecopay_promoted_ids") || "[]");

        const containerRekomendasi = document.getElementById("container-rekomendasi");
        const rekomendasiGrid = document.getElementById("rekomendasi-grid");

        catalogGrid.innerHTML = '';
        if (rekomendasiGrid) rekomendasiGrid.innerHTML = '';
        
        let hasPromoted = false;

        for (let i = allAssets.length - 1; i >= 0; i--) {
            const asset = allAssets[i];
            // Cek promosi dari Supabase ATAU dari daftar lokal
            const isPromoted = asset.is_promoted === true || promotedIds.includes(String(asset.id));
            const enrichedAsset = { ...asset, is_promoted: isPromoted };
            const html = createAssetCardHTML(enrichedAsset);
            
            if (isPromoted) {
                if (rekomendasiGrid) rekomendasiGrid.insertAdjacentHTML("beforeend", html);
            } else {
                catalogGrid.insertAdjacentHTML("beforeend", html);
            }
        }
        
        if (containerRekomendasi) {
            if (rekomendasiGrid && rekomendasiGrid.children.length > 0) {
                containerRekomendasi.classList.remove("hidden");
            } else {
                containerRekomendasi.classList.add("hidden");
            }
        }
    }
    window.loadAllAssets = loadAllAssets;

    async function loadMyAssets() {
          console.log("USER UNTUK ASET SAYA:", currentUser);
    if (!currentUser) return;
    const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('owner_id', currentUser.id);

    if (error) {
        console.error("LOAD MY ASSETS ERROR:", error);
        return;
    }

    console.log("ASET SAYA:", data);

    const myAssetsGrid = document.getElementById("my-assets-list");

    if (!myAssetsGrid) {
        console.log("Container aset saya tidak ditemukan");
        return;
    }

    myAssetsGrid.innerHTML = "";

    data.forEach(asset => {
        myAssetsGrid.insertAdjacentHTML(
            "beforeend",
            createAssetCardHTML(asset)
        );
    });
    }
    // Realtime Subscription
    if (supabase) {
        supabase.channel('custom-all-channel')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'assets' }, payload => {
                loadAllAssets(); // Auto refresh
            })
            .subscribe();
    }

    // ==========================================
    // 5. UPLOAD ASET SAYA & PETA LEAFLET
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
        document.querySelector('[data-target="tab-content-saya"]').addEventListener("click", function () {
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

                // Fungsi Cerdas: Reverse Geocoding ke OpenStreetMap (Nominatim API)
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

        document.getElementById("btn-current-location").addEventListener("click", function () {
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
            console.log("CURRENT USER:", currentUser);
            console.log("USER ID:", currentUser.id);
            // Data khusus untuk dikirim ke Supabase (hanya kolom yang pasti ada)
            const conditionRating = parseInt(document.getElementById('upload-star-container')?.getAttribute('data-selected') || '0');

            const supabasePayload = {
                title: titleInput,
                category: categoryInput,
                location: document.getElementById("upload-lokasi").value,
                price: parseInt(document.getElementById("upload-tarif").value),
                icon: "ph-package",
                image_url: imageUrl,
                owner_id: currentUser.id,
                condition_rating: conditionRating || null
            };

            if (supabase) {
                   console.log("DATA KIRIM SUPABASE:", JSON.stringify(supabasePayload, null, 2));
                const { error } = await supabase.from('assets').insert([supabasePayload]);
                
                if (error) {
                    console.error("Supabase Insert Error:", error);
                    alert("Gagal mengunggah ke server: " + error.message);
                    btnSubmit.innerHTML = originalText;
                    btnSubmit.disabled = false;
                    return;
                }
            } else {
                // Fallback lokal jika Supabase belum connect
                const allAssets = JSON.parse(localStorage.getItem("ecopay_all_assets") || "[]");
                allAssets.push({
                    id: "usr_" + new Date().getTime(),
                    title: titleInput,
                    category: categoryInput,
                    location: document.getElementById("upload-lokasi").value,
                    price: parseInt(document.getElementById("upload-tarif").value),
                    imageSrc: currentUploadImageSrc,
                    image_url: currentUploadImageSrc,
                    owner: currentUser,
                    condition_rating: conditionRating || null
                });
                localStorage.setItem("ecopay_all_assets", JSON.stringify(allAssets));
            }

            loadAllAssets();
            showToast(`Aset berhasil dipublikasikan!`);

            // Notifikasi Otomatis
            addNotification("Aset Publikasi Sukses", `Berhasil! Aset "${titleInput}" Anda berhasil dipublikasikan ke katalog.`, "success");

            formUpload.reset();
            document.getElementById("upload-preview-container").classList.add("hidden");
            currentUploadImageSrc = "";
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
            document.querySelector('[data-target="tab-content-cari"]').click();
        });
    }

    // ==========================================
    // 6. PEMINJAMAN & TRANSAKSI
    // ==========================================
    const modal = document.getElementById("modal-pinjam");
    let currentTargetCard = null, currentRatePerDay = 0, currentItemName = "";

    function closeModal() {
        document.getElementById("modal-backdrop").classList.add("opacity-0");
        document.getElementById("modal-panel").classList.add("translate-y-full");
        setTimeout(() => { modal.classList.add("hidden"); document.getElementById("modal-duration").value = 1; }, 300);
    }
    document.getElementById("modal-backdrop").addEventListener("click", closeModal);
    document.getElementById("modal-close-icon").addEventListener("click", closeModal);

    document.getElementById("modal-duration").addEventListener("input", function () {
        const total = (parseInt(this.value) || 1) * currentRatePerDay;
        document.getElementById("modal-total").innerText = total.toLocaleString('id-ID');
        document.getElementById("modal-cashback").innerText = `${Math.floor(total * 0.05).toLocaleString('id-ID')} Coins`;
    });

    if (catalogGrid) {
        catalogGrid.addEventListener("click", function (e) {
            const btn = e.target.closest(".btn-pinjam");
            if (!btn) return;

            const assetId = btn.getAttribute("data-id");
            // Gunakan `==` bukan `===` karena ID dari Supabase mungkin Integer, sedangkan dari DOM pasti String
            const assetData = JSON.parse(localStorage.getItem("ecopay_all_assets") || "[]").find(a => a.id == assetId);
            if (!assetData) {
                console.error("Data aset tidak ditemukan untuk ID:", assetId);
                return;
            }

            currentTargetCard = btn.closest(".glass-card");
            currentItemName = assetData.title;
            currentRatePerDay = assetData.price;
            currentAssetId = assetData.id;

            document.getElementById("modal-title").innerText = currentItemName;
            document.getElementById("modal-rate").innerText = currentRatePerDay.toLocaleString('id-ID');
            document.getElementById("modal-total").innerText = currentRatePerDay.toLocaleString('id-ID');
            document.getElementById("modal-location-link").innerText = assetData.location;
            document.getElementById("modal-cashback").innerText = `${Math.floor(currentRatePerDay * 0.05).toLocaleString('id-ID')} Coins`;
            
        console.log("CEK SEMUA MODAL:", document.querySelectorAll("[id^='modal']"));

const modalCover = document.querySelector("#modal-cover");
console.log("HASIL MODAL COVER:", modalCover);

if (!modalCover) {
    console.error("modal-cover tidak ditemukan");
    return;
}

            modalCover.innerHTML = assetData.image_url
    ? `<img src="${assetData.image_url}" class="w-full h-full object-contain">`
    : `<i class="ph-fill ${assetData.icon || 'ph-package'} text-5xl text-gray-600"></i>`;

            modal.classList.remove("hidden");
            setTimeout(() => {
                document.getElementById("modal-backdrop").classList.remove("opacity-0");
                document.getElementById("modal-panel").classList.remove("translate-y-full");
            }, 10);
        });
    }

   document.getElementById("modal-btn-confirm").addEventListener("click", async function () {
        if (!currentTargetCard || !currentUser) return;
        console.log("USER ID SEKARANG:", currentUser.id);
        const totalCost = (parseInt(document.getElementById("modal-duration").value) || 1) * currentRatePerDay;
        const cashback = Math.floor(totalCost * 0.05);

        const { data: profile, error } = await supabase
    .from("profiles")
    .select("eco_points")
    .eq("id", currentUser.id)
    .single();


            if(error){
                console.error("PROFILE ERROR:", error);
                return;
            }
            await supabase
                .from("profiles")
                .update({
                    eco_points: (profile.eco_points || 0) + cashback
                })
                .eq("id", currentUser.id);
                console.log("COINS BERTAMBAH:", cashback);
                // SIMPAN TRANSAKSI
const duration = parseInt(document.getElementById("modal-duration").value) || 1;

const paymentMethod = document.querySelector(
    'input[name="payment-method"]:checked'
)?.value || "qris";

console.log("DATA TRANSAKSI:", {
    user_id: currentUser.id,
    asset_id: currentAssetId,
    duration: duration,
    total_price: totalCost,
    payment_method: paymentMethod,
    status: "pending"
});
const { data: sessionCheck } = await supabase.auth.getSession();

console.log(
  "SESSION CEK:",
  sessionCheck.session
);
const { data: transaction, error: transactionError } = await supabase

    .from("transactions")
    .insert({
        user_id: currentUser.id,
        asset_id: currentAssetId,
        duration: duration,
        total_price: totalCost,
        payment_method: paymentMethod,
        status: "pending"
    })
    .select()
    .single();

if (transactionError) {
    console.error("TRANSACTION ERROR:", transactionError);
    alert("Gagal membuat transaksi");
    return;
}

console.log("TRANSAKSI BERHASIL:", transaction);
            updateCoinsUI();
        let txs = JSON.parse(localStorage.getItem("ecopay_transactions") || "{}");
        if (!txs[currentUser]) txs[currentUser] = [];
        txs[currentUser].unshift({ itemName: currentItemName, days: document.getElementById("modal-duration").value, totalCost, cashback });
        localStorage.setItem("ecopay_transactions", JSON.stringify(txs));

        loadTransactions();

        currentTargetCard.classList.add("opacity-60");
        currentTargetCard.querySelector(".relative.h-36").insertAdjacentHTML("beforeend", `<div class="absolute inset-0 bg-[#080d16]/70 flex items-center justify-center z-10"><span class="bg-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase">Dipinjam</span></div>`);
        const btn = currentTargetCard.querySelector(".btn-pinjam");
        btn.disabled = true; btn.className = "text-[10px] font-bold px-4 py-2 rounded-lg bg-gray-800 text-gray-500"; btn.innerHTML = "Dipinjam";

        closeModal();
        showToast(`Berhasil! Cashback ${cashback} Coins ditambahkan.`);
    });
    function loadTransactions() {
        const trxList = document.getElementById("transaction-list");
        if (!trxList || !currentUser) return;

        trxList.innerHTML = '';
        const userTxs = JSON.parse(localStorage.getItem("ecopay_transactions") || "{}")[currentUser] || [];

        if (userTxs.length === 0) return trxList.innerHTML = '<p class="text-xs text-gray-500 text-center py-4">Belum ada transaksi.</p>';

        userTxs.forEach(tx => {
            trxList.insertAdjacentHTML("beforeend", `
            <div class="glass-card p-4 border border-cyan/20 flex justify-between relative overflow-hidden mt-3">
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-cyan"></div>
                <div class="flex gap-3">
                    <div class="w-10 h-10 bg-[#030712] rounded-lg flex items-center justify-center border border-white/5"><i class="ph-fill ph-check-circle text-cyan"></i></div>
                    <div><h4 class="font-bold text-white text-[11px]">Sewa ${tx.itemName}</h4><p class="text-[10px] text-gray-400 mt-0.5">${tx.days} Hari</p></div>
                </div>
                <div class="text-right flex flex-col items-end">
                    <p class="text-gray-300 font-bold font-mono text-xs mb-0.5">Rp ${tx.totalCost.toLocaleString('id-ID')}</p>
                    <p class="text-yellow-500 font-bold font-mono text-[9px] bg-yellow-500/10 px-1 rounded">+${tx.cashback} Coins</p>
                </div>
            </div>`);
        });
    }

    // ==========================================
    // 7. PENCARIAN KATALOG REAL-TIME
    // ==========================================
    document.getElementById('searchInput').addEventListener('input', function (e) {
        const keyword = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.asset-card').forEach(card => {
            card.style.display = card.getAttribute('data-title').includes(keyword) ? 'flex' : 'none';
        });
    });

    // ==========================================
    // 8. SISTEM NOTIFIKASI
    // ==========================================
    function addNotification(notifTitle, message, type = "success") {
        if (!currentUser) return;
        let notifs = JSON.parse(localStorage.getItem("ecopay_notifications") || "{}");
        if (!notifs[currentUser]) notifs[currentUser] = [];

        notifs[currentUser].unshift({
            id: Date.now(),
            title: notifTitle,
            message: message,
            type: type,
            read: false,
            timestamp: new Date().toISOString()
        });

        localStorage.setItem("ecopay_notifications", JSON.stringify(notifs));
        loadNotifications();
    }

    function loadNotifications() {
        const notifList = document.getElementById("notif-list");
        const notifBadge = document.getElementById("notif-badge");
        if (!notifList || !notifBadge || !currentUser) return;

        notifList.innerHTML = '';
        const userNotifs = JSON.parse(localStorage.getItem("ecopay_notifications") || "{}")[currentUser] || [];

        let unreadCount = 0;

        if (userNotifs.length === 0) {
            notifList.innerHTML = '<p class="text-[11px] text-gray-500 text-center py-6">Belum ada notifikasi baru.</p>';
        } else {
            userNotifs.forEach(n => {
                if (!n.read) unreadCount++;

                let iconHTML;
                if (n.type === 'success') {
                    iconHTML = '<div class="w-8 h-8 rounded-full bg-emerald/20 flex items-center justify-center flex-shrink-0 border border-emerald/50"><i class="ph-bold ph-check text-emerald text-sm"></i></div>';
                } else if (n.type === 'warning') {
                    iconHTML = '<div class="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 border border-red-500/50"><i class="ph-bold ph-warning-circle text-red-500 text-sm"></i></div>';
                } else {
                    iconHTML = '<div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 border border-blue-500/50"><i class="ph-bold ph-info text-blue-400 text-sm"></i></div>';
                }

                let badgeHTML = !n.read
                    ? '<span class="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase">Baru</span>'
                    : '';

                let timeObj = new Date(n.timestamp);
                let timeStr = `${timeObj.getHours().toString().padStart(2, '0')}:${timeObj.getMinutes().toString().padStart(2, '0')}`;
                
                let cardClass = n.read ? 'border-white/5 bg-white/5 opacity-60' : (n.type === 'warning' ? 'border-red-500/30 bg-red-500/5' : 'border-blue-500/30 bg-blue-500/5');

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

    const btnReadAll = document.getElementById("btn-read-all");
    if (btnReadAll) {
        btnReadAll.addEventListener("click", function () {
            if (!currentUser) return;
            let notifs = JSON.parse(localStorage.getItem("ecopay_notifications") || "{}");
            if (notifs[currentUser]) {
                notifs[currentUser].forEach(n => n.read = true);
                localStorage.setItem("ecopay_notifications", JSON.stringify(notifs));
                loadNotifications();
                showToast("Semua notifikasi ditandai sudah dibaca");
            }
        });
    }

    document.getElementById("btn-nav-notif")?.addEventListener("click", () => {
        loadNotifications();
    });
    // ==========================================
    // 10. LOGIKA PENUKARAN REWARD
    // ==========================================
    function loadActiveRewards() {
        if (!currentUser) return;
        const rewards = JSON.parse(localStorage.getItem("ecopay_active_rewards") || "{}")[currentUser] || [];
        const section = document.getElementById("active-rewards-section");
        const list = document.getElementById("active-rewards-list");
        
        if (!section || !list) return;

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
                    <div class="w-10 h-10 ${bgClass.replace('/10','/20')} rounded-full flex items-center justify-center ${textClass}">
                        <i class="ph-fill ${r.icon} text-lg"></i>
                    </div>
                    <div>
                        <h4 class="text-sm font-bold text-white">${r.title}</h4>
                        <p class="text-[10px] text-gray-400 mt-0.5">Berlaku s/d ${new Date(r.expiry).toLocaleDateString('id-ID')}</p>
                    </div>
                </div>
                ${pakaiBtn}
            </div>
            `);
        });

        // Wire: Promosi Produk → buka modal pilih aset
        list.querySelectorAll('.btn-pakai-promosi').forEach(btn => {
            btn.addEventListener('click', function() {
                openPromosiModal(this.getAttribute('data-reward-id'));
            });
        });

        // Wire: Voucher lainnya → gunakan & hapus dari daftar aktif
        list.querySelectorAll('.btn-pakai-voucher').forEach(btn => {
            btn.addEventListener('click', function() {
                const rewardId = this.getAttribute('data-reward-id');
                const rewardTitle = this.getAttribute('data-reward-title');
                useVoucher(rewardId, rewardTitle);
            });
        });
    }

    function useVoucher(rewardId, rewardTitle) {
        // Animasi fade-out kartu sebelum dihapus
        const card = document.getElementById(`reward-card-${rewardId}`);
        if (card) {
            card.classList.add('opacity-0', 'scale-95', 'transition-all', 'duration-300');
        }

        setTimeout(() => {
            // Hapus voucher dari daftar aktif di localStorage
            let allRewards = JSON.parse(localStorage.getItem("ecopay_active_rewards") || "{}");
            if (allRewards[currentUser]) {
                allRewards[currentUser] = allRewards[currentUser].filter(r => String(r.id) !== String(rewardId));
                localStorage.setItem("ecopay_active_rewards", JSON.stringify(allRewards));
            }

            // Re-render daftar voucher aktif
            loadActiveRewards();

            // Notifikasi sukses
            showToast(`Voucher "${rewardTitle}" berhasil digunakan!`);

            // Tambah ke riwayat notifikasi
            addNotification(
                'Voucher Digunakan',
                `Voucher "${rewardTitle}" telah berhasil dipakai. Nikmati manfaatnya!`,
                'success'
            );
        }, 300);
    }

    loadActiveRewards(); // Load on start

    // ==========================================
    // 11. MODAL PILIH ASET UNTUK PROMOSI
    // ==========================================
    let activeRewardIdForPromosi = null;

    function openPromosiModal(rewardId) {
        activeRewardIdForPromosi = rewardId;
        const modal = document.getElementById('modal-promosi');
        const list = document.getElementById('promosi-asset-list');
        if (!modal || !list) return;

        // Load user's own assets
        const allAssets = JSON.parse(localStorage.getItem('ecopay_all_assets') || '[]');
        const myAssets = allAssets.filter(a => a.owner === currentUser || a.owner_id === (currentUser?.id || currentUser));

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

        // Wire asset selection
        list.querySelectorAll('.btn-pilih-aset').forEach(item => {
            item.addEventListener('click', function() {
                const assetId = this.getAttribute('data-asset-id');
                const assetTitle = this.getAttribute('data-asset-title');
                promoteAsset(assetId, assetTitle);
            });
        });

        // Open modal
        modal.classList.remove('hidden');
        setTimeout(() => {
            document.getElementById('modal-promosi-backdrop').classList.remove('opacity-0');
            document.getElementById('modal-promosi-panel').classList.remove('translate-y-full');
        }, 10);
    }

    function closePromosiModal() {
        const backdrop = document.getElementById('modal-promosi-backdrop');
        const panel = document.getElementById('modal-promosi-panel');
        if (backdrop) backdrop.classList.add('opacity-0');
        if (panel) panel.classList.add('translate-y-full');
        setTimeout(() => document.getElementById('modal-promosi')?.classList.add('hidden'), 300);
    }

    document.getElementById('modal-promosi-close')?.addEventListener('click', closePromosiModal);
    document.getElementById('modal-promosi-backdrop')?.addEventListener('click', closePromosiModal);

    function promoteAsset(assetId, assetTitle) {
        // Simpan ID aset yang dipromosikan ke key TERPISAH agar tidak tertimpa Supabase
        let promotedIds = JSON.parse(localStorage.getItem('ecopay_promoted_ids') || '[]');
        if (!promotedIds.includes(String(assetId))) {
            promotedIds.push(String(assetId));
            localStorage.setItem('ecopay_promoted_ids', JSON.stringify(promotedIds));
        }

        // Juga update di ecopay_all_assets untuk konsistensi
        let allAssets = JSON.parse(localStorage.getItem('ecopay_all_assets') || '[]');
        allAssets = allAssets.map(a => {
            if (String(a.id) === String(assetId)) {
                return { ...a, is_promoted: true };
            }
            return a;
        });
        localStorage.setItem('ecopay_all_assets', JSON.stringify(allAssets));

        // Remove the used reward voucher
        if (activeRewardIdForPromosi) {
            let allRewards = JSON.parse(localStorage.getItem('ecopay_active_rewards') || '{}');
            if (allRewards[currentUser]) {
                allRewards[currentUser] = allRewards[currentUser].filter(r => String(r.id) !== String(activeRewardIdForPromosi));
                localStorage.setItem('ecopay_active_rewards', JSON.stringify(allRewards));
            }
        }

        closePromosiModal();
        loadActiveRewards();

        // Refresh catalog so recommended section appears
        loadAllAssets();

        // Navigate to catalog tab
        const cariTabBtn = document.querySelector('.app-menu-btn[data-target="tab-content-cari"]');
        if (cariTabBtn) cariTabBtn.click();

        showToast(`"${assetTitle}" kini tampil di Rekomendasi!`);

        // Add notification
        addNotification('Promosi Aktif', `Aset "${assetTitle}" berhasil dipromosikan dan kini tampil di bagian Produk Direkomendasikan.`, 'success');
    }
    document.querySelectorAll(".btn-tukar-reward").forEach(btn => {
        btn.addEventListener("click", function() {
            if (!currentUser) {
                showToast("Silakan login terlebih dahulu");
                return;
            }

            const cost = parseInt(this.getAttribute("data-cost"));
            const title = this.getAttribute("data-reward");
            const icon = this.getAttribute("data-icon");
            const color = this.getAttribute("data-color");
            
            const navBalance = document.getElementById("nav-balance");
            if (!navBalance) return;
            
            let currentCoins = parseInt(navBalance.innerText.replace(/\./g, '')) || 0;
            
            if (currentCoins < cost) {
                const toast = document.createElement('div');
                toast.className = 'fixed top-10 left-1/2 -translate-x-1/2 z-[1000] bg-red-500/90 text-white px-5 py-2.5 rounded-full font-bold text-xs md:text-sm shadow-2xl animate-fade-in flex items-center gap-2 border border-red-500/50 whitespace-nowrap';
                toast.innerHTML = `<i class="ph-bold ph-warning-circle text-lg"></i> Koin tidak cukup! (Butuh ${cost.toLocaleString('id-ID')})`;
                document.body.appendChild(toast);
                setTimeout(() => { toast.classList.add('opacity-0', 'transition-opacity'); setTimeout(() => toast.remove(), 300); }, 3000);
                return;
            }
            
            // Deduct coins
            currentCoins -= cost;
            navBalance.innerText = currentCoins.toLocaleString('id-ID');
            
            // Save active reward
            let allRewards = JSON.parse(localStorage.getItem("ecopay_active_rewards") || "{}");
            if (!allRewards[currentUser]) allRewards[currentUser] = [];
            
            let expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 7); // Active for 7 days
            
            allRewards[currentUser].unshift({
                id: Date.now(),
                title: title,
                icon: icon,
                color: color,
                expiry: expiryDate.toISOString()
            });
            
            localStorage.setItem("ecopay_active_rewards", JSON.stringify(allRewards));
            
            // Re-render Active Rewards list
            loadActiveRewards();
            
            // Navigate to Reward tab if not already active
            const rewardTabBtn = document.querySelector('.app-menu-btn[data-target="tab-content-reward"]');
            if (rewardTabBtn && !rewardTabBtn.classList.contains("tab-active")) {
                rewardTabBtn.click();
            }
            
            // Scroll to the top of the app interface
            document.getElementById("app-interface").scrollTo({ top: 0, behavior: 'smooth' });
            
            showToast("Berhasil! Koin Anda telah ditukar menjadi Reward");
        });
    });

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-10 left-1/2 -translate-x-1/2 z-[1000] bg-emerald/90 text-white px-5 py-2.5 rounded-full font-bold text-xs md:text-sm shadow-2xl animate-fade-in flex items-center gap-2 border border-emerald/50 whitespace-nowrap';
        toast.innerHTML = `<i class="ph-bold ph-check-circle text-lg"></i> ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => { toast.classList.add('opacity-0', 'transition-opacity'); setTimeout(() => toast.remove(), 300); }, 3000);
    }
    // SIMULASI NOTIFIKASI KETERLAMBATAN
    setTimeout(() => {
        if (currentUser) {
            const notifs = JSON.parse(localStorage.getItem("ecopay_notifications") || "{}")[currentUser] || [];
            const hasWarning = notifs.some(n => n.type === 'warning');
            if (!hasWarning) {
                addNotification("Peringatan Keterlambatan", "Harap segera kembalikan barang sewaan Anda. Tenggat waktu telah lewat 1 hari dan denda harian mulai berlaku.", "warning");
            }
        }
    }, 4000);

});

// ==========================================
// 9. LOGIKA MODAL REVIEW BINTANG
// ==========================================
let currentReviewAssetId = null;
let currentRating = 0;

function openReview(assetId) {
    currentReviewAssetId = assetId;
    currentRating = 0;
    
    const modalReview = document.getElementById("modal-review");
    if (!modalReview) return;
    
    document.getElementById("review-text").value = "";
    
    const starRatingEls = document.querySelectorAll(".star-rating");
    starRatingEls.forEach(s => {
        s.classList.remove("text-yellow-400");
        s.classList.add("text-gray-700");
    });

    modalReview.classList.remove("hidden");
    setTimeout(() => {
        document.getElementById("modal-review-backdrop").classList.remove("opacity-0");
        document.getElementById("modal-review-panel").classList.remove("translate-y-full");
    }, 10);
}

document.addEventListener("DOMContentLoaded", function() {
    const modalReview = document.getElementById("modal-review");
    if (!modalReview) return;

    function closeReviewModal() {
        document.getElementById("modal-review-backdrop").classList.add("opacity-0");
        document.getElementById("modal-review-panel").classList.add("translate-y-full");
        setTimeout(() => { modalReview.classList.add("hidden"); }, 300);
    }

    document.getElementById("modal-review-backdrop")?.addEventListener("click", closeReviewModal);
    document.getElementById("modal-review-close")?.addEventListener("click", closeReviewModal);

    const starRatingEls = document.querySelectorAll(".star-rating");
    starRatingEls.forEach(star => {
        star.addEventListener("click", function() {
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

    document.getElementById("btn-submit-review")?.addEventListener("click", async function() {
        if (currentRating === 0) {
            alert("Mohon berikan rating bintang terlebih dahulu.");
            return;
        }
        
        if (!currentUser) {
            alert("Anda harus login untuk memberikan ulasan.");
            return;
        }

        const reviewText = document.getElementById("review-text") ? document.getElementById("review-text").value : "";

        // Tampilkan loading state
        const submitBtn = document.getElementById("btn-submit-review");
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Mengirim...';
        submitBtn.disabled = true;

        try {
            const payload = {
                asset_id: currentReviewAssetId,
                user_id: currentUser.id,
                reviewer_name: currentUser.user_metadata?.nama || currentUser.email.split('@')[0],
                rating: currentRating,
                comment: reviewText
            };

            const { error } = await supabase.from('reviews').insert([payload]);
            if (error) throw error;

            closeReviewModal();
            
            // Notifikasi sukses
            const toast = document.createElement('div');
            toast.className = 'fixed top-10 left-1/2 -translate-x-1/2 z-[1000] bg-emerald/90 text-white px-5 py-2.5 rounded-full font-bold text-xs md:text-sm shadow-2xl animate-fade-in flex items-center gap-2 border border-emerald/50 whitespace-nowrap';
            toast.innerHTML = `<i class="ph-bold ph-check-circle text-lg"></i> Ulasan ${currentRating} Bintang Terkirim!`;
            document.body.appendChild(toast);
            setTimeout(() => { toast.classList.add('opacity-0', 'transition-opacity'); setTimeout(() => toast.remove(), 300); }, 3000);

            // Fetch ulang aset agar ulasan update real-time
            if (typeof window.loadAllAssets === 'function') {
                await window.loadAllAssets();
            }

        } catch (error) {
            console.error("Gagal mengirim ulasan:", error);
            alert("Gagal mengirim ulasan. Pastikan koneksi stabil.");
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    // ==========================================
    // KONDISI BINTANG FORM UPLOAD ASET
    // ==========================================
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
        star.addEventListener('click', function() {
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
