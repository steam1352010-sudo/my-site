// ============ إدارة البيانات (localStorage) ============
function normalizeUser(user) {
  const fallbackUsername =
    user.username ||
    (user.email ? String(user.email).split("@")[0] : (user.name || "user").toLowerCase().replace(/\s+/g, ""));

  return {
    id: user.id || Date.now().toString(),
    name: user.name || fallbackUsername,
    username: fallbackUsername,
    email: user.email || "",
    password: user.password || "",
    bio: user.bio || "",
    avatar:
      user.avatar ||
      "https://via.placeholder.com/150/3b5998/ffffff?text=" + encodeURIComponent((user.name || "U")[0] || "U"),
    friends: Array.isArray(user.friends) ? user.friends : [],
    banned: !!user.banned,
    createdAt: user.createdAt || Date.now()
  };
}

function getUsers() {
  const raw = JSON.parse(localStorage.getItem("fb_users") || "[]");
  const normalized = raw.map(normalizeUser);
  if (JSON.stringify(raw) !== JSON.stringify(normalized)) {
    localStorage.setItem("fb_users", JSON.stringify(normalized));
  }
  return normalized;
}

function saveUsers(u) {
  localStorage.setItem("fb_users", JSON.stringify((u || []).map(normalizeUser)));
}

function getPosts() { return JSON.parse(localStorage.getItem("fb_posts") || "[]"); }
function savePosts(p) { localStorage.setItem("fb_posts", JSON.stringify(p)); }

function getMessages() { return JSON.parse(localStorage.getItem("fb_messages") || "[]"); }
function saveMessages(m) { localStorage.setItem("fb_messages", JSON.stringify(m)); }

function getReels() { return JSON.parse(localStorage.getItem("fb_reels") || "[]"); }
function saveReels(r) { localStorage.setItem("fb_reels", JSON.stringify(r)); }

let currentUser = null;
let currentProfileUserId = null;
let currentChatUserId = null;

// ============ أدوات مساعدة ============
function isRoot() {
  return !!currentUser && currentUser.role === "root";
}

function validateEmail(email) {
  return /^[a-z0-9._%+-]+@(gmail\.com|hotmail\.com)$/i.test(email);
}

function fileToDataURL(file, done) {
  if (!file) return done(null);
  const reader = new FileReader();
  reader.onload = e => done(e.target.result);
  reader.readAsDataURL(file);
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function findUserById(userId) {
  if (userId === "root") {
    return {
      id: "root",
      name: "Root",
      username: "Root",
      avatar: "https://via.placeholder.com/150/111111/ffffff?text=ROOT",
      bio: "وضع المطور",
      friends: [],
      banned: false,
      role: "root"
    };
  }
  return getUsers().find(u => u.id === userId) || null;
}

function refreshCurrentUserFromStorage() {
  if (!currentUser || isRoot()) return;
  const users = getUsers();
  const fresh = users.find(u => u.id === currentUser.id);
  if (fresh) currentUser = fresh;
}

// ============ التنقل بين الشاشات ============
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.style.display = "none");
  document.getElementById(id).style.display = "block";
}

// ============ البحث عن الأصدقاء ============
function handleSearchInput(value) {
  const q = value.trim().toLowerCase();
  const box = document.getElementById("searchResults");
  if (!box) return;

  if (!q) {
    box.innerHTML = "";
    return;
  }

  const users = getUsers().filter(u => {
    const hay = `${u.name} ${u.username} ${u.email}`.toLowerCase();
    return hay.includes(q) && u.id !== currentUser?.id;
  });

  if (!users.length) {
    box.innerHTML = `<div class="search-empty">لا توجد نتائج</div>`;
    return;
  }

  box.innerHTML = users.map(u => `
    <div class="search-item ${u.banned ? "search-item-banned" : ""}">
      <img src="${u.avatar}" class="search-avatar">
      <div class="search-meta">
        <div class="search-name">${escapeHtml(u.name)} <span class="search-username">@${escapeHtml(u.username)}</span></div>
        ${u.banned ? `<div class="banned-note">لم يعد هذا الحساب متوفرا في الوقت الحالي</div>` : ""}
      </div>
      <div class="search-actions">
        <button onclick="goToProfile('${u.id}')">الملف</button>
        ${u.banned ? "" : `<button onclick="openChat('${u.id}')">رسالة</button>`}
      </div>
    </div>
  `).join("");
}

