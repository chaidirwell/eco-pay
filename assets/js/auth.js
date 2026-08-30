
console.log("AUTH JS TERLOAD");
document.addEventListener("DOMContentLoaded", function(){

   const SUPABASE_URL = "https://emlwchpnkruibboxviqv.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_srQXJ1lskqDWST8vVb0VFg_0NHCRgxB";
    const supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );
    const btnRegister = document.getElementById("btnRegister");
    btnRegister.addEventListener("click", async function(){

        const nama = document.getElementById("nama").value;
        const email = document.getElementById("email").value.trim()
        console.log("EMAIL TERKIRIM:", email);
        const password = document.getElementById("password").value;
        console.log({
            nama,
            email
        });
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options:{
                data:{
                    nama:nama
                }
            }
        });
        if(error){
    console.error(error);
    alert(error.message);
    return;
}
          alert("Registrasi berhasil. Silahkan login.");
        window.location.href = "index.html";
    });
});