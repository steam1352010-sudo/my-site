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

let currentUser = null;
let currentProfileUserId = null;

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

// ============ التنقل بين الشاشات ============
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.style.display = "none");
  document.getElementById(id).style.display = "block";
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
    errorEl.textContent = "لقد تم حضر هذا الحساب";
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
  showScreen("homeScreen");
  renderFeed();
}

function logout() {
  currentUser = null;
  currentProfileUserId = null;
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

// ============ الشريط الجانبي (الرئيسية) ============
function renderSidebar() {
  if (!currentUser) return;

  document.getElementById("sideAvatar").src = currentUser.avatar;
  document.getElementById("sideName").textContent = isRoot()
    ? "Root"
    : `${currentUser.name} (@${currentUser.username})`;

  if (isRoot()) {
    document.getElementById("sideFriends").textContent =
      "المستخدمون: " + getUsers().length + " | المنشورات: " + getPosts().length;
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
              ${u.banned ? `<div class="banned-note">لقد تم حضر هذا الحساب</div>` : ""}
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
      ${bannedAuthor ? `<span class="banned-note inline-note">لقد تم حضر هذا الحساب</span>` : ""}
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

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

  const statusEl = document.getElementById("profStatusNote");
  statusEl.innerHTML = profileUser.banned ? `<span class="banned-note">لقد تم حضر هذا الحساب</span>` : "";

  const isMe = profileUser.id === currentUser.id;
  const isFriend = !isRoot() && Array.isArray(currentUser.friends) && currentUser.friends.includes(profileUser.id);

  document.getElementById("friendActionBox").innerHTML = isMe
    ? ""
    : isRoot()
      ? `<p class="muted">يمكنك إدارة هذا الحساب من هنا</p>`
      : profileUser.banned
        ? ""
        : isFriend
          ? `<p class="muted" style="color:green;">صديق بالفعل ✔</p>`
          : `<button onclick="addFriend('${profileUser.id}')">إضافة صديق</button>`;

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

  if (currentProfileUserId === userId) {
    goToProfile(userId);
  }
}

function deleteUser(userId) {
  if (!isRoot() || userId === "root") return;

  const users = getUsers();
  const posts = getPosts();

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

  saveUsers(filteredUsers);
  savePosts(filteredPosts);

  if (currentUser && currentUser.id === userId) {
    logout();
    return;
  }

  renderAdminPanel();
  renderFeed();

  if (currentProfileUserId === userId) {
    showScreen("homeScreen");
  }
}

// ============ عند تحميل الصفحة ============
window.onload = function () {
  const savedId = localStorage.getItem("fb_currentUserId");
  if (savedId && savedId !== "root") {
    const user = getUsers().find(u => u.id === savedId);
    if (user) {
      if (user.banned) {
        localStorage.removeItem("fb_currentUserId");
        showScreen("loginScreen");
        const err = document.getElementById("loginError");
        err.textContent = "لقد تم حضر هذا الحساب";
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
