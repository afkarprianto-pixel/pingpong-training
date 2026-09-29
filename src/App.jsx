import React, { useEffect, useState } from "react";

import { supabase } from "./supabase";

import "./App.css";
import pingpongTrainingLogo from "./assets/pingpong-training-logo.png";
import heroTraining from "./assets/hero-training.png";
import qrPingpongTraining from "./assets/QR_PINGPONG_TRAINING.png";
import qrisBca from "./assets/qris-bca.png";
import skIcon from "./assets/sk-icon.png";



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
  const [showTerms, setShowTerms] = useState(false);
  const [page, setPage] = useState("home");
  const [publicChats, setPublicChats] = useState([]);
  const [chatName, setChatName] = useState(() => localStorage.getItem("pingtrn_chat_name") || "");
  const [chatMessage, setChatMessage] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingChatText, setEditingChatText] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [lastReadChatId, setLastReadChatId] = useState(() => Number(localStorage.getItem("pingtrn_last_read_chat_id") || 0));

  const [editId, setEditId] = useState(null);

  const [scheduleForm, setScheduleForm] = useState({ ...emptySchedule });

  const [savingSchedule, setSavingSchedule] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [registrationError, setRegistrationError] = useState("");
  const [participantFilter, setParticipantFilter] = useState("Semua");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [bulkParticipantAction, setBulkParticipantAction] = useState(false);
  const [schedulePopup, setSchedulePopup] = useState(null);
  const [schedulePopupParticipants, setSchedulePopupParticipants] = useState([]);
  const [loadingSchedulePopup, setLoadingSchedulePopup] = useState(false);
  const [participantPopup, setParticipantPopup] = useState(null);
  const [participantEdit, setParticipantEdit] = useState({name:"",whatsapp:"",level:"",status:"",schedule_id:""});
  const [savingParticipantEdit, setSavingParticipantEdit] = useState(false);
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



  async function loadPublicChat() {
    setLoadingChat(true);
    const { data, error } = await supabase.from("public_chat")
      .select("id,sender_name,message,sender_type,created_at")
      .order("created_at", { ascending: true })
      .limit(100);
    if (!error) setPublicChats(data || []);
    else console.error("Gagal mengambil Chat Public:", error);
    setLoadingChat(false);
  }

  async function sendPublicChat(e) {
    e.preventDefault();
    const nama = (isPelatih ? "Pelatih" : chatName).trim();
    const pesan = chatMessage.trim();
    if (!nama) { alert("Isi nama terlebih dahulu."); return; }
    if (!pesan || sendingChat) return;
    setSendingChat(true);
    if (!isPelatih) localStorage.setItem("pingtrn_chat_name", nama);
    const { error } = await supabase.from("public_chat").insert({
      sender_name: nama,
      message: pesan,
      sender_type: isPelatih ? "pelatih" : "member"
    });
    setSendingChat(false);
    if (error) { alert("Pesan gagal dikirim: " + error.message); return; }
    setChatMessage("");
    await loadPublicChat();
  }

  useEffect(() => {
    loadPublicChat();
    const timer = setInterval(loadPublicChat, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (page !== "chat" || publicChats.length === 0) return;
    const newest = Math.max(...publicChats.map(c => Number(c.id) || 0));
    setLastReadChatId(newest);
    localStorage.setItem("pingtrn_last_read_chat_id", String(newest));
  }, [page, publicChats]);

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      if (!standalone && localStorage.getItem("pingtrn_install_dismissed") !== "1") setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function installPingTrn() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice?.outcome === "accepted") setShowInstall(false);
    setInstallPrompt(null);
  }

  function dismissInstall() {
    localStorage.setItem("pingtrn_install_dismissed", "1");
    setShowInstall(false);
  }

  async function saveEditedChat(id) {
    const message = editingChatText.trim();
    if (!message) return;
    const { error } = await supabase.from("public_chat").update({ message }).eq("id", id);
    if (error) { alert("Pesan gagal diedit: " + error.message); return; }
    setEditingChatId(null); setEditingChatText(""); await loadPublicChat();
  }

  async function deletePublicChat(id) {
    if (!window.confirm("Hapus pesan ini?")) return;
    const { error } = await supabase.from("public_chat").delete().eq("id", id);
    if (error) { alert("Pesan gagal dihapus: " + error.message); return; }
    await loadPublicChat();
  }

  const unreadChatCount = publicChats.filter(c => Number(c.id) > lastReadChatId).length;

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
      .select("id,schedule_id,name,whatsapp,level,status,payment_status,training_type,location_type,location_detail,paid_amount,invoice_amount,registration_status")
      .order("id", { ascending: false });
    if (error) {
      setRegistrationError("Gagal mengambil peserta: " + error.message);
      setRegistrations([]);
    } else setRegistrations(data || []);
    setLoadingRegistrations(false);
  }

  function jumlahPesertaJadwal(scheduleId) {
    return registrations.filter(r =>
      String(r.schedule_id) === String(scheduleId) &&
      (!r.registration_status || r.registration_status === "Terdaftar")
    ).length;
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

  async function bukaPesertaJadwal(schedule) {
    setSchedulePopup(schedule);
    setSchedulePopupParticipants([]);
    setLoadingSchedulePopup(true);

    const { data, error } = await supabase
      .from("registrations")
      .select("*")
      .eq("schedule_id", schedule.id)
      .order("id", { ascending: true });

    setLoadingSchedulePopup(false);

    if (error) {
      console.error("Gagal mengambil peserta jadwal:", error);
      alert("Gagal mengambil data peserta: " + error.message);
      return;
    }

    setSchedulePopupParticipants((data || []).filter(r => !r.registration_status || r.registration_status === "Terdaftar"));
  }

  async function batalkanPesertaCoach(r) {
    if (!isPelatih || !r) return;
    const nama = r.name || "peserta";
    if (!window.confirm(`Batalkan pendaftaran ${nama}? Slot jadwal akan tersedia kembali, tetapi riwayat peserta tetap tersimpan.`)) return;
    const { error } = await supabase.from("registrations")
      .update({ registration_status: "Dibatalkan Coach" }).eq("id", r.id);
    if (error) { alert("Gagal membatalkan pendaftaran: " + error.message); return; }
    setParticipantPopup(null);
    setSchedulePopup(null);
    await loadRegistrations();
    await loadSchedules();
    alert(`Pendaftaran ${nama} berhasil dibatalkan.`);
  }

  function togglePilihPeserta(id) {
    setSelectedParticipantIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function batalkanPesertaTerpilih() {
    if (!isPelatih || bulkParticipantAction || selectedParticipantIds.length === 0) return;
    const aktifIds = registrations
      .filter(r => selectedParticipantIds.includes(r.id) && (!r.registration_status || r.registration_status === "Terdaftar"))
      .map(r => r.id);

    if (aktifIds.length === 0) {
      alert("Tidak ada peserta aktif yang dipilih.");
      return;
    }

    if (!window.confirm(`Batalkan ${aktifIds.length} pendaftaran terpilih? Data tetap tersimpan sebagai riwayat dan slot jadwal akan tersedia kembali.`)) return;

    setBulkParticipantAction(true);
    const { error } = await supabase
      .from("registrations")
      .update({ registration_status: "Dibatalkan Coach" })
      .in("id", aktifIds);
    setBulkParticipantAction(false);

    if (error) {
      alert("Gagal membatalkan peserta terpilih: " + error.message);
      return;
    }

    setSelectedParticipantIds([]);
    await loadRegistrations();
    await loadSchedules();
    alert(`${aktifIds.length} pendaftaran berhasil dibatalkan.`);
  }

  async function hapusPesertaTerpilih() {
    if (!isPelatih || bulkParticipantAction || selectedParticipantIds.length === 0) return;
    const jumlah = selectedParticipantIds.length;
    if (!window.confirm(`HAPUS PERMANEN ${jumlah} peserta terpilih?\n\nGunakan ini hanya untuk data salah / data uji coba. Data yang dihapus tidak dapat dikembalikan.`)) return;
    if (!window.confirm(`Konfirmasi sekali lagi: benar-benar hapus permanen ${jumlah} data peserta?`)) return;

    setBulkParticipantAction(true);
    const { error } = await supabase
      .from("registrations")
      .delete()
      .in("id", selectedParticipantIds);
    setBulkParticipantAction(false);

    if (error) {
      alert("Gagal menghapus permanen. Pastikan policy DELETE Supabase untuk Coach sudah dibuat.\n\n" + error.message);
      return;
    }

    setSelectedParticipantIds([]);
    await loadRegistrations();
    await loadSchedules();
    alert(`${jumlah} data peserta berhasil dihapus permanen.`);
  }

  function bukaEditPeserta(r) {
    setParticipantPopup(r);
    setParticipantEdit({
      name:r.name || "",
      whatsapp:r.whatsapp || "",
      level:r.level || "",
      status:r.status || "",
      schedule_id:String(r.schedule_id || "")
    });
  }

  async function simpanEditPeserta() {
    if (!participantPopup || savingParticipantEdit) return;
    if (!participantEdit.name.trim() || !participantEdit.whatsapp.trim()) {
      alert("Nama dan WhatsApp wajib diisi.");
      return;
    }
    setSavingParticipantEdit(true);
    const { error } = await supabase.from("registrations").update({
      name:participantEdit.name.trim(),
      whatsapp:participantEdit.whatsapp.trim(),
      level:participantEdit.level,
      status:participantEdit.status,
      schedule_id:Number(participantEdit.schedule_id)
    }).eq("id",participantPopup.id);
    setSavingParticipantEdit(false);
    if (error) { alert("Gagal menyimpan perubahan peserta: " + error.message); return; }
    setParticipantPopup(null);
    await loadRegistrations();
    await loadSchedules();
    alert("Data peserta berhasil diperbarui.");
  }

  function nomorWhatsAppIndonesia(value) {
    let n = String(value || "").replace(/\D/g, "");
    if (n.startsWith("0")) n = "62" + n.slice(1);
    else if (n.startsWith("8")) n = "62" + n;
    else if (!n.startsWith("62")) return "";
    return /^628\d{7,12}$/.test(n) ? n : "";
  }

  function kirimTagihanWhatsApp(r) {
    const tagihan = tagihanPeserta(r);
    if (tagihan === null) {
      alert("Tagihan belum tersedia. Untuk Group, tunggu minimal 3 peserta.");
      return;
    }

    const nomor = nomorWhatsAppIndonesia(r.whatsapp);
    if (!nomor) {
      alert("Nomor WhatsApp peserta tidak valid. Periksa nomor pada Data Peserta.");
      return;
    }

    const jadwal = schedules.find(s => String(s.id) === String(r.schedule_id));
    if (!jadwal) {
      alert("Jadwal peserta tidak ditemukan.");
      return;
    }

    const jenis = r.training_type === "Private" ? "Private" : "Group";
    const pesan = [
      "🏓 *PINGPONG TRAINING*",
      "",
      `Halo ${r.name || "Member"}, pendaftaran latihan Anda sudah tercatat.`,
      "",
      `Jadwal: ${jadwal.day}, ${jadwal.time}`,
      `Program: ${jenis}`,
      `Total Tagihan: *${rupiah(tagihan)}*`,
      "",
      "Pembayaran:",
      "BCA a.n. Teguh Prianto, SE",
      "No. Rekening: 7740579198",
      "",
      "Setelah pembayaran, silakan kirim bukti pembayaran kepada Pelatih.",
      "Terima kasih."
    ].join("\\n");

    window.open(`https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`, "_blank", "noopener,noreferrer");
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

// Ambil peserta aktif langsung dari registrations agar angka jadwal selalu sinkron.
    const { data: activeRegistrationData, error: activeRegistrationError } = await supabase
      .from("registrations")
      .select("schedule_id,registration_status")
      .eq("registration_status", "Terdaftar");

    if (activeRegistrationError) {
      console.error("Gagal mengambil jumlah peserta aktif:", activeRegistrationError);
    }

    const activeCountBySchedule = (activeRegistrationData || []).reduce((acc, row) => {
      const key = String(row.schedule_id);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

const formattedSchedules = await Promise.all(

  (scheduleData || []).map(async (item) => {

    const registrationCount = activeCountBySchedule[String(item.id)] || 0;

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
      available: Boolean(item.is_active) && !Boolean(item.registration_closed) && Number(registrationCount || 0) < Number(item.quota || (item.type === "Private" ? 1 : 4)),

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
        *, *::before, *::after { box-sizing: border-box; }
        html, body { width: 100%; min-width: 320px; margin: 0; padding: 0; }
        #root { width: 100% !important; max-width: none !important; min-width: 320px; margin: 0 !important; padding: 0 !important; }
        body { overflow-x: hidden; background: #061a3a; }
        .app { width: 100%; max-width: none; min-height: 100vh; overflow-x: hidden; }
        .header { min-height: 58px !important; padding: 8px clamp(12px, 3vw, 28px) !important; gap: 12px; }
        .brand { min-width: 0; cursor: pointer; }
        .login-btn { flex: 0 0 auto; white-space: nowrap; }
        .hero { min-height: clamp(250px, 43vw, 330px) !important; padding: 16px clamp(12px, 4vw, 42px) 20px !important; background-position: center 58% !important; overflow: hidden; }
        .hero-content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; }
        .hero-content h2 { max-width: 620px; text-wrap: balance; }
        .home-contact-icon { flex: 0 0 auto; }
        .app footer .home-contact-icon { width: 48px !important; height: 48px !important; min-width: 48px !important; min-height: 48px !important; font-size: 24px !important; }
        .app footer .footer-qr { width: 44px !important; height: 44px !important; max-width: 44px !important; max-height: 44px !important; padding: 1px !important; }
        .bottom-nav { padding: 5px 2px 4px !important; }
        .hero-description { position: static !important; width: min(100%, 560px) !important; margin: 12px auto 0 !important; text-align: center !important; font-size: clamp(11px, 2.3vw, 14px) !important; line-height: 1.45 !important; }
        .quick-actions { padding: 16px 12px 12px !important; margin-top: 0 !important; }
        .quick-actions > div { gap: 10px !important; }
        .quick-actions button { min-height: 70px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
        .app > main:not(.registration-page):not(.success-page) { min-height: auto !important; padding-top: 16px !important; padding-bottom: 20px !important; }
        .content { width: min(100%, 1050px); }
        .admin-compact h2 { margin: 2px 0 8px !important; color:#062f46; }
        .admin-compact h3 { margin-top: 8px !important; margin-bottom: 7px !important; color:#073b55; }
        .admin-compact .registration-form { margin: 8px 0 12px !important; padding: 14px !important; background: rgba(255,255,255,.78) !important; border: 1px solid #b9d0da !important; border-radius: 12px !important; box-shadow: 0 5px 16px rgba(0,43,64,.07); }
        .admin-compact .form-group { margin-bottom: 8px !important; }
        .admin-compact .form-group label { margin-bottom: 3px !important; font-size:12px !important; color:#16485d; }
        .admin-compact input, .admin-compact select { min-height: 36px !important; padding: 7px 10px !important; }
        .admin-compact p { margin-top: 5px !important; margin-bottom: 5px !important; line-height:1.3 !important; }
        .admin-compact .register-submit { margin-top: 6px !important; min-height:38px !important; }
        .admin-compact section { box-shadow:0 5px 16px rgba(0,43,64,.06); }
        .admin-compact table th { background:#063d56; }
        .admin-compact table td { line-height:1.2; }
        .clickable-participant-row, .clickable-schedule-row { cursor:pointer; }
        .clickable-participant-row > td, .clickable-schedule-row > td { transition: background-color .16s ease, color .16s ease, box-shadow .16s ease !important; }
        .clickable-participant-row:hover > td { background-color:#bfe9df !important; }
        .clickable-participant-row:hover > td:first-child { box-shadow:inset 5px 0 0 #047857 !important; }
        .clickable-schedule-row:hover > td { background-color:#c7e9f5 !important; }
        .clickable-schedule-row:hover > td:first-child { box-shadow:inset 5px 0 0 #08799a !important; }
        footer { overflow: hidden; }
        @media (max-width: 600px) {
          .header { min-height: 54px !important; padding-top: 6px !important; padding-bottom: 6px !important; }
          .hero { height: 280px !important; min-height: 280px !important; background-position: center 80% !important; }
          .hero-content { transform: translateY(-18px) !important; padding-top: 4px; }
          .hero-content h2 { font-size: clamp(22px, 7vw, 30px) !important; line-height: 1.08 !important; margin: 7px 0 0 !important; }
          .hero-description { margin-top: 12px !important; }
          .app footer .home-contact-icon { width: 48px !important; height: 48px !important; min-width: 48px !important; min-height: 48px !important; font-size: 24px !important; }
          .app footer .footer-qr { width: 44px !important; height: 44px !important; max-width: 44px !important; max-height: 44px !important; }
          .quick-actions { padding-top: 12px !important; }
          .quick-actions > div { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px !important; }
          .quick-actions button { min-height: 66px; padding: 7px 5px !important; }
          .app > main:not(.registration-page):not(.success-page) { padding-left: 10px !important; padding-right: 10px !important; }
          footer { padding-top: 10px !important; padding-bottom: 12px !important; }

          /* KHUSUS footer navy paling bawah yang berisi QR + 3 baris teks */
          footer.qr-footer-final {
            min-height: 0 !important;
            height: auto !important;
            padding-top: 3px !important;
            padding-bottom: 3px !important;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
        }
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
                <div style={{marginBottom:10}}>
                  <input
                    type="search"
                    placeholder="🔍 Cari member: nama atau WhatsApp..."
                    value={memberSearch}
                    onChange={e=>setMemberSearch(e.target.value)}
                    style={{width:"100%",maxWidth:420,padding:"9px 11px",border:"1px solid #a9c2ce",borderRadius:9,background:"#fff",color:"#102a3a"}}
                  />
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:10,padding:"9px 10px",background:"#f4f8fa",border:"1px solid #d5e2e8",borderRadius:9}}>
                  <label style={{display:"flex",alignItems:"center",gap:6,fontWeight:800,cursor:"pointer"}}>
                    <input
                      type="checkbox"
                      checked={(() => {
                        const visible = registrations.filter(r=>(participantFilter==="Semua" || r.training_type===participantFilter) && (!memberSearch.trim() || `${r.name||""} ${r.whatsapp||""}`.toLowerCase().includes(memberSearch.trim().toLowerCase())));
                        return visible.length > 0 && visible.every(r=>selectedParticipantIds.includes(r.id));
                      })()}
                      onChange={e=>{
                        const visibleIds = registrations.filter(r=>(participantFilter==="Semua" || r.training_type===participantFilter) && (!memberSearch.trim() || `${r.name||""} ${r.whatsapp||""}`.toLowerCase().includes(memberSearch.trim().toLowerCase()))).map(r=>r.id);
                        setSelectedParticipantIds(prev => e.target.checked ? Array.from(new Set([...prev,...visibleIds])) : prev.filter(id=>!visibleIds.includes(id)));
                      }}
                    />
                    Pilih Semua
                  </label>
                  <span style={{fontSize:12,fontWeight:800,color:"#475569"}}>{selectedParticipantIds.length} dipilih</span>
                  <button type="button" disabled={!selectedParticipantIds.length || bulkParticipantAction} onClick={batalkanPesertaTerpilih}
                    style={{padding:"8px 10px",border:0,borderRadius:8,background:selectedParticipantIds.length?"#d97706":"#cbd5e1",color:"#fff",fontWeight:900,cursor:selectedParticipantIds.length?"pointer":"not-allowed"}}>
                    {bulkParticipantAction ? "Memproses..." : "Batalkan Terpilih"}
                  </button>
                  <button type="button" disabled={!selectedParticipantIds.length || bulkParticipantAction} onClick={hapusPesertaTerpilih}
                    style={{padding:"8px 10px",border:0,borderRadius:8,background:selectedParticipantIds.length?"#b91c1c":"#cbd5e1",color:"#fff",fontWeight:900,cursor:selectedParticipantIds.length?"pointer":"not-allowed"}}>
                    Hapus Permanen Terpilih
                  </button>
                </div>
                {registrationError && <p role="alert" style={{color:"#b91c1c"}}>{registrationError}</p>}
                {!loadingRegistrations && !registrationError && registrations.length===0 &&
                  <p>Klik "Muat / Refresh Peserta" untuk menampilkan pendaftar.</p>}
                <div style={{overflowX:"auto",maxHeight:430,overflowY:"auto",border:"1px solid #dbe5ed",borderRadius:10}}>
                  <table style={{width:"100%",minWidth:1480,borderCollapse:"collapse",fontSize:13,textAlign:"left"}}>
                    <thead style={{position:"sticky",top:0,background:"#0b3042",color:"white",zIndex:1}}>
                      <tr>{["Pilih","No.","Nama Peserta","WhatsApp","Jenis","Jadwal","Level","Lokasi","Status","Tagihan","Diterima (Rp)","Status Bayar","Aksi"].map(h=><th key={h} style={{padding:"11px 10px",whiteSpace:"nowrap",borderBottom:"1px solid #cbd5e1"}}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {registrations.filter(r=>(participantFilter==="Semua" || r.training_type===participantFilter) && (!memberSearch.trim() || `${r.name||""} ${r.whatsapp||""}`.toLowerCase().includes(memberSearch.trim().toLowerCase()))).map((r,index)=>{
                        const jadwal=schedules.find(s=>s.id===r.schedule_id);
                        const cell={padding:"10px",borderBottom:"1px solid #e2e8f0",verticalAlign:"top"};
                        const tagihan=tagihanPeserta(r);
                        const draft=paymentDrafts[r.id]||{};
                        const status=draft.status??(["Belum Dibayar","DP","Lunas"].includes(r.payment_status)?r.payment_status:"Belum Dibayar");
                        const dibayar=draft.paid!==undefined?bacaRupiah(draft.paid):Number(r.paid_amount||0);
                        return <tr key={r.id} className="clickable-participant-row" onClick={()=>bukaEditPeserta(r)} title="Klik untuk melihat / edit peserta" style={{background:index%2===0?"#ffffff":"#f1f7f8",cursor:"pointer"}}>
                          <td style={{...cell,textAlign:"center"}} onClick={e=>e.stopPropagation()}>
                            <input type="checkbox" aria-label={`Pilih ${r.name}`} checked={selectedParticipantIds.includes(r.id)} onChange={()=>togglePilihPeserta(r.id)} />
                          </td>
                          <td style={cell}>{index+1}</td>
                          <td style={{...cell,fontWeight:700}}>{r.name}</td>
                          <td style={cell}>{r.whatsapp}</td>
                          <td style={cell}>{r.training_type==="Private"?"Private":"Grup"}</td>
                          <td style={{...cell,whiteSpace:"nowrap"}}>{jadwal?`${jadwal.day}, ${jadwal.time}`:`ID ${r.schedule_id}`}</td>
                          <td style={cell}>{r.level||"-"}</td>
                          <td style={cell}>{r.location_type||"-"}{r.location_detail?` — ${r.location_detail}`:""}</td>
                          <td style={cell}>{r.status||"-"}</td>
                          <td style={{...cell,whiteSpace:"nowrap"}}>{tagihan===null?"Menunggu 3 peserta":<>{rupiah(tagihan)}{Number(r.paid_amount||0)>tagihan&&<div style={{color:"#047857",fontWeight:700}}>Kelebihan: {rupiah(Number(r.paid_amount)-tagihan)}</div>}</>}</td>
                          <td style={cell} onClick={e=>e.stopPropagation()}><input aria-label={`Pembayaran ${r.name}`} inputMode="numeric" style={{width:130,padding:7}} value={draft.paid!==undefined?draft.paid:angkaRupiah(r.paid_amount||0)} onChange={e=>setPaymentDrafts(p=>({...p,[r.id]:{...p[r.id],paid:angkaRupiah(bacaRupiah(e.target.value))}}))} disabled={tagihan===null}/></td>
                          <td style={cell} onClick={e=>e.stopPropagation()}><select aria-label={`Status pembayaran ${r.name}`} style={{minWidth:130,padding:7}} value={["Belum Dibayar","DP","Lunas"].includes(status)?status:"Belum Dibayar"} onChange={e=>setPaymentDrafts(p=>({...p,[r.id]:{...p[r.id],status:e.target.value}}))} disabled={tagihan===null}>
                            <option>Belum Dibayar</option><option>DP</option><option>Lunas</option>
                          </select></td>
                          <td style={cell} onClick={e=>e.stopPropagation()}>
                              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                                <button type="button" className="back-button" disabled={tagihan===null||savingPaymentId!==null} onClick={()=>simpanPembayaran(r)}>{savingPaymentId===r.id?"Menyimpan...":"Simpan"}</button>
                                <button
                                  type="button"
                                  disabled={tagihan===null}
                                  onClick={()=>kirimTagihanWhatsApp(r)}
                                  title={tagihan===null ? "Tagihan belum tersedia" : "Buka WhatsApp dengan pesan tagihan"}
                                  style={{
                                    padding:"8px 10px",
                                    borderRadius:8,
                                    border:"1px solid #128c5e",
                                    background:tagihan===null?"#d8e0e3":"#16a66a",
                                    color:tagihan===null?"#718087":"#fff",
                                    fontWeight:900,
                                    cursor:tagihan===null?"not-allowed":"pointer",
                                    whiteSpace:"nowrap"
                                  }}
                                >
                                  WhatsApp Tagihan
                                </button>
                              </div>
                            </td>
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
                <table style={{width:"100%",minWidth:1040,borderCollapse:"collapse",tableLayout:"fixed",fontSize:12.5,textAlign:"left"}}>
                  <colgroup>
                    <col style={{width:"52px"}} />
                    <col style={{width:"95px"}} />
                    <col style={{width:"135px"}} />
                    <col style={{width:"82px"}} />
                    <col style={{width:"88px"}} />
                    <col style={{width:"125px"}} />
                    <col style={{width:"120px"}} />
                    <col style={{width:"115px"}} />
                    <col style={{width:"228px"}} />
                  </colgroup>
                  <thead style={{position:"sticky",top:0,background:"#0b3042",color:"#fff",zIndex:2}}>
                    <tr>{["No.","Hari","Waktu","Durasi","Jenis","Peserta","Pembayaran","Pendaftaran","Aksi"].map(h=>
                      <th key={h} style={{padding:"10px 8px",whiteSpace:"nowrap",borderBottom:"1px solid #dbe5ed",textAlign:"left",boxSizing:"border-box"}}>{h}</th>
                    )}</tr>
                  </thead>
                  <tbody>
                    {schedules.map((item,i)=>{
                      const cell={padding:"9px 8px",borderBottom:"1px solid #e2e8f0",whiteSpace:"nowrap",verticalAlign:"middle",textAlign:"left",boxSizing:"border-box",overflow:"hidden",textOverflow:"ellipsis"};
                      const pesertaJadwal=registrations.filter(r=>String(r.schedule_id)===String(item.id) && (!r.registration_status || r.registration_status==="Terdaftar"));
                      const semuaLunas=pesertaJadwal.length>0 && pesertaJadwal.every(r=>r.payment_status==="Lunas");
                      const terbuka=selectedScheduleId===item.id;
                      return <React.Fragment key={item.id}>
                        <tr
                          className="clickable-schedule-row"
                          onClick={()=>bukaPesertaJadwal(item)}
                          style={{background:i%2===0?"#fff":"#f1f7f8",cursor:"pointer"}}
                          title="Klik untuk melihat peserta jadwal ini"
                        >
                          <td style={cell}>{i+1}</td>
                          <td style={cell}>{item.day}</td>
                          <td style={cell}>{item.time}</td>
                          <td style={cell}>{durasiJam(item.start_time,item.end_time).toLocaleString("id-ID")} jam</td>
                          <td style={cell}>{item.type}</td>
                          <td style={cell}>
                            <button type="button" onClick={e=>{e.stopPropagation();bukaPesertaJadwal(item);}} style={{border:"1px solid #79a9bd",background:"#e8f6fb",color:"#073b55",borderRadius:8,padding:"6px 10px",fontWeight:800,cursor:"pointer"}}>
                              {item.registered}/{item.quota} peserta
                            </button>
                          </td>
                          <td style={{...cell,fontWeight:700}}>{semuaLunas?"Lunas":"Belum Lunas"}</td>
                          <td style={cell}>{item.registrationClosed ? "Ditutup" : item.registered >= item.quota ? "Penuh" : item.activeRaw ? "Terbuka" : "Nonaktif"}</td>
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

                      </React.Fragment>;
                    })}
                    {schedules.length===0 && <tr><td colSpan={9} style={{padding:20,textAlign:"center"}}>Belum ada jadwal.</td></tr>}
                  </tbody>
                </table>
              </div>
              <p style={{fontSize:12,color:"#64748b"}}>Klik baris jadwal untuk membuka popup peserta: Nama | Level | Lunas / Belum Lunas. Nominal pembayaran tidak ditampilkan di Daftar Jadwal.</p>

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
              <div className="hero-description" style={{position:"static",width:"100%",textAlign:"center",fontSize:"clamp(11px,2.3vw,14px)",lineHeight:1.45,color:"#fff",textShadow:"0 2px 5px rgba(0,0,0,.75)"}}>
                Program latihan tenis meja untuk semua level, dengan pilihan Private maupun Grup 3–4 orang dan jadwal yang fleksibel.
              </div>

            </div>
          </section>

          <section className="quick-actions" style={{background:"linear-gradient(180deg,#07506a 0%,#6f9caf 18%,#d8e1e6 48%,#c7d6de 62%,#4f8eaa 82%,#08608d 100%)",padding:"16px 12px 12px",marginTop:0}}>
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
          <footer style={{background:"linear-gradient(180deg,#08608d 0%,#07547e 48%,#043e63 100%)",color:"#fff",padding:"8px 16px 18px",textAlign:"center",marginTop:-1}}>
            <div style={{maxWidth:1050,margin:"0 auto",display:"flex",justifyContent:"center",alignItems:"center",gap:10,flexWrap:"nowrap"}}>
              <div className="home-contact-icon" aria-hidden="true" style={{width:54,height:54,borderRadius:"50%",background:"#22c55e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:29,boxShadow:"0 5px 14px rgba(0,0,0,.18)"}}>☎</div>
              <div style={{textAlign:"left",lineHeight:1.15}}>
                <div style={{fontSize:10,opacity:.9}}>Informasi Pelatihan</div>
                <strong style={{fontSize:"clamp(14px,3.7vw,18px)",color:"#ffe84a",whiteSpace:"nowrap"}}>0858-1446-6929</strong>
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
                  <button className="choose-btn" disabled={!item.available} onClick={()=>chooseSchedule(item)}>
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
              <table style={{width:"100%",minWidth:680,borderCollapse:"collapse",tableLayout:"fixed",fontSize:14}}>
                <colgroup>
                  <col style={{width:"20%"}} />
                  <col style={{width:"22%"}} />
                  <col style={{width:"18%"}} />
                  <col style={{width:"18%"}} />
                  <col style={{width:"22%"}} />
                </colgroup>
                <thead style={{background:"#073b55",color:"#fff"}}>
                  <tr>{["Hari","Waktu","Jenis","Peserta","Status"].map(h=><th key={h} style={{padding:"12px 13px",textAlign:"left",boxSizing:"border-box"}}>{h}</th>)}</tr>
                </thead>
                <tbody>{schedules.map((item,i)=><tr
                  key={item.id}
                  className="clickable-schedule-row"
                  onClick={()=>bukaPesertaJadwal(item)}
                  title="Klik untuk melihat peserta"
                  style={{background:i%2?"#f1f7f8":"#fff",cursor:"pointer"}}
                >
                  <td style={{padding:"12px 13px",borderBottom:"1px solid #e2e8f0",boxSizing:"border-box"}}>{item.day}</td>
                  <td style={{padding:"12px 13px",borderBottom:"1px solid #e2e8f0",boxSizing:"border-box"}}>{item.time}</td>
                  <td style={{padding:"12px 13px",borderBottom:"1px solid #e2e8f0",boxSizing:"border-box"}}>{item.type==="Private"?"Private":"Grup"}</td>
                  <td style={{padding:"12px 13px",borderBottom:"1px solid #e2e8f0",boxSizing:"border-box",fontWeight:800}}>{item.registered}/{item.quota}</td>
                  <td style={{padding:"12px 13px",borderBottom:"1px solid #e2e8f0",boxSizing:"border-box",fontWeight:700}}>{item.available?"Tersedia":"Penuh / Ditutup"}</td>
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

      {page === "chat" && (
        <main style={{background:"linear-gradient(180deg,#dbe8ed,#eef4f6,#d4e4ea)",minHeight:"75vh",padding:"14px 10px 22px"}}>
          <div style={{maxWidth:720,margin:"0 auto"}}>
            <button className="back-button" onClick={()=>setPage("home")}>← Home</button>
            <div style={{textAlign:"center",margin:"7px 0 12px"}}>
              <div style={{fontSize:29}}>💬</div>
              <h2 style={{margin:"2px 0",color:"#073b55"}}>Chat Public</h2>
              <p style={{fontSize:12,color:"#607d8b",margin:0}}>Ruang komunikasi member dan pelatih PINGPONG TRAINING.</p>
            </div>

            <section style={{background:"#f8fbfc",border:"1px solid #b9d0da",borderRadius:15,overflow:"hidden",boxShadow:"0 7px 20px rgba(20,55,75,.10)"}}>
              <div style={{height:"min(54vh,470px)",overflowY:"auto",padding:12,background:"linear-gradient(180deg,#edf5f7,#dfecef)"}}>
                {loadingChat && publicChats.length===0 ? <div style={{textAlign:"center",padding:24,color:"#607d8b"}}>⏳ Memuat chat...</div> :
                 publicChats.length===0 ? <div style={{textAlign:"center",padding:30,color:"#607d8b"}}>Belum ada pesan. Jadilah yang pertama menyapa. 👋</div> :
                 publicChats.map(c=>{
                   const pelatih=c.sender_type==="pelatih";
                   const waktu=c.created_at ? new Date(c.created_at).toLocaleString("id-ID",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : "";
                   return <div key={c.id} style={{marginBottom:9,display:"flex",justifyContent:pelatih?"flex-end":"flex-start"}}>
                     <div style={{maxWidth:"84%",background:pelatih?"#d9f7df":"#fff",border:"1px solid #c3d6dc",borderRadius:12,padding:"8px 10px",boxShadow:"0 2px 7px rgba(0,0,0,.05)"}}>
                       <div style={{fontSize:11,fontWeight:900,color:pelatih?"#087b45":"#075a7a"}}>{c.sender_name}{pelatih?" • Pelatih":""}</div>
                       {editingChatId===c.id ? <div style={{marginTop:5}}>
                         <textarea value={editingChatText} onChange={e=>setEditingChatText(e.target.value)} maxLength={500} style={{width:"100%",boxSizing:"border-box",minHeight:64,padding:7,border:"1px solid #9fb8c2",borderRadius:8,resize:"vertical"}} />
                         <div style={{display:"flex",gap:5,justifyContent:"flex-end",marginTop:4}}>
                           <button type="button" onClick={()=>{setEditingChatId(null);setEditingChatText("");}} style={{border:"1px solid #9fb8c2",borderRadius:7,padding:"4px 8px",background:"#fff"}}>Batal</button>
                           <button type="button" onClick={()=>saveEditedChat(c.id)} style={{border:0,borderRadius:7,padding:"4px 8px",background:"#087b72",color:"#fff",fontWeight:800}}>Simpan</button>
                         </div>
                       </div> : <div style={{fontSize:14,color:"#102a3a",lineHeight:1.4,whiteSpace:"pre-wrap",overflowWrap:"anywhere",textAlign:"left"}}>{c.message}</div>}
                       <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginTop:4}}>
                         <div style={{display:"flex",gap:5}}>
                           {(isPelatih || c.sender_name===chatName) && <button type="button" onClick={()=>{setEditingChatId(c.id);setEditingChatText(c.message);}} style={{border:0,background:"transparent",fontSize:10,color:"#386273",padding:0,cursor:"pointer"}}>✏️ Edit</button>}
                           {(isPelatih || c.sender_name===chatName) && <button type="button" onClick={()=>deletePublicChat(c.id)} style={{border:0,background:"transparent",fontSize:10,color:"#b42318",padding:0,cursor:"pointer"}}>🗑️ Hapus</button>}
                         </div>
                         <div style={{fontSize:9,color:"#78909c",textAlign:"right"}}>{waktu}</div>
                       </div>
                     </div>
                   </div>;
                 })}
              </div>
              <form onSubmit={sendPublicChat} style={{padding:10,background:"#fff",borderTop:"1px solid #c7d8de"}}>
                {!isPelatih && <input value={chatName} onChange={e=>setChatName(e.target.value)} placeholder="Nama Anda" maxLength={40} style={{width:"100%",boxSizing:"border-box",padding:"9px 10px",border:"1px solid #b7cbd3",borderRadius:9,marginBottom:7}} />}
                {isPelatih && <div style={{fontSize:11,fontWeight:800,color:"#087b45",marginBottom:6}}>Mengirim sebagai: Pelatih</div>}
                <div style={{display:"flex",gap:7}}>
                  <input value={chatMessage} onChange={e=>setChatMessage(e.target.value)} placeholder="Tulis pesan..." maxLength={500} style={{flex:1,minWidth:0,padding:"10px",border:"1px solid #b7cbd3",borderRadius:10}} />
                  <button type="submit" disabled={sendingChat || !chatMessage.trim()} style={{border:0,borderRadius:10,padding:"9px 14px",background:"#087b72",color:"#fff",fontWeight:900,cursor:"pointer"}}>{sendingChat?"...":"Kirim"}</button>
                </div>
              </form>
            </section>
          </div>
        </main>
      )}

      {["home","pendaftaran","jadwal","pembayaran","program","progress","video","chat"].includes(page) && (
        <nav className="bottom-nav" style={{position:"relative",zIndex:20,background:"#003a61",color:"#fff",display:"grid",gridTemplateColumns:"repeat(6,1fr)",padding:"9px 2px 8px",boxShadow:"0 -4px 18px rgba(0,0,0,.15)"}}>
          {[
            ["home","⌂","Home"],["progress","📈","Progress"],["video","▶️","Video"],["sk","S&K","S&K"],["program","🏓","Program"],["chat","💬","Chat Public"]
          ].map(([key,ic,label])=><button key={key} type="button" onClick={()=>key === "sk" ? setShowTerms(true) : setPage(key)}
            style={{border:0,background:"transparent",color:page===key?"#24b6ff":"#fff",padding:"4px 1px",fontSize:10,cursor:"pointer",position:"relative"}}>
            {key === "sk" ? (
              <img src={skIcon} alt="" aria-hidden="true" style={{display:"block",width:24,height:24,objectFit:"cover",borderRadius:5,margin:"0 auto"}} />
            ) : (
              <div style={{fontSize:key === "home" ? 24 : 20,lineHeight:1.1}}>{ic}</div>
            )}
            {key==="chat" && unreadChatCount>0 && <span style={{position:"absolute",top:0,right:"18%",minWidth:16,height:16,padding:"0 4px",borderRadius:9,background:"#ef4444",color:"#fff",fontSize:9,fontWeight:900,lineHeight:"16px",boxSizing:"border-box"}}>{unreadChatCount>99?"99+":unreadChatCount}</span>}
            <div>{label}</div>
          </button>)}
        </nav>
      )}


      {showInstall && installPrompt && (
        <div style={{position:"fixed",inset:0,zIndex:10001,background:"rgba(0,0,0,.48)",display:"flex",alignItems:"center",justifyContent:"center",padding:18}}>
          <section style={{width:"min(92vw,420px)",background:"linear-gradient(145deg,#eef4f6,#cbd9df)",color:"#102a3a",borderRadius:18,padding:18,boxShadow:"0 18px 55px rgba(0,0,0,.35)",textAlign:"center"}}>
            <div style={{fontSize:40}}>📲</div><h2 style={{margin:"5px 0"}}>Install PingTrn</h2>
            <p style={{fontSize:14,lineHeight:1.5}}>Pasang PINGPONG TRAINING di HP agar bisa dibuka langsung dari layar utama.</p>
            <button type="button" onClick={installPingTrn} style={{width:"100%",border:0,borderRadius:10,padding:11,background:"#087b72",color:"#fff",fontWeight:900}}>INSTALL PINGTRN</button>
            <button type="button" onClick={dismissInstall} style={{marginTop:8,border:0,background:"transparent",color:"#365b6b",fontWeight:800}}>NANTI</button>
          </section>
        </div>
      )}

      {participantPopup && (
        <div onClick={()=>setParticipantPopup(null)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <section onClick={e=>e.stopPropagation()} style={{width:"min(94vw,520px)",maxHeight:"86vh",overflowY:"auto",background:"#f3f5f6",color:"#102a3a",borderRadius:16,padding:16,boxShadow:"0 18px 55px rgba(0,0,0,.35)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
              <h3 style={{margin:0}}>Data Peserta</h3>
              <button type="button" onClick={()=>setParticipantPopup(null)} style={{width:32,height:32,borderRadius:8,border:"1px solid #9aa",background:"#fff",fontSize:18}}>×</button>
            </div>
            <p style={{fontSize:12,color:"#64748b"}}>Edit data peserta lalu tekan Simpan Perubahan.</p>
            <label style={{display:"block",fontWeight:800,fontSize:12,marginTop:9}}>Nama Peserta</label>
            <input value={participantEdit.name} onChange={e=>setParticipantEdit(p=>({...p,name:e.target.value}))} style={{width:"100%",boxSizing:"border-box",padding:10,border:"1px solid #b8cbd5",borderRadius:8,marginTop:4}}/>
            <label style={{display:"block",fontWeight:800,fontSize:12,marginTop:9}}>WhatsApp</label>
            <input value={participantEdit.whatsapp} onChange={e=>setParticipantEdit(p=>({...p,whatsapp:e.target.value}))} style={{width:"100%",boxSizing:"border-box",padding:10,border:"1px solid #b8cbd5",borderRadius:8,marginTop:4}}/>
            <label style={{display:"block",fontWeight:800,fontSize:12,marginTop:9}}>Level</label>
            <select value={participantEdit.level} onChange={e=>setParticipantEdit(p=>({...p,level:e.target.value}))} style={{width:"100%",padding:10,border:"1px solid #b8cbd5",borderRadius:8,marginTop:4}}>
              <option value="">Pilih Level</option><option>Pemula</option><option>Menengah</option><option>Lanjutan</option>
            </select>
            <label style={{display:"block",fontWeight:800,fontSize:12,marginTop:9}}>Status</label>
            <input value={participantEdit.status} onChange={e=>setParticipantEdit(p=>({...p,status:e.target.value}))} style={{width:"100%",boxSizing:"border-box",padding:10,border:"1px solid #b8cbd5",borderRadius:8,marginTop:4}}/>
            <label style={{display:"block",fontWeight:800,fontSize:12,marginTop:9}}>Jadwal</label>
            <select value={participantEdit.schedule_id} onChange={e=>setParticipantEdit(p=>({...p,schedule_id:e.target.value}))} style={{width:"100%",padding:10,border:"1px solid #b8cbd5",borderRadius:8,marginTop:4}}>
              {schedules.map(s=><option key={s.id} value={s.id}>{s.day}, {s.time} — {s.type}</option>)}
            </select>
            {isPelatih && (!participantPopup.registration_status || participantPopup.registration_status === "Terdaftar") && (
              <button type="button" onClick={()=>batalkanPesertaCoach(participantPopup)} style={{width:"100%",marginTop:12,padding:9,borderRadius:9,border:"1px solid #b42318",background:"#fff1f0",color:"#b42318",fontWeight:900,cursor:"pointer"}}>
                Batalkan Pendaftaran
              </button>
            )}
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <button type="button" onClick={()=>setParticipantPopup(null)} style={{flex:1,padding:10,borderRadius:9,border:"1px solid #9fb2bd",background:"#fff",fontWeight:800}}>Tutup</button>
              <button type="button" disabled={savingParticipantEdit} onClick={simpanEditPeserta} style={{flex:1,padding:10,borderRadius:9,border:0,background:"#059669",color:"#fff",fontWeight:900}}>{savingParticipantEdit?"Menyimpan...":"Simpan Perubahan"}</button>
            </div>
          </section>
        </div>
      )}

      {schedulePopup && (()=>{
        const peserta = schedulePopupParticipants;
        return <div onClick={()=>setSchedulePopup(null)} style={{position:"fixed",inset:0,zIndex:9998,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <section onClick={e=>e.stopPropagation()} style={{width:"min(92vw,440px)",maxHeight:"78vh",overflowY:"auto",background:"#f3f5f6",color:"#102a3a",borderRadius:13,padding:13,boxShadow:"0 18px 55px rgba(0,0,0,.35)",fontSize:12}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}>
              <h3 style={{margin:0,fontSize:15,lineHeight:1.2}}>Peserta Jadwal</h3><button type="button" onClick={()=>setSchedulePopup(null)} style={{width:27,height:27,borderRadius:7,border:"1px solid #9aa",background:"#fff",fontSize:16,lineHeight:1}}>×</button>
            </div>
            <p style={{margin:"6px 0 8px",fontSize:11.5,lineHeight:1.35,textAlign:"left"}}><strong>{schedulePopup.day}, {schedulePopup.time}</strong> • {schedulePopup.type} • {peserta.length}/{schedulePopup.quota} peserta</p>
            {loadingSchedulePopup ? (
              <p style={{textAlign:"left",fontSize:11.5,margin:"8px 0"}}>Memuat peserta...</p>
            ) : peserta.length===0 ? <p style={{textAlign:"left"}}>Belum ada peserta pada jadwal ini.</p> : (
              <div style={{textAlign:"left",width:"100%"}}>
                {peserta.map((r,i)=><div key={r.id} onClick={()=>{if(isPelatih){setSchedulePopup(null);bukaEditPeserta(r);}}} style={{display:"grid",gridTemplateColumns:"22px 1fr",gap:4,padding:"7px 3px",borderBottom:"1px solid #ccd8de",textAlign:"left",cursor:"pointer",fontSize:12}}>
                  <strong style={{textAlign:"left"}}>{i+1}.</strong>
                  <div style={{textAlign:"left"}}>
                    <strong>{r.name}</strong>
                    <div style={{fontSize:10.5,marginTop:2,textAlign:"left",color:"#536b78"}}>Level: {r.level||"-"} • Pembayaran: <strong>{r.payment_status==="Lunas"?"Lunas":"Belum Lunas"}</strong></div>
                  </div>
                </div>)}
              </div>
            )}
            <button type="button" onClick={()=>setSchedulePopup(null)} style={{width:"100%",marginTop:10,border:0,borderRadius:8,padding:8,background:"#123b52",color:"#fff",fontWeight:800,fontSize:11.5}}>Tutup</button>
          </section>
        </div>;
      })()}

      {showTerms && (
        <div onClick={()=>setShowTerms(false)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:18}}>
          <section onClick={e=>e.stopPropagation()} style={{width:"min(92vw,520px)",maxHeight:"82vh",overflowY:"auto",background:"linear-gradient(145deg,#f4f4f4 0%,#c9c9c9 52%,#eeeeee 100%)",color:"#111",border:"1px solid #9a9a9a",borderRadius:18,padding:"8px 18px 16px",boxShadow:"0 18px 55px rgba(0,0,0,.38)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:10}}>
              <h2 style={{margin:0,fontSize:20,color:"#111"}}>Syarat & Ketentuan (S&K)</h2>
              <button type="button" aria-label="Tutup" onClick={()=>setShowTerms(false)} style={{border:"1px solid #777",background:"rgba(255,255,255,.7)",color:"#111",width:30,height:30,borderRadius:9,fontSize:18,cursor:"pointer"}}>×</button>
            </div>
            <div style={{fontSize:"clamp(13px,3.7vw,14px)",lineHeight:1.5,fontWeight:600,textAlign:"left",marginBottom:12}}>
              {[
                "Peserta dibatasi maksimal 3 s.d. 4 orang dalam 1 grup.",
                "Durasi latihan maksimal 2 jam.",
                "Biaya latihan adalah total biaya pelatih + sewa tempat, dibagi anggota grup.",
                "Peserta atau member bisa pindah hari, tetapi disesuaikan dengan jadwal yang ada.",
                "Member melakukan pembayaran sebelum latihan dilaksanakan.",
                "Pembayaran yang telah dilakukan, bukti pembayaran dikirim ke WhatsApp Pelatih."
              ].map((teks,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"26px 1fr",gap:5,alignItems:"start",marginBottom:8}}>
                <span>{i+1}.</span><span style={{textAlign:"left"}}>{teks}</span>
              </div>)}
            </div>
            <p style={{margin:"10px 0 14px",fontSize:13.5,lineHeight:1.55,fontWeight:700}}>Demikian ketentuan Pelatihan di PINGPONG TRAINING. Semakin cepat daftar, Anda akan semakin cepat bisa.</p>
            <button type="button" onClick={()=>setShowTerms(false)} style={{width:"100%",border:0,borderRadius:10,padding:"10px 12px",background:"#123b52",color:"#fff",fontWeight:800,cursor:"pointer"}}>Tutup</button>
          </section>
        </div>
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



      <footer className="qr-footer-final" style={{padding:"4px 12px 3px",minHeight:0,height:"auto",background:"#061a3a",margin:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,lineHeight:1.15}}>
          <button
            type="button"
            title="Klik QR untuk menyalin link PINGPONG TRAINING"
            aria-label="Salin link PINGPONG TRAINING"
            onClick={async () => {
              const link = "https://pingpong-training.vercel.app";
              try {
                await navigator.clipboard.writeText(link);
                alert("✓ Link berhasil disalin");
              } catch {
                window.prompt("Salin link PINGPONG TRAINING:", link);
              }
            }}
            style={{border:0,background:"transparent",padding:0,cursor:"pointer",display:"flex",alignItems:"center"}}
          >
            <img className="footer-qr"
              src={qrPingpongTraining}
              alt="QR PINGPONG TRAINING"
              style={{width:54,height:54,objectFit:"contain",borderRadius:6,background:"#fff",padding:2}}
            />
          </button>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:3}}>
            <strong style={{margin:0}}>PINGPONG TRAINING</strong>
            <span style={{margin:0}}>Table Tennis Training Center</span>
            <span style={{fontSize:10,opacity:.8}}>Klik QR untuk salin link</span>
          </div>
        </div>
      </footer>



    </div>

  );

}



export default App;