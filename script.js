const appConfig = {
  giftDateIndia: "2026-05-24T00:00:00+05:30",
  publicName: "Saumya",
  coupleNames: ["Aaditya", "Saumya"],
  adminEmails: ["achokshi15@gmail.com"],
  allowedEmails: ["achokshi15@gmail.com"],
  demoPasswords: {
    "achokshi15@gmail.com": "may24",
  },
  supabase: {
    url: "https://viszftpgdhzpwjlcjzgy.supabase.co",
    anonKey: "sb_publishable_D9X-HEwHsOd32-WagjeOJA_DxnL8LxH",
  },
  youtube: {
    apiKey: "AIzaSyByShQNsnRICxKz-xeZ2_BWkTZDe080RLg",
  },
  karaokeChallenges: [
    "BTS Round",
    "K-pop Round",
    "K-drama OST Round",
    "English Song Round",
    "Wildcard Round",
    "Saumya's Choice",
    "Aaditya's Challenge",
  ],
  karaokeSongs: [
    {
      id: "bts-spring-day",
      title: "Spring Day",
      artist: "BTS",
      challenge: "BTS Round",
      youtubeUrl: "https://www.youtube.com/results?search_query=BTS+Spring+Day+karaoke+version",
      lyricsUrl: "https://www.google.com/search?q=BTS+Spring+Day+lyrics",
      note: "Soft, emotional, very main-character ending scene.",
    },
    {
      id: "bts-dynamite",
      title: "Dynamite",
      artist: "BTS",
      challenge: "BTS Round",
      youtubeUrl: "https://www.youtube.com/results?search_query=BTS+Dynamite+karaoke+version",
      lyricsUrl: "https://www.google.com/search?q=BTS+Dynamite+lyrics",
      note: "Energy round. Extra points for confidence.",
    },
    {
      id: "iu-love-poem",
      title: "Love Poem",
      artist: "IU",
      challenge: "K-pop Round",
      youtubeUrl: "https://www.youtube.com/results?search_query=IU+Love+Poem+karaoke+version",
      lyricsUrl: "https://www.google.com/search?q=IU+Love+Poem+lyrics",
      note: "For the dramatic vocalist round.",
    },
    {
      id: "stay-with-me",
      title: "Stay With Me",
      artist: "Chanyeol, Punch",
      challenge: "K-drama OST Round",
      youtubeUrl: "https://www.youtube.com/results?search_query=Stay+With+Me+Chanyeol+Punch+karaoke+version",
      lyricsUrl: "https://www.google.com/search?q=Stay+With+Me+Chanyeol+Punch+lyrics",
      note: "K-drama OST mode.",
    },
    {
      id: "perfect",
      title: "Perfect",
      artist: "Ed Sheeran",
      challenge: "English Song Round",
      youtubeUrl: "https://www.youtube.com/results?search_query=Ed+Sheeran+Perfect+karaoke+version",
      lyricsUrl: "https://www.google.com/search?q=Ed+Sheeran+Perfect+lyrics",
      note: "Classic English romantic round.",
    },
  ],
  letter: [
    "This is your private letter area. Replace this placeholder with the real words before May 24.",
    "You can make it sweet, dramatic, funny, or painfully honest. The app is already shaped so the public never sees it.",
    "Every section after login is meant to become a permanent little archive for the two of you.",
  ],
  finalSurprise: {
    titleBefore: "Locked for May 24",
    bodyBefore: "The final surprise opens on May 24 in India time.",
    titleAfter: "For you, always",
    bodyAfter: "Replace this with the final message, video link, or promise you want her to see.",
  },
};

const state = {
  currentUser: null,
  supabaseClient: null,
  mediaRecorder: null,
  audioChunks: [],
  latestBlob: null,
  latestScore: null,
  latestScoreDetails: null,
  audioContext: null,
  analyser: null,
  previewStream: null,
  latestMediaType: "audio",
  pitchDetector: null,
  pitchBuffer: null,
  pitchyStatus: "not-loaded",
  meterTimer: null,
  meterSamples: [],
  pitchSamples: [],
  claritySamples: [],
};

