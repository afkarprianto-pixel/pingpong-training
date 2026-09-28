import React, { useEffect, useState } from "react";

import { supabase } from "./supabase";

import "./App.css";
import pingpongTrainingLogo from "./assets/pingpong-training-logo.png";
import heroTraining from "./assets/hero-training.png";
import qrisBca from "./assets/qris-bca.png";



const PELATIH_UID = "dfd45087-ef50-450c-8df4-259c64495c7a";

const rupiah = (n) => "Rp" + Math.round(Number(n) || 0).toLocaleString("id-ID") + ",-";
const angkaRupiah = (n) => Math.round(Number(n) || 0).toLocaleString("id-ID");
const bacaRupiah = (s) => Number(String(s).replace(/\D/g, "")) || 0;
const durasiJam = (mulai, selesai) => {
  const [a, b] = String(mulai || "00:00").split(":").map(Number);
  const [c, d] = String(selesai || "00:00").split(":").map(Number);
  return Math.max(0, (c * 60 + d - a * 60 - b) / 60);
};

const selesaiDariDurasi = (mulai, jam) => {
  const [h,m] = String(mulai||"00:00").split(":").map(Number);
  const menit = h*60+m+Number(jam)*60;
  return `${String(Math.floor(menit/60)).padStart(2,"0")}:${String(menit%60).padStart(2,"0")}`;
};
const emptySchedule = { coach_rate: 300000, rental_rate_per_hour: 50000, day: "Selasa", start_time: "14:00", end_time: "16:00", type: "Group", coach: "Teguh Orina", quota: 4, min_participants: 3, is_active: true };



