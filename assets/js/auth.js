
console.log("AUTH JS TERLOAD");
document.addEventListener("DOMContentLoaded", function () {
    const SUPABASE_URL = "https://emlwchpnkruibboxviqv.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_srQXJ1lskqDWST8vVb0VFg_0NHCRgxB";

    const supabaseClient = (window.supabase && SUPABASE_URL) 
        ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        : null;

    const btnRegister = document.getElementById("btnRegister");
    if (!btnRegister) return;

    btnRegister.addEventListener("click", async function () {
        if (!supabaseClient) {
            alert("Koneksi Supabase belum terinisialisasi.");
            return;
        }

        const nama = (document.getElementById("nama")?.value || "").trim();
        const email = (document.getElementById("email")?.value || "").trim();
        const password = document.getElementById("password")?.value || "";

        if (!nama || !email || !password) {
            alert("Mohon lengkapi seluruh kolom formulir pendaftaran.");
            return;
        }

        if (password.length < 6) {
            alert("Password minimal 6 karakter.");
            return;
        }

        const originalText = btnRegister.innerHTML;
        btnRegister.disabled = true;
        btnRegister.innerHTML = '<i class="ph-bold ph-spinner animate-spin mr-2"></i> Mendaftarkan...';

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        nama: nama
                    }
                }
            });

            if (error) {
                console.error("Sign up error:", error);
                alert("Registrasi gagal: " + error.message);
                return;
            }

            alert("Registrasi berhasil! Silakan masuk dengan akun baru Anda.");
            window.location.href = "index.html";
        } catch (err) {
            console.error("Registration error:", err);
            alert("Terjadi kesalahan: " + (err.message || err));
        } finally {
            btnRegister.disabled = false;
            btnRegister.innerHTML = originalText;
        }
    });
});