function clearSearchResults() {
  const input = document.getElementById("friendSearch");
  const box = document.getElementById("searchResults");
  if (input) input.value = "";
  if (box) box.innerHTML = "";
}

// ============ تسجيل حساب ============
function handleRegister() {
  const name = document.getElementById("registerName").value.trim();
  const username = document.getElementById("registerUsername").value.trim();
  const email = document.getElementById("registerEmail").value.trim().toLowerCase();
  const password = document.getElementById("registerPassword").value;
  const bio = document.getElementById("registerBio").value.trim();
  const avatarFile = document.getElementById("registerAvatar").files[0];
  const errorEl = document.getElementById("registerError");
  errorEl.textContent = "";
  errorEl.style.color = "red";

  if (!name || !username || !email || !password) {
    errorEl.textContent = "الرجاء تعبئة جميع الحقول";
    return;
  }

  if (username === "Root") {
    errorEl.textContent = "اسم المستخدم Root محجوز";
    return;
  }

  if (/\s/.test(username)) {
    errorEl.textContent = "اسم المستخدم لا يجب أن يحتوي على مسافات";
    return;
  }

  if (!validateEmail(email)) {
    errorEl.textContent = "البريد يجب أن يكون مثل: username@gmail.com أو username@hotmail.com";
    return;
  }

  const users = getUsers();

  if (users.find(u => u.username === username)) {
    errorEl.textContent = "اسم المستخدم هذا مسجل بالفعل";
    return;
  }

  if (users.find(u => u.email === email)) {
    errorEl.textContent = "هذا البريد الإلكتروني مسجل بالفعل";
    return;
  }

  fileToDataURL(avatarFile, (avatarData) => {
    const newUser = {
      id: Date.now().toString(),
      name,
      username,
      email,
      password,
      bio,
      avatar: avatarData || "https://via.placeholder.com/150/3b5998/ffffff?text=" + encodeURIComponent(name[0] || "U"),
      friends: [],
      banned: false,
      createdAt: Date.now()
    };

    users.push(newUser);
    saveUsers(users);
    loginAs(newUser);
  });
}

// ============ تسجيل الدخول ============
function handleLogin() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errorEl = document.getElementById("loginError");
  errorEl.textContent = "";
  errorEl.style.color = "red";

  if (username === "Root" && password === "ROT") {
    loginAsRoot();
    return;
  }

  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    errorEl.textContent = "اسم المستخدم أو كلمة المرور غير صحيحة";
    return;
  }

  if (user.banned) {
    errorEl.textContent = "لم يعد هذا الحساب متوفرا في الوقت الحالي";
    return;
  }

  loginAs(user);
}

function loginAs(user) {
  const users = getUsers();
  currentUser = users.find(u => u.id === user.id) || normalizeUser(user);
  localStorage.setItem("fb_currentUserId", currentUser.id);
  renderTopbar();
  renderSidebar();
  renderAdminPanel();
  renderMessagePanel();
  renderReels();
  showScreen("homeScreen");
  renderFeed();
}

function loginAsRoot() {
  currentUser = {
    id: "root",
    name: "Root",
    username: "Root",
    role: "root",
    avatar: "https://via.placeholder.com/150/111111/ffffff?text=ROOT",
    bio: "وضع المطور",
    friends: [],
    createdAt: Date.now()
  };
  localStorage.setItem("fb_currentUserId", "root");
  renderTopbar();
  renderSidebar();
  renderAdminPanel();
  renderMessagePanel();
  renderReels();
  showScreen("homeScreen");
  renderFeed();
}

function logout() {
  currentUser = null;
  currentProfileUserId = null;
  currentChatUserId = null;
  localStorage.removeItem("fb_currentUserId");
  showScreen("loginScreen");
  renderTopbar();
}

