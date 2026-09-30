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
  const [coachMenu, setCoachMenu] = useState("home");
  const [publicChats, setPublicChats] = useState([]);
  const [chatName, setChatName] = useState(() => localStorage.getItem("pingtrn_chat_name") || "");
  const [chatMessage, setChatMessage] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingChatText, setEditingChatText] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showQrPopup, setShowQrPopup] = useState(false);
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

  function bukaMigrasiMember(r) {
    if (!isPelatih || !r) return;
    setMigrationMember(r); setMigrationTargetId("");
    setParticipantPopup(null); setSchedulePopup(null);
  }

  async function konfirmasiMigrasiMember() {
    if (!isPelatih || !migrationMember || !migrationTargetId || migrationBusy) return;
    const asal=schedules.find(s=>String(s.id)===String(migrationMember.schedule_id));
    const tujuan=schedules.find(s=>String(s.id)===String(migrationTargetId));
    if(!tujuan){alert("Jadwal tujuan tidak ditemukan.");return;}
    if(String(tujuan.id)===String(migrationMember.schedule_id)){alert("Pilih jadwal tujuan yang berbeda.");return;}
    if(asal && tujuan.type!==asal.type){alert("Group hanya dipindahkan ke Group dan Private hanya ke Private.");return;}
    if(jumlahPesertaJadwal(tujuan.id)>=Number(tujuan.quota||1)){alert("Jadwal tujuan sudah penuh.");return;}
    const dari=asal?`${asal.type}${asal.type==="Group"?` ${asal.quota} orang`:""} • ${asal.day}, ${asal.time}`:"Jadwal lama";
    const ke=`${tujuan.type}${tujuan.type==="Group"?` ${tujuan.quota} orang`:""} • ${tujuan.day}, ${tujuan.time}`;
    if(!window.confirm(`Pindahkan ${migrationMember.name}?\n\nDari: ${dari}\nKe: ${ke}`))return;
    setMigrationBusy(true);
    const {error}=await supabase.from("registrations").update({schedule_id:tujuan.id,training_type:tujuan.type,invoice_amount:null}).eq("id",migrationMember.id);
    setMigrationBusy(false);
    if(error){alert("Gagal memindahkan member: "+error.message);return;}
    setMigrationMember(null);setMigrationTargetId("");
    await loadRegistrations();await loadSchedules();
    alert("Member berhasil dipindahkan ke jadwal baru.");
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

    setCoachMenu("schedule");
    setEditId(item.id);

    setScheduleForm({ day:item.day, start_time:item.start_time?.slice(0,5)||"", end_time:item.end_time?.slice(0,5)||"", type:item.type||"Group", coach:item.coach||"Teguh Orina", quota:item.quota, min_participants:item.min_participants, is_active:item.activeRaw, coach_rate: Number(item.coach_rate ?? (item.type==="Private"?350000:300000)), rental_rate_per_hour: Number(item.rental_rate_per_hour ?? 50000) });

    window.scrollTo(0,0);

  }

  async function saveSchedule(e) {

    e.preventDefault(); if (!isPelatih || savingSchedule) return;

    if (scheduleForm.start_time >= scheduleForm.end_time) { alert("Jam selesai harus setelah jam mulai."); return; }

    const jamTerpilih = [1,2,3].includes(durasiJam(scheduleForm.start_time,scheduleForm.end_time)) ? durasiJam(scheduleForm.start_time,scheduleForm.end_time) : 2;
    const payload = { ...scheduleForm, registration_closed: editId ? schedules.find(j=>j.id===editId)?.registrationClosed ?? false : false, end_time: selesaiDariDurasi(scheduleForm.start_time,jamTerpilih), coach_rate: Number(scheduleForm.coach_rate)||0, rental_rate_per_hour: Number(scheduleForm.rental_rate_per_hour)||0, quota: scheduleForm.type === "Private" ? 1 : Number(scheduleForm.quota || 4), min_participants: scheduleForm.type === "Private" ? 1 : Number(scheduleForm.quota || 4) };

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

    if (Number(count)>0) {alert("Jadwal masih memiliki member. Migrasikan atau batalkan member terlebih dahulu. Setelah kosong, jadwal dapat dihapus."); return;}

    const {error} = await supabase.from("schedule").delete().eq("id",item.id);

    if (error) alert("Gagal menghapus: " + error.message); else await loadSchedules();

  }



  const [selectedDay, setSelectedDay] = useState("Semua");
  const [registrationProgram, setRegistrationProgram] = useState("Group");
  const [selectedGroupSize, setSelectedGroupSize] = useState(3);
  const [pricePopup, setPricePopup] = useState(null);
  const [migrationMember, setMigrationMember] = useState(null);
  const [migrationTargetId, setMigrationTargetId] = useState("");
  const [migrationBusy, setMigrationBusy] = useState(false);
  const [visitorMode, setVisitorMode] = useState(() => localStorage.getItem("pingtrn_visitor_mode") || "visits");
  const [deviceVisitorCount, setDeviceVisitorCount] = useState(0);
  const [privateRequests, setPrivateRequests] = useState([]);
  const [loadingPrivateRequests, setLoadingPrivateRequests] = useState(false);
  const [privateName, setPrivateName] = useState("");
  const [privateMessage, setPrivateMessage] = useState("");
  const [privateProgram, setPrivateProgram] = useState("Teknik Dasar");
  const [privateThreadId, setPrivateThreadId] = useState(null);
  const [privateThreadMessages, setPrivateThreadMessages] = useState([]);
  const [privateReplyText, setPrivateReplyText] = useState("");
  const [privateRequestBusy, setPrivateRequestBusy] = useState(false);
  const [visitorCount, setVisitorCount] = useState(0);
  const [newsList, setNewsList] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [savingNews, setSavingNews] = useState(false);
  const [uploadingNewsImage, setUploadingNewsImage] = useState(false);
  const [editNewsId, setEditNewsId] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);
  const [newsForm, setNewsForm] = useState({
    title:"",
    category:"Berita Tenis Meja",
    image_url:"",
    content:"",
    is_published:true
  });

  useEffect(() => {
    let cancelled = false;
    async function catatDanHitungKunjungan() {
      try {
        // ID perangkat tetap untuk statistik "Per Perangkat".
        let deviceId = localStorage.getItem("pingtrn_device_id");
        if (!deviceId) {
          deviceId = window.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          localStorage.setItem("pingtrn_device_id", deviceId);
        }

        // Simpan 1 baris perangkat unik hanya sekali.
        const deviceVisitorId = `device:${deviceId}`;
        const deviceRecordedKey = `pingtrn_device_recorded_${deviceId}`;
        if (!localStorage.getItem(deviceRecordedKey)) {
          const { error: deviceInsertError } = await supabase.from("site_visits").insert({ visitor_id: deviceVisitorId });
          if (!deviceInsertError) localStorage.setItem(deviceRecordedKey, "1");
        }

        // Setiap buka/reload tetap dicatat sebagai 1 kunjungan.
        const visitId = `visit:${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
        const { error: insertError } = await supabase.from("site_visits").insert({ visitor_id: visitId });
        if (insertError) console.error("Gagal mencatat kunjungan:", insertError);

        // Total kunjungan: histori lama + baris visit baru, tetapi baris device tidak ikut.
        const { data: allRows, error } = await supabase.from("site_visits").select("visitor_id");
        if (error) {
          console.error("Gagal menghitung statistik:", error);
        } else if (!cancelled) {
          const ids = (allRows || []).map(r => String(r.visitor_id || ""));
          const deviceRows = ids.filter(id => id.startsWith("device:"));
          const visitRows = ids.filter(id => !id.startsWith("device:"));
          setVisitorCount(visitRows.length);
          setDeviceVisitorCount(new Set(deviceRows).size);
        }
      } catch (error) {
        console.error("Visit counter error:", error);
      }
    }
    catatDanHitungKunjungan();
    return () => { cancelled = true; };
  }, []);




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
    loadNews();

  }, []);



  async function loadNews() {
    setLoadingNews(true);
    const { data, error } = await supabase
      .from("table_tennis_news")
      .select("*")
      .order("published_at", { ascending:false });
    setLoadingNews(false);
    if (error) {
      console.error("Gagal mengambil berita:", error);
      return;
    }
    setNewsList(data || []);
  }

  async function uploadNewsImage(file) {
    if (!isPelatih || !file) return;
    if (!String(file.type || "").startsWith("image/")) {
      alert("File harus berupa foto/gambar.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert("Ukuran foto maksimal 8 MB.");
      return;
    }
    setUploadingNewsImage(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g,"");
    const fileName = `berita-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext || "jpg"}`;
    const { error } = await supabase.storage.from("news-images").upload(fileName, file, {
      cacheControl:"3600",
      upsert:false,
      contentType:file.type || undefined
    });
    if (error) {
      setUploadingNewsImage(false);
      alert("Upload foto gagal: " + error.message);
      return;
    }
    const { data } = supabase.storage.from("news-images").getPublicUrl(fileName);
    setNewsForm(p=>({...p,image_url:data?.publicUrl || ""}));
    setUploadingNewsImage(false);
  }

  async function saveNews(e) {
    e.preventDefault();
    if (!isPelatih || savingNews) return;
    if (!newsForm.title.trim() || !newsForm.content.trim()) {
      alert("Judul dan isi berita wajib diisi.");
      return;
    }
    setSavingNews(true);
    const payload = {
      title: newsForm.title.trim(),
      category: newsForm.category.trim() || "Berita Tenis Meja",
      image_url: newsForm.image_url.trim() || null,
      content: newsForm.content.trim(),
      is_published: Boolean(newsForm.is_published)
    };
    const request = editNewsId
      ? supabase.from("table_tennis_news").update(payload).eq("id", editNewsId)
      : supabase.from("table_tennis_news").insert(payload);
    const { error } = await request;
    setSavingNews(false);
    if (error) {
      alert("Gagal menyimpan berita: " + error.message);
      return;
    }
    setEditNewsId(null);
    setNewsForm({title:"",category:"Berita Tenis Meja",image_url:"",content:"",is_published:true});
    await loadNews();
    alert(editNewsId ? "Berita berhasil diperbarui." : "Berita berhasil diterbitkan.");
  }

  function editNews(item) {
    setEditNewsId(item.id);
    setNewsForm({
      title:item.title || "",
      category:item.category || "Berita Tenis Meja",
      image_url:item.image_url || "",
      content:item.content || "",
      is_published:item.is_published !== false
    });
  }

  async function deleteNews(item) {
    if (!isPelatih || !window.confirm(`Hapus berita "${item.title}"?`)) return;
    const { error } = await supabase.from("table_tennis_news").delete().eq("id", item.id);
    if (error) alert("Gagal menghapus berita: " + error.message);
    else {
      if (selectedNews?.id === item.id) setSelectedNews(null);
      await loadNews();
    }
  }

  async function loadPrivateRequests() {
    if (!isPelatih) return;
    setLoadingPrivateRequests(true);
    const { data, error } = await supabase
      .from("private_requests")
      .select("*")
      .order("created_at", { ascending:false });
    setLoadingPrivateRequests(false);
    if (error) { console.error("Gagal mengambil pengajuan Private:", error); return; }
    setPrivateRequests(data || []);
  }

  useEffect(() => {
    if (isPelatih) loadPrivateRequests();
  }, [isPelatih]);

  async function loadPrivateThread(requestId) {
    if (!requestId) return;
    const { data, error } = await supabase
      .from("private_request_messages")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending:true });
    if (error) { console.error("Gagal membuka percakapan Private:", error); return; }
    setPrivateThreadMessages(data || []);
  }

  useEffect(() => {
    if (!privateThreadId) return;
    loadPrivateThread(privateThreadId);
    const timer = setInterval(() => loadPrivateThread(privateThreadId), 4000);
    return () => clearInterval(timer);
  }, [privateThreadId]);

  async function mulaiPengajuanPrivate(e) {
    e.preventDefault();
    if (privateRequestBusy) return;
    if (!privateName.trim() || !privateMessage.trim()) {
      alert("Isi nama dan permintaan Private terlebih dahulu.");
      return;
    }
    setPrivateRequestBusy(true);
    const { data:req, error } = await supabase.from("private_requests").insert({
      name:privateName.trim(),
      whatsapp:"Belum diberikan",
      member_note:`Program: ${privateProgram}\n\n${privateMessage.trim()}`,
      status:"Menunggu Tanggapan"
    }).select("id").single();
    if (error) {
      setPrivateRequestBusy(false);
      alert("Pendaftaran Private gagal dikirim: " + error.message);
      return;
    }
    const { error:msgError } = await supabase.from("private_request_messages").insert({
      request_id:req.id, sender_type:"member", sender_name:privateName.trim(), message:`Program: ${privateProgram}\n\n${privateMessage.trim()}`
    });
    setPrivateRequestBusy(false);
    if (msgError) { alert("Pengajuan dibuat, tetapi pesan gagal disimpan: "+msgError.message); return; }
    localStorage.setItem("pingtrn_private_request_id", String(req.id));
    setPrivateThreadId(req.id);
    setPrivateMessage("");
    await loadPrivateThread(req.id);
  }

  async function bukaPercakapanPrivateSaya() {
    const saved = Number(localStorage.getItem("pingtrn_private_request_id") || 0);
    if (!saved) { alert("Belum ada pengajuan Private pada perangkat ini."); return; }
    setPrivateThreadId(saved);
    await loadPrivateThread(saved);
  }

  async function kirimPesanPrivate(senderType, senderName) {
    const message = privateReplyText.trim();
    if (!privateThreadId || !message) return;
    setPrivateRequestBusy(true);
    const { error } = await supabase.from("private_request_messages").insert({
      request_id:privateThreadId, sender_type:senderType, sender_name:senderName, message
    });
    setPrivateRequestBusy(false);
    if (error) { alert("Pesan gagal dikirim: "+error.message); return; }
    setPrivateReplyText("");
    await loadPrivateThread(privateThreadId);
    if (isPelatih) await loadPrivateRequests();
  }

  async function coachSiapkanJadwalPrivate(r) {
    const hari = window.prompt("Hari jadwal Private:", "Sabtu");
    if (!hari) return;
    const mulai = window.prompt("Jam mulai:", "18:00");
    if (!mulai) return;
    const selesai = window.prompt("Jam selesai:", "20:00");
    if (!selesai) return;
    setScheduleForm({
      ...emptySchedule,
      day:hari,
      start_time:mulai,
      end_time:selesai,
      type:"Private",
      quota:1,
      min_participants:1,
      coach_rate:350000,
      rental_rate_per_hour:50000,
      is_active:true
    });
    setEditId(null);
    setCoachMenu("schedule");
    await supabase.from("private_requests").update({status:"Siap Dibuat Jadwal"}).eq("id",r.id);
    window.scrollTo(0,0);
    alert("Data jadwal Private sudah dimasukkan ke form Tambah Jadwal. Periksa lalu klik Simpan Jadwal.");
  }

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

        ? "Terdaftar"

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

    <div className={`app ${page === "home" ? "home-app" : ""}`}>



      {/* =====================================================

          HEADER

      ===================================================== */}



      <header className="header">

        <div className="brand modern-brand" onClick={backHome}>
          <div className="modern-brand-logo-wrap">
            <img src={pingpongTrainingLogo} alt="PINGPONG TRAINING" />
          </div>
          <div className="modern-brand-copy">
            <div className="modern-brand-ping">PINGPONG</div>
            <div className="modern-brand-training">TRAINING</div>
          </div>
        </div>

        <button className="login-btn" onClick={() => setPage(isPelatih ? "admin" : "login")}>

          {isPelatih ? "Ruang Pelatih" : "Login Pelatih"}

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

          /* KHUSUS QR + PINGPONG TRAINING:
             turunkan mendekati batas bawah layar HP */
          .app > footer.qr-footer-bottom {
            padding-top: 2px !important;
            padding-bottom: 2px !important;
            margin: 0 !important;
            min-height: 0 !important;
            height: auto !important;
          }
          .app > footer.qr-footer-bottom > div {
            margin: 0 !important;
            padding: 0 !important;
            transform: translateY(0) !important;
          }
        }

        /* =========================================================
           HOME SUPER COMPACT - HP + DESKTOP
           Target: dashboard muat satu layar tanpa scrollbar pada
           layar normal, foto kegiatan tetap terlihat, padding tetap ada.
        ========================================================= */
        .header {
          min-height: 44px !important;
          height: 44px !important;
          padding: 3px clamp(10px,2vw,20px) !important;
        }
        .header .brand img {
          max-height: 34px !important;
        }
        .login-btn {
          padding-top: 7px !important;
          padding-bottom: 7px !important;
        }

        .hero {
          min-height: 0 !important;
          height: clamp(245px, 34vh, 330px) !important;
          padding-top: 8px !important;
          padding-bottom: 8px !important;
          background-position: center 60% !important;
        }
        .hero-content {
          padding-top: 0 !important;
        }
        .hero-description {
          margin-top: 7px !important;
        }

        .quick-actions {
          padding-top: 10px !important;
          padding-bottom: 7px !important;
        }
        .quick-actions > div {
          gap: 8px !important;
        }
        .quick-actions button {
          min-height: 58px !important;
          padding-top: 5px !important;
          padding-bottom: 5px !important;
        }

        .bottom-nav {
          margin: 0 !important;
          min-height: 52px !important;
          padding: 4px 2px 3px !important;
        }
        .bottom-nav button {
          padding-top: 2px !important;
          padding-bottom: 2px !important;
        }

        /* Data pengunjung dibuat rapat, tidak membuat ruang biru tinggi */
        .home-visitor-compact {
          padding: 4px 10px 2px !important;
          min-height: 20px !important;
          margin: 0 !important;
          width: 100% !important;
          display: flex !important;
          justify-content: flex-end !important;
          align-items: center !important;
          text-align: right !important;
        }

        /* Footer QR dinaikkan dan dirapatkan, tetapi masih punya padding */
        .app > footer.qr-footer-bottom {
          padding: 5px 12px 7px !important;
          margin: 0 !important;
          min-height: 0 !important;
          height: auto !important;
        }
        .app > footer.qr-footer-bottom > div {
          margin: 0 auto !important;
          padding: 0 !important;
          transform: none !important;
        }

        @media (max-width: 600px) {
          .header {
            min-height: 42px !important;
            height: 42px !important;
            padding-top: 2px !important;
            padding-bottom: 2px !important;
          }
          .header .brand img {
            max-height: 32px !important;
          }

          .hero {
            height: clamp(300px, 45vh, 390px) !important;
            min-height: 0 !important;
            padding: 7px 10px 8px !important;
            background-position: center 72% !important;
          }
          .hero-content {
            transform: none !important;
            padding-top: 0 !important;
          }
          .hero-content h2 {
            margin-top: 5px !important;
            margin-bottom: 4px !important;
          }
          .hero-description {
            margin-top: 7px !important;
            line-height: 1.35 !important;
          }

          .quick-actions {
            padding: 8px 10px 6px !important;
          }
          .quick-actions > div {
            gap: 7px !important;
          }
          .quick-actions button {
            min-height: 56px !important;
            padding: 4px 4px !important;
          }

          .bottom-nav {
            min-height: 50px !important;
            padding: 3px 1px 2px !important;
          }
          .home-visitor-compact {
            padding: 3px 9px 1px !important;
            min-height: 18px !important;
          }
          .app > footer.qr-footer-bottom {
            padding-top: 4px !important;
            padding-bottom: 6px !important;
          }
        }

        /* Desktop pendek seperti laptop 1366x768: prioritaskan muat satu layar */
        @media (min-width: 601px) and (max-height: 820px) {
          .hero {
            height: 330px !important;
            min-height: 0 !important;
          }
          .quick-actions {
            padding-top: 8px !important;
            padding-bottom: 5px !important;
          }
          .quick-actions button {
            min-height: 54px !important;
          }
          .bottom-nav {
            min-height: 48px !important;
            padding-top: 2px !important;
            padding-bottom: 2px !important;
          }
          .app > footer.qr-footer-bottom {
            padding-top: 3px !important;
            padding-bottom: 4px !important;
          }
        }


        /* HOME MODERN COMPACT: menu dipindah ke area bawah foto */
        .home-modern-actions{
          background:#075f86 !important;
          padding:8px 12px 7px !important;
          margin:0 !important;
        }
        .home-modern-actions-grid{
          max-width:1050px;margin:0 auto;display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;
        }
        .home-modern-action{
          min-height:58px !important;border-radius:13px;border:1px solid rgba(210,246,250,.42);
          color:#fff;cursor:pointer;display:flex !important;flex-direction:row !important;
          align-items:center !important;justify-content:flex-start !important;text-align:left;
          gap:14px;padding:7px 18px !important;box-shadow:0 5px 14px rgba(0,35,55,.16);
        }
        .home-modern-action.blue{background:linear-gradient(145deg,#0878a5,#064e70);}
        .home-modern-action.green{background:linear-gradient(145deg,#0b958a,#06656d);}
        .home-modern-action-icon{
          width:42px;min-width:42px;height:42px;display:grid;place-items:center;
          font-size:32px;line-height:1;
        }
        .home-modern-action-copy{display:flex;flex-direction:column;line-height:1.15;}
        .home-modern-action-copy strong{font-size:16px;}
        .home-modern-action-copy small{font-size:11px;margin-top:3px;opacity:.92;}

        .home-footer-modern{
          position:relative !important;background:#061a3a !important;
          margin:0 !important;padding:6px 12px 8px !important;min-height:0 !important;height:auto !important;
        }
        .home-footer-inner{
          max-width:760px;margin:0 auto !important;padding:0 !important;
          display:flex;align-items:center;justify-content:center;gap:10px;line-height:1.15;
        }
        .home-footer-qr-btn{border:0;background:transparent;padding:0;cursor:pointer;display:flex;align-items:center;}
        .home-footer-modern .footer-qr{
          width:52px !important;height:52px !important;max-width:52px !important;max-height:52px !important;
          object-fit:contain;border-radius:7px;background:#fff;padding:2px !important;
        }
        .home-footer-brand{display:flex;flex-direction:column;align-items:flex-start;gap:2px;white-space:nowrap;}
        .home-footer-brand strong{font-size:14px;color:#20dca0;}
        .home-footer-brand span{font-size:10px;color:#d9e5ee;}
        .home-footer-brand small{font-size:9px;color:#94a7b7;}
        .home-footer-contact{
          margin-left:18px;padding-left:18px;border-left:1px solid rgba(255,255,255,.18);
          display:flex;align-items:center;gap:9px;color:#fff;
        }
        .home-footer-phone-icon{
          width:38px;height:38px;border-radius:50%;display:grid;place-items:center;
          background:#16c968;font-size:22px;color:#fff;
        }
        .home-footer-contact > span:last-child{display:flex;flex-direction:column;}
        .home-footer-contact small{font-size:9px;color:#d6e3ea;}
        .home-footer-contact strong{font-size:16px;color:#ffeb3b;white-space:nowrap;}

        @media(max-width:600px){
          .home-modern-actions{padding:7px 9px 6px !important;}
          .home-modern-actions-grid{gap:7px;}
          .home-modern-action{min-height:55px !important;padding:6px 8px !important;gap:7px;border-radius:11px;}
          .home-modern-action-icon{width:32px;min-width:32px;height:32px;font-size:25px;}
          .home-modern-action-copy strong{font-size:12px;}
          .home-modern-action-copy small{font-size:9px;margin-top:2px;}
          .home-footer-modern{padding:5px 7px 7px !important;}
          .home-footer-inner{max-width:100%;gap:6px;justify-content:center;}
          .home-footer-modern .footer-qr{width:44px !important;height:44px !important;max-width:44px !important;max-height:44px !important;}
          .home-footer-brand strong{font-size:11px;}
          .home-footer-brand span{font-size:8px;}
          .home-footer-brand small{font-size:8px;}
          .home-footer-contact{margin-left:5px;padding-left:6px;gap:5px;}
          .home-footer-phone-icon{width:30px;height:30px;font-size:17px;}
          .home-footer-contact small{font-size:7px;}
          .home-footer-contact strong{font-size:11px;}
        }



        /* =========================================================
           HOME CARDS 2026 - tampilan lebih modern / premium
        ========================================================= */
        .home-modern-actions{
          background:
            radial-gradient(circle at 12% 0%,rgba(63,210,255,.16),transparent 34%),
            radial-gradient(circle at 88% 100%,rgba(32,214,155,.13),transparent 32%),
            linear-gradient(180deg,#075d84 0%,#064d72 100%) !important;
          padding:10px 12px 9px !important;
        }
        .home-modern-actions-grid{
          max-width:1050px !important;
          margin:0 auto !important;
          display:grid !important;
          grid-template-columns:repeat(2,minmax(0,1fr)) !important;
          gap:10px !important;
        }
        .home-modern-action{
          position:relative;
          overflow:hidden;
          isolation:isolate;
          min-height:66px !important;
          padding:9px 42px 9px 12px !important;
          gap:10px !important;
          border:1px solid rgba(255,255,255,.28) !important;
          border-radius:18px !important;
          background:rgba(255,255,255,.10) !important;
          backdrop-filter:blur(10px);
          -webkit-backdrop-filter:blur(10px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.26),
            0 9px 22px rgba(0,28,50,.22) !important;
          transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease !important;
        }
        .home-modern-action::before{
          content:"";
          position:absolute;
          z-index:-1;
          width:110px;
          height:110px;
          right:-42px;
          top:-58px;
          border-radius:50%;
          background:rgba(255,255,255,.12);
        }
        .home-modern-action:hover{
          transform:translateY(-2px);
          border-color:rgba(255,255,255,.48) !important;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 12px 26px rgba(0,28,50,.28) !important;
        }
        .home-modern-action.group-card{
          background:linear-gradient(135deg,rgba(0,153,204,.92),rgba(0,91,145,.92)) !important;
        }
        .home-modern-action.private-card{
          background:linear-gradient(135deg,rgba(18,166,132,.94),rgba(3,105,112,.94)) !important;
        }
        .home-modern-action.schedule-card{
          background:linear-gradient(135deg,rgba(58,112,196,.94),rgba(27,69,135,.94)) !important;
        }
        .home-modern-action.payment-card{
          background:linear-gradient(135deg,rgba(121,88,196,.94),rgba(65,58,139,.94)) !important;
        }
        .home-modern-action-icon{
          width:42px !important;
          min-width:42px !important;
          height:42px !important;
          border-radius:13px;
          background:rgba(255,255,255,.16);
          border:1px solid rgba(255,255,255,.18);
          font-size:26px !important;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.18);
        }
        .home-modern-action-copy{
          min-width:0;
          flex:1;
        }
        .home-modern-action-copy strong{
          font-size:15px !important;
          font-weight:900 !important;
          letter-spacing:.1px;
        }
        .home-modern-action-copy small{
          font-size:10px !important;
          opacity:.88 !important;
          margin-top:4px !important;
        }
        .home-modern-action-arrow{
          position:absolute;
          right:14px;
          top:50%;
          transform:translateY(-52%);
          font-size:28px;
          line-height:1;
          font-weight:300;
          color:rgba(255,255,255,.82);
        }
        @media(max-width:600px){
          .home-modern-actions{padding:8px 8px 7px !important;}
          .home-modern-actions-grid{gap:7px !important;}
          .home-modern-action{
            min-height:64px !important;
            padding:8px 27px 8px 8px !important;
            gap:7px !important;
            border-radius:15px !important;
          }
          .home-modern-action-icon{
            width:34px !important;
            min-width:34px !important;
            height:34px !important;
            border-radius:10px;
            font-size:22px !important;
          }
          .home-modern-action-copy strong{font-size:11.5px !important;}
          .home-modern-action-copy small{font-size:8px !important;line-height:1.15;}
          .home-modern-action-arrow{right:9px;font-size:22px;}
        }

        /* =========================================================
           FINAL HOME: FOTO LEBIH FULL + MENU TURUN + WA HANYA FOOTER
        ========================================================= */

        /* Foto kegiatan ditarik lebih panjang ke bawah */
        .hero{
          height:clamp(315px, 48vh, 390px) !important;
          min-height:315px !important;
          background-position:center 48% !important;
          padding-top:8px !important;
          padding-bottom:8px !important;
        }

        /* Empat tombol berada pada area bawah yang compact */
        .home-modern-actions{
          background:linear-gradient(180deg,#08658c 0%,#075a82 100%) !important;
          padding:8px 12px 7px !important;
          margin:0 !important;
        }
        .home-modern-actions-grid{
          max-width:1050px !important;
          margin:0 auto !important;
          gap:8px !important;
        }
        .home-modern-action{
          min-height:52px !important;
          padding:5px 16px !important;
        }
        .home-modern-action-icon{
          width:40px !important;
          min-width:40px !important;
          height:40px !important;
          font-size:30px !important;
        }

        /* Nav langsung mengikuti menu, tanpa blok WA tengah */
        .bottom-nav{
          margin:0 !important;
          min-height:48px !important;
          padding:3px 2px 2px !important;
        }

        .home-visitor-compact{
          padding:3px 10px 2px !important;
          min-height:18px !important;
        }

        /* Footer akhir: QR + brand + WA */
        .home-footer-modern{
          padding:5px 12px 7px !important;
        }

        @media(max-width:600px){
          /* HP: beri ruang vertikal foto agar kepala pelatih & aktivitas terlihat */
          .hero{
            height:clamp(345px, 51vh, 430px) !important;
            min-height:345px !important;
            background-position:center 55% !important;
            padding-top:6px !important;
            padding-bottom:7px !important;
          }

          .home-modern-actions{
            padding:6px 8px 5px !important;
          }
          .home-modern-actions-grid{
            grid-template-columns:repeat(2,minmax(0,1fr)) !important;
            gap:6px !important;
          }
          .home-modern-action{
            min-height:50px !important;
            padding:5px 7px !important;
            gap:6px !important;
          }
          .home-modern-action-icon{
            width:31px !important;
            min-width:31px !important;
            height:31px !important;
            font-size:25px !important;
          }
          .home-modern-action-copy strong{font-size:11.5px !important;}
          .home-modern-action-copy small{font-size:8.5px !important;}

          .bottom-nav{
            min-height:47px !important;
            padding:2px 1px 2px !important;
          }

          .home-footer-modern{
            padding:4px 6px 6px !important;
          }
        }

        @media(min-width:601px) and (max-height:820px){
          .hero{
            height:335px !important;
            min-height:335px !important;
            background-position:center 48% !important;
          }
          .home-modern-actions{padding-top:6px !important;padding-bottom:5px !important;}
          .home-modern-action{min-height:48px !important;}
          .bottom-nav{min-height:45px !important;}
          .home-footer-modern{padding-top:3px !important;padding-bottom:4px !important;}
        }


        /* FINAL: kurangi ruang kosong navy di bagian paling bawah */
        .home-footer-modern{
          padding-top:4px !important;
          padding-bottom:2px !important;
          min-height:0 !important;
          height:auto !important;
        }
        .home-footer-inner{
          margin-bottom:0 !important;
          padding-bottom:0 !important;
        }

        @media(max-width:600px){
          .home-footer-modern{
            padding-top:3px !important;
            padding-bottom:2px !important;
          }
        }

        @media(min-width:601px) and (max-height:820px){
          .home-footer-modern{
            padding-top:3px !important;
            padding-bottom:2px !important;
          }
        }


        /* =========================================================
           HOME PAS SATU LAYAR
           Potong blok navy kosong di bawah, lalu distribusikan
           tinggi Home agar seluruh konten turun mengisi layar.
        ========================================================= */

        /* Footer tidak lagi menyisakan blok tinggi sampai bawah */
        .home-footer-modern{
          flex:0 0 auto !important;
          min-height:0 !important;
          height:auto !important;
          margin:0 !important;
          padding:5px 10px 5px !important;
        }
        .home-footer-inner{
          min-height:0 !important;
          height:auto !important;
          margin:0 auto !important;
          padding:0 !important;
        }

        /* Home dibuat sebagai komposisi vertikal rapat */
        .app{
          min-height:100vh !important;
        }

        /* Desktop/laptop: gunakan tinggi viewport, bukan menambah navy kosong */
        @media (min-width:601px){
          .header{
            height:68px !important;
            min-height:68px !important;
            padding:5px 16px !important;
          }

          .hero{
            height:335px !important;
            min-height:335px !important;
            background-position:center 48% !important;
          }

          .home-modern-actions{
            padding:6px 12px 5px !important;
          }
          .home-modern-action{
            min-height:50px !important;
          }

          .bottom-nav{
            min-height:49px !important;
            height:49px !important;
            padding:3px 2px 2px !important;
          }

          .home-visitor-compact{
            min-height:18px !important;
            height:18px !important;
            padding:2px 10px 1px !important;
          }

          .home-footer-modern{
            padding-top:5px !important;
            padding-bottom:5px !important;
          }
        }

        /* Laptop pendek 1366x768: komposisi dibuat pas layar */
        @media (min-width:601px) and (max-height:820px){
          .header{
            height:68px !important;
            min-height:68px !important;
          }
          .hero{
            height:335px !important;
            min-height:335px !important;
          }
          .home-modern-actions{
            padding-top:5px !important;
            padding-bottom:4px !important;
          }
          .home-modern-action{
            min-height:48px !important;
          }
          .bottom-nav{
            height:48px !important;
            min-height:48px !important;
          }
          .home-footer-modern{
            padding:4px 10px 4px !important;
          }
        }

        /* HP: tetap compact, foto tetap dominan, tidak ada navy kosong besar */
        @media (max-width:600px){
          .header{
            height:58px !important;
            min-height:58px !important;
            padding:4px 10px !important;
          }

          .hero{
            height:clamp(335px,47vh,405px) !important;
            min-height:335px !important;
            background-position:center 55% !important;
          }

          .home-modern-actions{
            padding:5px 8px 4px !important;
          }
          .home-modern-action{
            min-height:48px !important;
          }

          .bottom-nav{
            min-height:48px !important;
            height:48px !important;
            padding:2px 1px !important;
          }

          .home-visitor-compact{
            min-height:17px !important;
            height:17px !important;
            padding:1px 8px !important;
          }

          .home-footer-modern{
            margin:0 !important;
            padding:4px 5px 5px !important;
          }
        }


        /* FINAL TUNING: potong lagi ruang bawah Home */
        .home-footer-modern{
          padding-top:2px !important;
          padding-bottom:0 !important;
          margin-bottom:0 !important;
          min-height:0 !important;
          height:auto !important;
        }
        .home-footer-inner{
          margin-top:0 !important;
          margin-bottom:0 !important;
          padding-top:0 !important;
          padding-bottom:0 !important;
        }

        @media (min-width:601px){
          .home-footer-modern{
            padding-top:2px !important;
            padding-bottom:0 !important;
          }
        }

        @media (max-width:600px){
          .home-footer-modern{
            padding-top:2px !important;
            padding-bottom:1px !important;
          }
        }


        /* =========================================================
           KUNCI BAGIAN BAWAH
           Header dipendekkan, selisih tinggi diberikan ke HERO.
           Footer / QR / WA / nav / visitor TIDAK DIUBAH.
        ========================================================= */

        @media (min-width:601px){
          /* sebelumnya 68px -> 48px: hemat 20px */
          .header{
            height:48px !important;
            min-height:48px !important;
            padding:2px 14px !important;
          }
          .header .brand img{
            max-height:36px !important;
          }
          .login-btn{
            padding-top:6px !important;
            padding-bottom:6px !important;
          }

          /* sebelumnya 335px -> 355px: tambah tepat 20px */
          .hero{
            height:355px !important;
            min-height:355px !important;
            background-position:center 48% !important;
          }
        }

        @media (max-width:600px){
          /* sebelumnya 58px -> 48px: hemat 10px */
          .header{
            height:48px !important;
            min-height:48px !important;
            padding:2px 9px !important;
          }
          .header .brand img{
            max-height:34px !important;
          }
          .login-btn{
            padding-top:6px !important;
            padding-bottom:6px !important;
          }

          /* tambahkan 10px ke hero, bagian bawah tetap */
          .hero{
            height:calc(clamp(335px, 47vh, 405px) + 10px) !important;
            min-height:345px !important;
            background-position:center 55% !important;
          }
        }

        @media (min-width:601px) and (max-height:820px){
          /* tetap: header -20px, hero +20px */
          .header{
            height:48px !important;
            min-height:48px !important;
          }
          .hero{
            height:355px !important;
            min-height:355px !important;
          }
        }


        /* =========================================================
           REVISI: 4 TOMBOL LEBIH PENDEK + FOOTER BAWAH DIPOTONG
        ========================================================= */

        /* Grup 4 tombol dipersempit dan dipusatkan */
        .home-modern-actions-grid{
          width:min(760px, 72vw) !important;
          max-width:760px !important;
          margin-left:auto !important;
          margin-right:auto !important;
          grid-template-columns:repeat(2,minmax(0,1fr)) !important;
          gap:8px !important;
        }

        .home-modern-action{
          width:100% !important;
          min-height:48px !important;
          padding:5px 12px !important;
        }

        /* Potong ruang navy kosong di bawah QR/WA */
        .home-footer-modern{
          padding-top:2px !important;
          padding-bottom:0 !important;
          margin-bottom:0 !important;
          min-height:0 !important;
          height:auto !important;
        }

        .home-footer-inner{
          margin-top:0 !important;
          margin-bottom:0 !important;
          padding-top:0 !important;
          padding-bottom:0 !important;
        }

        /* Jangan biarkan app memaksa bidang navy sampai 100vh */
        .app{
          min-height:0 !important;
        }

        @media (min-width:601px){
          .home-modern-actions{
            padding-top:5px !important;
            padding-bottom:4px !important;
          }
          .home-modern-actions-grid{
            width:min(760px,72vw) !important;
          }
          .home-modern-action{
            min-height:47px !important;
          }
          .home-footer-modern{
            padding-bottom:0 !important;
          }
        }

        @media (max-width:600px){
          /* HP tetap 2 kolom, tetapi proporsional terhadap layar */
          .home-modern-actions-grid{
            width:94% !important;
            max-width:94% !important;
            gap:6px !important;
          }
          .home-modern-action{
            min-height:47px !important;
            padding:5px 7px !important;
          }
          .home-footer-modern{
            padding-top:2px !important;
            padding-bottom:0 !important;
          }
        }


        /* KHUSUS HP: hilangkan ruang bawah berlebih. Desktop tidak disentuh. */
        @media (max-width:600px){
          .app{
            min-height:0 !important;
            height:auto !important;
          }
          .bottom-nav{
            grid-template-columns:repeat(6,1fr) !important;
            height:auto !important;
            min-height:0 !important;
            padding-top:3px !important;
            padding-bottom:3px !important;
            margin:0 !important;
          }
          .bottom-nav button{
            height:auto !important;
            min-height:0 !important;
            padding-top:3px !important;
            padding-bottom:3px !important;
          }
          .home-visitor-compact{
            height:auto !important;
            min-height:0 !important;
            margin:0 !important;
            padding-top:2px !important;
            padding-bottom:1px !important;
          }
          .home-footer-modern{
            height:auto !important;
            min-height:0 !important;
            margin:0 !important;
            padding-top:2px !important;
            padding-bottom:0 !important;
          }
          .home-footer-inner{
            height:auto !important;
            min-height:0 !important;
            margin-top:0 !important;
            margin-bottom:0 !important;
            padding-top:0 !important;
            padding-bottom:0 !important;
          }
        }


        /* =========================================================
           FIX FINAL KHUSUS HP:
           Ruang kosong di bawah bukan padding footer, tetapi sisa
           viewport setelah konten selesai. Home dibuat setinggi layar
           dan sisa tinggi diberikan ke FOTO/HERO, bukan ke footer.
           Desktop tidak berubah.
        ========================================================= */
        @media (max-width:600px){
          .app.home-app{
            min-height:100vh !important;
            min-height:100dvh !important;
            height:auto !important;
            display:flex !important;
            flex-direction:column !important;
            background:#061a3a !important;
          }

          /* Foto menyerap sisa tinggi layar agar tidak ada blok navy kosong bawah */
          .app.home-app .hero{
            flex:1 1 auto !important;
            height:auto !important;
            min-height:335px !important;
          }

          /* Bagian setelah foto tidak ikut membesar */
          .app.home-app .home-modern-actions,
          .app.home-app .bottom-nav,
          .app.home-app .home-visitor-compact,
          .app.home-app .home-footer-modern{
            flex:0 0 auto !important;
          }

          .app.home-app .home-footer-modern{
            min-height:0 !important;
            height:auto !important;
            margin:0 !important;
            padding-top:2px !important;
            padding-bottom:4px !important;
          }

          .app.home-app .home-footer-inner{
            min-height:0 !important;
            height:auto !important;
            margin:0 auto !important;
            padding:0 !important;
          }
        }


        /* KHUSUS HP: geser foto ke kiri agar pelatih terlihat lebih utuh */
        @media (max-width:600px){
          .app.home-app .hero{
            background-position:68% center !important;
          }
        }

        /* ===== MODERN FRONT UI 2026 ===== */
        .modern-brand{display:flex;align-items:center;gap:8px;cursor:pointer;min-width:0}
        .modern-brand-logo-wrap{width:42px;height:42px;border-radius:50%;background:#fff;display:grid;place-items:center;box-shadow:0 4px 14px rgba(0,0,0,.18);overflow:hidden}
        .modern-brand-logo-wrap img{width:100%;height:100%;object-fit:contain}
        .modern-brand-copy{line-height:.95;white-space:nowrap}
        .modern-brand-ping{font-size:clamp(14px,3.8vw,20px);font-weight:950;color:#fff;letter-spacing:.2px}
        .modern-brand-training{font-size:clamp(12px,3.2vw,17px);font-weight:950;color:#28e2ad;letter-spacing:.7px;margin-top:3px}
        .modern-hero-label{display:inline-flex!important;align-items:center;background:linear-gradient(90deg,rgba(4,91,160,.92),rgba(8,124,165,.86))!important;border:1px solid rgba(95,211,255,.55)!important;border-radius:999px!important;padding:5px 11px!important;font-size:10px!important;font-weight:850!important;letter-spacing:.35px!important;box-shadow:0 5px 16px rgba(0,24,54,.22)}
        .modern-hero-title{text-align:left!important;font-size:clamp(27px,7.2vw,42px)!important;line-height:1.02!important;margin:13px 0 8px!important;font-weight:950!important;letter-spacing:-.8px;color:#fff;text-shadow:0 4px 14px rgba(0,0,0,.5)}
        .modern-hero-title span{color:#27e2dc!important}
        .modern-hero-sub{text-align:left;max-width:300px;color:#fff;font-size:12px;line-height:1.35;font-weight:650;text-shadow:0 2px 7px rgba(0,0,0,.7)}
        .hero-content{text-align:left!important}

        .program-picker{max-width:680px;margin:0 auto 18px;background:rgba(255,255,255,.94);padding:14px;border-radius:20px;box-shadow:0 10px 30px rgba(20,55,75,.11);border:1px solid #c9dce4}
        .program-picker-title{font-size:14px;font-weight:950;color:#0b3550;margin-bottom:9px}
        .program-picker-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .program-picker-card{border:0;border-radius:17px;padding:15px 10px;color:#fff;min-height:125px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 18px rgba(0,48,78,.13);transition:.18s}
        .program-picker-card.group{background:linear-gradient(145deg,#268eff,#0870df)}
        .program-picker-card.private{background:linear-gradient(145deg,#20d8b1,#06957e)}
        .program-picker-card:not(.active){filter:saturate(.72);opacity:.82;transform:scale(.985)}
        .program-picker-card.active{outline:3px solid rgba(8,123,114,.18);transform:translateY(-2px)}
        .program-picker-icon{font-size:29px;margin-bottom:6px}.program-picker-card strong{font-size:17px}.program-picker-card small{font-size:10px;line-height:1.3;margin-top:4px;max-width:145px}
        .group-size-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.group-size-card{background:#eef7ff;border:1px solid #c5def2;border-radius:12px;padding:10px 5px;text-align:center;color:#164f76}.group-size-card b,.group-size-card small{display:block}.group-size-card small{font-size:9px;margin-top:3px;color:#648091}

        .private-request-modern{max-width:680px;margin:0 auto;background:#fff;padding:16px;border-radius:20px;box-shadow:0 10px 30px rgba(20,55,75,.11);border:1px solid #cbdde4}
        .private-request-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.private-request-head span{font-size:9px;font-weight:950;letter-spacing:1.2px;color:#0b8d7d}.private-request-head h3{margin:3px 0 0;color:#0b3550;font-size:20px}.private-request-badge{background:#e5f3ff;color:#0874d1;padding:7px 10px;border-radius:999px;font-size:10px;font-weight:900}.private-request-intro{font-size:11px;line-height:1.45;color:#607d8b;background:#f3f8fa;border-radius:11px;padding:9px 10px}
        .private-program-block>label{display:block;font-weight:950;color:#0b3550;font-size:13px;margin:13px 0 7px}.private-program-list{display:grid;gap:7px}
        .private-program-option{width:100%;border:1px solid #d5e2e8;background:#fff;border-radius:12px;padding:9px;display:grid;grid-template-columns:22px 34px 1fr;gap:7px;align-items:center;text-align:left;cursor:pointer;color:#163e55}.private-program-option.active{border:2px solid #1684f5;background:#f0f7ff;box-shadow:0 4px 12px rgba(22,132,245,.09)}.private-program-radio{color:#1684f5;font-size:18px}.private-program-icon{font-size:22px;text-align:center}.private-program-option strong,.private-program-option small{display:block}.private-program-option strong{font-size:12px}.private-program-option small{font-size:9px;color:#6d8592;margin-top:2px;line-height:1.25}
        .coach-message-box{margin-top:13px;background:linear-gradient(180deg,#f7fbfd,#eef6fa);border:1px solid #c7dce6;border-radius:15px;padding:11px}.coach-message-title{display:flex;gap:8px;align-items:flex-start;color:#0b3550}.coach-message-title>span{font-size:21px}.coach-message-title strong,.coach-message-title small{display:block}.coach-message-title strong{font-size:13px}.coach-message-title small{font-size:9px;color:#718995;margin-top:2px;line-height:1.3}.coach-message-box textarea{width:100%;box-sizing:border-box;margin-top:9px;border:1px solid #b9d4e1;border-radius:11px;padding:11px;font:inherit;font-size:12px;line-height:1.45;resize:vertical;background:#fff;outline:none}.coach-message-box textarea:focus{border-color:#1684f5;box-shadow:0 0 0 3px rgba(22,132,245,.1)}.coach-message-count{text-align:right;font-size:9px;color:#78909c;margin-top:2px}.modern-private-submit{margin-top:11px!important;border-radius:12px!important;background:linear-gradient(90deg,#1684f5,#0871dd)!important;box-shadow:0 7px 16px rgba(8,113,221,.22)!important}

        .modern-bottom-nav{position:relative!important;z-index:20!important;background:linear-gradient(180deg,#062d4c,#031f39)!important;color:#fff!important;display:grid!important;grid-template-columns:repeat(6,1fr)!important;padding:5px 4px 6px!important;box-shadow:0 -5px 18px rgba(0,0,0,.18)!important;border-top:1px solid rgba(90,205,255,.2)}
        .modern-bottom-item{border:0;background:transparent;color:#fff;padding:5px 1px 3px;font-size:9px;cursor:pointer;position:relative;border-radius:11px;min-height:43px}
        .modern-bottom-item.active{background:linear-gradient(145deg,rgba(22,132,245,.58),rgba(0,91,156,.72));color:#9ee8ff;box-shadow:inset 0 0 0 1px rgba(92,202,255,.22),0 3px 10px rgba(0,0,0,.15)}
        .modern-bottom-item>div:last-child{font-weight:700;margin-top:1px}
        @media(max-width:600px){
          .header{background:linear-gradient(90deg,#052a4a,#043b62)!important}
          .login-btn{font-size:9px!important;padding:6px 8px!important;border-radius:999px!important}
          .hero-content{padding-top:2px!important}
          .modern-hero-title{margin-top:10px!important}
          .program-picker,.private-request-modern{border-radius:16px}
        }

        /* ===== FINAL MOBILE FRONT ALIGNMENT ===== */
        .modern-brand{
          display:flex!important;align-items:center!important;gap:9px!important;
          min-width:0!important;height:100%!important;
        }
        .modern-brand-logo-wrap{
          flex:0 0 42px!important;width:42px!important;height:42px!important;
          border-radius:50%!important;background:#fff!important;
          display:grid!important;place-items:center!important;overflow:hidden!important;
        }
        .modern-brand-logo-wrap img{
          width:42px!important;height:42px!important;max-height:none!important;
          object-fit:contain!important;
        }
        .modern-brand-copy{display:flex!important;flex-direction:column!important;justify-content:center!important;line-height:1!important}
        .modern-brand-ping{font-size:18px!important;font-weight:900!important;letter-spacing:.4px!important;color:#fff!important}
        .modern-brand-training{font-size:16px!important;font-weight:900!important;letter-spacing:1px!important;color:#26d9a4!important;margin-top:4px!important}

        .hero-content{max-width:610px!important;margin:0 auto!important;text-align:left!important}
        .modern-hero-label{
          margin:4px 0 0!important;
          font-size:10px!important;
          padding:6px 12px!important;
          white-space:nowrap!important;
        }
        .modern-hero-title{
          max-width:330px!important;
          font-size:clamp(28px,7.1vw,39px)!important;
          line-height:1.02!important;
          margin:18px 0 10px!important;
          letter-spacing:-.7px!important;
        }
        .modern-hero-sub{
          max-width:330px!important;font-size:12px!important;line-height:1.42!important;
          margin:0!important;
        }

        .modern-bottom-nav{
          display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;
          gap:3px!important;padding:5px 5px 6px!important;
          background:linear-gradient(180deg,#073555,#04243e)!important;
        }
        .modern-bottom-item{
          width:100%!important;min-width:0!important;height:52px!important;min-height:52px!important;
          margin:0!important;padding:4px 1px!important;border-radius:11px!important;
          background:rgba(255,255,255,.025)!important;
          border:1px solid transparent!important;
          display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;
          color:#fff!important;box-shadow:none!important;
        }
        .modern-bottom-item.active{
          background:rgba(19,126,202,.28)!important;
          border-color:rgba(72,191,255,.42)!important;
          color:#8fe8ff!important;
          box-shadow:inset 0 0 12px rgba(30,155,225,.12)!important;
        }
        .modern-bottom-item img{margin:0 auto!important}
        .modern-bottom-item>div{margin-left:auto!important;margin-right:auto!important}

        .direct-program-head{
          max-width:680px;margin:0 auto 12px;padding:13px 14px;border-radius:16px;
          display:flex;align-items:center;gap:12px;color:#fff;
          box-shadow:0 8px 22px rgba(12,54,76,.12);
        }
        .group-direct-head{background:linear-gradient(135deg,#1687ed,#0871d7)}
        .private-direct-head{background:linear-gradient(135deg,#16bda0,#087e73)}
        .direct-program-icon{
          width:46px;height:46px;min-width:46px;border-radius:13px;
          display:grid;place-items:center;font-size:26px;background:rgba(255,255,255,.18)
        }
        .direct-program-head small{font-size:9px;font-weight:900;letter-spacing:1px;opacity:.9}
        .direct-program-head h3{font-size:18px;margin:2px 0 1px}
        .direct-program-head p{font-size:10px;margin:0;opacity:.92;line-height:1.3}

        @media(max-width:600px){
          .header{height:58px!important;min-height:58px!important;padding:5px 10px!important}
          .header .brand img{max-height:none!important}
          .modern-brand-logo-wrap,.modern-brand-logo-wrap img{width:42px!important;height:42px!important}
          .modern-brand-ping{font-size:17px!important}
          .modern-brand-training{font-size:15px!important}
          .modern-hero-label{margin-left:0!important}
          .modern-hero-title{font-size:34px!important;margin-top:16px!important}
          .modern-hero-sub{font-size:12px!important}
          .modern-bottom-nav{min-height:62px!important;height:auto!important}
          .modern-bottom-item{height:50px!important;min-height:50px!important}
        }

        /* ===== UPDATE 3 POIN: HOME / GROUP / VISITOR ===== */
        .visitor-settings-panel{margin:14px 0;padding:14px;background:rgba(255,255,255,.9);border:1px solid #b9d0da;border-radius:16px}
        .visitor-settings-panel h3{margin:0;color:#083c58}.visitor-settings-lead{font-size:11px;color:#657f8d;margin:4px 0 12px}
        .visitor-mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
        .visitor-mode-grid button{position:relative;border:1px solid #c7dce5;background:#f7fbfd;border-radius:14px;padding:13px 9px;text-align:center;cursor:pointer;color:#123e57}
        .visitor-mode-grid button.active{border:2px solid #1684f5;background:linear-gradient(180deg,#eaf6ff,#f7fcff);box-shadow:0 5px 16px rgba(22,132,245,.13)}
        .visitor-mode-grid span,.visitor-mode-grid strong,.visitor-mode-grid small,.visitor-mode-grid b{display:block}
        .visitor-mode-grid span{font-size:25px}.visitor-mode-grid strong{font-size:12px;margin-top:5px}.visitor-mode-grid small{font-size:9px;line-height:1.3;color:#718996;margin:3px 0 8px}.visitor-mode-grid b{font-size:23px;color:#0874d1}
        .visitor-mode-note{margin-top:10px;padding:9px 10px;background:#eaf4f8;border-radius:10px;font-size:10px;color:#526f7e}

        .group-package-picker{max-width:680px;margin:0 auto 13px;background:#fff;border:1px solid #cbdde5;border-radius:17px;padding:13px;box-shadow:0 8px 22px rgba(20,55,75,.08)}
        .group-package-title{font-size:14px;font-weight:950;color:#0b3550;margin-bottom:9px}
        .group-package-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
        .group-package-grid button{position:relative;border:1px solid #c6dce8;background:linear-gradient(180deg,#f8fcff,#edf7ff);border-radius:14px;padding:11px 4px 10px;cursor:pointer;color:#164f76;min-height:94px}
        .group-package-grid button.active{border:2px solid #1684f5;background:linear-gradient(145deg,#e9f5ff,#dff1ff);box-shadow:0 5px 15px rgba(22,132,245,.14);transform:translateY(-1px)}
        .group-people-icon{display:block;font-size:25px}.group-package-grid strong,.group-package-grid small{display:block}.group-package-grid strong{font-size:12px;margin-top:4px}.group-package-grid small{font-size:8.5px;color:#6b8593;margin-top:3px}.group-check{position:absolute;right:6px;top:5px;width:17px;height:17px;border-radius:50%;background:#1684f5;color:#fff;font-size:11px;line-height:17px}

        /* Home benar-benar mengikuti komposisi mockup: teks kiri, feature row, kartu dan nav satu bahasa visual */
        .app.home-app .hero{position:relative!important;background-position:62% center!important}
        .app.home-app .hero:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(1,24,48,.72) 0%,rgba(1,31,57,.35) 48%,rgba(0,35,60,.05) 75%)}
        .app.home-app .hero-content{position:relative!important;z-index:2!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important;text-align:left!important;padding:8px 0 0!important}
        .app.home-app .modern-hero-label{align-self:flex-start!important;margin:0!important;padding:5px 10px!important;font-size:9px!important}
        .hero-copy-card{margin-top:13px;text-align:left}
        .app.home-app .modern-hero-title{font-size:clamp(27px,7vw,39px)!important;line-height:1.01!important;margin:0 0 8px!important;text-align:left!important;font-weight:950!important}
        .app.home-app .modern-hero-sub{font-size:11px!important;line-height:1.4!important;text-align:left!important;margin:0!important}
        .hero-feature-row{margin-top:auto;margin-bottom:8px;width:min(360px,100%);display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .hero-feature-row>div{display:flex;flex-direction:column;align-items:center;text-align:center;color:#fff;font-size:9px;text-shadow:0 2px 5px rgba(0,0,0,.6)}
        .hero-feature-row span{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;border:1px solid #22baff;background:rgba(0,55,96,.58);font-size:19px;box-shadow:0 5px 14px rgba(0,0,0,.2)}
        .hero-feature-row b{font-size:9px;margin-top:3px}.hero-feature-row small{font-size:8px;opacity:.9}
        .app.home-app .home-modern-actions{background:#f4f8fa!important;padding:10px 9px!important}
        .app.home-app .home-modern-action{min-height:78px!important;border-radius:17px!important;border:0!important;box-shadow:0 7px 17px rgba(10,54,82,.15)!important}
        .app.home-app .home-modern-action.group-card{background:linear-gradient(145deg,#268eff,#0870df)!important}
        .app.home-app .home-modern-action.private-card{background:linear-gradient(145deg,#20d8b1,#06957e)!important}
        .app.home-app .home-modern-action.schedule-card-home{background:linear-gradient(145deg,#ff9448,#ff6436)!important}
        .app.home-app .home-modern-action.payment-card{background:linear-gradient(145deg,#9565f6,#6939dc)!important}
        .app.home-app .modern-bottom-nav{background:linear-gradient(180deg,#052e4d,#031e36)!important;border-radius:0!important;padding:5px!important}
        .app.home-app .modern-bottom-item{background:transparent!important;border:1px solid transparent!important;border-radius:10px!important}
        .app.home-app .modern-bottom-item.active{background:rgba(25,137,213,.34)!important;border-color:rgba(69,191,255,.36)!important}

        @media(max-width:600px){
          .app.home-app .hero{height:440px!important;min-height:440px!important;padding:10px 18px 8px!important;background-position:62% center!important}
          .app.home-app .modern-hero-title{font-size:31px!important;max-width:290px!important}
          .hero-feature-row{width:260px!important}
          .app.home-app .home-modern-actions-grid{gap:9px!important}
          .app.home-app .home-modern-action{min-height:76px!important;padding:9px 28px 9px 10px!important}
          .app.home-app .home-modern-action-copy strong{font-size:12px!important}
          .app.home-app .home-modern-action-copy small{font-size:8.5px!important}
        }

        /* ===== HOME POSITION FIX: feature bawah + nav seragam ===== */
        .app.home-app .hero{position:relative!important;}
        .app.home-app .hero-content{
          height:100%!important;
          box-sizing:border-box!important;
          position:relative!important;
        }
        .app.home-app .hero-feature-row-bottom{
          position:absolute!important;
          left:50%!important;
          transform:translateX(-50%)!important;
          bottom:18px!important;
          width:min(430px,88%)!important;
          margin:0!important;
          padding:10px 12px!important;
          border-radius:18px!important;
          background:rgba(3,39,67,.48)!important;
          border:1px solid rgba(88,206,255,.24)!important;
          backdrop-filter:blur(5px)!important;
          -webkit-backdrop-filter:blur(5px)!important;
          box-shadow:0 8px 22px rgba(0,0,0,.16)!important;
        }

        /* Semua tombol Home–Chat harus sama. Tidak ada kotak khusus Home. */
        .app.home-app .modern-bottom-nav{
          gap:2px!important;
          padding:5px 6px!important;
        }
        .app.home-app .modern-bottom-item,
        .app.home-app .modern-bottom-item.active{
          width:100%!important;
          height:52px!important;
          min-height:52px!important;
          padding:4px 1px!important;
          margin:0!important;
          border:1px solid transparent!important;
          border-radius:10px!important;
          background:transparent!important;
          box-shadow:none!important;
          outline:none!important;
          color:#fff!important;
          backdrop-filter:none!important;
          -webkit-backdrop-filter:none!important;
          transform:none!important;
        }
        .app.home-app .modern-bottom-item.active{
          color:#83dcff!important;
        }

        @media(max-width:600px){
          .app.home-app .hero-feature-row-bottom{
            bottom:14px!important;
            width:88%!important;
            padding:8px 7px!important;
          }
          .app.home-app .hero-feature-row-bottom span{
            width:36px!important;height:36px!important;font-size:18px!important;
          }
          .app.home-app .modern-bottom-item,
          .app.home-app .modern-bottom-item.active{
            height:50px!important;min-height:50px!important;
          }
        }

        /* ===== FINAL RAPAT IKON HERO + NAV HOME-CHAT ===== */
        .app.home-app .hero-feature-row-bottom{
          padding:8px 10px 7px!important;
          align-items:center!important;
        }
        .app.home-app .hero-feature-row-bottom>div{
          display:flex!important;
          flex-direction:column!important;
          align-items:center!important;
          justify-content:center!important;
          gap:0!important;
          line-height:1!important;
        }
        .app.home-app .hero-feature-row-bottom span{
          margin:0 0 3px!important;
        }
        .app.home-app .hero-feature-row-bottom b{
          display:block!important;
          margin:0!important;
          padding:0!important;
          line-height:1.05!important;
          font-size:9px!important;
        }
        .app.home-app .hero-feature-row-bottom small{
          display:block!important;
          margin:2px 0 0!important;
          padding:0!important;
          line-height:1.05!important;
          font-size:8px!important;
        }

        /* Home sampai Chat: ukuran, jarak, dan bentuk semuanya sama */
        .app.home-app .modern-bottom-nav{
          display:grid!important;
          grid-template-columns:repeat(6,minmax(0,1fr))!important;
          gap:0!important;
          padding:5px 4px 4px!important;
          min-height:58px!important;
          align-items:center!important;
        }
        .app.home-app .modern-bottom-item,
        .app.home-app .modern-bottom-item.active{
          width:100%!important;
          min-width:0!important;
          height:50px!important;
          min-height:50px!important;
          margin:0!important;
          padding:2px 0!important;
          border:0!important;
          border-radius:0!important;
          background:transparent!important;
          box-shadow:none!important;
          outline:none!important;
          display:flex!important;
          flex-direction:column!important;
          align-items:center!important;
          justify-content:center!important;
          gap:1px!important;
          color:#fff!important;
          transform:none!important;
          filter:none!important;
          backdrop-filter:none!important;
          -webkit-backdrop-filter:none!important;
        }
        .app.home-app .modern-bottom-item.active{
          color:#8de7ff!important;
        }
        .app.home-app .modern-bottom-item img{
          display:block!important;
          margin:0 auto 1px!important;
          padding:0!important;
          max-height:29px!important;
          object-fit:contain!important;
        }
        .app.home-app .modern-bottom-item>div{
          margin:0!important;
          padding:0!important;
          line-height:1.05!important;
          font-size:9px!important;
          font-weight:700!important;
        }

        @media(max-width:600px){
          .app.home-app .hero-feature-row-bottom{
            padding:7px 7px 6px!important;
          }
          .app.home-app .hero-feature-row-bottom span{
            margin-bottom:2px!important;
          }
          .app.home-app .hero-feature-row-bottom small{
            margin-top:1px!important;
          }
          .app.home-app .modern-bottom-nav{
            min-height:56px!important;
            padding:4px 3px 3px!important;
          }
          .app.home-app .modern-bottom-item,
          .app.home-app .modern-bottom-item.active{
            height:48px!important;
            min-height:48px!important;
          }
        }

        /* =========================================================
           FINAL HOME GLASS DESIGN
           1) 3 info hero lebih kecil, tanpa panel kaca besar
           2) 4 menu utama glass-card di atas background navy
           3) Home-Chat pakai lingkaran biru besar & seragam
        ========================================================= */

        /* --- 3 INFO DI AREA FOTO --- */
        .app.home-app .hero-feature-row-bottom{
          background:transparent!important;
          border:0!important;
          box-shadow:none!important;
          backdrop-filter:none!important;
          -webkit-backdrop-filter:none!important;
          padding:4px 6px!important;
          bottom:12px!important;
        }
        .app.home-app .hero-feature-row-bottom>div{
          gap:0!important;
          line-height:1!important;
        }
        .app.home-app .hero-feature-row-bottom span{
          width:31px!important;
          height:31px!important;
          min-width:31px!important;
          border-radius:50%!important;
          margin:0 0 2px!important;
          font-size:15px!important;
          background:rgba(2,69,116,.66)!important;
          border:1px solid rgba(82,203,255,.72)!important;
          box-shadow:0 4px 11px rgba(0,0,0,.17)!important;
          backdrop-filter:blur(4px)!important;
          -webkit-backdrop-filter:blur(4px)!important;
        }
        .app.home-app .hero-feature-row-bottom b{
          margin:0!important;
          font-size:8px!important;
          line-height:1!important;
        }
        .app.home-app .hero-feature-row-bottom small{
          margin:1px 0 0!important;
          font-size:7px!important;
          line-height:1!important;
        }

        /* --- AREA 4 MENU UTAMA: PUTIH DIGANTI NAVY MENYATU --- */
        .app.home-app .home-modern-actions{
          margin:0!important;
          padding:12px 10px 11px!important;
          background:
            radial-gradient(circle at 12% 5%,rgba(35,188,255,.16),transparent 35%),
            radial-gradient(circle at 88% 100%,rgba(25,213,176,.10),transparent 34%),
            linear-gradient(180deg,#075a82 0%,#063f64 55%,#052f50 100%)!important;
          border-top:1px solid rgba(127,219,255,.12)!important;
        }
        .app.home-app .home-modern-actions-grid{
          gap:9px!important;
        }

        /* Keempat kartu memakai bahasa visual kaca yang sama */
        .app.home-app .home-modern-action,
        .app.home-app .home-modern-action.group-card,
        .app.home-app .home-modern-action.private-card,
        .app.home-app .home-modern-action.schedule-card-home,
        .app.home-app .home-modern-action.payment-card{
          min-height:72px!important;
          padding:8px 29px 8px 10px!important;
          border-radius:17px!important;
          background:
            linear-gradient(145deg,rgba(255,255,255,.17),rgba(255,255,255,.075))!important;
          border:1px solid rgba(185,234,255,.34)!important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.23),
            0 7px 17px rgba(0,25,47,.18)!important;
          backdrop-filter:blur(10px)!important;
          -webkit-backdrop-filter:blur(10px)!important;
          color:#fff!important;
        }
        .app.home-app .home-modern-action:before{
          content:""!important;
          position:absolute!important;
          left:0!important;
          top:0!important;
          width:100%!important;
          height:1px!important;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)!important;
          opacity:.7!important;
        }
        .app.home-app .home-modern-action-icon{
          width:42px!important;
          min-width:42px!important;
          height:42px!important;
          border-radius:13px!important;
          background:rgba(3,50,83,.48)!important;
          border:1px solid rgba(117,220,255,.38)!important;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.18)!important;
          font-size:26px!important;
        }
        /* Aksen warna kecil, tanpa mengubah kartu menjadi solid */
        .app.home-app .group-card .home-modern-action-icon{background:rgba(23,119,232,.40)!important}
        .app.home-app .private-card .home-modern-action-icon{background:rgba(8,169,143,.38)!important}
        .app.home-app .schedule-card-home .home-modern-action-icon{background:rgba(230,112,43,.38)!important}
        .app.home-app .payment-card .home-modern-action-icon{background:rgba(120,73,218,.40)!important}
        .app.home-app .home-modern-action-copy strong{
          font-size:12px!important;
          color:#fff!important;
        }
        .app.home-app .home-modern-action-copy small{
          font-size:8.5px!important;
          color:rgba(232,247,255,.88)!important;
        }

        /* --- NAV HOME SAMPAI CHAT --- */
        .app.home-app .modern-bottom-nav{
          background:linear-gradient(180deg,#052f50 0%,#031f38 100%)!important;
          grid-template-columns:repeat(6,minmax(0,1fr))!important;
          gap:1px!important;
          padding:7px 3px 6px!important;
          min-height:70px!important;
          border-top:1px solid rgba(109,207,255,.18)!important;
        }
        .app.home-app .modern-bottom-item,
        .app.home-app .modern-bottom-item.active{
          height:58px!important;
          min-height:58px!important;
          padding:0!important;
          gap:2px!important;
          border:0!important;
          border-radius:0!important;
          background:transparent!important;
          box-shadow:none!important;
          backdrop-filter:none!important;
          -webkit-backdrop-filter:none!important;
          color:#fff!important;
        }

        /* Bungkus ikon bawaan dengan tampilan lingkaran biru.
           Berlaku untuk img maupun elemen ikon pertama di tombol. */
        .app.home-app .modern-bottom-item img{
          width:40px!important;
          height:40px!important;
          max-width:40px!important;
          max-height:40px!important;
          min-width:40px!important;
          min-height:40px!important;
          box-sizing:border-box!important;
          object-fit:contain!important;
          padding:7px!important;
          margin:0 auto 1px!important;
          border-radius:50%!important;
          background:rgba(4,80,133,.76)!important;
          border:1px solid rgba(76,199,255,.68)!important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.17),
            0 4px 10px rgba(0,0,0,.18)!important;
        }
        .app.home-app .modern-bottom-item.active img{
          background:rgba(6,107,174,.86)!important;
          border-color:rgba(111,222,255,.88)!important;
        }
        .app.home-app .modern-bottom-item>div:last-child{
          margin:0!important;
          padding:0!important;
          font-size:8.5px!important;
          line-height:1!important;
          font-weight:750!important;
          color:#f2fbff!important;
        }
        .app.home-app .modern-bottom-item.active>div:last-child{
          color:#8de7ff!important;
        }

        @media(max-width:600px){
          .app.home-app .hero-feature-row-bottom{
            width:82%!important;
            bottom:10px!important;
          }
          .app.home-app .home-modern-actions{
            padding:10px 8px 9px!important;
          }
          .app.home-app .home-modern-actions-grid{
            gap:8px!important;
          }
          .app.home-app .home-modern-action,
          .app.home-app .home-modern-action.group-card,
          .app.home-app .home-modern-action.private-card,
          .app.home-app .home-modern-action.schedule-card-home,
          .app.home-app .home-modern-action.payment-card{
            min-height:69px!important;
            padding:7px 25px 7px 8px!important;
          }
          .app.home-app .home-modern-action-icon{
            width:38px!important;
            min-width:38px!important;
            height:38px!important;
            font-size:23px!important;
          }
          .app.home-app .modern-bottom-nav{
            min-height:68px!important;
            padding:6px 2px 5px!important;
          }
          .app.home-app .modern-bottom-item,
          .app.home-app .modern-bottom-item.active{
            height:57px!important;
            min-height:57px!important;
          }
          .app.home-app .modern-bottom-item img{
            width:38px!important;
            height:38px!important;
            min-width:38px!important;
            min-height:38px!important;
            max-width:38px!important;
            max-height:38px!important;
            padding:6px!important;
          }
          .app.home-app .modern-bottom-item>div:last-child{
            font-size:8px!important;
          }
        }

        /* =========================================================
           HOME FIT FIX
           - Hero dipendekkan agar seluruh muka Home terlihat
           - 4 kartu dibuat sedikit lebih compact
           - Home s/d Chat: semua ikon dibesarkan dan diseragamkan
        ========================================================= */

        /* Foto/hero sebelumnya terlalu tinggi (440px). */
        @media(max-width:600px){
          .app.home-app .hero{
            height:360px!important;
            min-height:360px!important;
            padding:8px 16px 6px!important;
            background-position:62% center!important;
          }
          .app.home-app .modern-hero-label{
            margin-top:0!important;
            padding:4px 9px!important;
            font-size:8px!important;
          }
          .app.home-app .hero-copy-card{
            margin-top:8px!important;
          }
          .app.home-app .modern-hero-title{
            font-size:27px!important;
            line-height:1!important;
            margin:0 0 6px!important;
          }
          .app.home-app .modern-hero-sub{
            font-size:9.5px!important;
            line-height:1.25!important;
          }
          .app.home-app .hero-feature-row-bottom{
            bottom:7px!important;
            width:80%!important;
          }

          /* 4 menu utama tetap glass tetapi lebih pendek */
          .app.home-app .home-modern-actions{
            padding:7px 8px!important;
          }
          .app.home-app .home-modern-actions-grid{
            gap:7px!important;
          }
          .app.home-app .home-modern-action,
          .app.home-app .home-modern-action.group-card,
          .app.home-app .home-modern-action.private-card,
          .app.home-app .home-modern-action.schedule-card-home,
          .app.home-app .home-modern-action.payment-card{
            min-height:61px!important;
            height:61px!important;
            padding:5px 24px 5px 7px!important;
            border-radius:15px!important;
          }
          .app.home-app .home-modern-action-icon{
            width:35px!important;
            min-width:35px!important;
            height:35px!important;
            font-size:21px!important;
            border-radius:11px!important;
          }
          .app.home-app .home-modern-action-copy strong{
            font-size:10.5px!important;
          }
          .app.home-app .home-modern-action-copy small{
            font-size:7.5px!important;
            line-height:1.1!important;
          }

          /* Bottom nav dibuat compact tetapi ikon justru besar dan seragam */
          .app.home-app .modern-bottom-nav{
            min-height:66px!important;
            height:66px!important;
            padding:4px 3px 3px!important;
            grid-template-columns:repeat(6,minmax(0,1fr))!important;
            gap:1px!important;
          }
          .app.home-app .modern-bottom-item,
          .app.home-app .modern-bottom-item.active{
            height:58px!important;
            min-height:58px!important;
            padding:0!important;
            display:flex!important;
            flex-direction:column!important;
            justify-content:center!important;
            align-items:center!important;
            gap:2px!important;
          }

          /* Ada ikon yang berupa img dan ada yang berupa div/emoji.
             Samakan container ikon pertama semuanya. */
          .app.home-app .modern-bottom-item > *:first-child{
            width:38px!important;
            min-width:38px!important;
            max-width:38px!important;
            height:38px!important;
            min-height:38px!important;
            max-height:38px!important;
            box-sizing:border-box!important;
            margin:0 auto!important;
            padding:6px!important;
            border-radius:50%!important;
            background:rgba(4,80,133,.78)!important;
            border:1px solid rgba(76,199,255,.70)!important;
            box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 4px 10px rgba(0,0,0,.18)!important;
            display:flex!important;
            align-items:center!important;
            justify-content:center!important;
            line-height:1!important;
            font-size:22px!important;
            object-fit:contain!important;
          }
          .app.home-app .modern-bottom-item.active > *:first-child{
            background:rgba(6,107,174,.88)!important;
            border-color:rgba(111,222,255,.9)!important;
          }
          .app.home-app .modern-bottom-item > img:first-child{
            object-fit:contain!important;
          }
          .app.home-app .modern-bottom-item > div:last-child{
            width:auto!important;
            height:auto!important;
            min-height:0!important;
            max-height:none!important;
            padding:0!important;
            margin:0!important;
            border:0!important;
            border-radius:0!important;
            background:transparent!important;
            box-shadow:none!important;
            font-size:7.8px!important;
            line-height:1!important;
            color:#f5fbff!important;
          }

          /* Footer/visitor jangan menambah ruang besar */
          .app.home-app .home-visitor-compact{
            margin:0!important;
            padding:2px 8px 3px!important;
            min-height:20px!important;
            font-size:9px!important;
          }
        }

        /* ===== POPUP BIAYA GROUP / PRIVATE ===== */
        .direct-program-head .direct-program-icon{
          background:rgba(255,255,255,.96)!important;
          color:#0873a8!important;
          border:1px solid #d6edf6!important;
          box-shadow:0 5px 14px rgba(0,50,80,.10)!important;
        }

        .training-price-overlay{
          position:fixed;inset:0;z-index:9999;
          background:rgba(1,18,34,.64);
          display:flex;align-items:center;justify-content:center;
          padding:18px;
          backdrop-filter:blur(4px);
          -webkit-backdrop-filter:blur(4px);
        }
        .training-price-modal{
          width:min(390px,100%);
          background:#fff;
          border-radius:22px;
          overflow:hidden;
          box-shadow:0 24px 65px rgba(0,20,40,.32);
          border:1px solid rgba(255,255,255,.7);
        }
        .training-price-head{
          padding:18px 18px 15px;
          color:#fff;
          background:linear-gradient(145deg,#075c87,#087f82);
          text-align:center;
        }
        .training-price-head .price-icon{
          width:48px;height:48px;margin:0 auto 7px;
          border-radius:50%;display:grid;place-items:center;
          background:rgba(255,255,255,.16);
          border:1px solid rgba(255,255,255,.34);
          font-size:26px;
        }
        .training-price-head small{font-size:9px;letter-spacing:1.4px;opacity:.88}
        .training-price-head h3{margin:3px 0 0;font-size:21px}
        .training-price-body{padding:16px}
        .price-total-card{
          background:#eef8fc;border:1px solid #c9e3ed;
          border-radius:15px;padding:12px;text-align:center;
        }
        .price-total-card small{display:block;font-size:9px;color:#69818e}
        .price-total-card strong{display:block;font-size:25px;color:#075d86;margin-top:2px}
        .price-breakdown{
          margin-top:10px;border:1px solid #dbe8ed;border-radius:13px;overflow:hidden;
        }
        .price-breakdown-row{
          display:flex;justify-content:space-between;gap:12px;
          padding:9px 11px;font-size:11px;color:#385565;
          border-bottom:1px solid #e6eef1;
        }
        .price-breakdown-row:last-child{border-bottom:0}
        .price-breakdown-row b{color:#073e5b;text-align:right}
        .price-rental-note{
          margin-top:10px;padding:10px 11px;border-radius:12px;
          background:#fff7e8;border:1px solid #f3d69b;
          color:#72551b;font-size:10px;line-height:1.4;
        }
        .training-price-actions{display:grid;grid-template-columns:.8fr 1.2fr;gap:8px;margin-top:13px}
        .training-price-actions button{
          min-height:42px;border-radius:12px;font-weight:850;cursor:pointer;
        }
        .price-back-btn{border:1px solid #cbdde5;background:#f5f9fb;color:#4c6674}
        .price-continue-btn{border:0;background:linear-gradient(145deg,#138ee4,#087a82);color:#fff}

        /* PRIVATE = ALUR SAMA DENGAN GROUP */
        .private-request-modern .private-request-head{
          background:linear-gradient(145deg,#075c87,#087f82)!important;
          color:#fff!important;
          border-radius:16px!important;
          padding:13px!important;
        }
        .private-request-modern .private-request-intro{
          background:#eef8fc!important;
          border:1px solid #cce6ef!important;
          border-radius:12px!important;
          padding:10px!important;
          color:#365b6b!important;
          line-height:1.4!important;
        }
        .private-request-modern .schedule-grid{
          margin-top:10px!important;
        }
        .private-request-modern .schedule-card{
          background:#fff!important;
          border:1px solid #d6e7ee!important;
          border-radius:15px!important;
          box-shadow:0 6px 16px rgba(7,67,99,.08)!important;
        }

        /* PRIVATE dibuat dengan struktur visual yang sama seperti GROUP */
        .private-same-as-group .group-package-picker{
          margin-bottom:12px!important;
        }
        .private-same-as-group .schedule-grid{
          margin-top:10px!important;
        }

      `}</style>

      {pricePopup && (() => {
        const isGroup = pricePopup.type === "Group";
        const size = Number(pricePopup.size || 0);
        const coachFee = isGroup ? 300000 : 350000;
        const perPerson = isGroup && size ? Math.ceil(coachFee / size) : coachFee;
        const rupiah = n => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
        return (
          <div className="training-price-overlay" onClick={()=>setPricePopup(null)}>
            <div className="training-price-modal" onClick={e=>e.stopPropagation()}>
              <div className="training-price-head">
                <div className="price-icon">{isGroup ? "👥" : "🏓"}</div>
                <small>INFORMASI BIAYA LATIHAN</small>
                <h3>{isGroup ? (size ? `Group ${size} Orang` : "Latihan Group") : "Latihan Private"}</h3>
              </div>

              <div className="training-price-body">
                {isGroup && !size ? (
                  <>
                    <div style={{fontSize:12,fontWeight:900,color:"#123e57",marginBottom:9}}>Pilih jumlah peserta:</div>
                    <div className="group-package-grid">
                      {[3,4,6].map(n=>(
                        <button key={n} type="button" onClick={()=>{setSelectedGroupSize(n);setPricePopup({type:"Group",size:n});}}>
                          <span className="group-people-icon">👥</span>
                          <strong>{n} Orang</strong>
                          <small>{n===3?"Lebih intensif":n===4?"Seimbang":"Lebih hemat"}</small>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="price-total-card">
                      <small>{isGroup ? "BIAYA PELATIH / SESI" : "BIAYA PRIVATE / SESI"}</small>
                      <strong>{rupiah(coachFee)}</strong>
                    </div>

                    <div className="price-breakdown">
                      {isGroup ? <>
                        <div className="price-breakdown-row"><span>Jumlah peserta</span><b>{size} orang</b></div>
                        <div className="price-breakdown-row"><span>Biaya pelatih</span><b>{rupiah(coachFee)}</b></div>
                        <div className="price-breakdown-row"><span>Biaya per orang</span><b>{rupiah(perPerson)} / orang</b></div>
                      </> : <>
                        <div className="price-breakdown-row"><span>Peserta</span><b>1 orang</b></div>
                        <div className="price-breakdown-row"><span>Biaya pelatih</span><b>{rupiah(coachFee)} / sesi</b></div>
                      </>}
                    </div>

                    <div className="price-rental-note">
                      <strong>🏓 Belum termasuk biaya sewa lapangan/meja.</strong><br/>
                      {isGroup
                        ? `Biaya sewa lapangan/meja dibagi rata kepada ${size} peserta.`
                        : "Biaya sewa lapangan/meja dibayarkan terpisah oleh peserta."}
                    </div>

                    <div className="training-price-actions">
                      <button className="price-back-btn" type="button" onClick={()=>{
                        if(isGroup) setPricePopup({type:"Group",size:null});
                        else setPricePopup(null);
                      }}>{isGroup ? "Kembali" : "Tutup"}</button>
                      <button className="price-continue-btn" type="button" onClick={()=>{
                        setRegistrationProgram(isGroup ? "Group" : "Private");
                        if(isGroup) setSelectedGroupSize(size);
                        setPricePopup(null);
                        setPage("pendaftaran");
                        window.scrollTo(0,0);
                      }}>Lanjut Pilih Jadwal</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {page === "admin" && (

        <main className="content admin-compact" style={{maxWidth:1000,margin:"10px auto",padding:"12px",background:"linear-gradient(180deg,#dce8ed 0%,#eef4f6 48%,#d7e5eb 100%)",borderRadius:14}}>

          {!authReady ? <p>Memeriksa akun...</p> : !isPelatih ? <p>Akses khusus pelatih. <button onClick={()=>setPage("login")}>Login</button></p> : <>

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <div>
                <h2 style={{marginBottom:2}}>Ruang Pelatih</h2>
                <div style={{fontSize:11,color:"#607d8b"}}>Pilih menu yang ingin dikelola.</div>
              </div>
              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                {coachMenu!=="home" && <button type="button" className="back-button" onClick={()=>{setCoachMenu("home");window.scrollTo(0,0);}}>← Ruang Pelatih</button>}
                <button className="back-button" onClick={logoutPelatih}>Logout</button>
              </div>
            </div>

            {coachMenu==="home" && (
              <section style={{margin:"14px 0",padding:14,background:"rgba(255,255,255,.82)",border:"1px solid #b9d0da",borderRadius:14}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
                  {[
                    ["schedule","📅","Tambah Jadwal","Buat jadwal Group atau Private"],
                    ["cost","💰","Pengaturan Biaya Latihan","Atur biaya coach dan sewa meja"],
                    ["participants","👥","Daftar Peserta","Data member dan pembayaran"],
                    ["private","💬","Pendaftaran Private","Buka dan balas permintaan Private"],
                    ["news","📰","Kelola Berita Tenis Meja","Tambah, edit dan terbitkan berita"],
                    ["scheduleList","📋","Daftar Jadwal","Kelola jadwal yang sudah dibuat"],
                    ["visitors","👁","Statistik Kunjungan","Lihat jumlah kunjungan situs"]
                  ].map(([key,icon,title,desc])=>(
                    <button key={key} type="button" onClick={()=>{setCoachMenu(key);window.scrollTo(0,0);}}
                      style={{minHeight:108,padding:"12px 8px",border:"1px solid #b9d0da",borderRadius:13,background:"linear-gradient(145deg,#ffffff,#edf5f7)",boxShadow:"0 5px 14px rgba(0,43,64,.07)",cursor:"pointer",textAlign:"center"}}>
                      <div style={{fontSize:28,lineHeight:1}}>{icon}</div>
                      <div style={{fontSize:13,fontWeight:900,color:"#073b55",marginTop:7}}>{title}</div>
                      <div style={{fontSize:10,color:"#607d8b",lineHeight:1.3,marginTop:3}}>{desc}</div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {coachMenu==="visitors" && (
              <section className="visitor-settings-panel">
                <h3>👁 Statistik & Mode Pengunjung</h3>
                <p className="visitor-settings-lead">Pilih angka yang ingin ditampilkan di halaman depan.</p>
                <div className="visitor-mode-grid">
                  <button type="button" className={visitorMode==="visits"?"active":""}
                    onClick={()=>{setVisitorMode("visits");localStorage.setItem("pingtrn_visitor_mode","visits");}}>
                    <span>🔄</span><strong>Per Kunjungan</strong>
                    <small>Setiap situs dibuka / reload dihitung.</small>
                    <b>{visitorCount.toLocaleString("id-ID")}</b>
                  </button>
                  <button type="button" className={visitorMode==="devices"?"active":""}
                    onClick={()=>{setVisitorMode("devices");localStorage.setItem("pingtrn_visitor_mode","devices");}}>
                    <span>📱</span><strong>Per Perangkat</strong>
                    <small>Satu browser/perangkat dihitung satu kali.</small>
                    <b>{deviceVisitorCount.toLocaleString("id-ID")}</b>
                  </button>
                </div>
                <div className="visitor-mode-note">
                  Mode aktif: <strong>{visitorMode==="visits"?"Per Kunjungan":"Per Perangkat"}</strong>. Angka di halaman depan otomatis mengikuti pilihan ini.
                </div>
              </section>
            )}

            {coachMenu==="cost" && (
              <section style={{margin:"14px 0",padding:14,background:"rgba(255,255,255,.84)",border:"1px solid #b9d0da",borderRadius:12}}>
                <h3 style={{marginTop:0}}>💰 Pengaturan Biaya Latihan</h3>
                <div className="form-group"><label>Jenis Latihan</label>
                  <select value={scheduleForm.type} onChange={e=>setScheduleForm(p=>({...p,type:e.target.value,coach_rate:e.target.value==="Private"?350000:300000}))}>
                    <option>Group</option><option>Private</option>
                  </select>
                </div>
                <div className="form-group"><label>Rate Coach / Sesi</label>
                  <input inputMode="numeric" value={angkaRupiah(scheduleForm.coach_rate)} onChange={e=>setScheduleForm(p=>({...p,coach_rate:bacaRupiah(e.target.value)}))}/>
                </div>
                <div className="form-group"><label>Sewa Meja / Jam</label>
                  <input inputMode="numeric" value={angkaRupiah(scheduleForm.rental_rate_per_hour)} onChange={e=>setScheduleForm(p=>({...p,rental_rate_per_hour:bacaRupiah(e.target.value)}))}/>
                </div>
                <div style={{fontSize:12,color:"#526b78",background:"#edf5f7",padding:10,borderRadius:9}}>Nilai ini akan dibawa ke form Tambah Jadwal dan masih dapat disesuaikan untuk setiap jadwal.</div>
                <button type="button" className="register-submit" onClick={()=>{setCoachMenu("schedule");window.scrollTo(0,0);}}>Lanjut ke Tambah Jadwal</button>
              </section>
            )}

            {coachMenu==="schedule" && (<>
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
              <div className="form-group"><label>Jenis Latihan</label><select value={scheduleForm.type} onChange={e=>setScheduleForm(p=>({...p,type:e.target.value,coach_rate:e.target.value==="Private"?350000:300000,quota:e.target.value==="Private"?1:4,min_participants:e.target.value==="Private"?1:4}))}><option value="Group">Group</option><option value="Private">Private (1 Orang)</option></select></div>
              {scheduleForm.type==="Group" ? <div className="form-group">
                <label>Kapasitas Group</label>
                <select value={Number(scheduleForm.quota||4)} onChange={e=>setScheduleForm(p=>({...p,quota:Number(e.target.value),min_participants:Number(e.target.value)}))}>
                  <option value={3}>Group 3 Orang</option><option value={4}>Group 4 Orang</option><option value={6}>Group 6 Orang</option>
                </select>
                <p style={{fontSize:12,color:"#64748b",margin:"5px 0 0"}}>Pilih kapasitas untuk jadwal ini.</p>
              </div> : <p>Kapasitas: 1 orang (Private)</p>}

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
            </>)}

            {coachMenu==="participants" && (<>
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
            </>)}

            {coachMenu==="private" && (<>
              <section style={{marginTop:16,background:"#fff",border:"1px solid #d7e3e8",borderRadius:12,padding:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <h3 style={{margin:0}}>💬 Pendaftaran Private</h3>
                  <button type="button" className="back-button" onClick={loadPrivateRequests}>Refresh</button>
                </div>
                <p style={{fontSize:12,color:"#64748b"}}>Percakapan ini hanya untuk calon member Private dan Coach, bukan Chat Publik.</p>
                {loadingPrivateRequests ? <p>Memuat...</p> : privateRequests.length===0 ? <p style={{fontSize:12}}>Belum ada pengajuan Private.</p> :
                  <div style={{display:"grid",gap:8}}>
                    {privateRequests.map(r=><div key={r.id} style={{border:"1px solid #dbe5ed",borderRadius:10,padding:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
                        <strong>{r.name}</strong><span style={{fontSize:11,color:"#087b72",fontWeight:800}}>{r.status}</span>
                      </div>
                      <div style={{fontSize:12,color:"#526b78",marginTop:4}}>{r.member_note || "Pendaftaran Private"}</div>
                      <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:8}}>
                        <button type="button" className="back-button" onClick={async()=>{setPrivateThreadId(r.id);await loadPrivateThread(r.id);}}>Buka & Balas</button>
                        <button type="button" className="back-button" onClick={()=>coachSiapkanJadwalPrivate(r)}>Buat Jadwal Private</button>
                      </div>
                    </div>)}
                  </div>}
                {privateThreadId && <div style={{marginTop:12,borderTop:"1px solid #dbe5ed",paddingTop:12}}>
                  <div style={{fontWeight:900,marginBottom:8}}>Percakapan</div>
                  <div style={{background:"#eef4f6",borderRadius:12,padding:10,maxHeight:280,overflowY:"auto",display:"grid",gap:8}}>
                    {privateThreadMessages.map(m=><div key={m.id} style={{maxWidth:"86%",justifySelf:m.sender_type==="coach"?"end":"start",background:m.sender_type==="coach"?"#d8f4e8":"#fff",border:"1px solid #d6e1e6",borderRadius:12,padding:"8px 10px"}}>
                      <div style={{fontSize:10,fontWeight:900,color:"#087b72"}}>{m.sender_type==="coach"?"Coach":m.sender_name}</div>
                      <div style={{fontSize:13,whiteSpace:"pre-wrap"}}>{m.message}</div>
                    </div>)}
                  </div>
                  <div style={{display:"flex",gap:7,marginTop:8}}>
                    <input value={privateReplyText} onChange={e=>setPrivateReplyText(e.target.value)} placeholder="Balas pengajuan Private..." style={{flex:1,padding:10,border:"1px solid #b8cbd5",borderRadius:9}}/>
                    <button type="button" className="register-submit" style={{width:"auto"}} disabled={privateRequestBusy} onClick={()=>kirimPesanPrivate("coach","Coach Teguh")}>Kirim</button>
                  </div>
                </div>}
              </section>
            </>)}

            {coachMenu==="news" && (<>
              <section style={{margin:"14px 0",padding:12,background:"rgba(255,255,255,.84)",border:"1px solid #b9d0da",borderRadius:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <h3 style={{margin:0}}>📰 Kelola Berita Tenis Meja</h3>
                  <button type="button" onClick={loadNews} style={{border:"1px solid #9fb8c2",background:"#fff",borderRadius:8,padding:"6px 10px",cursor:"pointer"}}>↻ Refresh</button>
                </div>

                <form onSubmit={saveNews} style={{marginTop:10,padding:10,borderRadius:10,background:"#edf5f7"}}>
                  <div className="form-group"><label>Judul Berita</label><input value={newsForm.title} onChange={e=>setNewsForm(p=>({...p,title:e.target.value}))} placeholder="Contoh: Turnamen Tenis Meja JIEP Sports" required /></div>
                  <div className="form-group"><label>Kategori</label><input value={newsForm.category} onChange={e=>setNewsForm(p=>({...p,category:e.target.value}))} placeholder="Berita Tenis Meja" /></div>
                  <div className="form-group">
                    <label>Foto Berita (opsional)</label>
                    <input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0]; if(f) uploadNewsImage(f); e.target.value="";}} />
                    <p style={{fontSize:11,color:"#607d8b",margin:"4px 0"}}>{uploadingNewsImage ? "⏳ Mengupload foto..." : "Pilih foto dari HP atau laptop. Maksimal 8 MB."}</p>
                    {newsForm.image_url && <div style={{marginTop:7}}>
                      <img src={newsForm.image_url} alt="Preview berita" style={{width:"100%",maxWidth:320,maxHeight:190,objectFit:"cover",borderRadius:9,border:"1px solid #c7d7de"}} />
                      <div><button type="button" onClick={()=>setNewsForm(p=>({...p,image_url:""}))} style={{marginTop:5,border:"1px solid #e6a5a5",background:"#fff5f5",color:"#b42318",borderRadius:7,padding:"5px 9px",cursor:"pointer"}}>Hapus Foto dari Berita</button></div>
                    </div>}
                  </div>
                  <div className="form-group"><label>Isi Berita</label><textarea value={newsForm.content} onChange={e=>setNewsForm(p=>({...p,content:e.target.value}))} rows="5" required style={{width:"100%",boxSizing:"border-box",padding:9,border:"1px solid #b7cbd3",borderRadius:8,resize:"vertical"}} /></div>
                  <label style={{display:"flex",alignItems:"center",gap:7,fontSize:12,margin:"7px 0"}}><input type="checkbox" checked={newsForm.is_published} onChange={e=>setNewsForm(p=>({...p,is_published:e.target.checked}))}/> Tampilkan ke publik</label>
                  <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                    <button type="submit" className="register-submit" disabled={savingNews || uploadingNewsImage} style={{width:"auto"}}>{uploadingNewsImage ? "Upload Foto..." : savingNews ? "Menyimpan..." : editNewsId ? "Simpan Perubahan" : "Terbitkan Berita"}</button>
                    {editNewsId && <button type="button" onClick={()=>{setEditNewsId(null);setNewsForm({title:"",category:"Berita Tenis Meja",image_url:"",content:"",is_published:true});}} style={{border:"1px solid #9fb8c2",background:"#fff",borderRadius:8,padding:"7px 11px",cursor:"pointer"}}>Batal Edit</button>}
                  </div>
                </form>

                <div style={{marginTop:10,display:"grid",gap:7}}>
                  {loadingNews ? <div style={{fontSize:12,color:"#607d8b"}}>Memuat berita...</div> :
                   newsList.length===0 ? <div style={{fontSize:12,color:"#607d8b"}}>Belum ada berita.</div> :
                   newsList.map(n=><div key={n.id} style={{padding:9,border:"1px solid #c9d9df",borderRadius:9,background:"#fff",display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}>
                     <div style={{minWidth:0}}>
                       <div style={{fontSize:10,color:"#087b72",fontWeight:800}}>{n.category || "Berita Tenis Meja"} • {n.is_published===false ? "Draft" : "Tayang"}</div>
                       <strong style={{fontSize:12,color:"#073b55"}}>{n.title}</strong>
                     </div>
                     <div style={{display:"flex",gap:5,flexShrink:0}}>
                       <button type="button" onClick={()=>editNews(n)} style={{border:"1px solid #9fb8c2",background:"#fff",borderRadius:7,padding:"5px 8px",fontSize:10,cursor:"pointer"}}>Edit</button>
                       <button type="button" onClick={()=>deleteNews(n)} style={{border:"1px solid #e6a5a5",background:"#fff5f5",color:"#b42318",borderRadius:7,padding:"5px 8px",fontSize:10,cursor:"pointer"}}>Hapus</button>
                     </div>
                   </div>)}
                </div>
              </section>
            </>)}

            {coachMenu==="scheduleList" && (<>
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
                              <button type="button" className="back-button" onClick={()=>deleteSchedule(item)} style={{borderColor:"#b42318",color:"#b42318"}}>Hapus Jadwal</button>
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
            </>)}

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
              <div className="hero-label modern-hero-label">PROGRAM LATIHAN TENIS MEJA</div>
              <div className="hero-copy-card">
                <h2 className="modern-hero-title">Latihan<br/>Lebih Teratur,<br/><span>Progress<br/>Lebih Terukur</span></h2>
                <div className="modern-hero-sub">Bersama Coach Profesional<br/>untuk Semua Level Pemain</div>
              </div>
              <div className="hero-feature-row hero-feature-row-bottom">
                <div><span>📅</span><b>Jadwal</b><small>Terstruktur</small></div>
                <div><span>📈</span><b>Progress</b><small>Terpantau</small></div>
                <div><span>🏓</span><b>Coach</b><small>Profesional</small></div>
              </div>

            </div>
          </section>

          <section className="quick-actions home-modern-actions">
            <div className="home-modern-actions-grid">
              <button className="home-modern-action group-card" type="button" onClick={()=>setPricePopup({type:"Group",size:null})}>
                <span className="home-modern-action-icon">👥</span>
                <span className="home-modern-action-copy">
                  <strong>Latihan Group</strong>
                  <small>Pilih paket & jadwal latihan</small>
                </span>
                <span className="home-modern-action-arrow">›</span>
              </button>

              <button className="home-modern-action private-card" type="button" onClick={()=>setPricePopup({type:"Private",size:1})}>
                <span className="home-modern-action-icon">🏓</span>
                <span className="home-modern-action-copy">
                  <strong>Latihan Private</strong>
                  <small>Lebih fokus bersama Coach</small>
                </span>
                <span className="home-modern-action-arrow">›</span>
              </button>

              <button className="home-modern-action schedule-card-home" type="button" onClick={()=>setPage("jadwal")}>
                <span className="home-modern-action-icon">📅</span>
                <span className="home-modern-action-copy">
                  <strong>Daftar Jadwal</strong>
                  <small>Lihat hari & jam tersedia</small>
                </span>
                <span className="home-modern-action-arrow">›</span>
              </button>

              <button className="home-modern-action payment-card" type="button" onClick={()=>setPage("pembayaran")}>
                <span className="home-modern-action-icon">💳</span>
                <span className="home-modern-action-copy">
                  <strong>Pembayaran</strong>
                  <small>Info biaya & pembayaran</small>
                </span>
                <span className="home-modern-action-arrow">›</span>
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
        </>

      )}



      {/* =====================================================

          FORM PENDAFTARAN

      ===================================================== */}




      {page === "pendaftaran" && (
        <main style={{background:"#dfe9ef",minHeight:"75vh",padding:"28px 18px"}}>
          <div style={{maxWidth:1050,margin:"0 auto"}}>
            <button className="back-button" onClick={()=>setPage("home")}>← Home</button>
            <div style={{textAlign:"center",margin:"10px 0 16px"}}>
              <div style={{letterSpacing:3,color:"#079f79",fontWeight:700,fontSize:13}}>PENDAFTARAN LATIHAN</div>
              <h2 style={{fontSize:30,margin:"8px 0"}}>Pilih Program Latihan</h2>
            </div>
            {registrationProgram==="Group" && (
              <section className="direct-program-head group-direct-head">
                <div className="direct-program-icon">👥</div>
                <div>
                  <small>PROGRAM LATIHAN</small>
                  <h3>Latihan Group</h3>
                  <p>Pilih jadwal dan paket Group yang tersedia.</p>
                </div>
              </section>
            )}
            {registrationProgram==="Private" && (
              <section className="direct-program-head private-direct-head">
                <div className="direct-program-icon">🏓</div>
                <div>
                  <small>PRIVATE TRAINING</small>
                  <h3>Latihan Private</h3>
                  <p>Pilih program latihan, lalu pilih hari dan jadwal Private yang sudah dibuat Coach.</p>
                </div>
              </section>
            )}

            {registrationProgram==="Group" ? <>
              <section className="group-package-picker">
                <div className="group-package-title">Pilih Jumlah Peserta</div>
                <div className="group-package-grid">
                  {[
                    [3,"3 Orang","Lebih intensif"],
                    [4,"4 Orang","Seimbang"],
                    [6,"6 Orang","Lebih hemat"]
                  ].map(([size,label,desc])=>
                    <button key={size} type="button"
                      className={selectedGroupSize===size?"active":""}
                      onClick={()=>{setSelectedGroupSize(size);setPricePopup({type:"Group",size});}}>
                      <span className="group-people-icon">👥</span>
                      <strong>{label}</strong>
                      <small>{desc}</small>
                      <span className="group-check">{selectedGroupSize===size?"✓":""}</span>
                    </button>
                  )}
                </div>
              </section>
              <div className="day-filter">{days.map(day=><button key={day} className={selectedDay===day?"active":""} onClick={()=>setSelectedDay(day)}>{day}</button>)}</div>
              <div className="schedule-grid">
                {filteredSchedules.filter(item=>item.type==="Group" && Number(item.quota)===Number(selectedGroupSize)).length===0 ? <div style={{textAlign:"center",gridColumn:"1/-1",background:"#fff",padding:20,borderRadius:14}}>Belum ada jadwal Group {selectedGroupSize} orang tersedia.</div> :
                  filteredSchedules.filter(item=>item.type==="Group" && Number(item.quota)===Number(selectedGroupSize)).map(item=><div className="schedule-card" key={item.id}>
                    <div className="schedule-top"><span className="day">{item.day}</span><span className="time">{item.time}</span></div>
                    <div className="coach">GRUP • {item.registered}/{item.quota} peserta</div>
                    <button className="choose-btn" disabled={!item.available} onClick={()=>chooseSchedule(item)}>{item.available?"Pilih Group & Daftar":"Penuh / Ditutup"}</button>
                  </div>)}
              </div>
            </> : <>
              <section className="private-same-as-group">
                <section className="group-package-picker">
                  <div className="group-package-title">Pilih Program Private</div>
                  <select
                    value={privateProgram}
                    onChange={e=>setPrivateProgram(e.target.value)}
                    style={{width:"100%",padding:"11px 12px",borderRadius:12,border:"1px solid #c8dce5",background:"#fff",fontWeight:800,color:"#153f55"}}
                  >
                    <option>Teknik Dasar</option>
                    <option>Spin Bola Kosong</option>
                    <option>Spin Bola Isi</option>
                    <option>Teknik Block & Defend</option>
                    <option>Menghadapi Pemain Bintik</option>
                    <option>Persiapan Turnamen</option>
                    <option>Program Khusus</option>
                  </select>
                </section>

                <div className="day-filter">
                  {days.map(day=><button key={day} className={selectedDay===day?"active":""} onClick={()=>setSelectedDay(day)}>{day}</button>)}
                </div>

                <div className="schedule-grid">
                  {filteredSchedules.filter(item=>item.type==="Private").length===0 ? (
                    <div style={{textAlign:"center",gridColumn:"1/-1",background:"#fff",padding:20,borderRadius:14}}>
                      Belum ada jadwal Private tersedia.
                    </div>
                  ) : filteredSchedules.filter(item=>item.type==="Private").map(item=>(
                    <div className="schedule-card" key={item.id}>
                      <div className="schedule-top">
                        <span className="day">{item.day}</span>
                        <span className="time">{item.time}</span>
                      </div>
                      <div className="coach">PRIVATE • {item.registered}/1 peserta</div>
                      <button
                        className="choose-btn"
                        disabled={!item.available}
                        onClick={()=>{
                          setRegistrationProgram("Private");
                          chooseSchedule(item);
                        }}
                      >
                        {item.available?"Pilih Private & Daftar":"Penuh / Ditutup"}
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="back-button"
                  style={{width:"100%",marginTop:10}}
                  onClick={()=>window.open("https://wa.me/6285814466929","_blank","noopener,noreferrer")}
                >
                  💬 Hubungi Coach via WhatsApp
                </button>
              </section>
            </>}
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

      {page === "news" && (
        <main style={{background:"linear-gradient(180deg,#dbe8ed,#eef4f6,#d4e4ea)",minHeight:"75vh",padding:"14px 10px 24px"}}>
          <div style={{maxWidth:900,margin:"0 auto"}}>
            <button className="back-button" onClick={()=>{setSelectedNews(null);setPage("home");}}>← Home</button>
            <div style={{textAlign:"center",margin:"7px 0 14px"}}>
              <div style={{fontSize:30}}>📰</div>
              <h2 style={{margin:"2px 0",color:"#073b55"}}>Berita Tenis Meja</h2>
              <p style={{fontSize:12,color:"#607d8b",margin:0}}>Informasi, kegiatan, turnamen dan kabar tenis meja.</p>
            </div>

            {selectedNews ? (
              <article style={{background:"#fff",border:"1px solid #bfd3dc",borderRadius:15,overflow:"hidden",boxShadow:"0 7px 20px rgba(20,55,75,.10)"}}>
                {selectedNews.image_url && <img src={selectedNews.image_url} alt={selectedNews.title} style={{display:"block",width:"100%",maxHeight:430,objectFit:"cover"}} onError={e=>{e.currentTarget.style.display="none";}} />}
                <div style={{padding:"16px 15px 20px"}}>
                  <button type="button" onClick={()=>setSelectedNews(null)} style={{border:0,background:"transparent",color:"#087b72",fontWeight:800,padding:0,cursor:"pointer"}}>← Daftar Berita</button>
                  <div style={{fontSize:10,fontWeight:900,color:"#087b72",marginTop:12}}>{selectedNews.category || "Berita Tenis Meja"}</div>
                  <h2 style={{color:"#073b55",margin:"5px 0 4px",lineHeight:1.2}}>{selectedNews.title}</h2>
                  <div style={{fontSize:10,color:"#78909c",marginBottom:13}}>{selectedNews.published_at ? new Date(selectedNews.published_at).toLocaleString("id-ID",{day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}) : ""}</div>
                  <div style={{fontSize:14,color:"#243b4a",lineHeight:1.65,whiteSpace:"pre-wrap",textAlign:"left"}}>{selectedNews.content}</div>
                </div>
              </article>
            ) : loadingNews ? (
              <div style={{textAlign:"center",padding:30,color:"#607d8b"}}>⏳ Memuat berita...</div>
            ) : newsList.length===0 ? (
              <section style={{background:"#fff",border:"1px solid #bfd3dc",borderRadius:14,padding:28,textAlign:"center",color:"#64748b"}}>Belum ada berita yang diterbitkan.</section>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:12}}>
                {newsList.map(n=><article key={n.id} onClick={()=>{setSelectedNews(n);window.scrollTo(0,0);}} style={{background:"#fff",border:"1px solid #bfd3dc",borderRadius:14,overflow:"hidden",boxShadow:"0 6px 17px rgba(20,55,75,.08)",cursor:"pointer"}}>
                  {n.image_url ? <img src={n.image_url} alt="" style={{display:"block",width:"100%",height:150,objectFit:"cover"}} onError={e=>{e.currentTarget.style.display="none";}} /> : <div style={{height:90,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,background:"linear-gradient(135deg,#0b6681,#073b55)"}}>🏓</div>}
                  <div style={{padding:12}}>
                    <div style={{fontSize:10,fontWeight:900,color:"#087b72"}}>{n.category || "Berita Tenis Meja"}</div>
                    <h3 style={{fontSize:15,margin:"4px 0",color:"#073b55",lineHeight:1.25}}>{n.title}</h3>
                    <p style={{fontSize:11,color:"#64748b",margin:"5px 0",lineHeight:1.45}}>{String(n.content||"").slice(0,120)}{String(n.content||"").length>120?"...":""}</p>
                    <div style={{fontSize:10,fontWeight:800,color:"#087b72"}}>Baca selengkapnya →</div>
                  </div>
                </article>)}
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

      {["home","pendaftaran","jadwal","pembayaran","program","progress","video","news","chat"].includes(page) && (
        <nav className="bottom-nav modern-bottom-nav">
          {[
            ["home","⌂","Home"],["progress","📈","Progress"],["video","▶️","Video"],["sk","S&K","S&K"],["news","📰","Berita"],["chat","💬","Chat"]
          ].map(([key,ic,label])=><button key={key} type="button" onClick={()=>key === "sk" ? setShowTerms(true) : setPage(key)}
            className={`modern-bottom-item ${page===key?"active":""}`}>
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

      {page === "home" && (
        <div
          className="home-visitor-compact"
          style={{
            background:"#061a3a",
            color:"#ffffff",
            padding:"7px 10px 2px",
            fontSize:11,
            fontWeight:400,
            lineHeight:1.2,
            textAlign:"right",
            display:"flex",
            justifyContent:"flex-end",
            alignItems:"center",
            width:"100%",
            boxSizing:"border-box",
            textShadow:"0 1px 3px rgba(0,0,0,.65)"
          }}
        >
          👁 {visitorMode==="visits"?"Kunjungan":"Pengunjung"}: {(visitorMode==="visits"?visitorCount:deviceVisitorCount).toLocaleString("id-ID")}
        </div>
      )}


      {showQrPopup && (
        <div
          onClick={() => setShowQrPopup(false)}
          style={{
            position:"fixed", inset:0, zIndex:10003,
            background:"rgba(0,0,0,.68)",
            display:"flex", alignItems:"center", justifyContent:"center",
            padding:18
          }}
        >
          <section
            onClick={(e)=>e.stopPropagation()}
            style={{
              width:"min(92vw,360px)",
              background:"#fff",
              color:"#102a3a",
              borderRadius:20,
              padding:"18px 16px 14px",
              textAlign:"center",
              boxShadow:"0 20px 60px rgba(0,0,0,.45)"
            }}
          >
            <h2 style={{margin:"0 0 4px",fontSize:19}}>PINGPONG TRAINING</h2>
            <div style={{fontSize:12,opacity:.72,marginBottom:12}}>Scan QR untuk membuka aplikasi</div>

            <img
              src={qrPingpongTraining}
              alt="QR PINGPONG TRAINING besar"
              style={{
                width:"min(72vw,270px)",
                height:"min(72vw,270px)",
                objectFit:"contain",
                display:"block",
                margin:"0 auto",
                background:"#fff",
                padding:5,
                borderRadius:10
              }}
            />

            <div style={{fontSize:11,opacity:.7,marginTop:8}}>
              Arahkan kamera HP lain ke QR di atas
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
              <button
                type="button"
                onClick={async ()=>{
                  const link = "https://pingpong-training.vercel.app";
                  try {
                    await navigator.clipboard.writeText(link);
                    alert("✓ Link berhasil disalin");
                  } catch {
                    window.prompt("Salin link PINGPONG TRAINING:", link);
                  }
                }}
                style={{
                  border:0,borderRadius:10,padding:"10px 8px",
                  background:"#087b72",color:"#fff",fontWeight:900,cursor:"pointer"
                }}
              >
                Salin Link
              </button>
              <button
                type="button"
                onClick={()=>setShowQrPopup(false)}
                style={{
                  border:"1px solid #b9c7cc",borderRadius:10,padding:"10px 8px",
                  background:"#eef3f5",color:"#17394a",fontWeight:900,cursor:"pointer"
                }}
              >
                Tutup
              </button>
            </div>
          </section>
        </div>
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

      {migrationMember && (()=>{
        const asal=schedules.find(s=>String(s.id)===String(migrationMember.schedule_id));
        const kandidat=schedules.filter(s=>String(s.id)!==String(migrationMember.schedule_id) && (!asal||s.type===asal.type) && s.activeRaw && !s.registrationClosed && jumlahPesertaJadwal(s.id)<Number(s.quota||1));
        return <div onClick={()=>setMigrationMember(null)} style={{position:"fixed",inset:0,zIndex:10002,background:"rgba(0,0,0,.58)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <section onClick={e=>e.stopPropagation()} style={{width:"min(94vw,480px)",background:"#f5f8fa",color:"#102a3a",borderRadius:18,padding:16,boxShadow:"0 20px 60px rgba(0,0,0,.38)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3 style={{margin:0}}>⇄ Migrasi Member</h3><button type="button" onClick={()=>setMigrationMember(null)} style={{width:31,height:31,borderRadius:8,border:"1px solid #abc",background:"#fff"}}>×</button></div>
            <p style={{fontSize:12,color:"#607583"}}>Pindahkan <strong>{migrationMember.name}</strong> tanpa daftar ulang.</p>
            <div style={{background:"#e9f4f8",borderRadius:11,padding:10,fontSize:12,marginBottom:10}}><small>JADWAL SEKARANG</small><br/><strong>{asal?`${asal.type}${asal.type==="Group"?` ${asal.quota} orang`:""} • ${asal.day}, ${asal.time}`:"Tidak ditemukan"}</strong></div>
            <label style={{display:"block",fontWeight:850,fontSize:12,marginBottom:5}}>Jadwal Tujuan</label>
            <select value={migrationTargetId} onChange={e=>setMigrationTargetId(e.target.value)} style={{width:"100%",padding:11,border:"1px solid #a9c3cf",borderRadius:10}}>
              <option value="">-- Pilih jadwal yang tersedia --</option>
              {kandidat.map(s=><option key={s.id} value={s.id}>{s.type}{s.type==="Group"?` ${s.quota} orang`:""} — {s.day}, {s.time} — {jumlahPesertaJadwal(s.id)}/{s.quota}</option>)}
            </select>
            {kandidat.length===0&&<p style={{fontSize:11,color:"#b45309",background:"#fff7e8",padding:8,borderRadius:9}}>Belum ada jadwal tujuan yang memiliki slot.</p>}
            <p style={{fontSize:10.5,color:"#64748b",lineHeight:1.4}}>Group bisa pindah ke Group 3, 4, atau 6 orang. Private pindah ke Private. Tagihan lama dikosongkan agar dihitung ulang sesuai jadwal baru.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:8,marginTop:12}}>
              <button type="button" onClick={()=>setMigrationMember(null)} style={{padding:10,borderRadius:10,border:"1px solid #abc",background:"#fff",fontWeight:800}}>Batal</button>
              <button type="button" disabled={!migrationTargetId||migrationBusy} onClick={konfirmasiMigrasiMember} style={{padding:10,borderRadius:10,border:0,background:"#08799a",color:"#fff",fontWeight:900,opacity:(!migrationTargetId||migrationBusy)?.55:1}}>{migrationBusy?"Memindahkan...":"Konfirmasi Pindah"}</button>
            </div>
          </section>
        </div>;
      })()}

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
              <div style={{display:"grid",gap:7,marginTop:12}}>
                <button type="button" onClick={()=>bukaMigrasiMember(participantPopup)} style={{width:"100%",padding:10,borderRadius:9,border:"1px solid #08799a",background:"#e8f6fb",color:"#07516d",fontWeight:900,cursor:"pointer"}}>⇄ Migrasi / Pindahkan Member</button>
                <button type="button" onClick={()=>batalkanPesertaCoach(participantPopup)} style={{width:"100%",padding:9,borderRadius:9,border:"1px solid #b42318",background:"#fff1f0",color:"#b42318",fontWeight:900,cursor:"pointer"}}>Batalkan Pendaftaran</button>
              </div>
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

                    ? "Terdaftar"

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



      <footer className="qr-footer-bottom home-footer-modern">
        <div className="home-footer-inner">
          <button type="button" className="home-footer-qr-btn" title="Klik untuk memperbesar QR PINGPONG TRAINING" aria-label="Perbesar QR PINGPONG TRAINING" onClick={() => setShowQrPopup(true)}>
            <img className="footer-qr" src={qrPingpongTraining} alt="QR PINGPONG TRAINING" />
          </button>
          <div className="home-footer-brand">
            <strong>PINGPONG TRAINING</strong>
            <span>Table Tennis Training Center</span>
            <small>Klik QR untuk memperbesar</small>
          </div>
          <div className="home-footer-contact">
            <span className="home-footer-phone-icon">☎</span>
            <span><small>Informasi Pelatihan / WhatsApp</small><strong>0858-1446-6929</strong></span>
          </div>
        </div>
      </footer>



    </div>

  );

}



export default App;