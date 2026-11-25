// ==========================================
// SOMATOGETHER - COMPLETE JAVASCRIPT
// ==========================================

// 1. FIREBASE CONFIGURATION

const firebaseConfig = {
  apiKey: "AIzaSyAxNzqen7cR0htPMgLVKoqp3tvsWhJJgUw",
  authDomain: "soma-together.firebaseapp.com",
  projectId: "soma-together",
  storageBucket: "soma-together.firebasestorage.app",
  messagingSenderId: "524938678671",
  appId: "1:524938678671:web:4fbf638f8f087f91a2fbfa",
  measurementId: "G-FWL42HCL1C"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// 2. HTML ELEMENTS

const authSection = document.getElementById("authSection");
const dashboard = document.getElementById("dashboard");
const message = document.getElementById("message");

const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");
const logoutButton = document.getElementById("logoutButton");
const resetPassword = document.getElementById("resetPassword");

const profileForm = document.getElementById("profileForm");
const postForm = document.getElementById("postForm");
const friendForm = document.getElementById("friendForm");

const greeting = document.getElementById("greeting");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");

const postsList = document.getElementById("postsList");
const requestsList = document.getElementById("requestsList");
const friendsList = document.getElementById("friendsList");

const signupName = document.getElementById("signupName");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const postContent = document.getElementById("postContent");
const friendEmail = document.getElementById("friendEmail");

// 3. APPLICATION STATE

let currentUser = null;
let activeListeners = [];

// 4. GENERAL FUNCTIONS

function showMessage(text) {
  if (message) {
    message.textContent = text;
  }
}

function addListener(unsubscribe) {
  activeListeners.push(unsubscribe);
}

function clearListeners() {
  activeListeners.forEach(function (unsubscribe) {
    unsubscribe();
  });

  activeListeners = [];
}

function showLogin() {
  authSection.hidden = false;
  dashboard.hidden = true;
}

function showDashboard(user) {
  authSection.hidden = true;
  dashboard.hidden = false;

  greeting.textContent =
    "Welcome, " + (user.displayName || "Learner") + "!";

  profileName.value = user.displayName || "";
  profileEmail.textContent = user.email || "";
}

// 5. REGISTRATION

signupForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const name = signupName.value.trim();
  const email = signupEmail.value.trim().toLowerCase();
  const password = signupPassword.value;

  if (!name || !email || !password) {
    showMessage("Please complete all registration fields.");
    return;
  }

  if (password.length < 6) {
    showMessage("Password must contain at least 6 characters.");
    return;
  }

  try {
    showMessage("Creating your account...");

    const result = await auth.createUserWithEmailAndPassword(
      email,
      password
    );

    await result.user.updateProfile({
      displayName: name
    });

    await db.collection("users").doc(result.user.uid).set({
      uid: result.user.uid,
      displayName: name,
      email: email,
      role: "user",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    signupForm.reset();
    showMessage("Account created successfully!");

  } catch (error) {
    showMessage("Registration failed: " + error.message);
  }
});

// 6. LOGIN

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const email = loginEmail.value.trim().toLowerCase();
  const password = loginPassword.value;

  if (!email || !password) {
    showMessage("Enter your email and password.");
    return;
  }

  try {
    showMessage("Logging in...");

    await auth.signInWithEmailAndPassword(email, password);

    loginForm.reset();
    showMessage("Welcome back!");

  } catch (error) {
    showMessage("Login failed: " + error.message);
  }
});

// 7. PASSWORD RECOVERY

resetPassword.addEventListener("click", async function (event) {
  event.preventDefault();

  const email = loginEmail.value.trim().toLowerCase();

  if (!email) {
    showMessage("Enter your email in the login box first.");
    return;
  }

  try {
    await auth.sendPasswordResetEmail(email);
    showMessage("Password reset email sent.");

  } catch (error) {
    showMessage("Password reset failed: " + error.message);
  }
});

// 8. AUTOMATIC AUTHENTICATION

auth.onAuthStateChanged(async function (user) {
  clearListeners();
  currentUser = user;

  if (!user) {
    showLogin();
    showMessage("Please log in or create an account.");
    return;
  }

  showDashboard(user);

  try {
    await db.collection("users").doc(user.uid).set({
      uid: user.uid,
      displayName: user.displayName || "Learner",
      email: user.email || "",
      role: "user"
    }, {
      merge: true
    });

    showMessage("Welcome to SomaTogether!");

  } catch (error) {
    showMessage("Profile saving failed: " + error.message);
  }

  listenForPosts();
  listenForRequests();
  listenForFriends();
});

// 9. UPDATE PROFILE

profileForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (!currentUser) return;

  const name = profileName.value.trim();

  if (!name) {
    showMessage("Please enter your name.");
    return;
  }

  try {
    await currentUser.updateProfile({
      displayName: name
    });

    await db.collection("users").doc(currentUser.uid).set({
      uid: currentUser.uid,
      displayName: name,
      email: currentUser.email,
      role: "user"
    }, {
      merge: true
    });

    greeting.textContent = "Welcome, " + name + "!";

    showMessage("Profile updated successfully!");

  } catch (error) {
    showMessage("Profile update failed: " + error.message);
  }
});

// 10. CREATE LEARNING POST

postForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (!currentUser) return;

  const content = postContent.value.trim();

  if (!content) {
    showMessage("Write something before publishing.");
    return;
  }

  try {
    await db.collection("posts").add({
      content: content,
      authorUid: currentUser.uid,
      authorName: currentUser.displayName || "Learner",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    postForm.reset();
    showMessage("Your post has been published!");

  } catch (error) {
    showMessage("Post failed: " + error.message);
  }
});