const storageKeys = {
  session: "saumyaGift.session",
  scores: "saumyaGift.scores",
  notes: "saumyaGift.notes",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const on = (selector, eventName, handler) => {
  const element = $(selector);
  if (element) element.addEventListener(eventName, handler);
};

function hasSupabase() {
  return Boolean(appConfig.supabase.url && appConfig.supabase.anonKey);
}

async function initSupabase() {
  if (!hasSupabase()) return;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  state.supabaseClient = createClient(appConfig.supabase.url, appConfig.supabase.anonKey);
}

async function loadPitchy(inputLength) {
  if (state.pitchDetector && state.pitchBuffer && state.pitchBuffer.length === inputLength) return true;
  try {
    state.pitchyStatus = "loading";
    const { PitchDetector } = await import("https://esm.sh/pitchy@4");
    state.pitchDetector = PitchDetector.forFloat32Array(inputLength);
    state.pitchBuffer = new Float32Array(inputLength);
    state.pitchyStatus = "ready";
    return true;
  } catch (error) {
    console.warn("Pitchy unavailable; using volume-only scoring.", error);
    state.pitchyStatus = "fallback";
    return false;
  }
}

function setLoginVisible(isVisible) {
  $("#loginPanel").classList.toggle("hidden", !isVisible);
}

function showPrivateApp(user) {
  state.currentUser = user;
  localStorage.setItem(storageKeys.session, JSON.stringify(user));
  $("#publicLanding").classList.add("hidden");
  $("#loginPanel").classList.add("hidden");
  $("#privateApp").classList.remove("hidden");
  $("#profilePill").textContent = user.email;
  $$(".admin-only").forEach((item) => item.classList.toggle("hidden", !appConfig.adminEmails.includes(user.email)));
  refreshAll();
}

function showPublicApp() {
  state.currentUser = null;
  localStorage.removeItem(storageKeys.session);
  $("#publicLanding").classList.remove("hidden");
  $("#privateApp").classList.add("hidden");
  setLoginVisible(false);
}

async function login(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!appConfig.allowedEmails.includes(normalizedEmail)) {
    throw new Error("This email is not on the private allowlist.");
  }

  if (state.supabaseClient) {
    const { data, error } = await state.supabaseClient.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) throw error;
    return { email: data.user.email, id: data.user.id, provider: "supabase" };
  }

  if (appConfig.demoPasswords[normalizedEmail] !== password) {
    throw new Error("Incorrect password for this private gift.");
  }
  return { email: normalizedEmail, id: normalizedEmail, provider: "local-demo" };
}

async function logout() {
  if (state.supabaseClient) {
    await state.supabaseClient.auth.signOut();
  }
  showPublicApp();
}

function switchView(viewId) {
  $$(".view").forEach((view) => view.classList.toggle("active-view", view.id === viewId));
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === viewId));
  const activeButton = $(`.nav-item[data-view="${viewId}"]`);
  $("#viewTitle").textContent = activeButton ? activeButton.textContent : "Home";
}

function updateCountdown() {
  const target = new Date(appConfig.giftDateIndia).getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) {
    $("#publicCountdown").textContent = "Open now";
    return;
  }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  $("#publicCountdown").textContent = `${days}d ${hours}h to May 24`;
}

function isGiftOpen() {
  return Date.now() >= new Date(appConfig.giftDateIndia).getTime();
}

function renderStaticContent() {
  $("#letterBody").innerHTML = appConfig.letter.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  $("#surpriseTitle").textContent = isGiftOpen() ? appConfig.finalSurprise.titleAfter : appConfig.finalSurprise.titleBefore;
  $("#surpriseBody").textContent = isGiftOpen() ? appConfig.finalSurprise.bodyAfter : appConfig.finalSurprise.bodyBefore;

  $("#singerInput").innerHTML = appConfig.coupleNames.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  $("#challengeInput").innerHTML = appConfig.karaokeChallenges.map((challenge) => `<option value="${escapeHtml(challenge)}">${escapeHtml(challenge)}</option>`).join("");
  $("#songCatalogInput").innerHTML = [
    `<option value="">Custom song</option>`,
    ...appConfig.karaokeSongs.map((song) => `<option value="${escapeAttribute(song.id)}">${escapeHtml(song.title)} · ${escapeHtml(song.artist)}</option>`),
  ].join("");
  updateSelectedSong();
}

