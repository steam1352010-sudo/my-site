// ============ إدارة البيانات (localStorage) ============
function getUsers() { return JSON.parse(localStorage.getItem("fb_users") || "[]"); }
function saveUsers(u) { localStorage.setItem("fb_users", JSON.stringify(u)); }
function getPosts() { return JSON.parse(localStorage.getItem("fb_posts") || "[]"); }
function savePosts(p) { localStorage.setItem("fb_posts", JSON.stringify(p)); }

let currentUser = null;

// ============ التنقل بين الشاشات ============
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.style.display = "none");
  document.getElementById(id).style.display = "block";
}

// ============ تسجيل حساب ============
function handleRegister() {
  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const errorEl = document.getElementById("registerError");
  errorEl.textContent = "";

  if (!name || !email || !password) {
    errorEl.textContent = "الرجاء تعبئة جميع الحقول";
    return;
  }
  const users = getUsers();
  if (users.find(u => u.email === email)) {
    errorEl.textContent = "هذا البريد الإلكتروني مسجل بالفعل";
    return;
  }
  const newUser = {
    id: Date.now().toString(),
    name, email, password,
    avatar: "https://via.placeholder.com/150/3b5998/ffffff?text=" + encodeURIComponent(name[0] || "U"),
    friends: [],
    createdAt: Date.now()
  };
  users.push(newUser);
  saveUsers(users);
  loginAs(newUser);
}

// ============ تسجيل الدخول ============
function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
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
  currentUser = user;
  localStorage.setItem("fb_currentUserId", user.id);
  renderTopbar();
  renderSidebar();
  showScreen("homeScreen");
  renderFeed();
}

function logout() {
  currentUser = null;
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
  document.getElementById("sideAvatar").src = currentUser.avatar;
  document.getElementById("sideName").textContent = currentUser.name;
  document.getElementById("sideFriends").textContent = "الأصدقاء: " + currentUser.friends.length;
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
    reader.onload = e => savePost(e.target.result); // يحفظ الصورة كـ base64
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
  // إعادة رسم القائمة الحالية (رئيسية أو بروفايل)
  if (document.getElementById("homeScreen").style.display !== "none") renderFeed();
  else renderProfileFeed(currentProfileUserId);
}

// ============ التعليقات ============
function handleCommentKey(event, postId, input) {
  if (event.key === "Enter" && input.value.trim()) {
    const posts = getPosts();
    const post = posts.find(p => p.id === postId);
    post.comments.push({ userId: currentUser.id, text: input.value.trim(), createdAt: Date.now() });
    savePosts(posts);
    input.value = "";
    if (document.getElementById("homeScreen").style.display !== "none") renderFeed();
    else renderProfileFeed(currentProfileUserId);
  }
}

// ============ صفحة البروفايل ============
let currentProfileUserId = null;

function goToProfile(userId) {
  currentProfileUserId = userId;
  const users = getUsers();
  const profileUser = users.find(u => u.id === userId);
  if (!profileUser) return;

  document.getElementById("profAvatar").src = profileUser.avatar;
  document.getElementById("profName").textContent = profileUser.name;
  document.getElementById("profFriends").textContent = "الأصدقاء: " + profileUser.friends.length;

  const isMe = profileUser.id === currentUser.id;
  const isFriend = currentUser.friends.includes(profileUser.id);

  document.getElementById("friendActionBox").innerHTML = isMe
    ? ""
    : isFriend
      ? `<p class="muted" style="color:green;">صديق بالفعل ✔</p>`
      : `<button onclick="addFriend('${profileUser.id}')">إضافة صديق</button>`;

  document.getElementById("profilePostBox").innerHTML = isMe
    ? `<div class="box">
        <h3>بماذا تفكر؟</h3>
        <textarea id="postText" rows="2" placeholder="اكتب منشوراً..."></textarea>
        <input type="file" id="postImage" accept="image/*">
        <button onclick="createPost()">نشر</button>
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

function addFriend(targetId) {
  const users = getUsers();
  const me = users.find(u => u.id === currentUser.id);
  const target = users.find(u => u.id === targetId);
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