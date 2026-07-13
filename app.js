// ============ إدارة البيانات (localStorage) ============
function getUsers() { return JSON.parse(localStorage.getItem("fb_users") || "[]"); }
function saveUsers(u) { localStorage.setItem("fb_users", JSON.stringify(u)); }
function getPosts() { return JSON.parse(localStorage.getItem("fb_posts") || "[]"); }
function savePosts(p) { localStorage.setItem("fb_posts", JSON.stringify(p)); }

let currentUser = null;
let currentProfileUserId = null;

// ============ أدوات مساعدة ============
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
  let email = document.getElementById("registerEmail").value.trim().toLowerCase();
  const password = document.getElementById("registerPassword").value;
  const bio = document.getElementById("registerBio").value.trim();
  const avatarFile = document.getElementById("registerAvatar").files[0];
  const errorEl = document.getElementById("registerError");
  errorEl.textContent = "";

  if (!name || !email || !password) {
    errorEl.textContent = "الرجاء تعبئة جميع الحقول";
    return;
  }

  if (!validateEmail(email)) {
    errorEl.textContent = "البريد يجب أن يكون مثل: username@gmail.com أو username@hotmail.com";
    return;
  }

  const users = getUsers();
  if (users.find(u => u.email === email)) {
    errorEl.textContent = "هذا البريد الإلكتروني مسجل بالفعل";
    return;
  }

  fileToDataURL(avatarFile, (avatarData) => {
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password,
      bio,
      avatar: avatarData || "https://via.placeholder.com/150/3b5998/ffffff?text=" + encodeURIComponent(name[0] || "U"),
      friends: [],
      createdAt: Date.now()
    };

    users.push(newUser);
    saveUsers(users);
    loginAs(newUser);
  });
}

// ============ تسجيل الدخول ============
function handleLogin() {
  let email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;
  const errorEl = document.getElementById("loginError");
  errorEl.textContent = "";

  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    errorEl.textContent = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
    return;
  }
  loginAs(user);
}

function loginAs(user) {
  const users = getUsers();
  currentUser = users.find(u => u.id === user.id) || user;
  localStorage.setItem("fb_currentUserId", currentUser.id);
  renderTopbar();
  renderSidebar();
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
  if (currentUser) {
    el.innerHTML = `
      <a onclick="goToProfile(currentUser.id)">${currentUser.name}</a>
      <a onclick="logout()">تسجيل خروج</a>`;
  } else {
    el.innerHTML = "";
  }
}

// ============ الشريط الجانبي (الرئيسية) ============
function renderSidebar() {
  if (!currentUser) return;
  document.getElementById("sideAvatar").src = currentUser.avatar;
  document.getElementById("sideName").textContent = currentUser.name;
  document.getElementById("sideFriends").textContent = "الأصدقاء: " + currentUser.friends.length;
  document.getElementById("homeSideBio").textContent = currentUser.bio ? currentUser.bio : "لا توجد سيرة ذاتية بعد";
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
  document.getElementById("feed").innerHTML = posts.map(p => postHTML(p, users)).join("") || `<div class="box">لا توجد منشورات بعد.</div>`;
}

function postHTML(post, users) {
  const author = users.find(u => u.id === post.userId);
  const liked = post.likes.includes(currentUser.id);
  return `
  <div class="box post" data-post-id="${post.id}">
    <div>
      <img class="userpic" src="${author ? author.avatar : ""}">
      <a class="author" onclick="goToProfile('${post.userId}')">${author ? author.name : "مستخدم محذوف"}</a>
    </div>
    <div class="content">${escapeHtml(post.text)}</div>
    ${post.image ? `<img class="postimg" src="${post.image}">` : ""}
    <div class="meta">${new Date(post.createdAt).toLocaleString("ar-EG")}</div>
    <div class="actions">
      <a onclick="toggleLike('${post.id}')">${liked ? "إلغاء الإعجاب" : "أعجبني"} (${post.likes.length})</a>
      <span>تعليقات (${post.comments.length})</span>
    </div>
    <div class="comments">
      ${post.comments.map(c => {
        const cu = users.find(u => u.id === c.userId);
        return `<div class="comment"><b>${cu ? cu.name : "مستخدم"}:</b> ${escapeHtml(c.text)}</div>`;
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

  const isMe = profileUser.id === currentUser.id;
  const isFriend = currentUser.friends.includes(profileUser.id);

  document.getElementById("friendActionBox").innerHTML = isMe
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
    : "";

  renderProfileFeed(userId);
  showScreen("profileScreen");
}

function renderProfileFeed(userId) {
  const users = getUsers();
  const posts = getPosts()
    .filter(p => p.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
  document.getElementById("profileFeed").innerHTML = posts.map(p => postHTML(p, users)).join("") || `<div class="box">لا توجد منشورات بعد.</div>`;
}

function saveProfileChanges() {
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
    if (currentProfileUserId === me.id) {
      goToProfile(me.id);
      const msg = document.getElementById("profileSaveMsg");
      if (msg) msg.textContent = "تم حفظ التغييرات";
    }
  }

  if (file) fileToDataURL(file, finish);
  else finish(null);
}

function addFriend(targetId) {
  const users = getUsers();
  const me = users.find(u => u.id === currentUser.id);
  const target = users.find(u => u.id === targetId);
  if (!me || !target) return;

  if (!me.friends.includes(targetId)) {
    me.friends.push(targetId);
    target.friends.push(me.id);
    saveUsers(users);
    currentUser = me;
    goToProfile(targetId);
    renderSidebar();
  }
}

// ============ عند تحميل الصفحة ============
window.onload = function () {
  const savedId = localStorage.getItem("fb_currentUserId");
  if (savedId) {
    const user = getUsers().find(u => u.id === savedId);
    if (user) {
      loginAs(user);
      return;
    }
  }
  showScreen("loginScreen");
};