// 11. DISPLAY LEARNING POSTS

function listenForPosts() {
  const unsubscribe = db.collection("posts")
    .orderBy("createdAt", "desc")
    .limit(50)
    .onSnapshot(function (snapshot) {

      postsList.replaceChildren();

      if (snapshot.empty) {
        postsList.textContent =
          "No posts yet. Share something with the community!";
        return;
      }

      snapshot.forEach(function (doc) {
        const post = doc.data();

        const article = document.createElement("article");
        article.className = "post-item";

        const author = document.createElement("h3");
        author.textContent = post.authorName || "Learner";

        const content = document.createElement("p");
        content.textContent = post.content || "";

        article.appendChild(author);
        article.appendChild(content);
        postsList.appendChild(article);
      });

    }, function (error) {
      showMessage("Posts could not load: " + error.message);
    });

  addListener(unsubscribe);
}

// 12. SEND FRIEND REQUEST

friendForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (!currentUser) return;

  const email = friendEmail.value.trim().toLowerCase();

  if (!email) {
    showMessage("Enter the learner's email address.");
    return;
  }

  try {
    showMessage("Searching for learner...");

    const result = await db.collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (result.empty) {
      showMessage("No learner found with that email.");
      return;
    }

    const recipient = result.docs[0];

    if (recipient.id === currentUser.uid) {
      showMessage("You cannot add yourself.");
      return;
    }

    const previousRequests = await db.collection("friendRequests")
      .where("senderUid", "==", currentUser.uid)
      .get();

    const alreadyExists = previousRequests.docs.some(function (doc) {
      return doc.data().recipientUid === recipient.id;
    });

    if (alreadyExists) {
      showMessage("A request to this learner already exists.");
      return;
    }

    await db.collection("friendRequests").add({
      senderUid: currentUser.uid,
      senderName: currentUser.displayName || "Learner",
      recipientUid: recipient.id,
      recipientName: recipient.data().displayName || "Learner",
      status: "pending",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    friendForm.reset();
    showMessage("Friend request sent successfully!");

  } catch (error) {
    showMessage("Friend request failed: " + error.message);
  }
});

// 13. DISPLAY INCOMING FRIEND REQUESTS

function listenForRequests() {
  const unsubscribe = db.collection("friendRequests")
    .where("recipientUid", "==", currentUser.uid)
    .onSnapshot(function (snapshot) {

      requestsList.replaceChildren();

      const pending = snapshot.docs.filter(function (doc) {
        return doc.data().status === "pending";
      });

      if (pending.length === 0) {
        requestsList.textContent = "No pending friend requests.";
        return;
      }

      pending.forEach(function (doc) {
        const request = doc.data();

        const item = document.createElement("div");
        item.className = "request-item";

        const name = document.createElement("p");
        name.textContent = request.senderName || "Learner";

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Accept request";

        button.addEventListener("click", async function () {
          try {
            await doc.ref.update({
              status: "accepted",
              acceptedAt:
                firebase.firestore.FieldValue.serverTimestamp()
            });

            showMessage("Friend request accepted!");

          } catch (error) {
            showMessage("Could not accept request: " + error.message);
          }
        });

        item.appendChild(name);
        item.appendChild(button);
        requestsList.appendChild(item);
      });

    }, function (error) {
      showMessage("Requests could not load: " + error.message);
    });

  addListener(unsubscribe);
}

// 14. DISPLAY ACCEPTED FRIENDS

function listenForFriends() {
  const friends = new Map();

  function renderFriends() {
    friendsList.replaceChildren();

    if (friends.size === 0) {
      friendsList.textContent = "You have no connected friends yet.";
      return;
    }

    friends.forEach(function (friend) {
      const item = document.createElement("div");
      item.className = "friend-item";

      const name = document.createElement("p");
      name.textContent = friend.displayName || "Learner";

      item.appendChild(name);
      friendsList.appendChild(item);
    });
  }

  async function loadFriends(snapshot, otherField) {
    const accepted = snapshot.docs.filter(function (doc) {
      return doc.data().status === "accepted";
    });

    for (const doc of accepted) {
      const uid = doc.data()[otherField];

      if (!uid) continue;

      try {
        const userDoc = await db.collection("users").doc(uid).get();

        if (userDoc.exists) {
          friends.set(uid, userDoc.data());
        }

      } catch (error) {
        showMessage("Friend profile could not load: " + error.message);
      }
    }

    renderFriends();
  }

  const outgoing = db.collection("friendRequests")
    .where("senderUid", "==", currentUser.uid)
    .onSnapshot(function (snapshot) {
      loadFriends(snapshot, "recipientUid");
    }, function (error) {
      showMessage("Friends could not load: " + error.message);
    });

  const incoming = db.collection("friendRequests")
    .where("recipientUid", "==", currentUser.uid)
    .onSnapshot(function (snapshot) {
      loadFriends(snapshot, "senderUid");
    }, function (error) {
      showMessage("Friends could not load: " + error.message);
    });

  addListener(outgoing);
  addListener(incoming);
}

// 15. LOGOUT

logoutButton.addEventListener("click", async function () {
  try {
    await auth.signOut();
    clearListeners();
    showMessage("You have logged out successfully.");

  } catch (error) {
    showMessage("Logout failed: " + error.message);
  }
});

// ==========================================
// END OF SOMATOGETHER JAVASCRIPT
// ==========================================