function getLocalList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function setLocalList(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function loadScores() {
  if (state.supabaseClient) {
    const { data, error } = await state.supabaseClient
      .from("karaoke_scores")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Promise.all(data.map(addSignedAudioUrl));
  }
  return getLocalList(storageKeys.scores).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

async function saveScore(record) {
  if (state.supabaseClient) {
    const { error } = await state.supabaseClient.from("karaoke_scores").insert(record);
    if (error) throw error;
    return;
  }
  const scores = getLocalList(storageKeys.scores);
  scores.unshift({ ...record, id: crypto.randomUUID() });
  setLocalList(storageKeys.scores, scores);
}

async function loadNotes() {
  if (state.supabaseClient) {
    const { data, error } = await state.supabaseClient
      .from("saumya_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }
  return getLocalList(storageKeys.notes).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

async function saveNote(record) {
  if (state.supabaseClient) {
    const { error } = await state.supabaseClient.from("saumya_posts").insert(record);
    if (error) throw error;
    return;
  }
  const notes = getLocalList(storageKeys.notes);
  notes.unshift({ ...record, id: crypto.randomUUID() });
  setLocalList(storageKeys.notes, notes);
}

async function refreshScores() {
  const scores = await loadScores();
  const list = $("#scoreList");
  if (!scores.length) {
    list.innerHTML = `<p class="muted">No karaoke scores yet.</p>`;
  } else {
    list.innerHTML = scores.map(renderScoreItem).join("");
  }
  $("#totalScores").textContent = scores.length;
  $("#topScore").textContent = scores.length ? Math.max(...scores.map((item) => item.score)) : "--";
}

async function refreshNotes() {
  const notes = await loadNotes();
  const list = $("#noteList");
  if (!notes.length) {
    list.innerHTML = `<p class="muted">Nothing saved yet.</p>`;
  } else {
    list.innerHTML = notes.map(renderNoteItem).join("");
  }
  $("#totalNotes").textContent = notes.length;
}

async function refreshAll() {
  try {
    await Promise.all([refreshScores(), refreshNotes()]);
  } catch (error) {
    console.error(error);
  }
}

function renderScoreItem(item) {
  const date = new Date(item.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const songLine = item.artist ? `${item.song} · ${item.artist}` : item.song;
  const pitchLine = item.pitch_score ? ` · pitch ${item.pitch_score}/55` : "";
  return `
    <div class="list-item">
      <div class="list-item-header">
        <strong>${escapeHtml(item.singer)} · ${escapeHtml(songLine)}</strong>
        <span class="badge">${item.score}</span>
      </div>
      <div class="muted">${escapeHtml(item.challenge)} · ${date} · ${escapeHtml(item.badge || getBadge(item.score))}${pitchLine}</div>
      ${item.youtube_url ? `<p><a href="${escapeAttribute(item.youtube_url)}" target="_blank" rel="noreferrer">Open YouTube track</a></p>` : ""}
      ${item.youtube_embed_url ? `<p><a href="${escapeAttribute(item.youtube_embed_url)}" target="_blank" rel="noreferrer">Open embedded video</a></p>` : ""}
      ${renderPerformancePlayback(item)}
    </div>
  `;
}

function renderPerformancePlayback(item) {
  if (!item.media_url && !item.audio_url) return "";
  const source = item.media_url || item.audio_url;
  if (item.media_type === "video") {
    return `<video class="saved-performance" controls src="${escapeAttribute(source)}"></video>`;
  }
  return `<audio controls src="${escapeAttribute(source)}"></audio>`;
}

function renderNoteItem(item) {
  const date = new Date(item.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const body = looksLikeUrl(item.body)
    ? `<a href="${escapeAttribute(item.body)}" target="_blank" rel="noreferrer">${escapeHtml(item.body)}</a>`
    : `<p>${escapeHtml(item.body)}</p>`;
  return `
    <div class="list-item">
      <div class="list-item-header">
        <strong>${escapeHtml(item.title)}</strong>
        <span class="badge">${escapeHtml(item.type)}</span>
      </div>
      ${body}
      <div class="muted">${date}</div>
    </div>
  `;
}

async function startRecording() {
  const mediaType = $("#recordingModeInput").value;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: mediaType === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
  });
  state.audioChunks = [];
  state.latestBlob = null;
  state.latestScore = null;
  state.latestScoreDetails = null;
  state.latestMediaType = mediaType;
  if (mediaType === "video") {
    state.previewStream = stream;
    $("#cameraPreview").srcObject = stream;
    $("#cameraPreview").classList.remove("hidden");
  }
  const mimeType = getSupportedMediaMimeType(mediaType);
  state.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  state.mediaRecorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) state.audioChunks.push(event.data);
  });
  state.mediaRecorder.addEventListener("stop", () => finishRecording(stream));
  $("#recordingStatus").textContent = "Loading pitch scoring...";
  await setupMeter(stream);
  state.mediaRecorder.start();
  $("#recordButton").disabled = true;
  $("#stopButton").disabled = false;
  $("#saveScoreButton").disabled = true;
  $("#recordingStatus").textContent = "Recording...";
}

function stopRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state === "recording") {
    state.mediaRecorder.stop();
  }
}