// ============ الشريط العلوي ============
function renderTopbar() {
  const el = document.getElementById("topbarUser");
  if (!currentUser) {
    el.innerHTML = "";
    return;
  }

  if (isRoot()) {
    el.innerHTML = `
      <span class="admin-badge">وضع المطور</span>
      <span class="topbar-root-name">Root</span>
      <a onclick="logout()">تسجيل خروج</a>
    `;
    return;
  }

  el.innerHTML = `
    <a onclick="goToProfile(currentUser.id)">@${escapeHtml(currentUser.username || currentUser.name)}</a>
    <a onclick="logout()">تسجيل خروج</a>
  `;
}

// ============ الشريط الجانبي ============
function renderSidebar() {
  if (!currentUser) return;

  document.getElementById("sideAvatar").src = currentUser.avatar;
  document.getElementById("sideName").textContent = isRoot()
    ? "Root"
    : `${currentUser.name} (@${currentUser.username})`;

  if (isRoot()) {
    document.getElementById("sideFriends").textContent =
      "المستخدمون: " + getUsers().length + " | المنشورات: " + getPosts().length + " | الريلز: " + getReels().length;
    document.getElementById("homeSideBio").textContent = "وضع المطور";
  } else {
    document.getElementById("sideFriends").textContent = "الأصدقاء: " + currentUser.friends.length;
    document.getElementById("homeSideBio").textContent = currentUser.bio ? currentUser.bio : "لا توجد سيرة ذاتية بعد";
  }
}