function App() {

  const [session, setSession] = useState(null);

  const [authReady, setAuthReady] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");

  const [loginPassword, setLoginPassword] = useState("");

  const [loginError, setLoginError] = useState("");

  const [loginBusy, setLoginBusy] = useState(false);

  const [editId, setEditId] = useState(null);

  const [scheduleForm, setScheduleForm] = useState({ ...emptySchedule });

  const [savingSchedule, setSavingSchedule] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [registrationError, setRegistrationError] = useState("");
  const [participantFilter, setParticipantFilter] = useState("Semua");
  const [paymentDrafts, setPaymentDrafts] = useState({});
  const [savingPaymentId, setSavingPaymentId] = useState(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [trainingVideos, setTrainingVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoForm, setVideoForm] = useState({ title:"", youtube_url:"", category:"Teknik Dasar", description:"" });
  const [savingVideo, setSavingVideo] = useState(false);
  const [progressList, setProgressList] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [progressForm, setProgressForm] = useState({
    registration_id:"",
    training_date:new Date().toISOString().slice(0,10),
    material:"Forehand",
    rating:"Berkembang",
    coach_note:"",
    next_target:""
  });
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressSearch, setProgressSearch] = useState({name:"",whatsapp:""});
  const [publicProgress, setPublicProgress] = useState([]);
  const [progressSearchDone, setProgressSearchDone] = useState(false);
  const [playerPickerOpen, setPlayerPickerOpen] = useState(false);
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
  const [ratingPickerOpen, setRatingPickerOpen] = useState(false);

  const isPelatih = session?.user?.id === PELATIH_UID;



  useEffect(() => {

    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));

    return () => subscription.unsubscribe();

  }, []);

  useEffect(() => {
    if (isPelatih) {
      loadRegistrations();
      loadProgress();
    }
  }, [isPelatih]);



  async function loadProgress() {
    if (!isPelatih) return;
    setLoadingProgress(true);
    const { data, error } = await supabase.from("training_progress")
      .select("*").order("training_date",{ascending:false}).order("id",{ascending:false});
    if (!error) setProgressList(data || []);
    else console.error("Gagal mengambil progress:", error);
    setLoadingProgress(false);
  }

  async function saveProgress(e) {
    e.preventDefault();
    if (!isPelatih || savingProgress) return;
    const reg = registrations.find(r=>String(r.id)===String(progressForm.registration_id));
    if (!reg) { alert("Pilih pemain terlebih dahulu."); return; }
    setSavingProgress(true);
    const { error } = await supabase.from("training_progress").insert({
      registration_id: reg.id,
      player_name: reg.name,
      player_whatsapp: reg.whatsapp,
      training_date: progressForm.training_date,
      material: progressForm.material,
      rating: progressForm.rating,
      coach_note: progressForm.coach_note.trim(),
      next_target: progressForm.next_target.trim()
    });
    setSavingProgress(false);
    if (error) { alert("Gagal menyimpan progress: " + error.message); return; }
    setProgressForm({...progressForm,coach_note:"",next_target:""});
    await loadProgress();
    alert("Progress pemain berhasil disimpan.");
  }

  async function deleteProgress(id) {
    if (!isPelatih || !window.confirm("Hapus catatan progress ini?")) return;
    const { error } = await supabase.from("training_progress").delete().eq("id",id);
    if (error) alert("Gagal menghapus progress: " + error.message);
    else await loadProgress();
  }

  async function findPublicProgress(e) {
    e.preventDefault();
    setProgressSearchDone(false);
    setPublicProgress([]);
    const name=progressSearch.name.trim(), whatsapp=progressSearch.whatsapp.trim();
    if (!name || !whatsapp) { alert("Isi nama dan nomor WhatsApp yang digunakan saat pendaftaran."); return; }
    const { data, error } = await supabase.rpc("get_player_progress",{
      p_name:name,
      p_whatsapp:whatsapp
    });
    setProgressSearchDone(true);
    if (error) { alert("Progress belum dapat dibuka: " + error.message); return; }
    setPublicProgress(data || []);
  }

  function youtubeEmbedUrl(url) {
    const value = String(url || "").trim();
    const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([^?&/]+)/i);
    return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : "";
  }

  async function loadTrainingVideos() {
    setLoadingVideos(true);
    const { data, error } = await supabase.from("training_videos").select("*").order("created_at",{ascending:false});
    if (!error) setTrainingVideos(data || []);
    else console.error("Gagal mengambil video:", error);
    setLoadingVideos(false);
  }

  async function saveTrainingVideo(e) {
    e.preventDefault();
    if (!isPelatih || savingVideo) return;
    if (!videoForm.title.trim() || !youtubeEmbedUrl(videoForm.youtube_url)) {
      alert("Isi judul dan link YouTube yang valid.");
      return;
    }
    setSavingVideo(true);
    const { error } = await supabase.from("training_videos").insert({
      title: videoForm.title.trim(),
      youtube_url: videoForm.youtube_url.trim(),
      category: videoForm.category,
      description: videoForm.description.trim()
    });
    setSavingVideo(false);
    if (error) { alert("Gagal menyimpan video: " + error.message); return; }
    setVideoForm({ title:"", youtube_url:"", category:"Teknik Dasar", description:"" });
    await loadTrainingVideos();
  }

  async function deleteTrainingVideo(id) {
    if (!isPelatih || !window.confirm("Hapus video ini dari daftar?")) return;
    const { error } = await supabase.from("training_videos").delete().eq("id",id);
    if (error) alert("Gagal menghapus video: " + error.message);
    else await loadTrainingVideos();
  }

  async function loginPelatih(e) {

    e.preventDefault(); setLoginError(""); setLoginBusy(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPassword });

    setLoginBusy(false); setLoginPassword("");

    if (error) { setLoginError("Login gagal. Periksa email dan password, atau gunakan pemulihan password di Supabase."); return; }

    if (data.user?.id !== PELATIH_UID) {

      await supabase.auth.signOut(); setLoginError("Akun ini tidak memiliki akses pelatih."); return;

    }

    setPage("admin"); await loadSchedules();

  }

  async function loadRegistrations() {
    if (!isPelatih) return;
    setLoadingRegistrations(true);
    setRegistrationError("");
    const { data, error } = await supabase.from("registrations")
      .select("id,schedule_id,name,whatsapp,level,status,payment_status,training_type,location_type,location_detail,paid_amount,invoice_amount")
      .order("id", { ascending: false });
    if (error) {
      setRegistrationError("Gagal mengambil peserta: " + error.message);
      setRegistrations([]);
    } else setRegistrations(data || []);
    setLoadingRegistrations(false);
  }

  function jumlahPesertaJadwal(scheduleId) {
    return registrations.filter(r => String(r.schedule_id) === String(scheduleId)).length;
  }

  function tagihanPeserta(r) {
    if (r.invoice_amount !== null && r.invoice_amount !== undefined) return Number(r.invoice_amount);
    const j = schedules.find(s => String(s.id) === String(r.schedule_id));
    if (!j) return null;
    const jumlah = jumlahPesertaJadwal(r.schedule_id);
    if (j.type !== "Private" && jumlah < 3) return null;
    const durasi = durasiJam(j.start_time, j.end_time);
    return Math.ceil((Number(j.coach_rate || 0) + Number(j.rental_rate_per_hour || 0) * durasi) / (j.type === "Private" ? 1 : jumlah));
  }

  async function simpanPembayaran(r) {
    if (!isPelatih || savingPaymentId !== null) return;
    const draft = paymentDrafts[r.id] || {};
    const status = draft.status ?? (["Belum Dibayar","DP","Lunas"].includes(r.payment_status) ? r.payment_status : "Belum Dibayar");
    const dibayar = draft.paid !== undefined ? bacaRupiah(draft.paid) : Number(r.paid_amount || 0);
    const tagihan = tagihanPeserta(r);
    if (tagihan === null) { alert("Tagihan belum tersedia. Grup perlu minimal 3 peserta, atau jadwal belum ditemukan."); return; }
    // Kelebihan pembayaran bisa muncul saat peserta keempat masuk; jangan hapus riwayat uang diterima.
    if (status === "Lunas" && dibayar < tagihan) { alert("Status Lunas hanya jika pembayaran sudah memenuhi tagihan."); return; }
    if (status === "Belum Dibayar" && dibayar > 0) { alert("Sudah ada pembayaran. Pilih status DP atau Lunas."); return; }
    if (status === "DP" && (dibayar <= 0 || dibayar >= tagihan)) { alert("DP harus lebih dari nol dan kurang dari total tagihan."); return; }
    setSavingPaymentId(r.id);
    const { error } = await supabase.from("registrations")
      .update({ payment_status: dibayar >= tagihan ? "Lunas" : status, paid_amount: dibayar, invoice_amount: tagihan })
      .eq("id", r.id);
    setSavingPaymentId(null);
    if (error) { alert("Gagal menyimpan pembayaran: " + error.message); return; }
    setPaymentDrafts(prev => { const next = {...prev}; delete next[r.id]; return next; });
    await loadRegistrations();
    alert("Pembayaran berhasil disimpan.");
  }

  async function tutupPendaftaran(j) {
    if (!isPelatih || !window.confirm(`Tutup pendaftaran ${j.day} ${j.time}? Setelah ditutup, peserta baru tidak bisa mendaftar.`)) return;
    const {error} = await supabase.rpc("pingpong_close_registration", {p_schedule_id:j.id});
    if (error) {alert("Gagal menutup: "+error.message); return;}
    await loadSchedules(); await loadRegistrations();
    alert("Pendaftaran ditutup. Tagihan peserta menjadi final.");
  }

  async function logoutPelatih() { await supabase.auth.signOut(); setPage("home"); }

  function editSchedule(item) {

    setEditId(item.id);

    setScheduleForm({ day:item.day, start_time:item.start_time?.slice(0,5)||"", end_time:item.end_time?.slice(0,5)||"", type:item.type||"Group", coach:item.coach||"Teguh Orina", quota:item.quota, min_participants:item.min_participants, is_active:item.activeRaw, coach_rate: Number(item.coach_rate ?? (item.type==="Private"?350000:300000)), rental_rate_per_hour: Number(item.rental_rate_per_hour ?? 50000) });

    window.scrollTo(0,0);

  }

  async function saveSchedule(e) {

    e.preventDefault(); if (!isPelatih || savingSchedule) return;

    if (scheduleForm.start_time >= scheduleForm.end_time) { alert("Jam selesai harus setelah jam mulai."); return; }

    const jamTerpilih = [1,2,3].includes(durasiJam(scheduleForm.start_time,scheduleForm.end_time)) ? durasiJam(scheduleForm.start_time,scheduleForm.end_time) : 2;
    const payload = { ...scheduleForm, registration_closed: editId ? schedules.find(j=>j.id===editId)?.registrationClosed ?? false : false, end_time: selesaiDariDurasi(scheduleForm.start_time,jamTerpilih), coach_rate: Number(scheduleForm.coach_rate)||0, rental_rate_per_hour: Number(scheduleForm.rental_rate_per_hour)||0, quota: scheduleForm.type === "Private" ? 1 : 4, min_participants: scheduleForm.type === "Private" ? 1 : 3 };

    setSavingSchedule(true);

    const request = editId ? supabase.from("schedule").update(payload).eq("id",editId) : supabase.from("schedule").insert(payload);

    const { error } = await request;

    setSavingSchedule(false);

    if (error) { alert("Gagal menyimpan jadwal: " + error.message); return; }

    setEditId(null); setScheduleForm({...emptySchedule}); await loadSchedules(); alert("Jadwal berhasil disimpan.");

  }

  async function toggleSchedule(item) {

    if (!isPelatih) return;

    const { error } = await supabase.from("schedule").update({is_active: !item.activeRaw}).eq("id",item.id);

    if (error) alert("Gagal mengubah status: " + error.message); else await loadSchedules();

  }

  async function deleteSchedule(item) {

    if (!isPelatih || !window.confirm(`Hapus jadwal ${item.day} ${item.time}?`)) return;

    const {data: count, error: countError} = await supabase.rpc("get_registration_count",{p_schedule_id:item.id});

    if (countError) {alert("Tidak dapat memeriksa pendaftaran. Jadwal tidak dihapus."); return;}

    if (Number(count)>0) {alert("Jadwal memiliki pendaftar. Nonaktifkan saja agar data peserta tetap aman."); return;}

    const {error} = await supabase.from("schedule").delete().eq("id",item.id);

    if (error) alert("Gagal menghapus: " + error.message); else await loadSchedules();

  }



  const [selectedDay, setSelectedDay] = useState("Semua");

  const [page, setPage] = useState("home");

  const [selectedSchedule, setSelectedSchedule] = useState(null);



  const [form, setForm] = useState({

    name: "",

    whatsapp: "",

    level: "",

    trainingType: "Group",

    locationType: "JIEP Sports",

    locationDetail: "",

  });



  const [schedules, setSchedules] = useState([]);

  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);



  const days = [

    "Semua",

    "Senin",

    "Selasa",

    "Rabu",

    "Kamis",

    "Jumat",

    "Sabtu",

    "Minggu",

  ];



  // =========================================================

  // AMBIL JADWAL + HITUNG JUMLAH PESERTA DARI SUPABASE

  // =========================================================



  async function loadSchedules() {

    setIsLoadingSchedules(true);



    // Ambil semua jadwal

    const { data: scheduleData, error: scheduleError } = await supabase

      .from("schedule")

      .select("*")

      .order("id", { ascending: true });



    if (scheduleError) {

      console.error("Gagal mengambil jadwal:", scheduleError);

      setIsLoadingSchedules(false);

      return;

    }

const formattedSchedules = await Promise.all(

  (scheduleData || []).map(async (item) => {

    const { data: registrationCount, error: countError } =

      await supabase.rpc("get_registration_count", {

        p_schedule_id: item.id,

      });



    if (countError) {

      console.error("Gagal menghitung peserta:", countError);

    }



    return {

      id: item.id,

      start_time: item.start_time,

      end_time: item.end_time,

      day: item.day,

      time: `${String(item.start_time || "").slice(0, 5)} - ${String(

        item.end_time || ""

      ).slice(0, 5)}`,

      coach: item.coach || "Belum ditentukan",

      type: item.type || "Group",

      registered: Number(registrationCount) || 0,

      quota: Number(item.quota) || 1,

      minParticipants: Number(item.min_participants) || 1,
      coach_rate: Number(item.coach_rate ?? (item.type==="Private"?350000:300000)),
      rental_rate_per_hour: Number(item.rental_rate_per_hour ?? 50000),

      activeRaw: Boolean(item.is_active),
      isActive: item.is_active && !item.registration_closed,
      registrationClosed: Boolean(item.registration_closed),

    };

  })

);



    setSchedules(formattedSchedules);

    setIsLoadingSchedules(false);

  }



  useEffect(() => {

    loadSchedules();
    loadTrainingVideos();

  }, []);



  // =========================================================

  // FILTER HARI

  // =========================================================



  const filteredSchedules = schedules.filter(item => item.isActive && (selectedDay === "Semua" || item.day === selectedDay));



  // =========================================================

  // PILIH JADWAL

  // =========================================================



  function chooseSchedule(schedule) {

    setForm(prev => ({...prev, trainingType: schedule.type === "Private" ? "Private" : "Group", locationType:"JIEP Sports", locationDetail:""}));

    setSelectedSchedule(schedule);

    setPage("register");

    window.scrollTo(0, 0);

  }



  // =========================================================

  // FORM

  // =========================================================



  function handleFormChange(e) {

    const { name, value } = e.target;



    setForm((prev) => ({

      ...prev,

      [name]: value,

    }));

  }



  // =========================================================

  // SIMPAN PENDAFTARAN

  // =========================================================



  async function submitRegistration(e) {

    e.preventDefault();



    if (isSubmitting) return;



    if (!form.name || !form.whatsapp || !form.level) {

      alert("Mohon lengkapi data pendaftaran.");

      return;

    }



    if (!selectedSchedule) {

      alert("Jadwal belum dipilih.");

      return;

    }



    // Jenis latihan wajib mengikuti jadwal, bukan pilihan bebas peserta.

    if (form.trainingType !== selectedSchedule.type) {

      alert("Jenis latihan tidak sesuai jadwal. Silakan pilih jadwal kembali.");

      return;

    }

    if (!form.locationType) {

      alert("Mohon pilih lokasi latihan.");

      return;

    }

    if (selectedSchedule.type === "Group" && form.locationType === "Datang ke Rumah") {

      alert("Lokasi Datang ke Rumah hanya tersedia untuk Private.");

      return;

    }



    if (

      (form.locationType === "Datang ke Rumah" ||

        form.locationType === "Lokasi Lain") &&

      !form.locationDetail.trim()

    ) {

      alert("Mohon isi alamat atau detail lokasi latihan.");

      return;

    }



    setIsSubmitting(true);



    const registrationStatus =

      form.trainingType === "Private"

        ? "Menunggu Konfirmasi Pelatih"

        : "Menunggu Peserta";



    const { data: result, error } = await supabase.rpc(

      "register_training",

      {

        p_schedule_id: selectedSchedule.id,

        p_name: form.name.trim(),

        p_whatsapp: `+62${form.whatsapp.trim()}`,

        p_level: form.level,

        p_status: registrationStatus,

        p_training_type: form.trainingType,

        p_location_type: form.locationType,

        p_location_detail:

          form.locationType === "JIEP Sports"

            ? ""

            : form.locationDetail.trim(),

      }

    );



    if (error) {

      console.error("Gagal menyimpan pendaftaran:", error);

      alert("Pendaftaran belum berhasil disimpan. Silakan coba lagi.");

      setIsSubmitting(false);

      return;

    }



    if (!result?.success) {

      alert(result?.message || "Pendaftaran belum berhasil.");



      await loadSchedules();



      if (result?.message === "Jadwal sudah penuh") {

        setPage("home");

        setSelectedSchedule(null);

        window.scrollTo(0, 0);

      }



      setIsSubmitting(false);

      return;

    }



    setSelectedSchedule((prev) => ({

      ...prev,

      registered: Number(result.registered) || 0,

      quota: Number(result.quota) || prev.quota,

    }));



    await loadSchedules();



    setIsSubmitting(false);

    setPage("success");

    window.scrollTo(0, 0);

  }



  // =========================================================

  // KEMBALI KE HOME

  // =========================================================



  async function backHome() {

    // Refresh data dari Supabase ketika kembali

    // supaya jumlah peserta langsung berubah.

    await loadSchedules();



    setPage("home");

    setSelectedSchedule(null);



    setForm({

      name: "",

      whatsapp: "",

      level: "",

      trainingType: "Group",

      locationType: "JIEP Sports",

      locationDetail: "",

    });



    window.scrollTo(0, 0);

  }



  return (

    <div className="app">



      {/* =====================================================

          HEADER

      ===================================================== */}



      <header className="header">

        <div className="brand" onClick={backHome} style={{display:"flex",alignItems:"center",gap:8}}>
          <img
            src={pingpongTrainingLogo}
            alt="PINGPONG TRAINING"
            style={{
              display:"block",
              width:"clamp(72px, 13vw, 110px)",
              maxHeight:42,
              objectFit:"contain",
              objectPosition:"left center"
            }}
          />
          <div style={{lineHeight:1.05,whiteSpace:"nowrap"}}>
            <div style={{fontSize:"clamp(14px,3.5vw,20px)",fontWeight:800,color:"#fff",letterSpacing:.2}}>PINGPONG</div>
            <div style={{fontSize:"clamp(10px,2.5vw,14px)",fontWeight:800,color:"#20d69b",letterSpacing:1}}>TRAINING</div>
          </div>
        </div>

        <button className="login-btn" onClick={() => setPage(isPelatih ? "admin" : "login")}>

          {isPelatih ? "Kelola Jadwal" : "Login Pelatih"}

        </button>

      </header>



      {page === "login" && (

        <main className="content" style={{maxWidth:480, margin:"32px auto"}}>

          <button className="back-button" onClick={() => setPage("home")}>← Kembali</button>

          <form className="registration-form" onSubmit={loginPelatih}>

            <h2>Login Pelatih</h2>

            <div className="form-group"><label>Email</label><input type="email" required autoComplete="username" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}/></div>

            <div className="form-group"><label>Password</label><input type="password" required autoComplete="current-password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)}/></div>

            {loginError && <p role="alert" style={{color:"#b91c1c"}}>{loginError}</p>}

            <button className="register-submit" type="submit" disabled={loginBusy}>{loginBusy ? "Memeriksa..." : "Masuk"}</button>

          </form>

        </main>

      )}

      <style>{`
        .admin-compact h2 { margin: 2px 0 8px !important; color:#062f46; }
        .admin-compact h3 { margin-top: 8px !important; margin-bottom: 7px !important; color:#073b55; }
        .admin-compact .registration-form {
          margin: 8px 0 12px !important;
          padding: 14px !important;
          background: rgba(255,255,255,.78) !important;
          border: 1px solid #b9d0da !important;
          border-radius: 12px !important;
          box-shadow: 0 5px 16px rgba(0,43,64,.07);
        }
        .admin-compact .form-group { margin-bottom: 8px !important; }
        .admin-compact .form-group label { margin-bottom: 3px !important; font-size:12px !important; color:#16485d; }
        .admin-compact input,
        .admin-compact select { min-height: 36px !important; padding: 7px 10px !important; }
        .admin-compact p { margin-top: 5px !important; margin-bottom: 5px !important; line-height:1.3 !important; }
        .admin-compact .register-submit { margin-top: 6px !important; min-height:38px !important; }
        .admin-compact section { box-shadow:0 5px 16px rgba(0,43,64,.06); }
        .admin-compact table th { background:#063d56; }
        .admin-compact table td { line-height:1.2; }
      `}</style>

      {page === "admin" && (

        <main className="content admin-compact" style={{maxWidth:1000,margin:"10px auto",padding:"12px",background:"linear-gradient(180deg,#dce8ed 0%,#eef4f6 48%,#d7e5eb 100%)",borderRadius:14}}>

          {!authReady ? <p>Memeriksa akun...</p> : !isPelatih ? <p>Akses khusus pelatih. <button onClick={()=>setPage("login")}>Login</button></p> : <>

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><h2>Kelola Jadwal</h2><button className="back-button" onClick={logoutPelatih}>Logout</button></div>

            <form className="registration-form" onSubmit={saveSchedule} style={{margin:"8px 0 12px",maxWidth:"none"}}>

              <h3>{editId ? "Edit Jadwal" : "Tambah Jadwal"}</h3>

              <div className="form-group"><label>Hari</label><select value={scheduleForm.day} onChange={e=>setScheduleForm(p=>({...p,day:e.target.value}))}>{days.filter(d=>d!=="Semua").map(d=><option key={d}>{d}</option>)}</select></div>

              <div className="form-group"><label>Jam Mulai (format 24 jam)</label>

                <div style={{display:"flex",gap:10,alignItems:"center"}}>

                  <select aria-label="Jam Jam Mulai" value={(scheduleForm.start_time || "00:00").slice(0,2)} onChange={e=>setScheduleForm(p=>({...p,start_time:`${e.target.value}:${(p.start_time || "00:00").slice(3,5)}`,end_time:selesaiDariDurasi(`${e.target.value}:${(p.start_time || "00:00").slice(3,5)}`,[1,2,3].includes(durasiJam(p.start_time,p.end_time))?durasiJam(p.start_time,p.end_time):2)}))}>

                    {Array.from({length:24},(_,i)=>String(i).padStart(2,"0")).map(h=><option key={h} value={h}>{h}</option>)}

                  </select>

                  <strong>:</strong>

                  <select aria-label="Menit Jam Mulai" value={(scheduleForm.start_time || "00:00").slice(3,5)} onChange={e=>setScheduleForm(p=>({...p,start_time:`${(p.start_time || "00:00").slice(0,2)}:${e.target.value}`,end_time:selesaiDariDurasi(`${(p.start_time || "00:00").slice(0,2)}:${e.target.value}`,[1,2,3].includes(durasiJam(p.start_time,p.end_time))?durasiJam(p.start_time,p.end_time):2)}))}>

                    {Array.from({length:60},(_,i)=>String(i).padStart(2,"0")).map(m=><option key={m} value={m}>{m}</option>)}

                  </select>

                </div>

              </div>

              <div className="form-group"><label>Durasi Latihan</label>
                <select value={String([1,2,3].includes(durasiJam(scheduleForm.start_time,scheduleForm.end_time))?durasiJam(scheduleForm.start_time,scheduleForm.end_time):2)} onChange={e=>setScheduleForm(p=>({...p,end_time:selesaiDariDurasi(p.start_time,Number(e.target.value))}))}>
                  <option value="1">1 jam</option><option value="2">2 jam</option><option value="3">3 jam</option>
                </select>
                <p style={{fontSize:13}}>Jam selesai otomatis: {selesaiDariDurasi(scheduleForm.start_time,[1,2,3].includes(durasiJam(scheduleForm.start_time,scheduleForm.end_time))?durasiJam(scheduleForm.start_time,scheduleForm.end_time):2)}</p>
              </div>
              <div className="form-group"><label>Jenis Latihan</label><select value={scheduleForm.type} onChange={e=>setScheduleForm(p=>({...p,type:e.target.value,coach_rate:e.target.value==="Private"?350000:300000,quota:e.target.value==="Private"?1:4,min_participants:e.target.value==="Private"?1:3}))}><option value="Group">Group (3–4 Orang)</option><option value="Private">Private (1 Orang)</option></select></div>

              <p>Kapasitas: {scheduleForm.type === "Private" ? "1 orang" : "minimal 3, maksimal 4 orang"}</p>

              <div className="form-group"><label>Pelatih</label><input value={scheduleForm.coach} required onChange={e=>setScheduleForm(p=>({...p,coach:e.target.value}))}/></div>

              <div style={{padding:10,border:"1px solid #b9d0da",borderRadius:10,marginBottom:9,background:"linear-gradient(135deg,#edf5f7,#dcebef)"}}>
                <h3 style={{marginTop:0}}>Pengaturan Biaya Latihan</h3>
                <p style={{fontSize:13}}>Tarif berlaku untuk jadwal ini dan bisa diubah kapan saja.</p>
                <div className="form-group">
                  <label>Tarif Pelatih per Sesi</label>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <strong>Rp</strong>
                    <input inputMode="numeric" value={angkaRupiah(scheduleForm.coach_rate)} onChange={e=>setScheduleForm(p=>({...p,coach_rate:bacaRupiah(e.target.value)}))}/>
                    <strong>,-</strong>
                  </div>
                </div>
                <div className="form-group">
                  <label>Sewa Lapangan per Jam</label>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <strong>Rp</strong>
                    <input inputMode="numeric" value={angkaRupiah(scheduleForm.rental_rate_per_hour)} onChange={e=>setScheduleForm(p=>({...p,rental_rate_per_hour:bacaRupiah(e.target.value)}))}/>
                    <strong>,-</strong>
                  </div>
                </div>
                <p>Durasi: <strong>{([1,2,3].includes(durasiJam(scheduleForm.start_time,scheduleForm.end_time))?durasiJam(scheduleForm.start_time,scheduleForm.end_time):2).toLocaleString("id-ID")} jam</strong> (sesuai pilihan durasi).</p>
                <p>Sewa total: <strong>{rupiah(scheduleForm.rental_rate_per_hour * ([1,2,3].includes(durasiJam(scheduleForm.start_time,scheduleForm.end_time))?durasiJam(scheduleForm.start_time,scheduleForm.end_time):2))}</strong></p>
                <p>Total sesi: <strong>{rupiah(Number(scheduleForm.coach_rate) + Number(scheduleForm.rental_rate_per_hour)*([1,2,3].includes(durasiJam(scheduleForm.start_time,scheduleForm.end_time))?durasiJam(scheduleForm.start_time,scheduleForm.end_time):2))}</strong></p>
                {scheduleForm.type==="Private"
                  ? <p>Private (1 orang): <strong>{rupiah(Number(scheduleForm.coach_rate)+Number(scheduleForm.rental_rate_per_hour)*([1,2,3].includes(durasiJam(scheduleForm.start_time,scheduleForm.end_time))?durasiJam(scheduleForm.start_time,scheduleForm.end_time):2))}</strong></p>
                  : <div><p>Jika 3 peserta: <strong>{rupiah((Number(scheduleForm.coach_rate)+Number(scheduleForm.rental_rate_per_hour)*([1,2,3].includes(durasiJam(scheduleForm.start_time,scheduleForm.end_time))?durasiJam(scheduleForm.start_time,scheduleForm.end_time):2))/3)}</strong> / orang</p>
                    <p>Jika 4 peserta: <strong>{rupiah((Number(scheduleForm.coach_rate)+Number(scheduleForm.rental_rate_per_hour)*([1,2,3].includes(durasiJam(scheduleForm.start_time,scheduleForm.end_time))?durasiJam(scheduleForm.start_time,scheduleForm.end_time):2))/4)}</strong> / orang</p></div>}
              </div>

              <label style={{display:"flex",gap:8,marginBottom:7}}><input type="checkbox" checked={scheduleForm.is_active} onChange={e=>setScheduleForm(p=>({...p,is_active:e.target.checked}))}/> Jadwal Aktif</label>

              <button className="register-submit" type="submit" disabled={savingSchedule}>{savingSchedule ? "Menyimpan..." : editId ? "Simpan Perubahan" : "Tambah Jadwal"}</button>

              {editId && <button type="button" className="back-button" onClick={()=>{setEditId(null);setScheduleForm({...emptySchedule});}}>Batal Edit</button>}

            </form>

                          <section style={{margin:"12px 0",padding:12,background:"rgba(255,255,255,.82)",borderRadius:12,border:"1px solid #b9d0da"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                  <h3 style={{margin:0}}>Daftar Peserta</h3>
                  <button type="button" className="back-button" onClick={loadRegistrations} disabled={loadingRegistrations}>
                    {loadingRegistrations ? "Memuat..." : "Muat / Refresh Peserta"}
                  </button>
                </div>
                <p style={{fontSize:13,color:"#64748b"}}>Khusus akun pelatih. Data langsung dari Supabase.</p>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:7}}>
                  {["Semua","Group","Private"].map(type => (
                    <button key={type} type="button" className="back-button"
                      onClick={() => setParticipantFilter(type)}
                      style={{background:participantFilter===type?"#059669":"#edf5f7",color:participantFilter===type?"white":"#0f2937"}}>
                      {type === "Group" ? "Grup" : type}
                    </button>
                  ))}
                </div>
                {registrationError && <p role="alert" style={{color:"#b91c1c"}}>{registrationError}</p>}
                {!loadingRegistrations && !registrationError && registrations.length===0 &&
                  <p>Klik "Muat / Refresh Peserta" untuk menampilkan pendaftar.</p>}
                <div style={{overflowX:"auto",maxHeight:430,overflowY:"auto",border:"1px solid #dbe5ed",borderRadius:10}}>
                  <table style={{width:"100%",minWidth:1480,borderCollapse:"collapse",fontSize:13,textAlign:"left"}}>
                    <thead style={{position:"sticky",top:0,background:"#0b3042",color:"white",zIndex:1}}>
                      <tr>{["No.","Nama Peserta","WhatsApp","Jenis","Jadwal","Level","Lokasi","Status","Tagihan","Diterima (Rp)","Status Bayar","Aksi"].map(h=><th key={h} style={{padding:"11px 10px",whiteSpace:"nowrap",borderBottom:"1px solid #cbd5e1"}}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {registrations.filter(r=>participantFilter==="Semua" || r.training_type===participantFilter).map((r,index)=>{
                        const jadwal=schedules.find(s=>s.id===r.schedule_id);
                        const cell={padding:"10px",borderBottom:"1px solid #e2e8f0",verticalAlign:"top"};
                        const tagihan=tagihanPeserta(r);
                        const draft=paymentDrafts[r.id]||{};
                        const status=draft.status??(["Belum Dibayar","DP","Lunas"].includes(r.payment_status)?r.payment_status:"Belum Dibayar");
                        const dibayar=draft.paid!==undefined?bacaRupiah(draft.paid):Number(r.paid_amount||0);
                        return <tr key={r.id} style={{background:index%2===0?"#ffffff":"#f1f7f8"}}>
                          <td style={cell}>{index+1}</td>
                          <td style={{...cell,fontWeight:700}}>{r.name}</td>
                          <td style={cell}>{r.whatsapp}</td>
                          <td style={cell}>{r.training_type==="Private"?"Private":"Grup"}</td>
                          <td style={{...cell,whiteSpace:"nowrap"}}>{jadwal?`${jadwal.day}, ${jadwal.time}`:`ID ${r.schedule_id}`}</td>
                          <td style={cell}>{r.level||"-"}</td>
                          <td style={cell}>{r.location_type||"-"}{r.location_detail?` — ${r.location_detail}`:""}</td>
                          <td style={cell}>{r.status||"-"}</td>
                          <td style={{...cell,whiteSpace:"nowrap"}}>{tagihan===null?"Menunggu 3 peserta":<>{rupiah(tagihan)}{Number(r.paid_amount||0)>tagihan&&<div style={{color:"#047857",fontWeight:700}}>Kelebihan: {rupiah(Number(r.paid_amount)-tagihan)}</div>}</>}</td>
                          <td style={cell}><input aria-label={`Pembayaran ${r.name}`} inputMode="numeric" style={{width:130,padding:7}} value={draft.paid!==undefined?draft.paid:angkaRupiah(r.paid_amount||0)} onChange={e=>setPaymentDrafts(p=>({...p,[r.id]:{...p[r.id],paid:angkaRupiah(bacaRupiah(e.target.value))}}))} disabled={tagihan===null}/></td>
                          <td style={cell}><select aria-label={`Status pembayaran ${r.name}`} style={{minWidth:130,padding:7}} value={["Belum Dibayar","DP","Lunas"].includes(status)?status:"Belum Dibayar"} onChange={e=>setPaymentDrafts(p=>({...p,[r.id]:{...p[r.id],status:e.target.value}}))} disabled={tagihan===null}>
                            <option>Belum Dibayar</option><option>DP</option><option>Lunas</option>
                          </select></td>
                          <td style={cell}><button type="button" className="back-button" disabled={tagihan===null||savingPaymentId!==null} onClick={()=>simpanPembayaran(r)}>{savingPaymentId===r.id?"Menyimpan...":"Simpan"}</button></td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:14,padding:12,background:"#edf7f2",borderRadius:9}}>
                  <strong>Total pembayaran diterima: {rupiah(registrations.reduce((n,r)=>n+Number(r.paid_amount||0),0))}</strong>
                  <span>Peserta: {registrations.length}</span>
                </div>
                <p style={{fontSize:12,color:"#64748b"}}>Tagihan Grup muncul saat 3 peserta dan dihitung ulang otomatis jika menjadi 4. Pembayaran yang sudah diterima tidak hilang; kelebihan pembayaran ditampilkan di kolom tagihan.</p>
                <p style={{fontSize:12,color:"#64748b"}}>Pada layar kecil, geser tabel ke samping untuk melihat seluruh kolom.</p>
              </section>
              <h3 style={{marginTop:12}}>Daftar Jadwal</h3>
              <div style={{overflowX:"auto",maxHeight:430,overflowY:"auto",border:"1px solid #dbe5ed",borderRadius:10,marginTop:6}}>
                <table style={{width:"100%",minWidth:980,borderCollapse:"collapse",fontSize:13,textAlign:"left"}}>
                  <thead style={{position:"sticky",top:0,background:"#0b3042",color:"#fff",zIndex:2}}>
                    <tr>{["No.","Hari","Waktu","Durasi","Jenis","Peserta","Pembayaran","Pendaftaran","Aksi"].map(h=>
                      <th key={h} style={{padding:"12px 10px",whiteSpace:"nowrap",borderBottom:"1px solid #dbe5ed"}}>{h}</th>
                    )}</tr>
                  </thead>
                  <tbody>
                    {schedules.map((item,i)=>{
                      const cell={padding:"10px",borderBottom:"1px solid #e2e8f0",whiteSpace:"nowrap",verticalAlign:"middle"};
                      const pesertaJadwal=registrations.filter(r=>String(r.schedule_id)===String(item.id));
                      const semuaLunas=pesertaJadwal.length>0 && pesertaJadwal.every(r=>r.payment_status==="Lunas");
                      const terbuka=selectedScheduleId===item.id;
                      return <React.Fragment key={item.id}>
                        <tr
                          onClick={async ()=>{
                            setSelectedScheduleId(terbuka?null:item.id);
                            if(!terbuka && registrations.length===0) await loadRegistrations();
                          }}
                          style={{background:i%2===0?"#fff":"#f1f7f8",cursor:"pointer"}}
                          title="Klik untuk melihat peserta jadwal ini"
                        >
                          <td style={cell}>{i+1}</td>
                          <td style={cell}>{item.day}</td>
                          <td style={cell}>{item.time}</td>
                          <td style={cell}>{durasiJam(item.start_time,item.end_time).toLocaleString("id-ID")} jam</td>
                          <td style={cell}>{item.type}</td>
                          <td style={cell}>{item.registered}/{item.quota}</td>
                          <td style={{...cell,fontWeight:700}}>{semuaLunas?"Lunas":"Belum Lunas"}</td>
                          <td style={cell}>{item.registrationClosed?"Ditutup":"Terbuka"}</td>
                          <td style={cell} onClick={e=>e.stopPropagation()}>
                            <div style={{display:"flex",gap:7,alignItems:"center"}}>
                              <button type="button" className="back-button" onClick={()=>editSchedule(item)}>Edit</button>
                              <button type="button" className="back-button" onClick={()=>toggleSchedule(item)}>{item.activeRaw?"Nonaktifkan":"Aktifkan"}</button>
                              {!item.registrationClosed && item.registered===3 &&
                                <button type="button" className="back-button" onClick={()=>tutupPendaftaran(item)}>Tutup Pendaftaran</button>}
                              <button type="button" className="back-button" onClick={()=>deleteSchedule(item)}>Hapus</button>
                            </div>
                          </td>
                        </tr>
                        {terbuka && <tr>
                          <td colSpan={9} style={{padding:0,background:"#edf7f2",borderBottom:"1px solid #cbd5e1"}}>
                            <div style={{padding:"12px 18px"}}>
                              <strong>Peserta — {item.day}, {item.time}</strong>
                              {pesertaJadwal.length===0
                                ? <p style={{margin:"8px 0 0",color:"#64748b"}}>Belum ada peserta pada jadwal ini.</p>
                                : <div style={{marginTop:8}}>
                                    {pesertaJadwal.map(r=><div key={r.id} style={{padding:"7px 0",borderBottom:"1px solid #d7e5df"}}>
                                      <strong>{r.name}</strong> &nbsp;|&nbsp; {r.level||"-"} &nbsp;|&nbsp; <strong>{r.payment_status==="Lunas"?"Lunas":"Belum Lunas"}</strong>
                                    </div>)}
                                  </div>}
                            </div>
                          </td>
                        </tr>}
                      </React.Fragment>;
                    })}
                    {schedules.length===0 && <tr><td colSpan={9} style={{padding:20,textAlign:"center"}}>Belum ada jadwal.</td></tr>}
                  </tbody>
                </table>
              </div>
              <p style={{fontSize:12,color:"#64748b"}}>Klik baris jadwal untuk melihat Nama Peserta | Level | Lunas / Belum Lunas. Nominal pembayaran tidak ditampilkan di Daftar Jadwal.</p>

          </>}

        </main>

      )}



      {/* =====================================================

          HALAMAN UTAMA

      ===================================================== */}



      {page === "home" && (

        <>

          <section
            className="hero"
            style={{
              minHeight:"clamp(285px,45vw,360px)",
              backgroundImage:`linear-gradient(180deg,rgba(2,32,52,.62) 0%,rgba(2,42,62,.38) 42%,rgba(2,48,67,.18) 72%,rgba(5,73,99,.48) 100%), url(${heroTraining})`,
              backgroundSize:"cover",
              backgroundPosition:"center 58%",
              position:"relative",
              display:"flex",
              alignItems:"flex-start",
              padding:"10px 16px 18px"
            }}
          >
            <div className="hero-content" style={{maxWidth:610,padding:0,width:"100%",margin:"0 auto",textAlign:"center"}}>
              <div className="hero-label" style={{fontSize:"clamp(9px,2.3vw,11px)",marginBottom:4,padding:"5px 10px"}}>🏓 PROGRAM LATIHAN TENIS MEJA</div>
              <h2 style={{fontSize:"clamp(23px,5.7vw,36px)",lineHeight:1.02,margin:"4px 0 6px"}}>Latihan Lebih Teratur,<br/><span>Progress Lebih Terukur.</span></h2>
              <div style={{position:"absolute",left:"clamp(14px,4vw,42px)",bottom:14,width:"min(43%,250px)",textAlign:"left",fontSize:"clamp(9px,2.3vw,12px)",lineHeight:1.35,color:"#fff",textShadow:"0 2px 5px rgba(0,0,0,.75)"}}>
                Program latihan tenis meja untuk semua level, dengan pilihan Private maupun Grup 3–4 orang dan jadwal yang fleksibel.
              </div>

            </div>
          </section>

          <section style={{background:"linear-gradient(180deg,#07506a 0%,#6f9caf 18%,#d8e1e6 48%,#c7d6de 62%,#4f8eaa 82%,#08608d 100%)",padding:"18px 12px 16px",marginTop:-1}}>
            <div style={{maxWidth:1050,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:7}}>
              <button type="button" onClick={()=>setPage("pendaftaran")}
                style={{border:0,borderRadius:11,padding:"6px 6px",background:"linear-gradient(145deg,rgba(8,111,158,.94),rgba(3,65,96,.92))",border:"1px solid rgba(210,240,246,.48)",boxShadow:"0 7px 16px rgba(0,35,55,.18),inset 0 1px 0 rgba(255,255,255,.16)",color:"#fff",cursor:"pointer"}}>
                <div style={{fontSize:17}}>📝</div><strong style={{fontSize:12}}>Pendaftaran</strong><div style={{fontSize:9,marginTop:1}}>Daftar jadi peserta</div>
              </button>
              <button type="button" onClick={()=>setPage("jadwal")}
                style={{border:0,borderRadius:11,padding:"6px 6px",background:"linear-gradient(145deg,rgba(8,142,132,.94),rgba(4,85,91,.92))",border:"1px solid rgba(210,246,240,.48)",boxShadow:"0 7px 16px rgba(0,35,55,.18),inset 0 1px 0 rgba(255,255,255,.16)",color:"#fff",cursor:"pointer"}}>
                <div style={{fontSize:17}}>📅</div><strong style={{fontSize:12}}>Daftar Jadwal</strong><div style={{fontSize:9,marginTop:1}}>Lihat hari & jam</div>
              </button>
              <button type="button" onClick={()=>setPage("pembayaran")}
                style={{border:0,borderRadius:11,padding:"6px 6px",background:"linear-gradient(145deg,rgba(16,104,142,.94),rgba(5,70,101,.92))",border:"1px solid rgba(210,240,246,.48)",boxShadow:"0 7px 16px rgba(0,35,55,.18),inset 0 1px 0 rgba(255,255,255,.16)",color:"#fff",cursor:"pointer"}}>
                <div style={{fontSize:17}}>💳</div><strong style={{fontSize:12}}>Pembayaran</strong><div style={{fontSize:9,marginTop:1}}>Informasi pembayaran</div>
              </button>
              <button type="button" onClick={()=>setPage("program")}
                style={{border:0,borderRadius:11,padding:"6px 6px",background:"linear-gradient(145deg,rgba(10,127,122,.94),rgba(4,77,90,.92))",border:"1px solid rgba(210,246,240,.48)",boxShadow:"0 7px 16px rgba(0,35,55,.18),inset 0 1px 0 rgba(255,255,255,.16)",color:"#fff",cursor:"pointer"}}>
                <div style={{fontSize:17}}>🏓</div><strong style={{fontSize:12}}>Program Latihan</strong><div style={{fontSize:9,marginTop:1}}>Private / Grup</div>
              </button>
            </div>
          </section>

          <main className="content" id="booking-latihan" style={{display:"none"}}>



            <div className="section-title">



              <span className="small-title">

                BOOKING LATIHAN

              </span>



              <h2>

                Pilih Jadwal Latihan

              </h2>



              <p>

                Pilih hari dan jam yang masih tersedia.

                Kapasitas peserta setiap sesi dapat berbeda

                sesuai program latihan.

              </p>



            </div>



            {/* FILTER HARI */}



            <div className="day-filter">



              {days.map((day) => (

                <button

                  key={day}

                  className={

                    selectedDay === day

                      ? "active"

                      : ""

                  }

                  onClick={() =>

                    setSelectedDay(day)

                  }

                >

                  {day}

                </button>

              ))}



            </div>



            {/* =================================================

                DAFTAR JADWAL

            ================================================= */}



            <div id="jadwal-publik" className="schedule-grid">



              {isLoadingSchedules ? (



                <div className="empty">

                  ⏳ Memuat jadwal...

                </div>



              ) : filteredSchedules.length > 0 ? (



                filteredSchedules.map(

                  (schedule) => {



                    const remaining =

                      schedule.quota -

                      schedule.registered;



                    const full =

                      remaining <= 0;



                    return (

                      <div

                        className="schedule-card"

                        key={schedule.id}

                      >



                        <div style={{

                          display: "inline-block",

                          marginBottom: 14,

                          padding: "8px 14px",

                          borderRadius: 9,

                          background: schedule.type === "Private" ? "#dbeafe" : "#d1fae5",

                          color: schedule.type === "Private" ? "#1d4ed8" : "#047857",

                          fontWeight: 800,

                          fontSize: 14,

                          letterSpacing: "0.6px"

                        }}>

                          {schedule.type === "Private" ? "JADWAL PRIVATE" : "JADWAL GRUP"}

                        </div>



                        <div className="card-top">



                          <div>



                            <span className="day">

                              {schedule.day}

                            </span>



                            <h3>

                              {schedule.time}

                            </h3>



                          </div>



                          <span

                            className={

                              full

                                ? "status full"

                                : "status available"

                            }

                          >

                            {full

                              ? "Penuh"

                              : "Tersedia"}

                          </span>



                        </div>



                        <div className="training-type">



                          {schedule.type ===

                          "Private"

                            ? "🏓 Private Training"

                            : `👥 Grup Maks. ${schedule.quota} Orang`}



                        </div>



                        <div className="coach">



                          <div className="coach-avatar">



                            {schedule.coach ===

                            "Teguh Orina"

                              ? "TO"

                              : "PT"}



                          </div>



                          <div>



                            <small>

                              PELATIH

                            </small>



                            <strong>

                              {schedule.coach}

                            </strong>



                          </div>



                        </div>



                        {/* JUMLAH PESERTA */}



                        <div className="quota">



                          <div className="quota-text">



                            <span>

                              Peserta

                            </span>



                            <strong>

                              {

                                schedule.registered

                              }{" "}

                              /{" "}

                              {

                                schedule.quota

                              }{" "}

                              Orang

                            </strong>



                          </div>



                          <div className="quota-bar">



                            <div

                              className="quota-fill"

                              style={{

                                width: `${Math.min(

                                  (schedule.registered /

                                    schedule.quota) *

                                    100,

                                  100

                                )}%`,

                              }}

                            ></div>



                          </div>



                          <small>



                            {full

                              ? "Kuota latihan sudah penuh"



                              : schedule.type ===

                                "Private"



                              ? "Slot private masih tersedia"



                              : `Tersisa ${remaining} tempat`}



                          </small>



                        </div>



                        <button

                          className="choose-btn"

                          disabled={full}

                          onClick={() =>

                            chooseSchedule(

                              schedule

                            )

                          }

                        >

                          {full

                            ? "Jadwal Penuh"

                            : "Pilih Jadwal"}

                        </button>



                      </div>

                    );

                  }

                )



              ) : (



                <div className="empty">

                  Belum ada jadwal latihan

                  untuk hari {selectedDay}.

                </div>



              )}



            </div>



            {/* =================================================

                CARA PENDAFTARAN

            ================================================= */}



            <section className="flow">



              <span className="small-title">

                CARA PENDAFTARAN

              </span>



              <h2>

                Mudah dan Cepat

              </h2>



              <div className="flow-grid">



                <div>

                  <b>1</b>



                  <strong>

                    Pilih Jadwal

                  </strong>



                  <span>

                    Pilih hari, jam dan jenis

                    latihan.

                  </span>

                </div>



                <div>

                  <b>2</b>



                  <strong>

                    Isi Data Diri

                  </strong>



                  <span>

                    Nama, WhatsApp dan level

                    permainan.

                  </span>

                </div>



                <div>

                  <b>3</b>



                  <strong>

                    Menunggu Peserta

                  </strong>



                  <span>

                    Untuk latihan grup, tunggu

                    jumlah minimum peserta.

                  </span>

                </div>



                <div>

                  <b>4</b>



                  <strong>

                    Pembayaran

                  </strong>



                  <span>

                    Tagihan diberikan setelah

                    sesi siap dilaksanakan.

                  </span>

                </div>



              </div>



            </section>



          </main>

          <section id="info-pembayaran" style={{display:"none"}}>
            <div style={{maxWidth:1050,margin:"0 auto",background:"#fff",borderRadius:16,padding:20,boxShadow:"0 8px 24px rgba(20,55,75,.08)"}}>
              <h2 style={{marginTop:0}}>💳 Pembayaran</h2>
              <p style={{marginBottom:0}}>Status dan nominal pembayaran dikelola setelah peserta terdaftar. Untuk konfirmasi pembayaran, hubungi Pelatih melalui WhatsApp.</p>
            </div>
          </section>
          <section id="program-latihan" style={{display:"none"}}>
            <div style={{maxWidth:1050,margin:"0 auto",background:"#fff",borderRadius:16,padding:20,boxShadow:"0 8px 24px rgba(20,55,75,.08)"}}>
              <h2 style={{marginTop:0}}>🏆 Program Latihan</h2>
              <p style={{marginBottom:0}}>Teknik Dasar • Spin & Topspin • Blok & Defense • Latihan Taktik • Private • Grup 3–4 Orang</p>
            </div>
          </section>
          <footer style={{background:"linear-gradient(180deg,#08608d 0%,#07547e 48%,#043e63 100%)",color:"#fff",padding:"12px 16px 14px",textAlign:"center",marginTop:-1}}>
            <div style={{maxWidth:1050,margin:"0 auto",display:"flex",justifyContent:"center",alignItems:"center",gap:10,flexWrap:"nowrap"}}>
              <img src={pingpongTrainingLogo} alt="PINGPONG TRAINING" style={{width:72,maxHeight:34,objectFit:"contain",alignSelf:"flex-end"}}/>
              <div style={{textAlign:"left",lineHeight:1.15}}>
                <div style={{fontSize:10,opacity:.9}}>Informasi & Pendaftaran</div>
                <strong style={{fontSize:"clamp(14px,3.7vw,18px)",color:"#ffe84a",whiteSpace:"nowrap"}}>WhatsApp 0858-1446-6929</strong>
              </div>
            </div>
          </footer>
        </>

      )}



      {/* =====================================================

          FORM PENDAFTARAN

      ===================================================== */}




      {page === "pendaftaran" && (
        <main style={{background:"#dfe9ef",minHeight:"75vh",padding:"28px 18px"}}>
          <div style={{maxWidth:1050,margin:"0 auto"}}>
            <button className="back-button" onClick={()=>setPage("home")}>← Home</button>
            <div style={{textAlign:"center",margin:"10px 0 22px"}}>
              <div style={{letterSpacing:3,color:"#079f79",fontWeight:700,fontSize:13}}>PENDAFTARAN LATIHAN</div>
              <h2 style={{fontSize:30,margin:"8px 0"}}>Pilih Jadwal & Daftar</h2>
              <p style={{color:"#64748b"}}>Pilih jadwal yang tersedia. Setelah memilih, formulir pendaftaran akan terbuka.</p>
            </div>
            <div className="day-filter">
              {days.map(day=><button key={day} className={selectedDay===day?"active":""} onClick={()=>setSelectedDay(day)}>{day}</button>)}
            </div>
            <div className="schedule-grid">
              {filteredSchedules.length===0 ? <p style={{textAlign:"center",gridColumn:"1/-1"}}>Belum ada jadwal tersedia untuk hari ini.</p> :
                filteredSchedules.map(item=><div className="schedule-card" key={item.id}>
                  <div className="schedule-top"><span className="day">{item.day}</span><span className="time">{item.time}</span></div>
                  <div className="coach">{item.type==="Private"?"PRIVATE":"GRUP"} • {item.registered}/{item.quota} peserta</div>
                  <button className="choose-btn" disabled={!item.available} onClick={()=>selectSchedule(item)}>
                    {item.available?"Pilih & Daftar":"Penuh / Ditutup"}
                  </button>
                </div>)}
            </div>
          </div>
        </main>
      )}

      {page === "jadwal" && (
        <main style={{background:"#dfe9ef",minHeight:"75vh",padding:"28px 18px"}}>
          <div style={{maxWidth:1050,margin:"0 auto"}}>
            <button className="back-button" onClick={()=>setPage("home")}>← Home</button>
            <div style={{textAlign:"center",margin:"10px 0 22px"}}>
              <div style={{letterSpacing:3,color:"#079f79",fontWeight:700,fontSize:13}}>DAFTAR JADWAL</div>
              <h2 style={{fontSize:30,margin:"8px 0"}}>Jadwal Latihan</h2>
              <p style={{color:"#64748b"}}>Jadwal Grup dan Private yang tersedia.</p>
            </div>
            <div style={{overflowX:"auto",background:"#fff",borderRadius:16,boxShadow:"0 8px 24px rgba(20,55,75,.08)"}}>
              <table style={{width:"100%",minWidth:680,borderCollapse:"collapse",fontSize:14}}>
                <thead style={{background:"#073b55",color:"#fff"}}>
                  <tr>{["Hari","Waktu","Jenis","Peserta","Status"].map(h=><th key={h} style={{padding:13,textAlign:"left"}}>{h}</th>)}</tr>
                </thead>
                <tbody>{schedules.map((item,i)=><tr key={item.id} style={{background:i%2?"#f1f7f8":"#fff"}}>
                  <td style={{padding:13,borderBottom:"1px solid #e2e8f0"}}>{item.day}</td>
                  <td style={{padding:13,borderBottom:"1px solid #e2e8f0"}}>{item.time}</td>
                  <td style={{padding:13,borderBottom:"1px solid #e2e8f0"}}>{item.type==="Private"?"Private":"Grup"}</td>
                  <td style={{padding:13,borderBottom:"1px solid #e2e8f0"}}>{item.registered}/{item.quota}</td>
                  <td style={{padding:13,borderBottom:"1px solid #e2e8f0",fontWeight:700}}>{item.available?"Tersedia":"Penuh / Ditutup"}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {page === "pembayaran" && (
        <main style={{background:"linear-gradient(180deg,#dbe8ed 0%,#eef4f6 48%,#d4e4ea 100%)",minHeight:"75vh",padding:"16px 12px 22px"}}>
          <div style={{maxWidth:820,margin:"0 auto"}}>
            <button className="back-button" onClick={()=>setPage("home")}>← Home</button>

            <div style={{textAlign:"center",margin:"8px 0 12px"}}>
              <div style={{fontSize:28}}>💳</div>
              <h2 style={{margin:"3px 0",color:"#073b55"}}>Pembayaran Latihan</h2>
              <p style={{margin:0,fontSize:13,color:"#557184"}}>Transfer BCA atau scan QRIS. Nominal disesuaikan dengan tagihan latihan.</p>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:12,alignItems:"start"}}>
              <section style={{background:"linear-gradient(145deg,#064f76,#073b55)",color:"#fff",borderRadius:16,padding:16,boxShadow:"0 8px 22px rgba(0,45,70,.15)"}}>
                <div style={{fontSize:12,opacity:.82}}>TRANSFER BANK</div>
                <div style={{fontSize:18,fontWeight:800,marginTop:4}}>Bank BCA</div>
                <div style={{fontSize:13,marginTop:8,opacity:.9}}>a.n.</div>
                <div style={{fontSize:17,fontWeight:800}}>Teguh Prianto, SE</div>
                <div style={{fontSize:12,marginTop:10,opacity:.85}}>Nomor Rekening</div>
                <div style={{fontSize:"clamp(25px,7vw,34px)",fontWeight:900,color:"#ffe24a",letterSpacing:1}}>7740579198</div>
                <button
                  type="button"
                  onClick={async()=>{
                    try{
                      await navigator.clipboard.writeText("7740579198");
                      alert("Nomor rekening berhasil disalin.");
                    }catch{
                      alert("Nomor rekening: 7740579198");
                    }
                  }}
                  style={{width:"100%",marginTop:12,border:"1px solid rgba(255,255,255,.35)",borderRadius:10,padding:"9px 12px",background:"rgba(255,255,255,.12)",color:"#fff",fontWeight:800,cursor:"pointer"}}
                >
                  Salin No. Rekening
                </button>
              </section>

              <section style={{background:"#fff",borderRadius:16,padding:14,boxShadow:"0 8px 22px rgba(0,45,70,.10)",textAlign:"center"}}>
                <div style={{fontSize:12,color:"#087b72",fontWeight:900,letterSpacing:1}}>QRIS BCA</div>
                <div style={{fontSize:12,color:"#64748b",margin:"3px 0 9px"}}>Scan QR untuk melakukan pembayaran</div>
                <div style={{background:"#fff",border:"1px solid #cbdde4",borderRadius:12,padding:8,maxWidth:360,margin:"0 auto"}}>
                  <img src={qrisBca} alt="QRIS BCA Teguh Prianto SE" style={{display:"block",width:"100%",height:"auto",borderRadius:8}}/>
                </div>
                <div style={{fontSize:11,color:"#64748b",marginTop:7}}>QRIS berlaku sesuai ketentuan pada QR BCA.</div>
              </section>
            </div>

            <section style={{marginTop:12,background:"rgba(255,255,255,.82)",border:"1px solid #b9d0da",borderRadius:14,padding:14}}>
              <strong style={{color:"#073b55"}}>Cara Pembayaran</strong>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8,marginTop:9,fontSize:12,color:"#284c5e"}}>
                <div><b>1.</b> Transfer ke BCA atau scan QRIS.</div>
                <div><b>2.</b> Masukkan nominal sesuai tagihan latihan.</div>
                <div><b>3.</b> Pastikan penerima Teguh Prianto, SE.</div>
                <div><b>4.</b> Simpan bukti pembayaran.</div>
              </div>
            </section>

            <div style={{marginTop:10,padding:"11px 14px",borderRadius:12,background:"linear-gradient(90deg,#07547e,#087b72)",color:"#fff",textAlign:"center"}}>
              <div style={{fontSize:11,opacity:.9}}>Konfirmasi pembayaran</div>
              <strong style={{fontSize:17,color:"#ffe84a"}}>WhatsApp 0858-1446-6929</strong>
            </div>
          </div>
        </main>
      )}

      {page === "program" && (
        <main style={{background:"linear-gradient(180deg,#dbe8ed,#eef4f6,#d4e4ea)",minHeight:"75vh",padding:"18px 12px 24px"}}>
          <div style={{maxWidth:900,margin:"0 auto"}}>
            <button className="back-button" onClick={()=>setPage("home")}>← Home</button>
            <div style={{textAlign:"center",margin:"8px 0 14px"}}>
              <div style={{letterSpacing:2,color:"#087b72",fontWeight:800,fontSize:11}}>PROGRAM PINGPONG TRAINING</div>
              <h2 style={{fontSize:24,margin:"5px 0",color:"#073b55"}}>Program & Perkembangan Latihan</h2>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:9,marginBottom:14}}>
              <button type="button" onClick={()=>setPage("progress")} style={{border:"1px solid #9dc3cf",borderRadius:14,padding:"14px 8px",background:"linear-gradient(145deg,#075b7d,#087b72)",color:"#fff",cursor:"pointer",boxShadow:"0 7px 18px rgba(0,45,65,.12)"}}>
                <div style={{fontSize:25}}>📈</div><strong style={{fontSize:14}}>Progress Latihan</strong>
                <div style={{fontSize:10,opacity:.9,marginTop:3}}>Lihat perkembangan pemain</div>
              </button>
              <button type="button" onClick={()=>setPage("video")} style={{border:"1px solid #9dc3cf",borderRadius:14,padding:"14px 8px",background:"linear-gradient(145deg,#08608d,#064660)",color:"#fff",cursor:"pointer",boxShadow:"0 7px 18px rgba(0,45,65,.12)"}}>
                <div style={{fontSize:25}}>▶️</div><strong style={{fontSize:14}}>Video Pelatihan</strong>
                <div style={{fontSize:10,opacity:.9,marginTop:3}}>Latihan & teknik tenis meja</div>
              </button>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:9}}>
              {[
                ["🏓","Teknik Dasar","Fondasi pukulan, footwork dan kontrol bola."],
                ["🔥","Spin & Topspin","Spin bola kosong, bola isi dan topspin."],
                ["🛡️","Blok & Defense","Blok, defense dan menghadapi variasi serangan."],
                ["🎯","Latihan Taktik","Placing, pola permainan dan pengambilan keputusan."],
                ["👤","Private","Latihan individual sesuai kebutuhan pemain."],
                ["👥","Grup 3–4 Orang","Kelompok kecil dengan program terstruktur."]
              ].map(([ic,t,d])=><div key={t} style={{background:"rgba(255,255,255,.86)",border:"1px solid #bfd3dc",borderRadius:12,padding:12,boxShadow:"0 5px 15px rgba(20,55,75,.06)"}}>
                <div style={{fontSize:22}}>{ic}</div><h3 style={{fontSize:14,margin:"4px 0",color:"#073b55"}}>{t}</h3><p style={{fontSize:11,color:"#64748b",margin:0}}>{d}</p>
              </div>)}
            </div>
          </div>
        </main>
      )}

      {page === "progress" && (
        <main style={{background:"linear-gradient(180deg,#dbe8ed,#eef4f6,#d4e4ea)",minHeight:"75vh",padding:"18px 12px 24px"}}>
          <div style={{maxWidth:950,margin:"0 auto"}}>
            <button className="back-button" onClick={()=>setPage("program")}>← Program</button>
            <div style={{textAlign:"center",margin:"8px 0 14px"}}>
              <div style={{fontSize:30}}>📈</div>
              <h2 style={{margin:"3px 0",color:"#073b55"}}>Progress Latihan</h2>
              <p style={{fontSize:12,color:"#607d8b",margin:0}}>{isPelatih ? "Isi dan pantau perkembangan setiap pemain." : "Lihat riwayat perkembangan latihan Anda."}</p>
            </div>

            {isPelatih ? (
              <>
                <form onSubmit={saveProgress} style={{background:"linear-gradient(145deg,#064f76,#073b55)",color:"#fff",borderRadius:14,padding:14,marginBottom:12}}>
                  <strong>+ Tambah Progress Pemain</strong>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:8,marginTop:9}}>
                    <div style={{position:"relative"}}>
                      <button
                        type="button"
                        onClick={()=>setPlayerPickerOpen(v=>!v)}
                        style={{
                          width:"100%",padding:9,borderRadius:8,border:0,
                          background:"#fff",color:"#1f2937",textAlign:"left",
                          cursor:"pointer",display:"flex",alignItems:"center",
                          justifyContent:"space-between",gap:8
                        }}
                      >
                        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {(()=>{
                            const selected=registrations.find(r=>String(r.id)===String(progressForm.registration_id));
                            return selected ? `${selected.name} — ${selected.whatsapp}` : "Pilih pemain...";
                          })()}
                        </span>
                        <span style={{fontSize:11}}>▼</span>
                      </button>

                      {playerPickerOpen && (
                        <div style={{
                          position:"absolute",zIndex:50,top:"calc(100% + 5px)",left:0,
                          width:"100%",maxHeight:190,overflowY:"auto",
                          background:"#fff",border:"1px solid #b9d0da",
                          borderRadius:9,boxShadow:"0 8px 22px rgba(0,35,55,.22)",
                          padding:4
                        }}>
                          {Array.from(new Map(registrations.map(r=>[`${String(r.name).toLowerCase()}|${r.whatsapp}`,r])).values()).length===0 ? (
                            <div style={{padding:"9px 10px",fontSize:13,color:"#64748b"}}>Belum ada pemain.</div>
                          ) : Array.from(new Map(registrations.map(r=>[`${String(r.name).toLowerCase()}|${r.whatsapp}`,r])).values()).map(r=>(
                            <button
                              key={r.id}
                              type="button"
                              onClick={()=>{
                                setProgressForm({...progressForm,registration_id:String(r.id)});
                                setPlayerPickerOpen(false);
                              }}
                              style={{
                                display:"block",width:"100%",border:0,
                                borderBottom:"1px solid #edf2f4",
                                background:String(progressForm.registration_id)===String(r.id)?"#e7f4f5":"#fff",
                                color:"#163b4d",padding:"8px 9px",textAlign:"left",
                                fontSize:13,lineHeight:1.25,cursor:"pointer",
                                borderRadius:6
                              }}
                            >
                              <strong>{r.name}</strong>
                              <span style={{display:"block",fontSize:11,color:"#64748b",marginTop:2}}>{r.whatsapp}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input type="date" required value={progressForm.training_date} onChange={e=>setProgressForm({...progressForm,training_date:e.target.value})} style={{padding:9,borderRadius:8,border:0}}/>
                    <div style={{position:"relative"}}>
                      <button type="button" onClick={()=>{setMaterialPickerOpen(v=>!v);setRatingPickerOpen(false);setPlayerPickerOpen(false);}}
                        style={{width:"100%",padding:9,borderRadius:8,border:0,background:"#fff",color:"#1f2937",textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span>{progressForm.material}</span><span style={{fontSize:11}}>▼</span>
                      </button>
                      {materialPickerOpen && (
                        <div style={{position:"absolute",zIndex:50,top:"calc(100% + 5px)",left:0,width:"100%",maxHeight:180,overflowY:"auto",background:"#fff",border:"1px solid #b9d0da",borderRadius:9,boxShadow:"0 8px 22px rgba(0,35,55,.22)",padding:4}}>
                          {["Forehand","Backhand","Topspin","Service","Receive","Block / Defense","Footwork","Taktik","Bintik","Lainnya"].map(x=>
                            <button key={x} type="button" onClick={()=>{setProgressForm({...progressForm,material:x});setMaterialPickerOpen(false);}}
                              style={{display:"block",width:"100%",border:0,borderBottom:"1px solid #edf2f4",background:progressForm.material===x?"#e7f4f5":"#fff",color:"#163b4d",padding:"8px 9px",textAlign:"left",fontSize:13,lineHeight:1.2,cursor:"pointer",borderRadius:6}}>
                              {x}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{position:"relative"}}>
                      <button type="button" onClick={()=>{setRatingPickerOpen(v=>!v);setMaterialPickerOpen(false);setPlayerPickerOpen(false);}}
                        style={{width:"100%",padding:9,borderRadius:8,border:0,background:"#fff",color:"#1f2937",textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span>{progressForm.rating}</span><span style={{fontSize:11}}>▼</span>
                      </button>
                      {ratingPickerOpen && (
                        <div style={{position:"absolute",zIndex:50,top:"calc(100% + 5px)",left:0,width:"100%",maxHeight:160,overflowY:"auto",background:"#fff",border:"1px solid #b9d0da",borderRadius:9,boxShadow:"0 8px 22px rgba(0,35,55,.22)",padding:4}}>
                          {["Perlu Latihan","Berkembang","Baik","Sangat Baik"].map(x=>
                            <button key={x} type="button" onClick={()=>{setProgressForm({...progressForm,rating:x});setRatingPickerOpen(false);}}
                              style={{display:"block",width:"100%",border:0,borderBottom:"1px solid #edf2f4",background:progressForm.rating===x?"#e7f4f5":"#fff",color:"#163b4d",padding:"8px 9px",textAlign:"left",fontSize:13,lineHeight:1.2,cursor:"pointer",borderRadius:6}}>
                              {x}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <textarea rows="2" value={progressForm.coach_note} onChange={e=>setProgressForm({...progressForm,coach_note:e.target.value})} placeholder="Catatan Pelatih" style={{width:"100%",boxSizing:"border-box",padding:9,border:0,borderRadius:8,marginTop:8}}/>
                  <textarea rows="2" value={progressForm.next_target} onChange={e=>setProgressForm({...progressForm,next_target:e.target.value})} placeholder="Target latihan berikutnya" style={{width:"100%",boxSizing:"border-box",padding:9,border:0,borderRadius:8,marginTop:8}}/>
                  <button disabled={savingProgress} type="submit" style={{marginTop:8,border:0,borderRadius:9,padding:"9px 15px",background:"#ffe24a",color:"#073b55",fontWeight:900,cursor:"pointer"}}>
                    {savingProgress ? "Menyimpan..." : "Simpan Progress"}
                  </button>
                </form>

                <section style={{background:"rgba(255,255,255,.9)",border:"1px solid #b9d0da",borderRadius:14,padding:12,overflowX:"auto"}}>
                  <table style={{width:"100%",minWidth:820,borderCollapse:"collapse",fontSize:11}}>
                    <thead style={{background:"#063d56",color:"#fff"}}><tr>
                      {["Tanggal","Pemain","Materi","Progress","Catatan Pelatih","Target Berikutnya","Aksi"].map(h=><th key={h} style={{padding:8,textAlign:"left"}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {loadingProgress ? <tr><td colSpan="7" style={{padding:20,textAlign:"center"}}>Memuat...</td></tr> :
                       progressList.length===0 ? <tr><td colSpan="7" style={{padding:20,textAlign:"center",color:"#64748b"}}>Belum ada progress pemain.</td></tr> :
                       progressList.map(x=><tr key={x.id} style={{borderBottom:"1px solid #dbe5ea"}}>
                         <td style={{padding:8}}>{x.training_date}</td><td style={{padding:8,fontWeight:700}}>{x.player_name}</td>
                         <td style={{padding:8}}>{x.material}</td><td style={{padding:8}}>{x.rating}</td>
                         <td style={{padding:8}}>{x.coach_note || "-"}</td><td style={{padding:8}}>{x.next_target || "-"}</td>
                         <td style={{padding:8}}><button type="button" onClick={()=>deleteProgress(x.id)} style={{border:"1px solid #e6a5a5",background:"#fff5f5",color:"#b42318",borderRadius:6,padding:"4px 7px",fontSize:10}}>Hapus</button></td>
                       </tr>)}
                    </tbody>
                  </table>
                </section>
              </>
            ) : (
              <>
                <form onSubmit={findPublicProgress} style={{background:"#fff",border:"1px solid #b9d0da",borderRadius:14,padding:14,boxShadow:"0 6px 18px rgba(0,45,65,.08)"}}>
                  <strong style={{color:"#073b55"}}>Cari Progress Saya</strong>
                  <p style={{fontSize:11,color:"#64748b"}}>Gunakan nama dan nomor WhatsApp yang sama dengan saat pendaftaran.</p>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:8}}>
                    <input required value={progressSearch.name} onChange={e=>setProgressSearch({...progressSearch,name:e.target.value})} placeholder="Nama peserta" style={{padding:10,border:"1px solid #b9d0da",borderRadius:8}}/>
                    <input required value={progressSearch.whatsapp} onChange={e=>setProgressSearch({...progressSearch,whatsapp:e.target.value})} placeholder="Nomor WhatsApp" style={{padding:10,border:"1px solid #b9d0da",borderRadius:8}}/>
                  </div>
                  <button type="submit" style={{marginTop:9,border:0,borderRadius:9,padding:"9px 15px",background:"#087b72",color:"#fff",fontWeight:800}}>Lihat Progress</button>
                </form>

                {progressSearchDone && <div style={{marginTop:12,display:"grid",gap:8}}>
                  {publicProgress.length===0 ? <div style={{background:"#fff",padding:18,borderRadius:12,textAlign:"center",color:"#64748b"}}>Progress belum ditemukan.</div> :
                  publicProgress.map(x=><article key={x.id} style={{background:"#fff",border:"1px solid #bfd3dc",borderRadius:12,padding:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:10,color:"#64748b"}}><span>{x.training_date}</span><strong style={{color:"#087b72"}}>{x.rating}</strong></div>
                    <h3 style={{fontSize:15,margin:"4px 0",color:"#073b55"}}>{x.material}</h3>
                    <div style={{fontSize:11}}><b>Catatan:</b> {x.coach_note || "-"}</div>
                    <div style={{fontSize:11,marginTop:4}}><b>Target berikutnya:</b> {x.next_target || "-"}</div>
                  </article>)}
                </div>}
              </>
            )}
          </div>
        </main>
      )}

      {page === "video" && (
        <main style={{background:"linear-gradient(180deg,#dbe8ed,#eef4f6,#d4e4ea)",minHeight:"75vh",padding:"18px 12px 24px"}}>
          <div style={{maxWidth:900,margin:"0 auto"}}>
            <button className="back-button" onClick={()=>setPage("program")}>← Program</button>
            <div style={{textAlign:"center",margin:"8px 0 14px"}}>
              <div style={{fontSize:30}}>▶️</div>
              <h2 style={{margin:"3px 0",color:"#073b55"}}>Video Pelatihan</h2>
              <p style={{fontSize:12,color:"#607d8b",margin:0}}>Dokumentasi latihan dan materi teknik tenis meja.</p>
            </div>

            {isPelatih && (
              <form onSubmit={saveTrainingVideo} style={{background:"linear-gradient(145deg,#064f76,#073b55)",color:"#fff",borderRadius:14,padding:14,marginBottom:12,boxShadow:"0 7px 18px rgba(0,45,65,.13)"}}>
                <strong>+ Tambah Video YouTube</strong>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:8,marginTop:9}}>
                  <input value={videoForm.title} onChange={e=>setVideoForm({...videoForm,title:e.target.value})} placeholder="Judul video" required style={{padding:9,borderRadius:8,border:0}}/>
                  <select value={videoForm.category} onChange={e=>setVideoForm({...videoForm,category:e.target.value})} style={{padding:9,borderRadius:8,border:0}}>
                    {["Teknik Dasar","Topspin & Spin","Service","Block & Defense","Bintik","Footwork","Taktik","Latihan / Pertandingan","Lainnya"].map(x=><option key={x}>{x}</option>)}
                  </select>
                </div>
                <input value={videoForm.youtube_url} onChange={e=>setVideoForm({...videoForm,youtube_url:e.target.value})} placeholder="Tempel link YouTube di sini" required style={{width:"100%",padding:9,borderRadius:8,border:0,marginTop:8,boxSizing:"border-box"}}/>
                <textarea value={videoForm.description} onChange={e=>setVideoForm({...videoForm,description:e.target.value})} placeholder="Keterangan video (opsional)" rows="2" style={{width:"100%",padding:9,borderRadius:8,border:0,marginTop:8,boxSizing:"border-box",resize:"vertical"}}/>
                <button disabled={savingVideo} type="submit" style={{marginTop:8,border:0,borderRadius:9,padding:"9px 15px",background:"#ffe24a",color:"#073b55",fontWeight:900,cursor:"pointer"}}>
                  {savingVideo ? "Menyimpan..." : "Simpan Video"}
                </button>
              </form>
            )}

            {loadingVideos ? (
              <div style={{textAlign:"center",padding:25,color:"#607d8b"}}>⏳ Memuat video...</div>
            ) : trainingVideos.length === 0 ? (
              <section style={{background:"rgba(255,255,255,.88)",border:"1px solid #b9d0da",borderRadius:14,padding:26,textAlign:"center",color:"#64748b"}}>
                <div style={{fontSize:34}}>🎬</div><strong style={{color:"#073b55"}}>Belum ada video pelatihan</strong>
              </section>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12}}>
                {trainingVideos.map(v=>{
                  const embed=youtubeEmbedUrl(v.youtube_url);
                  return <article key={v.id} style={{background:"#fff",border:"1px solid #bfd3dc",borderRadius:14,overflow:"hidden",boxShadow:"0 6px 17px rgba(20,55,75,.08)"}}>
                    {embed && <div style={{aspectRatio:"16/9",background:"#062f46"}}><iframe src={embed} title={v.title} style={{width:"100%",height:"100%",border:0}} allowFullScreen /></div>}
                    <div style={{padding:12}}>
                      <div style={{fontSize:10,fontWeight:900,color:"#087b72"}}>{v.category || "Video Pelatihan"}</div>
                      <h3 style={{fontSize:15,margin:"3px 0",color:"#073b55"}}>{v.title}</h3>
                      {v.description && <p style={{fontSize:11,color:"#64748b",margin:"4px 0"}}>{v.description}</p>}
                      {isPelatih && <button type="button" onClick={()=>deleteTrainingVideo(v.id)} style={{marginTop:7,border:"1px solid #e6a5a5",background:"#fff5f5",color:"#b42318",borderRadius:7,padding:"5px 9px",fontSize:10,cursor:"pointer"}}>Hapus</button>}
                    </div>
                  </article>
                })}
              </div>
            )}
          </div>
        </main>
      )}

      {["home","pendaftaran","jadwal","pembayaran","program","progress","video"].includes(page) && (
        <nav style={{position:"sticky",bottom:0,zIndex:20,background:"#003a61",color:"#fff",display:"grid",gridTemplateColumns:"repeat(5,1fr)",padding:"4px 2px",boxShadow:"0 -4px 18px rgba(0,0,0,.15)"}}>
          {[
            ["home","⌂","Home"],["progress","📈","Progress"],["video","▶️","Video"],["pembayaran","💳","Pembayaran"],["program","🏓","Program"]
          ].map(([key,ic,label])=><button key={key} type="button" onClick={()=>setPage(key)}
            style={{border:0,background:"transparent",color:page===key?"#24b6ff":"#fff",padding:"4px 1px",fontSize:10,cursor:"pointer"}}>
            <div style={{fontSize:17,lineHeight:1.1}}>{ic}</div><div>{label}</div>
          </button>)}
        </nav>
      )}

      {page === "register" &&

        selectedSchedule && (



          <main className="registration-page">



            <button

              className="back-button"

              onClick={() =>

                setPage("home")

              }

            >

              ← Kembali ke Jadwal

            </button>



            <div className="registration-wrapper">



              <div className="registration-heading">



                <span className="small-title">

                  PENDAFTARAN LATIHAN

                </span>



                <h2>

                  Isi Data Peserta

                </h2>



                <p>

                  Jadwal sudah dipilih.

                  Silakan lengkapi data peserta

                  di bawah ini.

                </p>



              </div>



              <div className="registration-layout">



                {/* JADWAL DIPILIH */}



                <div className="selected-session">



                  <span className="selected-label">

                    JADWAL YANG DIPILIH

                  </span>



                  <h3>

                    {selectedSchedule.day}

                  </h3>



                  <div className="selected-time">

                    {selectedSchedule.time}

                  </div>



                  <div className="session-info-row">



                    <span>

                      Pelatih

                    </span>



                    <strong>

                      {

                        selectedSchedule.coach

                      }

                    </strong>



                  </div>



                  <div className="session-info-row">



                    <span>

                      Jenis Latihan

                    </span>



                    <strong>



                      {selectedSchedule.type ===

                      "Private"

                        ? "Private"

                        : `Grup Maks. ${selectedSchedule.quota} Orang`}



                    </strong>



                  </div>



                  <div className="session-info-row">



                    <span>

                      Peserta Saat Ini

                    </span>



                    <strong>

                      {

                        selectedSchedule.registered

                      }{" "}

                      /{" "}

                      {

                        selectedSchedule.quota

                      }

                    </strong>



                  </div>



                  <div className="session-note">



                    {selectedSchedule.type ===

                    "Private"



                      ? "Slot ini khusus latihan private."



                      : "Pendaftaran belum dikenakan pembayaran. Tagihan akan diberikan setelah sesi memenuhi jumlah minimum peserta."}



                  </div>



                </div>



                {/* FORM */}



                <form

                  className="registration-form"

                  onSubmit={

                    submitRegistration

                  }

                >



                  <div className="form-group">



                    <label>

                      Nama Lengkap

                    </label>



                    <input

                      type="text"

                      name="name"

                      value={form.name}

                      onChange={

                        handleFormChange

                      }

                      placeholder="Contoh: Budi Santoso"

                    />



                  </div>



                  <div className="form-group">



                    <label>

                      Nomor WhatsApp

                    </label>



                    <div className="phone-input">



                      <span>

                        +62

                      </span>



                      <input

                        type="tel"

                        name="whatsapp"

                        value={

                          form.whatsapp

                        }

                        onChange={

                          handleFormChange

                        }

                        placeholder="812 3456 7890"

                      />



                    </div>



                  </div>



                  <div className="form-group">



                    <label>

                      Level Permainan

                    </label>



                    <select

                      name="level"

                      value={form.level}

                      onChange={

                        handleFormChange

                      }

                    >



                      <option value="">

                        Pilih Level

                      </option>



                      <option value="Pemula">

                        Pemula

                      </option>



                      <option value="Menengah">

                        Menengah

                      </option>



                      <option value="Advance">

                        Advance

                      </option>



                    </select>



                  </div>



                  <div className="form-group">

                    <label>Jenis Latihan</label>

                    <input

                      type="text"

                      value={selectedSchedule.type === "Private" ? "Private Khusus (1 Orang)" : "Group (3–4 Orang)"}

                      readOnly

                      aria-label="Jenis Latihan sesuai jadwal"

                    />

                  </div>



                  <div className="form-group">

                    <label>Lokasi Latihan</label>

                    <select

                      name="locationType"

                      value={form.locationType}

                      onChange={(e) =>

                        setForm((prev) => ({

                          ...prev,

                          locationType: e.target.value,

                          locationDetail: "",

                        }))

                      }

                    >

                      {form.trainingType === "Private" && (

                        <option value="Datang ke Rumah">Datang ke Rumah</option>

                      )}

                      <option value="JIEP Sports">JIEP Sports</option>

                      <option value="Lokasi Lain">Lokasi Lain</option>

                    </select>

                  </div>



                  {(form.locationType === "Datang ke Rumah" ||

                    form.locationType === "Lokasi Lain") && (

                    <div className="form-group">

                      <label>

                        {form.locationType === "Datang ke Rumah"

                          ? "Alamat Rumah"

                          : "Nama / Alamat Lokasi"}

                      </label>

                      <input

                        type="text"

                        name="locationDetail"

                        value={form.locationDetail}

                        onChange={handleFormChange}

                        placeholder={

                          form.locationType === "Datang ke Rumah"

                            ? "Masukkan alamat lengkap"

                            : "Masukkan nama atau alamat lokasi"

                        }

                      />

                    </div>

                  )}



                  <div className="registration-warning">

                    {form.trainingType === "Private"

                      ? "Private Khusus untuk 1 orang. Pilih JIEP Sports, Datang ke Rumah, atau Lokasi Lain."

                      : "Group berjalan mulai 3 peserta dan maksimal 4 peserta. Pilih JIEP Sports atau Lokasi Lain."}

                  </div>



                  <button

                    type="submit"

                    className="register-submit"

                    disabled={isSubmitting}

                  >

                    {isSubmitting

                      ? "⏳ Memproses Pendaftaran..."

                      : "Daftar Sekarang →"}

                  </button>



                </form>



              </div>



            </div>



          </main>

        )}



      {/* =====================================================

          PENDAFTARAN BERHASIL

      ===================================================== */}



      {page === "success" &&

        selectedSchedule && (



          <main className="success-page">



            <div className="success-card">



              <div className="success-icon">

                ✓

              </div>



              <span className="small-title">

                PENDAFTARAN BERHASIL

              </span>



              <h2>

                Terima Kasih, {form.name}

              </h2>



              <p className="success-intro">

                Data pendaftaran latihan Anda

                sudah tercatat.

              </p>



              <div className="success-session">



                <div>



                  <span>

                    Hari

                  </span>



                  <strong>

                    {

                      selectedSchedule.day

                    }

                  </strong>



                </div>



                <div>



                  <span>

                    Jam

                  </span>



                  <strong>

                    {

                      selectedSchedule.time

                    }

                  </strong>



                </div>



                <div>



                  <span>

                    Pelatih

                  </span>



                  <strong>

                    {

                      selectedSchedule.coach

                    }

                  </strong>



                </div>



                <div>



                  <span>

                    Peserta

                  </span>



                  <strong>

                    {selectedSchedule.registered}{" "}

                    /{" "}

                    {

                      selectedSchedule.quota

                    }

                  </strong>



                </div>



              </div>



              <div className="waiting-status">



                <span>

                  STATUS PENDAFTARAN

                </span>



                <strong>



                  {form.trainingType === "Private"

                    ? "Menunggu Konfirmasi Pelatih"

                    : selectedSchedule.registered >= 3

                    ? "Grup Siap / Bisa Jalan"

                    : "Menunggu Grup Terbentuk"}



                </strong>



                <p>



                  {form.trainingType === "Private"

                    ? "Pelatih akan mengonfirmasi lokasi, jadwal, dan pembayaran latihan private."

                    : selectedSchedule.registered >= 3

                    ? "Jumlah minimum 3 peserta sudah terpenuhi. Grup sudah dapat dijalankan."

                    : "Belum perlu melakukan pembayaran. Grup akan berjalan setelah minimal 3 peserta terpenuhi."}



                </p>



              </div>



              <button

                className="back-home-button"

                onClick={backHome}

              >

                Kembali ke Jadwal

              </button>



            </div>



          </main>

        )}



      {/* =====================================================

          FOOTER

      ===================================================== */}



      <footer>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,lineHeight:1.15}}>
          <strong style={{margin:0}}>PINGPONG TRAINING</strong>
          <span style={{margin:0}}>Table Tennis Training Center</span>
        </div>
      </footer>



    </div>

  );

}



export default App;