function finishRecording(stream) {
  stream.getTracks().forEach((track) => track.stop());
  if (state.previewStream) {
    $("#cameraPreview").srcObject = null;
    $("#cameraPreview").classList.add("hidden");
    state.previewStream = null;
  }
  clearInterval(state.meterTimer);
  $("#volumeMeter").style.width = "0%";
  state.latestBlob = new Blob(state.audioChunks, { type: state.latestMediaType === "video" ? "video/webm" : "audio/webm" });
  const url = URL.createObjectURL(state.latestBlob);
  showLocalPlayback(url, state.latestMediaType);
  const details = calculateScore();
  state.latestScore = details.total;
  state.latestScoreDetails = details;
  const methodLabel = details.usedPitch ? "pitch + energy" : "energy fallback";
  $("#scoreResult").innerHTML = `<strong>${state.latestScore}</strong><span>${getBadge(state.latestScore)} · ${methodLabel}</span>`;
  $("#recordingStatus").textContent = "Recording ready. Listen once, then save it.";
  $("#recordButton").disabled = false;
  $("#stopButton").disabled = true;
  $("#saveScoreButton").disabled = false;
  state.meterSamples = [];
  state.pitchSamples = [];
  state.claritySamples = [];
}

function showLocalPlayback(url, mediaType) {
  $("#audioPlayback").classList.toggle("hidden", mediaType !== "audio");
  $("#videoPlayback").classList.toggle("hidden", mediaType !== "video");
  if (mediaType === "video") {
    $("#videoPlayback").src = url;
    $("#audioPlayback").removeAttribute("src");
  } else {
    $("#audioPlayback").src = url;
    $("#videoPlayback").removeAttribute("src");
  }
}

