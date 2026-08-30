// ============================================================================
// KONFIGURASI SUPABASE (Node.js)
// ============================================================================
// Pastikan Anda sudah menginstal library supabase: 
// npm install @supabase/supabase-js dotenv

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Mengambil konfigurasi dari Environment Variables (.env)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Gagal: Supabase URL atau Key tidak ditemukan di environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 1. FUNGSI SIGN-UP USER BARU
 * Mendaftarkan pengguna dan menyimpan sesi aktif secara langsung
 * ke database (via Supabase Auth).
 */
async function signUpNewUser(email, password, fullName) {
    try {
        console.log(`⏳ Memproses pendaftaran untuk ${email}...`);
        
        // Memanggil fungsi signUp bawaan Supabase yang secara otomatis
        // akan membuat user di database dan menghasilkan sesi aktif
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    nama: fullName // metadata kustom (nama lengkap)
                }
            }
        });

        if (error) {
            throw error;
        }

        console.log("✅ Sign-up berhasil!");
        console.log("👉 Session Active:", data.session ? "Ya (Sesi tersimpan)" : "Tidak (Mungkin butuh verifikasi email)");
        return { success: true, user: data.user, session: data.session };

    } catch (error) {
        console.error("❌ Terjadi kesalahan saat Sign-up:", error.message);
        return { success: false, error: error.message };
    }
}

/**
 * 2. FUNGSI PROMOSI PRODUK (INSERT DATA)
 * Menyimpan data promosi produk ke tabel 'promotions' (atau 'assets')
 * lengkap dengan error handling agar sinkronisasi antar device berjalan baik.
 */
async function promoteProduct(assetId, userId, promoDetails) {
    try {
        console.log(`⏳ Menyimpan data promosi produk [${assetId}]...`);

        // Insert data ke tabel, misal tabel 'promotions' atau update status 'assets'
        // Tergantung skema database Anda, di sini kita asumsikan insert ke 'promotions'
        const payload = {
            asset_id: assetId,
            user_id: userId,
            status: 'active',
            details: promoDetails,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('promotions') // Ganti dengan nama tabel promosi Anda jika berbeda
            .insert([payload])
            .select(); // select() memastikan data yang di-insert dikembalikan

        if (error) {
            throw error;
        }

        console.log("✅ Promosi produk berhasil disimpan dan tersinkronisasi!");
        console.log("👉 Data:", data);
        return { success: true, data: data };

    } catch (error) {
        console.error("❌ Gagal menyimpan promosi produk. Pastikan jaringan stabil.");
        console.error("Detail Error:", error.message);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// CONTOH PENGGUNAAN FUNGSI
// ============================================================================
// Hapus komentar (uncomment) fungsi di bawah ini untuk mencoba:

/*
(async () => {
    // 1. Tes Sign Up
    await signUpNewUser("testuser@ecopay.com", "P4ssw0rdAman!", "User Percobaan");

    // 2. Tes Promosi Produk
    await promoteProduct(
        "asset-12345", 
        "user-uuid-67890", 
        "Tampil di halaman depan (Rekomendasi 3K Koin)"
    );
})();
*/

module.exports = { supabase, signUpNewUser, promoteProduct };