// ============ لوحة المطور ============
function renderAdminPanel() {
  const el = document.getElementById("adminPanel");
  if (!el) return;

  if (!isRoot()) {
    el.innerHTML = "";
    return;
  }

  const users = getUsers();
  const posts = getPosts();

  el.innerHTML = `
    <div class="box admin-panel">
      <h3>لوحة المطور</h3>
      <p class="muted">المستخدمون: ${users.length} | المنشورات: ${posts.length}</p>
      <div class="admin-list">
        ${users.map(u => `
          <div class="admin-row ${u.banned ? "admin-row-banned" : ""}">
            <div class="admin-info">
              <div class="admin-title">
                <b>${escapeHtml(u.name)}</b>
                <span class="muted">@${escapeHtml(u.username)}</span>
              </div>
              <div class="muted">${escapeHtml(u.email)}</div>
              ${u.banned ? `<div class="banned-note">لم يعد هذا الحساب متوفرا في الوقت الحالي</div>` : ""}
            </div>
            <div class="admin-actions">
              <button onclick="goToProfile('${u.id}')">عرض</button>
              <button class="danger-btn" onclick="toggleBanUser('${u.id}')">${u.banned ? "إلغاء الحظر" : "حظر"}</button>
              <button class="danger-btn" onclick="deleteUser('${u.id}')">حذف</button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ============ الرسائل ============
function openChat(userId) {
  currentChatUserId = userId;
  const input = document.getElementById("friendSearch");
  if (input) input.value = "";
  const box = document.getElementById("searchResults");
  if (box) box.innerHTML = "";
  showScreen("homeScreen");
  renderMessagePanel();
  const panel = document.getElementById("messageBox");
  if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderMessagePanel() {
  const el = document.getElementById("messageBox");
  if (!el || !currentUser) return;

  if (!currentChatUserId) {
    el.innerHTML = `
      <div class="box message-panel">
        <h3>الرسائل</h3>
        <p class="muted">ابحث عن صديق من الأعلى ثم اختر "رسالة".</p>
      </div>
    `;
    return;
  }

  const recipient = findUserById(currentChatUserId);
  if (!recipient) {
    el.innerHTML = `
      <div class="box message-panel">
        <h3>الرسائل</h3>
        <p class="muted">المستخدم غير موجود.</p>
      </div>
    `;
    return;
  }

  const messages = getMessages()
    .filter(m =>
      (m.fromId === currentUser.id && m.toId === recipient.id) ||
      (m.fromId === recipient.id && m.toId === currentUser.id)
    )
    .sort((a, b) => a.createdAt - b.createdAt);

  el.innerHTML = `
    <div class="box message-panel">
      <h3>محادثة مع ${escapeHtml(recipient.name)} @${escapeHtml(recipient.username)}</h3>
      ${recipient.banned ? `<p class="banned-note">لم يعد هذا الحساب متوفرا في الوقت الحالي</p>` : ""}
      <div class="message-thread">
        ${messages.length ? messages.map(m => `
          <div class="msg-row ${m.fromId === currentUser.id ? "me" : "them"}">
            <div class="msg-bubble">${escapeHtml(m.text)}</div>
            <div class="msg-time">${new Date(m.createdAt).toLocaleString("ar-EG")}</div>
          </div>
        `).join("") : `<p class="muted">لا توجد رسائل بعد.</p>`}
      </div>
      <textarea id="messageText" rows="2" placeholder="اكتب رسالة..."></textarea>
      <button onclick="sendMessage()">إرسال</button>
    </div>
  `;
}

function sendMessage() {
  const recipient = findUserById(currentChatUserId);
  if (!recipient || recipient.banned) return;

  const input = document.getElementById("messageText");
  const text = input.value.trim();
  if (!text) return;

  const messages = getMessages();
  messages.push({
    id: Date.now().toString(),
    fromId: currentUser.id,
    toId: recipient.id,
    text,
    createdAt: Date.now()
  });
  saveMessages(messages);
  input.value = "";
  renderMessagePanel();
}

// ============ الريلز ============
function createReel() {
  const fileInput = document.getElementById("reelVideo");
  const file = fileInput.files[0];
  const caption = document.getElementById("reelCaption").value.trim();
  const mode = document.getElementById("reelMode").value;
  const errorEl = document.getElementById("reelError");
  errorEl.textContent = "";

  if (!file) {
    errorEl.textContent = "اختر فيديو أولًا";
    return;
  }

  if (!file.type.startsWith("video/")) {
    errorEl.textContent = "الملف يجب أن يكون فيديو";
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    errorEl.textContent = "حجم الفيديو يجب ألا يتجاوز 10 ميجابايت";
    return;
  }

  const video = document.createElement("video");
  video.preload = "metadata";
  video.onloadedmetadata = function () {
    URL.revokeObjectURL(video.src);

    const width = video.videoWidth;
    const height = video.videoHeight;
    const duration = video.duration || 0;
    const ratio = width / height;
    const targetRatio = 16 / 9;

    if (Math.abs(ratio - targetRatio) > 0.1) {
      errorEl.textContent = "يجب أن يكون الفيديو بنسبة 16:9";
      return;
    }

    if (mode === "reel") {
      if (width > 1920 || height > 1080) {
        errorEl.textContent = "دقة الريلز يجب ألا تتجاوز 1080p";
        return;
      }

      if (duration > 60) {
        errorEl.textContent = "الريلز يجب أن يكون قصيرًا";
        return;
      }

      if (duration > 0) {
        const estimatedKbps = (file.size * 8) / duration / 1000;
        if (estimatedKbps < 2000 || estimatedKbps > 5000) {
          errorEl.textContent = "معدل البت للريلز يجب أن يكون بين 2000 و 5000 kbps تقريبًا";
          return;
        }
      }
    } else {
      if (width > 1280 || height > 720) {
        errorEl.textContent = "فيديو الخلفية يجب ألا يتجاوز 720p";
        return;
      }
    }

    fileToDataURL(file, (videoData) => {
      const reels = getReels();
      reels.push({
        id: Date.now().toString(),
        userId: currentUser.id,
        caption,
        video: videoData,
        mode,
        width,
        height,
        duration,
        createdAt: Date.now()
      });
      saveReels(reels);
      fileInput.value = "";
      document.getElementById("reelCaption").value = "";
      renderReels();
      renderProfileReels(currentUser.id);
    });
  };

  video.onerror = function () {
    errorEl.textContent = "تعذر قراءة بيانات الفيديو";
  };

  video.src = URL.createObjectURL(file);
}

function renderReels() {
  const box = document.getElementById("reelsFeed");
  if (!box) return;

  const reels = getReels().sort((a, b) => b.createdAt - a.createdAt);
  const users = getUsers();

  box.innerHTML = reels.length ? reels.map(r => {
    const author = users.find(u => u.id === r.userId);
    return `
      <div class="box reel-card">
        <div class="reel-head">
          <img class="userpic" src="${author ? author.avatar : ""}">
          <div>
            <div class="author-line">
              <a class="author" onclick="goToProfile('${r.userId}')">${author ? escapeHtml(author.name) : "مستخدم محذوف"}</a>
            </div>
            <div class="muted">@${author ? escapeHtml(author.username) : "deleted"}</div>
          </div>
        </div>
        ${author && author.banned ? `<div class="banned-note">لم يعد هذا الحساب متوفرا في الوقت الحالي</div>` : ""}
        <video class="reel-video" controls src="${r.video}"></video>
        ${r.caption ? `<div class="content">${escapeHtml(r.caption)}</div>` : ""}
        <div class="meta">${new Date(r.createdAt).toLocaleString("ar-EG")} — ${r.mode === "background" ? "خلفية فيديو" : "ريلز"}</div>
      </div>
    `;
  }).join("") : `<div class="box">لا توجد ريلز بعد.</div>`;
}

function renderProfileReels(userId) {
  const box = document.getElementById("profileReelsFeed");
  if (!box) return;

  const reels = getReels()
    .filter(r => r.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);

  box.innerHTML = reels.length ? reels.map(r => `
    <div class="box reel-card">
      <video class="reel-video" controls src="${r.video}"></video>
      ${r.caption ? `<div class="content">${escapeHtml(r.caption)}</div>` : ""}
      <div class="meta">${new Date(r.createdAt).toLocaleString("ar-EG")}</div>
    </div>
  `).join("") : `<div class="box">لا توجد ريلز بعد.</div>`;
}

// ============ نشر منشور ============
function createPost() {
  const text = document.getElementById("postText").value.trim();
  const fileInput = document.getElementById("postImage");
  const file = fileInput.files[0];

  function savePost(imageData) {
    const posts = getPosts();
    posts.push({
      id: Date.now().toString(),
      userId: currentUser.id,
      text,
      image: imageData || null,
      likes: [],
      comments: [],
      createdAt: Date.now()
    });
    savePosts(posts);
    document.getElementById("postText").value = "";
    fileInput.value = "";
    renderFeed();
    renderAdminPanel();
  }

  if (!text && !file) return;

  if (file) {
    const reader = new FileReader();
    reader.onload = e => savePost(e.target.result);
    reader.readAsDataURL(file);
  } else {
    savePost(null);
  }
}

// ============ عرض المنشورات ============
function renderFeed() {
  const posts = getPosts().sort((a, b) => b.createdAt - a.createdAt);
  const users = getUsers();
  document.getElementById("feed").innerHTML =
    posts.map(p => postHTML(p, users)).join("") || `<div class="box">لا توجد منشورات بعد.</div>`;
}

function postHTML(post, users) {
  const author = users.find(u => u.id === post.userId);
  const liked = post.likes.includes(currentUser.id);
  const bannedAuthor = author && author.banned;

  return `
  <div class="box post" data-post-id="${post.id}">
    <div>
      <img class="userpic" src="${author ? author.avatar : ""}">
      <a class="author ${bannedAuthor ? "banned-name" : ""}" onclick="goToProfile('${post.userId}')">
        ${author ? escapeHtml(author.name) : "مستخدم محذوف"}
      </a>
      ${bannedAuthor ? `<span class="banned-note inline-note">لم يعد هذا الحساب متوفرا في الوقت الحالي</span>` : ""}
    </div>
    <div class="content">${escapeHtml(post.text)}</div>
    ${post.image ? `<img class="postimg" src="${post.image}">` : ""}
    <div class="meta">${new Date(post.createdAt).toLocaleString("ar-EG")}</div>
    <div class="actions">
      <a onclick="toggleLike('${post.id}')">${liked ? "إلغاء الإعجاب" : "أعجبني"} (${post.likes.length})</a>
      <span>تعليقات (${post.comments.length})</span>
      ${isRoot() ? `<a class="danger-link" onclick="deletePost('${post.id}')">حذف المنشور</a>` : ""}
    </div>
    <div class="comments">
      ${post.comments.map(c => {
        const cu = users.find(u => u.id === c.userId);
        return `<div class="comment"><b>${cu ? escapeHtml(cu.name) : "مستخدم"}:</b> ${escapeHtml(c.text)}</div>`;
      }).join("")}
    </div>
    <input type="text" class="comment-input" placeholder="اكتب تعليقاً..." onkeypress="handleCommentKey(event, '${post.id}', this)">
  </div>`;
}

// ============ الإعجاب ============
function toggleLike(postId) {
  const posts = getPosts();
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  const idx = post.likes.indexOf(currentUser.id);
  if (idx >= 0) post.likes.splice(idx, 1);
  else post.likes.push(currentUser.id);
  savePosts(posts);
  if (document.getElementById("homeScreen").style.display !== "none") renderFeed();
  else renderProfileFeed(currentProfileUserId);
}

// ============ التعليقات ============
function handleCommentKey(event, postId, input) {
  if (event.key === "Enter" && input.value.trim()) {
    const posts = getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    post.comments.push({ userId: currentUser.id, text: input.value.trim(), createdAt: Date.now() });
    savePosts(posts);
    input.value = "";
    if (document.getElementById("homeScreen").style.display !== "none") renderFeed();
    else renderProfileFeed(currentProfileUserId);
  }
}

// ============ صفحة البروفايل ============
function goToProfile(userId) {
  currentProfileUserId = userId;
  const users = getUsers();
  const profileUser = users.find(u => u.id === userId);
  if (!profileUser) return;

  document.getElementById("profAvatar").src = profileUser.avatar;
  document.getElementById("profName").textContent = profileUser.name;
  document.getElementById("profFriends").textContent = "الأصدقاء: " + profileUser.friends.length;
  document.getElementById("profBioDisplay").textContent = profileUser.bio ? profileUser.bio : "لا توجد سيرة ذاتية بعد";
  document.getElementById("profStatusNote").innerHTML = profileUser.banned
    ? `<span class="banned-note">لم يعد هذا الحساب متوفرا في الوقت الحالي</span>`
    : "";

  const isMe = profileUser.id === currentUser.id;
  const isFriend = !isRoot() && Array.isArray(currentUser.friends) && currentUser.friends.includes(profileUser.id);

  document.getElementById("friendActionBox").innerHTML = isMe
    ? ""
    : isRoot()
      ? `<p class="muted">يمكنك إدارة هذا الحساب من هنا</p><button onclick="openChat('${profileUser.id}')">رسالة</button>`
      : profileUser.banned
        ? ""
        : isFriend
          ? `<p class="muted" style="color:green;">صديق بالفعل ✔</p><button onclick="openChat('${profileUser.id}')">رسالة</button>`
          : `<button onclick="addFriend('${profileUser.id}')">إضافة صديق</button><button onclick="openChat('${profileUser.id}')">رسالة</button>`;

  document.getElementById("profilePostBox").innerHTML = isMe
    ? `<div class="box profile-edit-box">
        <h3>تعديل الحساب</h3>
        <img class="side-avatar profile-preview" src="${profileUser.avatar}">
        <input type="file" id="profileAvatarInput" accept="image/*">
        <textarea id="profileBio" rows="3" placeholder="أضف سيرتك الذاتية...">${escapeHtml(profileUser.bio || "")}</textarea>
        <button onclick="saveProfileChanges()">حفظ التغييرات</button>
        <p id="profileSaveMsg" class="muted"></p>
      </div>`
    : isRoot()
      ? `<div class="box">
          <h3>إدارة الحساب</h3>
          <button onclick="toggleBanUser('${profileUser.id}')">${profileUser.banned ? "إلغاء الحظر" : "حظر الحساب"}</button>
          <button class="danger-btn" onclick="deleteUser('${profileUser.id}')">حذف الحساب</button>
        </div>`
      : "";

  renderProfileFeed(userId);
  renderProfileReels(userId);
  showScreen("profileScreen");
}

function renderProfileFeed(userId) {
  const users = getUsers();
  const posts = getPosts()
    .filter(p => p.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
  document.getElementById("profileFeed").innerHTML =
    posts.map(p => postHTML(p, users)).join("") || `<div class="box">لا توجد منشورات بعد.</div>`;
}

function renderProfileReels(userId) {
  const box = document.getElementById("profileReelsFeed");
  if (!box) return;

  const reels = getReels()
    .filter(r => r.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);

  box.innerHTML = reels.length ? reels.map(r => `
    <div class="box reel-card">
      <video class="reel-video" controls src="${r.video}"></video>
      ${r.caption ? `<div class="content">${escapeHtml(r.caption)}</div>` : ""}
      <div class="meta">${new Date(r.createdAt).toLocaleString("ar-EG")}</div>
    </div>
  `).join("") : `<div class="box">لا توجد ريلز بعد.</div>`;
}

function saveProfileChanges() {
  if (isRoot()) return;

  const users = getUsers();
  const me = users.find(u => u.id === currentUser.id);
  if (!me) return;

  const bio = document.getElementById("profileBio").value.trim();
  const file = document.getElementById("profileAvatarInput").files[0];

  function finish(avatarData) {
    if (avatarData) me.avatar = avatarData;
    me.bio = bio;

    saveUsers(users);
    currentUser = me;
    localStorage.setItem("fb_currentUserId", me.id);

    renderTopbar();
    renderSidebar();
    renderAdminPanel();
    goToProfile(me.id);

    const msg = document.getElementById("profileSaveMsg");
    if (msg) msg.textContent = "تم حفظ التغييرات";
  }

  if (file) fileToDataURL(file, finish);
  else finish(null);
}

function addFriend(targetId) {
  if (isRoot()) return;

  const users = getUsers();
  const me = users.find(u => u.id === currentUser.id);
  const target = users.find(u => u.id === targetId);
  if (!me || !target || target.banned) return;

  if (!me.friends.includes(targetId)) {
    me.friends.push(targetId);
    target.friends.push(me.id);
    saveUsers(users);
    currentUser = me;
    goToProfile(targetId);
    renderSidebar();
    renderAdminPanel();
  }
}

// ============ إدارة المطور: المنشورات والحسابات ============
function deletePost(postId) {
  if (!isRoot()) return;
  const posts = getPosts().filter(p => p.id !== postId);
  savePosts(posts);
  renderFeed();
  if (currentProfileUserId) renderProfileFeed(currentProfileUserId);
  renderAdminPanel();
  renderReels();
}

function toggleBanUser(userId) {
  if (!isRoot() || userId === "root") return;

  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;

  user.banned = !user.banned;
  saveUsers(users);

  renderAdminPanel();
  renderFeed();
  renderReels();

  if (currentProfileUserId === userId) {
    goToProfile(userId);
  }
}

function deleteUser(userId) {
  if (!isRoot() || userId === "root") return;

  const users = getUsers();
  const posts = getPosts();
  const messages = getMessages();
  const reels = getReels();

  const filteredUsers = users.filter(u => u.id !== userId).map(u => {
    u.friends = (u.friends || []).filter(fid => fid !== userId);
    return u;
  });

  const filteredPosts = posts
    .filter(p => p.userId !== userId)
    .map(p => ({
      ...p,
      likes: (p.likes || []).filter(uid => uid !== userId),
      comments: (p.comments || []).filter(c => c.userId !== userId)
    }));

  const filteredMessages = messages.filter(m => m.fromId !== userId && m.toId !== userId);
  const filteredReels = reels.filter(r => r.userId !== userId);

  saveUsers(filteredUsers);
  savePosts(filteredPosts);
  saveMessages(filteredMessages);
  saveReels(filteredReels);

  if (currentUser && currentUser.id === userId) {
    logout();
    return;
  }

  renderAdminPanel();
  renderFeed();
  renderReels();

  if (currentProfileUserId === userId) {
    showScreen("homeScreen");
  }
}

// ============ عند تحميل الصفحة ============
window.onload = function () {
  const savedId = localStorage.getItem("fb_currentUserId");

  if (savedId === "root") {
    loginAsRoot();
    return;
  }

  if (savedId) {
    const user = getUsers().find(u => u.id === savedId);
    if (user) {
      if (user.banned) {
        localStorage.removeItem("fb_currentUserId");
        showScreen("loginScreen");
        const err = document.getElementById("loginError");
        err.textContent = "لم يعد هذا الحساب متوفرا في الوقت الحالي";
        err.style.color = "red";
        renderTopbar();
        return;
      }
      loginAs(user);
      return;
    }
  }

  showScreen("loginScreen");
};