function getSupportedMediaMimeType(mediaType) {
  const options = mediaType === "video"
    ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
    : ["audio/webm;codecs=opus", "audio/webm"];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

async function setupMeter(stream) {
  state.audioContext = new AudioContext();
  const source = state.audioContext.createMediaStreamSource(stream);
  state.analyser = state.audioContext.createAnalyser();
  state.analyser.fftSize = 2048;
  source.connect(state.analyser);
  const data = new Uint8Array(state.analyser.frequencyBinCount);
  await loadPitchy(state.analyser.fftSize);
  state.meterSamples = [];
  state.pitchSamples = [];
  state.claritySamples = [];
  state.meterTimer = setInterval(() => {
    state.analyser.getByteFrequencyData(data);
    const level = data.reduce((sum, value) => sum + value, 0) / data.length / 255;
    state.meterSamples.push(level);
    $("#volumeMeter").style.width = `${Math.min(100, Math.round(level * 160))}%`;
    samplePitch();
  }, 250);
}

function samplePitch() {
  if (!state.pitchDetector || !state.pitchBuffer || !state.audioContext) return;
  state.analyser.getFloatTimeDomainData(state.pitchBuffer);
  const [pitch, clarity] = state.pitchDetector.findPitch(state.pitchBuffer, state.audioContext.sampleRate);
  if (pitch >= 70 && pitch <= 1100 && clarity >= 0.55) {
    state.pitchSamples.push(pitch);
    state.claritySamples.push(clarity);
  }
}

function calculateScore() {
  const durationScore = Math.min(20, Math.round(state.meterSamples.length / 5));
  const average = averageValue(state.meterSamples);
  const variance = averageValue(state.meterSamples.map((sample) => Math.abs(sample - average)));
  const energyScore = Math.min(25, Math.round(average * 44));
  const consistencyFallback = Math.max(10, 35 - Math.round(variance * 80));

  if (state.pitchSamples.length < 4) {
    const fallbackTotal = Math.max(35, Math.min(99, durationScore + energyScore + consistencyFallback + 15));
    return {
      total: fallbackTotal,
      usedPitch: false,
      durationScore,
      energyScore,
      pitchScore: 0,
      pitchStability: 0,
      pitchConfidence: 0,
    };
  }

  const semitones = state.pitchSamples.map(frequencyToMidi);
  const median = medianValue(semitones);
  const averageDeviation = averageValue(semitones.map((note) => Math.abs(note - median)));
  const pitchStability = Math.max(0, Math.min(30, Math.round(30 - averageDeviation * 12)));
  const pitchConfidence = Math.min(25, Math.round(averageValue(state.claritySamples) * 25));
  const pitchScore = pitchStability + pitchConfidence;
  const total = Math.max(35, Math.min(99, durationScore + energyScore + pitchScore));

  return {
    total,
    usedPitch: true,
    durationScore,
    energyScore,
    pitchScore,
    pitchStability,
    pitchConfidence,
  };
}

async function uploadMediaIfPossible(blob, mediaType) {
  if (!state.supabaseClient || !blob) return "";
  const bucket = mediaType === "video" ? "karaoke-performances" : "karaoke-recordings";
  const fileName = `${state.currentUser.id}/${Date.now()}-${crypto.randomUUID()}.webm`;
  const contentType = mediaType === "video" ? "video/webm" : "audio/webm";
  const { error } = await state.supabaseClient.storage.from(bucket).upload(fileName, blob, {
    contentType,
  });
  if (error) throw error;
  return fileName;
}

async function addSignedAudioUrl(score) {
  const mediaPath = score.media_path || score.audio_path;
  if (!mediaPath) return score;
  const mediaType = score.media_type || "audio";
  const bucket = mediaType === "video" ? "karaoke-performances" : "karaoke-recordings";
  const { data, error } = await state.supabaseClient.storage
    .from(bucket)
    .createSignedUrl(mediaPath, 60 * 60);
  if (error) return score;
  return { ...score, media_url: data.signedUrl, audio_url: data.signedUrl };
}

function getBadge(score) {
  if (score >= 92) return "Main Vocal";
  if (score >= 84) return "Concert Mode";
  if (score >= 76) return "OST Energy";
  if (score >= 66) return "Encore Needed";
  return "One More Take";
}

function averageValue(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function medianValue(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function frequencyToMidi(frequency) {
  return 69 + 12 * Math.log2(frequency / 440);
}

function looksLikeUrl(value) {
  return /^https?:\/\//i.test(value);
}

function getSelectedCatalogSong() {
  const id = $("#songCatalogInput").value;
  return appConfig.karaokeSongs.find((song) => song.id === id) || null;
}

function updateSelectedSong() {
  const song = getSelectedCatalogSong();
  const customMode = !song;
  $("#songInput").disabled = !customMode;
  $("#songInput").required = customMode;
  $("#selectedSongCard").classList.toggle("hidden", customMode);

  if (customMode) {
    $("#songInput").value = "";
    $("#songArtistInput").value = "";
    $("#youtubeUrlInput").value = "";
    $("#lyricsUrlInput").value = "";
    $("#youtubeSearchInput").value = "";
    $("#youtubeEmbedUrlInput").value = "";
    updateYoutubeEmbed();
    return;
  }

  $("#challengeInput").value = song.challenge;
  $("#songInput").value = song.title;
  $("#songArtistInput").value = song.artist;
  $("#youtubeUrlInput").value = song.youtubeUrl;
  $("#lyricsUrlInput").value = song.lyricsUrl;
  $("#youtubeSearchInput").value = `${song.artist} ${song.title} karaoke version`;
  $("#youtubeEmbedUrlInput").value = "";
  $("#selectedSongTitle").textContent = `${song.title} · ${song.artist}`;
  $("#selectedSongNote").textContent = song.note;
  $("#openYoutubeButton").href = song.youtubeUrl;
  $("#openLyricsButton").href = song.lyricsUrl;
  updateYoutubeEmbed();
}

function updateYoutubeSearchFromCustomSong() {
  const song = $("#songInput").value.trim();
  const artist = $("#songArtistInput").value.trim();
  const query = [artist, song, "karaoke version"].filter(Boolean).join(" ");
  $("#youtubeSearchInput").value = query;
  $("#youtubeUrlInput").value = query ? makeYoutubeSearchUrl(query) : "";
  $("#openYoutubeButton").href = $("#youtubeUrlInput").value || "#";
  clearYoutubeResults();
}

function makeYoutubeSearchUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query).replace(/%20/g, "+")}`;
}

function updateYoutubeEmbed() {
  const videoId = extractYoutubeVideoId($("#youtubeEmbedUrlInput").value.trim());
  const frame = $("#youtubeFrame");
  const empty = $("#youtubeEmptyState");
  const fallback = $("#youtubeFallback");
  fallback?.classList.add("hidden");
  if (!videoId) {
    frame.classList.add("hidden");
    frame.removeAttribute("src");
    empty.classList.remove("hidden");
    return;
  }
  frame.src = `https://www.youtube.com/embed/${videoId}?origin=${encodeURIComponent(window.location.origin)}`;
  frame.classList.remove("hidden");
  empty.classList.add("hidden");
  window.setTimeout(() => {
    if (!frame.classList.contains("hidden")) fallback?.classList.remove("hidden");
  }, 1800);
}

function extractYoutubeVideoId(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0];
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname.startsWith("/watch")) return url.searchParams.get("v") || "";
      if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2] || "";
      if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2] || "";
    }
  } catch {
    return "";
  }
  return "";
}

async function searchEmbeddableYoutubeVideos() {
  const query = $("#youtubeSearchInput").value.trim();
  const results = $("#youtubeResults");
  if (!query) {
    results.innerHTML = `<p class="muted">Choose or type a song first.</p>`;
    return;
  }
  if (!appConfig.youtube.apiKey) {
    results.innerHTML = `
      <p class="muted">YouTube API key is not configured yet. Use Search YouTube, then paste a video URL that allows embedding.</p>
    `;
    return;
  }

  $("#youtubeSearchButton").disabled = true;
  $("#youtubeSearchButton").textContent = "Searching...";
  results.innerHTML = `<p class="muted">Searching embeddable karaoke videos...</p>`;
  try {
    const params = new URLSearchParams({
      key: appConfig.youtube.apiKey,
      part: "snippet",
      type: "video",
      maxResults: "6",
      videoEmbeddable: "true",
      q: query,
    });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error?.message || "YouTube search failed.");
    }
    renderYoutubeResults(payload.items || []);
  } catch (error) {
    results.innerHTML = `<p class="form-message">${escapeHtml(error.message)}</p>`;
  } finally {
    $("#youtubeSearchButton").disabled = false;
    $("#youtubeSearchButton").textContent = "Find embeddable videos";
  }
}

function renderYoutubeResults(items) {
  const results = $("#youtubeResults");
  if (!items.length) {
    results.innerHTML = `<p class="muted">No embeddable results found. Try the regular YouTube search link.</p>`;
    return;
  }
  results.innerHTML = items.map((item) => {
    const videoId = item.id?.videoId || "";
    const title = item.snippet?.title || "YouTube video";
    const channel = item.snippet?.channelTitle || "YouTube";
    const thumb = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "";
    return `
      <button class="youtube-result" type="button" data-video-id="${escapeAttribute(videoId)}">
        ${thumb ? `<img src="${escapeAttribute(thumb)}" alt="" />` : ""}
        <span>
          <strong>${escapeHtml(title)}</strong>
          <em>${escapeHtml(channel)}</em>
        </span>
      </button>
    `;
  }).join("");
}

function chooseYoutubeResult(videoId) {
  if (!videoId) return;
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  $("#youtubeEmbedUrlInput").value = url;
  updateYoutubeEmbed();
}

function clearYoutubeResults() {
  $("#youtubeResults").innerHTML = "";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function bindEvents() {
  $("#openLoginButton").addEventListener("click", () => setLoginVisible(true));
  $("#heroLoginButton").addEventListener("click", () => setLoginVisible(true));
  $("#closeLoginButton").addEventListener("click", () => setLoginVisible(false));
  $("#logoutButton").addEventListener("click", logout);
  $("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    $("#loginMessage").textContent = "";
    try {
      const user = await login($("#emailInput").value, $("#passwordInput").value);
      showPrivateApp(user);
    } catch (error) {
      $("#loginMessage").textContent = error.message;
    }
  });

  $$(".nav-item").forEach((item) => item.addEventListener("click", () => switchView(item.dataset.view)));
  $$("[data-jump]").forEach((item) => item.addEventListener("click", () => switchView(item.dataset.jump)));
  on("#recordButton", "click", () => startRecording().catch((error) => {
    $("#recordingStatus").textContent = error.message;
  }));
  on("#stopButton", "click", stopRecording);
  on("#refreshScoresButton", "click", refreshScores);
  on("#refreshNotesButton", "click", refreshNotes);
  on("#songCatalogInput", "change", updateSelectedSong);
  on("#songInput", "input", updateYoutubeSearchFromCustomSong);
  on("#youtubeEmbedUrlInput", "input", updateYoutubeEmbed);
  on("#youtubeSearchButton", "click", searchEmbeddableYoutubeVideos);
  on("#youtubeResults", "click", (event) => {
    const button = event.target.closest("[data-video-id]");
    if (button) chooseYoutubeResult(button.dataset.videoId);
  });

  $("#karaokeForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.latestScore) return;
    $("#saveScoreButton").disabled = true;
    $("#saveScoreButton").textContent = "Saving...";
    try {
      const mediaPath = await uploadMediaIfPossible(state.latestBlob, state.latestMediaType);
      await saveScore({
        singer: $("#singerInput").value,
        challenge: $("#challengeInput").value,
        song: $("#songInput").value.trim(),
        artist: $("#songArtistInput").value.trim(),
        youtube_url: $("#youtubeUrlInput").value.trim(),
        lyrics_url: $("#lyricsUrlInput").value.trim(),
        youtube_embed_url: $("#youtubeEmbedUrlInput").value.trim(),
        score: state.latestScore,
        badge: getBadge(state.latestScore),
        score_method: state.latestScoreDetails?.usedPitch ? "pitchy" : "energy-fallback",
        pitch_score: state.latestScoreDetails?.pitchScore || 0,
        pitch_stability: state.latestScoreDetails?.pitchStability || 0,
        pitch_confidence: state.latestScoreDetails?.pitchConfidence || 0,
        media_type: state.latestMediaType,
        media_path: mediaPath,
        audio_path: state.latestMediaType === "audio" ? mediaPath : "",
        created_by: state.currentUser.id,
        created_at: new Date().toISOString(),
      });
      $("#karaokeForm").reset();
      updateSelectedSong();
      $("#audioPlayback").classList.add("hidden");
      $("#videoPlayback").classList.add("hidden");
      $("#cameraPreview").classList.add("hidden");
      $("#scoreResult").innerHTML = `<strong>--</strong><span>Saved. Record another round.</span>`;
      state.latestScore = null;
      await refreshScores();
      switchView("scoreboardView");
    } catch (error) {
      $("#recordingStatus").textContent = error.message;
      $("#saveScoreButton").disabled = false;
    } finally {
      $("#saveScoreButton").textContent = "Save performance";
    }
  });

  $("#noteForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveNote({
      type: $("#noteTypeInput").value,
      title: $("#noteTitleInput").value.trim(),
      body: $("#noteBodyInput").value.trim(),
      created_by: state.currentUser.id,
      created_at: new Date().toISOString(),
    });
    $("#noteForm").reset();
    await refreshNotes();
  });
}

async function restoreSession() {
  if (state.supabaseClient) {
    const { data } = await state.supabaseClient.auth.getUser();
    if (data.user && appConfig.allowedEmails.includes(data.user.email)) {
      showPrivateApp({ email: data.user.email, id: data.user.id, provider: "supabase" });
      return;
    }
  }
  const cached = localStorage.getItem(storageKeys.session);
  if (!cached) return;
  try {
    const user = JSON.parse(cached);
    if (appConfig.allowedEmails.includes(user.email)) showPrivateApp(user);
  } catch {
    localStorage.removeItem(storageKeys.session);
  }
}

async function init() {
  try {
    if (new URLSearchParams(window.location.search).get("reset") === "1") {
      localStorage.removeItem(storageKeys.session);
      localStorage.removeItem(storageKeys.scores);
      localStorage.removeItem(storageKeys.notes);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    await initSupabase();
    renderStaticContent();
    bindEvents();
    updateCountdown();
    setInterval(updateCountdown, 60000);
    await restoreSession();
  } catch (error) {
    console.error(error);
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div style="padding:12px 16px;background:#d83f5d;color:#fff;font-family:system-ui">App startup error: ${escapeHtml(error.message)}</div>`
    );
  }
}

init();
