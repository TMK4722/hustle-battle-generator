const addButton = document.getElementById("addParticipant");
const nameInput = document.getElementById("name");
const judgeCheckbox = document.getElementById("judgeAvailable");
const danceOptions = document.getElementById("danceOptions");
const judgeOptions = document.getElementById("judgeOptions");
const editParticipantModal = document.getElementById("editParticipantModal");
const editParticipantName = document.getElementById("editParticipantName");
const editDanceOptions = document.getElementById("editDanceOptions");
const editJudgeOptions = document.getElementById("editJudgeOptions");
const editJudgeAvailable = document.getElementById("editJudgeAvailable");
const editParticipantCancel = document.getElementById("editParticipantCancel");
const editParticipantSave = document.getElementById("editParticipantSave");
const registrationCard = document.getElementById("registrationCard");
const registrationTitle = document.getElementById("registrationTitle");
const registrationDescription = document.getElementById("registrationDescription");
const participantList = document.getElementById("participantList");
const participantCount = document.getElementById("participantCount");
const emptyMessage = document.getElementById("emptyMessage");
const generateRoundButton = document.getElementById("generateRound");
const resetRoundDataButton = document.getElementById("resetRoundData");
const roundControlCard = document.getElementById("roundControlCard");
const roundResultCard = document.getElementById("roundResultCard");
const roundTitle = document.getElementById("roundTitle");
const battleCount = document.getElementById("battleCount");
const battleList = document.getElementById("battleList");
const waitingArea = document.getElementById("waitingArea");
const waitingList = document.getElementById("waitingList");
const roundPersonalStatus = document.getElementById("roundPersonalStatus");
const pairHistoryDetails = document.getElementById("pairHistoryDetails");
const pairHistoryList = document.getElementById("pairHistoryList");
const pairHistoryEmpty = document.getElementById("pairHistoryEmpty");
const opponentHistoryDetails = document.getElementById("opponentHistoryDetails");
const leaderOpponentList = document.getElementById("leaderOpponentList");
const leaderOpponentEmpty = document.getElementById("leaderOpponentEmpty");
const followerOpponentList = document.getElementById("followerOpponentList");
const followerOpponentEmpty = document.getElementById("followerOpponentEmpty");
const firebaseStatus = document.getElementById("firebaseStatus");
const firebaseUserInfo = document.getElementById("firebaseUserInfo");
const adminLoginButton = document.getElementById("adminLoginButton");
const adminLogoutButton = document.getElementById("adminLogoutButton");

const firebaseConfig = {
  apiKey: "AIzaSyCDgc7y6_gOpdXcqiuakwaBpYZPC0euXlI",
  authDomain: "hustle-battle-generator.firebaseapp.com",
  projectId: "hustle-battle-generator",
  storageBucket: "hustle-battle-generator.firebasestorage.app",
  messagingSenderId: "985205666015",
  appId: "1:985205666015:web:f17deffad37585696bb96a",
  measurementId: "G-E8X2L86JX7"
};

let firebaseAuth = null;
let firebaseDb = null;
let firebaseReady = false;
let currentFirebaseUser = null;
let isCurrentUserAdmin = false;
let participantsUnsubscribe = null;
let eventStateUnsubscribe = null;
let participantsLoaded = false;
let eventStateLoaded = false;
let eventStateExists = false;

let participants = [];
let currentRound = 0;
let participantStats = {};
let pairHistory = {};
let leaderOpponentHistory = {};
let followerOpponentHistory = {};
let lastRoundData = null;
let openParticipantMenuId = null;
let editingParticipantId = null;

function updateFirebaseStatus(status, detail = "") {
  firebaseStatus.textContent = status;
  firebaseUserInfo.textContent = detail;
}

function initializeFirebaseConnection() {
  if (typeof firebase === "undefined") {
    updateFirebaseStatus(
      "接続失敗",
      "Firebase SDKを読み込めませんでした。"
    );
    return;
  }

  try {
    if (firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
    }

    firebaseAuth = firebase.auth();
    firebaseDb = firebase.firestore();
    firebaseReady = true;

    firebaseAuth.onAuthStateChanged(
      async function (user) {
        currentFirebaseUser = user;
        isCurrentUserAdmin = false;

        if (!user) {
          stopRealtimeListeners();
          participantsLoaded = false;
          eventStateLoaded = false;

          updateFirebaseStatus(
            "接続中",
            "匿名認証を準備しています。"
          );

          try {
            await firebaseAuth.signInAnonymously();
          } catch (error) {
            console.error(error);

            updateFirebaseStatus(
              "認証失敗",
              error.code || error.message
            );
          }

          return;
        }

        await checkCurrentUserRole(user);

        startParticipantsListener();
        startEventStateListener();
      }
    );

  } catch (error) {
    console.error(error);

    updateFirebaseStatus(
      "接続失敗",
      error.message
    );
  }
}

async function checkCurrentUserRole(user) {
  if (user.isAnonymous) {
    isCurrentUserAdmin = false;

    updateFirebaseStatus(
      "接続OK",
      "匿名認証済み"
    );

    adminLoginButton.classList.remove("hidden");
    adminLogoutButton.classList.add("hidden");

    updatePermissionUI();
    return;
  }

  adminLoginButton.classList.add("hidden");
  adminLogoutButton.classList.remove("hidden");

  updateFirebaseStatus(
    "管理者確認中",
    user.email || ""
  );

  try {
    const snapshot =
      await firebaseDb
        .collection("admins")
        .doc(user.uid)
        .get();

    isCurrentUserAdmin =
      snapshot.exists &&
      snapshot.data() &&
      snapshot.data().role === "admin";

    if (isCurrentUserAdmin) {
      updateFirebaseStatus(
        "管理者認証OK",
        user.email || ""
      );

    } else {
      updateFirebaseStatus(
        "管理者権限なし",
        "このGoogleアカウントは管理者として登録されていません。"
      );
    }

  } catch (error) {
    console.error(error);

    isCurrentUserAdmin = false;

    updateFirebaseStatus(
      "管理者確認失敗",
      error.code || error.message
    );
  }

  updatePermissionUI();
}

async function loginAsAdmin() {
  if (!firebaseReady || !firebaseAuth) {
    return;
  }

  const provider =
    new firebase.auth.GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: "select_account"
  });

  try {
    const user = firebaseAuth.currentUser;

    if (user && user.isAnonymous) {
      try {
        await user.linkWithPopup(provider);
        return;

      } catch (error) {
        const fallbackCodes = [
          "auth/credential-already-in-use",
          "auth/email-already-in-use",
          "auth/provider-already-linked"
        ];

        if (!fallbackCodes.includes(error.code)) {
          throw error;
        }
      }
    }

    await firebaseAuth.signInWithPopup(provider);

  } catch (error) {
    console.error(error);

    if (error.code === "auth/popup-closed-by-user") {
      return;
    }

    alert(
      "Googleログインに失敗しました。\n" +
      (error.code || error.message)
    );
  }
}

async function exitAdminMode() {
  if (!firebaseAuth) {
    return;
  }

  try {
    await firebaseAuth.signOut();
  } catch (error) {
    console.error(error);
  }
}

function updatePermissionUI() {
  document.body.classList.toggle(
    "admin-mode",
    isCurrentUserAdmin
  );

  if (isCurrentUserAdmin) {
    roundControlCard.classList.remove("hidden");
    pairHistoryDetails.classList.remove("hidden");
    opponentHistoryDetails.classList.remove("hidden");

  } else {
    roundControlCard.classList.add("hidden");
    pairHistoryDetails.classList.add("hidden");
    opponentHistoryDetails.classList.add("hidden");
  }

  updateRegistrationDisplay();
  renderParticipantList();
  renderCurrentRound();
}

function updateRegistrationDisplay() {
  if (!currentFirebaseUser) {
    registrationCard.classList.add("hidden");
    return;
  }

  if (isCurrentUserAdmin) {
    registrationCard.classList.remove("hidden");

    registrationTitle.textContent =
      "参加者追加";

    registrationDescription.textContent =
      "管理者は参加者を何人でも追加できます。";

    addButton.textContent =
      "参加者を追加";

    return;
  }

  if (getCurrentParticipant()) {
    registrationCard.classList.add("hidden");

  } else {
    registrationCard.classList.remove("hidden");

    registrationTitle.textContent =
      "参加登録";

    registrationDescription.textContent =
      "この端末を使用する参加者を登録します。";

    addButton.textContent =
      "参加する";
  }
}

function startParticipantsListener() {
  if (!firebaseDb || !currentFirebaseUser) {
    return;
  }

  if (participantsUnsubscribe) {
    participantsUnsubscribe();
  }

  participantsLoaded = false;

  participantsUnsubscribe =
    firebaseDb
      .collection("participants")
      .onSnapshot(

        function (snapshot) {
          const previousMap = new Map();

          participants.forEach(
            function (participant) {
              previousMap.set(
                String(participant.id),
                participant
              );
            }
          );

          const incoming = [];

          snapshot.forEach(
            function (doc) {
              const remote = doc.data();
              const id = doc.id;
              const stats =
                participantStats[id] || {};

              incoming.push({
                id: id,

                uid:
                  typeof remote.uid === "string"
                    ? remote.uid
                    : null,

                name:
                  remote.name || "",

                participationType:
                  remote.participationType === "judgeOnly"
                    ? "judgeOnly"
                    : "dance",

                role:
                  remote.participationType === "judgeOnly"
                    ? "judgeOnly"
                    : (remote.role || "both"),

                judgeAvailable:
                  remote.judgeAvailable !== false,

                active:
                  remote.active !== false,

                danceCount:
                  getNumberOrZero(stats.danceCount),

                judgeCount:
                  getNumberOrZero(stats.judgeCount),

                danceFairCount:
                  getNumberOrZero(stats.danceFairCount),

                judgeFairCount:
                  getNumberOrZero(stats.judgeFairCount)
              });
            }
          );

          incoming.sort(
            function (a, b) {
              return a.name.localeCompare(
                b.name,
                "ja"
              );
            }
          );

          participants = incoming;
          participantsLoaded = true;

          maybeInitializeSharedState(
            previousMap
          );

          applyStatsToParticipants();
          renderAll();
        },

        function (error) {
          console.error(error);

          alert(
            "参加者一覧を取得できませんでした。\n" +
            (error.code || error.message)
          );
        }
      );
}

function startEventStateListener() {
  if (!firebaseDb || !currentFirebaseUser) {
    return;
  }

  if (eventStateUnsubscribe) {
    eventStateUnsubscribe();
  }

  eventStateLoaded = false;

  eventStateUnsubscribe =
    firebaseDb
      .collection("eventState")
      .doc("current")
      .onSnapshot(

        function (snapshot) {
          eventStateExists =
            snapshot.exists;

          if (snapshot.exists) {
            const data =
              snapshot.data() || {};

            currentRound =
              getNumberOrZero(
                data.currentRound
              );

            participantStats =
              data.participantStats || {};

            pairHistory =
              data.pairHistory || {};

            leaderOpponentHistory =
              data.leaderOpponentHistory || {};

            followerOpponentHistory =
              data.followerOpponentHistory || {};

            lastRoundData =
              data.lastRoundData || null;

          } else {
            currentRound = 0;
            participantStats = {};
            pairHistory = {};
            leaderOpponentHistory = {};
            followerOpponentHistory = {};
            lastRoundData = null;
          }

          eventStateLoaded = true;

          maybeInitializeSharedState();

          applyStatsToParticipants();
          renderAll();
        },

        function (error) {
          console.error(error);

          alert(
            "Round情報を取得できませんでした。\n" +
            (error.code || error.message)
          );
        }
      );
}

async function maybeInitializeSharedState(
  previousMap = null
) {
  if (
    !participantsLoaded ||
    !eventStateLoaded ||
    !isCurrentUserAdmin
  ) {
    return;
  }

  let changed = false;

  if (!eventStateExists) {
    initializeMissingParticipantStats();
    await saveEventState();
    return;
  }

  if (initializeMissingParticipantStats()) {
    changed = true;
  }

  if (
    previousMap &&
    adjustResumedParticipants(
      previousMap
    )
  ) {
    changed = true;
  }

  if (changed) {
    await saveEventState();
  }
}

function stopRealtimeListeners() {
  if (participantsUnsubscribe) {
    participantsUnsubscribe();
    participantsUnsubscribe = null;
  }

  if (eventStateUnsubscribe) {
    eventStateUnsubscribe();
    eventStateUnsubscribe = null;
  }
}

async function addParticipant() {
  if (!currentFirebaseUser || !firebaseDb) {
    alert(
      "Firebaseへの接続を待ってから登録してください。"
    );
    return;
  }

  const name =
    nameInput.value.trim();

  if (name === "") {
    alert(
      "名前を入力してください。"
    );

    nameInput.focus();
    return;
  }

  const selectedParticipationType =
    document.querySelector(
      'input[name="participationType"]:checked'
    );

  if (!selectedParticipationType) {
    alert(
      "参加区分を選択してください。"
    );
    return;
  }

  const participationType =
    selectedParticipationType.value;

  const selectedRole =
    document.querySelector(
      'input[name="role"]:checked'
    );

  if (
    participationType === "dance" &&
    !selectedRole
  ) {
    alert(
      "Roleを選択してください。"
    );
    return;
  }

  const role =
    participationType === "judgeOnly"
      ? "judgeOnly"
      : selectedRole.value;

  const judgeAvailable =
    participationType === "judgeOnly"
      ? true
      : judgeCheckbox.checked;

  addButton.disabled = true;

  try {
    const participantData = {
      name: name,
      participationType: participationType,
      role: role,
      judgeAvailable: judgeAvailable,
      active: true,
      danceCount: 0,
      judgeCount: 0,
      danceFairCount: 0,
      judgeFairCount: 0,

      createdAt:
        firebase.firestore
          .FieldValue
          .serverTimestamp()
    };

    if (isCurrentUserAdmin) {
      const docRef =
        firebaseDb
          .collection("participants")
          .doc();

      participantData.uid = null;

      await docRef.set(
        participantData
      );

    } else {
      if (getCurrentParticipant()) {
        alert(
          "この端末ではすでに参加登録されています。"
        );
        return;
      }

      const docRef =
        firebaseDb
          .collection("participants")
          .doc(
            currentFirebaseUser.uid
          );

      const existing =
        await docRef.get();

      if (existing.exists) {
        alert(
          "この端末ではすでに参加登録されています。"
        );
        return;
      }

      participantData.uid =
        currentFirebaseUser.uid;

      await docRef.set(
        participantData
      );
    }

    resetRegistrationForm();
    nameInput.focus();

  } catch (error) {
    console.error(error);

    alert(
      "参加者を登録できませんでした。\n" +
      (error.code || error.message)
    );

  } finally {
    addButton.disabled = false;
  }
}

function resetRegistrationForm() {
  nameInput.value = "";

  document.querySelectorAll(
    'input[name="role"]'
  ).forEach(
    function (input) {
      input.checked = false;
    }
  );

  const danceType =
    document.querySelector(
      'input[name="participationType"][value="dance"]'
    );

  if (danceType) {
    danceType.checked = true;
  }

  judgeCheckbox.checked = true;

  updateRegistrationParticipationUI();
}

function updateRegistrationParticipationUI() {
  const selected =
    document.querySelector(
      'input[name="participationType"]:checked'
    );

  const judgeOnly =
    selected &&
    selected.value === "judgeOnly";

  danceOptions.classList.toggle(
    "hidden",
    judgeOnly
  );

  if (judgeOnly) {
    judgeCheckbox.checked = true;
    judgeCheckbox.disabled = true;

  } else {
    judgeCheckbox.disabled = false;
  }
}

function getCurrentParticipant() {
  if (!currentFirebaseUser) {
    return null;
  }

  return participants.find(
    function (participant) {
      return (
        String(participant.id) ===
        currentFirebaseUser.uid
      );
    }
  ) || null;
}

function isCurrentParticipant(
  participant
) {
  if (
    !participant ||
    !currentFirebaseUser
  ) {
    return false;
  }

  return (
    String(participant.id) ===
    currentFirebaseUser.uid
  );
}

async function deleteParticipant(id) {
  if (!isCurrentUserAdmin) {
    return;
  }

  const participant =
    findParticipantById(id);

  if (!participant) {
    return;
  }

  if (
    !confirm(
      participant.name +
      " を参加者一覧から削除しますか？"
    )
  ) {
    return;
  }

  try {
    await firebaseDb
      .collection("participants")
      .doc(String(id))
      .delete();

    delete participantStats[
      String(id)
    ];

    removeParticipantFromHistories(
      String(id)
    );

    lastRoundData = null;

    await saveEventState();

    openParticipantMenuId = null;

  } catch (error) {
    console.error(error);

    alert(
      "参加者を削除できませんでした。\n" +
      (error.code || error.message)
    );
  }
}

function removeParticipantFromHistories(id) {
  removeParticipantFromHistoryObject(
    pairHistory,
    id
  );

  removeParticipantFromHistoryObject(
    leaderOpponentHistory,
    id
  );

  removeParticipantFromHistoryObject(
    followerOpponentHistory,
    id
  );
}

function removeParticipantFromHistoryObject(
  historyObject,
  id
) {
  Object.keys(
    historyObject
  ).forEach(
    function (key) {
      const item =
        historyObject[key];

      if (
        String(item.participantAId) === id ||
        String(item.participantBId) === id
      ) {
        delete historyObject[key];
      }
    }
  );
}

async function restParticipant(id) {
  await changeParticipantActive(
    id,
    false
  );
}

async function resumeParticipant(id) {
  await changeParticipantActive(
    id,
    true
  );
}

async function changeParticipantActive(
  id,
  active
) {
  if (
    !currentFirebaseUser ||
    !firebaseDb
  ) {
    return;
  }

  const isOwn =
    currentFirebaseUser.uid ===
    String(id);

  if (
    !isCurrentUserAdmin &&
    !isOwn
  ) {
    return;
  }

  try {
    await firebaseDb
      .collection("participants")
      .doc(String(id))
      .update({
        active: active
      });

    openParticipantMenuId = null;

  } catch (error) {
    console.error(error);

    alert(
      "状態を変更できませんでした。\n" +
      (error.code || error.message)
    );
  }
}

function toggleParticipantMenu(id) {
  const canManage =
    isCurrentUserAdmin ||
    (
      currentFirebaseUser &&
      currentFirebaseUser.uid ===
      String(id)
    );

  if (!canManage) {
    return;
  }

  openParticipantMenuId =
    openParticipantMenuId === id
      ? null
      : id;

  renderParticipantList();
}

function openParticipantEditModal(id) {
  if (!isCurrentUserAdmin) {
    return;
  }

  const participant =
    findParticipantById(id);

  if (!participant) {
    return;
  }

  editingParticipantId =
    String(id);

  editParticipantName.value =
    participant.name;

  const participationType =
    getParticipationType(
      participant
    );

  const typeInput =
    document.querySelector(
      'input[name="editParticipationType"][value="' +
      participationType +
      '"]'
    );

  if (typeInput) {
    typeInput.checked = true;
  }

  document.querySelectorAll(
    'input[name="editRole"]'
  ).forEach(
    function (input) {
      input.checked =
        participationType === "dance" &&
        input.value ===
        participant.role;
    }
  );

  editJudgeAvailable.checked =
    participationType === "judgeOnly"
      ? true
      : participant.judgeAvailable !== false;

  updateEditParticipationUI();

  editParticipantModal
    .classList
    .remove("hidden");

  editParticipantName.focus();
}

function closeParticipantEditModal() {
  editingParticipantId = null;

  editParticipantModal
    .classList
    .add("hidden");
}

function updateEditParticipationUI() {
  const selected =
    document.querySelector(
      'input[name="editParticipationType"]:checked'
    );

  const judgeOnly =
    selected &&
    selected.value === "judgeOnly";

  editDanceOptions.classList.toggle(
    "hidden",
    judgeOnly
  );

  if (judgeOnly) {
    editJudgeAvailable.checked = true;
    editJudgeAvailable.disabled = true;

  } else {
    editJudgeAvailable.disabled = false;
  }
}

async function saveParticipantEdit() {
  if (
    !isCurrentUserAdmin ||
    !firebaseDb ||
    !editingParticipantId
  ) {
    return;
  }

  const participant =
    findParticipantById(
      editingParticipantId
    );

  if (!participant) {
    closeParticipantEditModal();
    return;
  }

  const name =
    editParticipantName.value.trim();

  if (name === "") {
    alert(
      "名前を入力してください。"
    );

    editParticipantName.focus();
    return;
  }

  const selectedType =
    document.querySelector(
      'input[name="editParticipationType"]:checked'
    );

  if (!selectedType) {
    alert(
      "参加区分を選択してください。"
    );
    return;
  }

  const participationType =
    selectedType.value;

  const selectedRole =
    document.querySelector(
      'input[name="editRole"]:checked'
    );

  if (
    participationType === "dance" &&
    !selectedRole
  ) {
    alert(
      "Roleを選択してください。"
    );
    return;
  }

  const oldParticipationType =
    getParticipationType(
      participant
    );

  const oldJudgeAvailable =
    participant.judgeAvailable !== false;

  const role =
    participationType === "judgeOnly"
      ? "judgeOnly"
      : selectedRole.value;

  const judgeAvailable =
    participationType === "judgeOnly"
      ? true
      : editJudgeAvailable.checked;

  editParticipantSave.disabled = true;

  try {
    await firebaseDb
      .collection("participants")
      .doc(
        String(participant.id)
      )
      .update({
        name: name,
        participationType: participationType,
        role: role,
        judgeAvailable: judgeAvailable
      });

    const id =
      String(participant.id);

    participant.name = name;
    participant.participationType =
      participationType;
    participant.role = role;
    participant.judgeAvailable =
      judgeAvailable;

    if (!participantStats[id]) {
      participantStats[id] = {};
    }

    if (
      oldParticipationType === "judgeOnly" &&
      participationType === "dance"
    ) {
      const danceBaseline =
        getCurrentDanceFairBaseline(
          id
        );

      participant.danceFairCount =
        danceBaseline;

      participantStats[id]
        .danceFairCount =
        danceBaseline;
    }

    if (
      !oldJudgeAvailable &&
      judgeAvailable
    ) {
      const judgeBaseline =
        getCurrentJudgeFairBaseline(
          id
        );

      participant.judgeFairCount =
        judgeBaseline;

      participantStats[id]
        .judgeFairCount =
        judgeBaseline;
    }

    await saveEventState();

    openParticipantMenuId = null;

    closeParticipantEditModal();

  } catch (error) {
    console.error(error);

    alert(
      "参加者情報を変更できませんでした。\n" +
      (error.code || error.message)
    );

  } finally {
    editParticipantSave.disabled = false;
  }
}

async function saveEventState() {
  if (
    !isCurrentUserAdmin ||
    !firebaseDb
  ) {
    return;
  }

  syncStatsFromParticipants();

  try {
    await firebaseDb
      .collection("eventState")
      .doc("current")
      .set({
        currentRound: currentRound,
        participantStats: participantStats,
        pairHistory: pairHistory,
        leaderOpponentHistory: leaderOpponentHistory,
        followerOpponentHistory: followerOpponentHistory,
        lastRoundData: lastRoundData,

        updatedAt:
          firebase.firestore
            .FieldValue
            .serverTimestamp()
      });

    eventStateExists = true;

  } catch (error) {
    console.error(error);

    alert(
      "Round情報を保存できませんでした。\n" +
      (error.code || error.message)
    );
  }
}

function initializeMissingParticipantStats() {
  let changed = false;

  participants.forEach(
    function (participant) {
      const id =
        String(participant.id);

      if (participantStats[id]) {
        return;
      }

      participantStats[id] = {
        danceCount: 0,
        judgeCount: 0,

        danceFairCount:
          getParticipationType(
            participant
          ) === "dance"
            ? getCurrentDanceFairBaseline(id)
            : 0,

        judgeFairCount:
          participant.judgeAvailable
            ? getCurrentJudgeFairBaseline(id)
            : 0
      };

      changed = true;
    }
  );

  return changed;
}

function adjustResumedParticipants(
  previousMap
) {
  let changed = false;

  participants.forEach(
    function (participant) {
      const previous =
        previousMap.get(
          String(participant.id)
        );

      if (!previous) {
        return;
      }

      if (
        previous.active === false &&
        participant.active !== false
      ) {
        const id =
          String(participant.id);

        if (!participantStats[id]) {
          participantStats[id] = {};
        }

        if (
          getParticipationType(
            participant
          ) === "dance"
        ) {
          participantStats[id]
            .danceFairCount =
            getCurrentDanceFairBaseline(
              id
            );
        }

        if (participant.judgeAvailable) {
          participantStats[id]
            .judgeFairCount =
            getCurrentJudgeFairBaseline(
              id
            );
        }

        changed = true;
      }
    }
  );

  return changed;
}

function applyStatsToParticipants() {
  participants.forEach(
    function (participant) {
      const stats =
        participantStats[
          String(participant.id)
        ] || {};

      participant.danceCount =
        getNumberOrZero(
          stats.danceCount
        );

      participant.judgeCount =
        getNumberOrZero(
          stats.judgeCount
        );

      participant.danceFairCount =
        getNumberOrZero(
          stats.danceFairCount
        );

      participant.judgeFairCount =
        getNumberOrZero(
          stats.judgeFairCount
        );
    }
  );
}

function syncStatsFromParticipants() {
  const validIds =
    new Set();

  participants.forEach(
    function (participant) {
      const id =
        String(participant.id);

      validIds.add(id);

      participantStats[id] = {
        danceCount:
          getNumberOrZero(
            participant.danceCount
          ),

        judgeCount:
          getNumberOrZero(
            participant.judgeCount
          ),

        danceFairCount:
          getNumberOrZero(
            participant.danceFairCount
          ),

        judgeFairCount:
          getNumberOrZero(
            participant.judgeFairCount
          )
      };
    }
  );

  Object.keys(
    participantStats
  ).forEach(
    function (id) {
      if (!validIds.has(id)) {
        delete participantStats[id];
      }
    }
  );
}

function getCurrentDanceFairBaseline(
  excludeId = null
) {
  const targets =
    participants.filter(
      function (participant) {
        return (
          participant.active !== false &&
          getParticipationType(
            participant
          ) === "dance" &&
          String(participant.id) !==
          String(excludeId)
        );
      }
    );

  if (targets.length === 0) {
    return 0;
  }

  const total =
    targets.reduce(
      function (sum, participant) {
        return (
          sum +
          getDanceFairCount(
            participant
          )
        );
      },
      0
    );

  return total / targets.length;
}

function getCurrentJudgeFairBaseline(
  excludeId = null
) {
  const targets =
    participants.filter(
      function (participant) {
        return (
          participant.active !== false &&
          participant.judgeAvailable &&
          String(participant.id) !==
          String(excludeId)
        );
      }
    );

  if (targets.length === 0) {
    return 0;
  }

  const total =
    targets.reduce(
      function (sum, participant) {
        return (
          sum +
          getJudgeFairCount(
            participant
          )
        );
      },
      0
    );

  return total / targets.length;
}

async function generateRound() {
  if (!isCurrentUserAdmin) {
    return;
  }

  /*
    前Roundの最終BattleでDanceまたはJudgeを担当した人。
    次RoundのBattle 1では、できる限りDanceにもJudgeにも配置しない。
  */
  const previousFinalBattleParticipantIds =
    getPreviousFinalBattleParticipantIds();

  const activeDanceParticipants =
    participants.filter(
      function (participant) {
        return (
          participant.active !== false &&
          getParticipationType(
            participant
          ) === "dance"
        );
      }
    );

  if (
    activeDanceParticipants.length < 4
  ) {
    alert(
      "Dance参加中の人が4人以上必要です。"
    );
    return;
  }

  const fixedLeaders =
    sortByDanceCount(
      activeDanceParticipants.filter(
        function (participant) {
          return (
            participant.role ===
            "leader"
          );
        }
      )
    );

  const fixedFollowers =
    sortByDanceCount(
      activeDanceParticipants.filter(
        function (participant) {
          return (
            participant.role ===
            "follower"
          );
        }
      )
    );

  const both =
    sortByDanceCount(
      activeDanceParticipants.filter(
        function (participant) {
          return (
            participant.role ===
            "both"
          );
        }
      )
    );

  const leaders =
    [...fixedLeaders];

  const followers =
    [...fixedFollowers];

  both.forEach(
    function (participant) {
      if (
        leaders.length <
        followers.length
      ) {
        leaders.push(participant);

      } else if (
        followers.length <
        leaders.length
      ) {
        followers.push(participant);

      } else {
        if (Math.random() < 0.5) {
          leaders.push(participant);

        } else {
          followers.push(participant);
        }
      }
    }
  );

  const possiblePairCount =
    Math.min(
      leaders.length,
      followers.length
    );

  const usablePairCount =
    Math.floor(
      possiblePairCount / 2
    ) * 2;

  if (usablePairCount < 2) {
    alert(
      "2ペアを作成できません。Role構成を確認してください。"
    );
    return;
  }

  /*
    誰がこのRoundにDance出場するかは従来どおり
    danceFairCountで決める。
  */
  const selectedLeaders =
    sortByDanceCount(
      leaders
    ).slice(
      0,
      usablePairCount
    );

  const selectedFollowers =
    sortByDanceCount(
      followers
    ).slice(
      0,
      usablePairCount
    );

  /*
    v31:
    まず従来どおりPairとBattleを公平性優先で作る。
    そのBattle順の入れ替えだけでRound境界の連続を0人にできるなら、
    Pair構成は一切変更しない。

    順番変更だけでは連続を0人にできない場合に限り、
    Battle 1の4人・Pair構成を再検討する。
  */
  const standardPairs =
    createFairPairs(
      selectedLeaders,
      selectedFollowers
    );

  let battles =
    createFairBattles(
      standardPairs
    );

  const couldAvoidByReordering =
    moveZeroOverlapBattleToFront(
      battles,
      previousFinalBattleParticipantIds
    );

  if (!couldAvoidByReordering) {
    battles =
      createRoundBattlesWithProtectedFirstBattle(
        selectedLeaders,
        selectedFollowers,
        previousFinalBattleParticipantIds
      );
  }

  const usedIds =
    new Set();

  battles.forEach(
    function (battle) {
      [
        battle.pairA,
        battle.pairB
      ].forEach(
        function (pair) {
          usedIds.add(
            pair.leader.id
          );

          usedIds.add(
            pair.follower.id
          );

          pair.leader.danceCount++;
          pair.follower.danceCount++;

          pair.leader.danceFairCount =
            getDanceFairCount(
              pair.leader
            ) + 1;

          pair.follower.danceFairCount =
            getDanceFairCount(
              pair.follower
            ) + 1;

          addPairHistory(
            pair.leader,
            pair.follower
          );
        }
      );

      addOpponentHistory(
        leaderOpponentHistory,
        battle.pairA.leader,
        battle.pairB.leader
      );

      addOpponentHistory(
        followerOpponentHistory,
        battle.pairA.follower,
        battle.pairB.follower
      );
    }
  );

  battles.forEach(
    function (
      battle,
      battleIndex
    ) {
      battle.judges =
        selectJudgesForBattle(
          battle,
          3,

          battleIndex === 0
            ? previousFinalBattleParticipantIds
            : new Set()
        );

      battle.judges.forEach(
        function (judge) {
          judge.judgeCount++;

          judge.judgeFairCount =
            getJudgeFairCount(
              judge
            ) + 1;
        }
      );
    }
  );

  const waitingParticipants =
    activeDanceParticipants.filter(
      function (participant) {
        return (
          !usedIds.has(
            participant.id
          )
        );
      }
    );

  currentRound++;

  lastRoundData =
    serializeRound(
      battles,
      waitingParticipants,
      currentRound
    );

  syncStatsFromParticipants();

  await saveEventState();

  renderAll();
}

/*
  前Round最終Battleで
  DanceまたはJudgeを担当した人を取得。
*/
function getPreviousFinalBattleParticipantIds() {
  const result =
    new Set();

  if (
    !lastRoundData ||
    !Array.isArray(
      lastRoundData.battles
    ) ||
    lastRoundData.battles.length === 0
  ) {
    return result;
  }

  const finalBattle =
    lastRoundData.battles[
      lastRoundData.battles.length - 1
    ];

  if (!finalBattle) {
    return result;
  }

  const ids = [
    finalBattle.pairA &&
      finalBattle.pairA.leaderId,

    finalBattle.pairA &&
      finalBattle.pairA.followerId,

    finalBattle.pairB &&
      finalBattle.pairB.leaderId,

    finalBattle.pairB &&
      finalBattle.pairB.followerId,

    ...(
      finalBattle.judgeIds ||
      []
    )
  ];

  ids.forEach(
    function (id) {
      if (
        id !== null &&
        typeof id !== "undefined"
      ) {
        result.add(
          String(id)
        );
      }
    }
  );

  return result;
}

/*
  v31 第1段階:
  従来どおり作ったBattleの中に、前Round最終Battleとの
  Dance重複が0人のBattleがあれば、そのBattleを先頭へ移す。

  ここで成功した場合、Pair構成は一切変更しない。
*/
function moveZeroOverlapBattleToFront(
  battles,
  avoidIds
) {
  if (
    !Array.isArray(battles) ||
    battles.length === 0
  ) {
    return false;
  }

  if (
    !avoidIds ||
    avoidIds.size === 0
  ) {
    return true;
  }

  const zeroOverlapIndexes = [];

  battles.forEach(
    function (battle, index) {
      if (
        getBattleDanceOverlapCount(
          battle,
          avoidIds
        ) === 0
      ) {
        zeroOverlapIndexes.push(
          index
        );
      }
    }
  );

  if (zeroOverlapIndexes.length === 0) {
    return false;
  }

  const selectedIndex =
    getRandomItem(
      zeroOverlapIndexes
    );

  if (selectedIndex !== 0) {
    [
      battles[0],
      battles[selectedIndex]
    ] = [
      battles[selectedIndex],
      battles[0]
    ];
  }

  return true;
}

function getBattleDanceOverlapCount(
  battle,
  avoidIds
) {
  const dancerIds = [
    battle.pairA.leader.id,
    battle.pairA.follower.id,
    battle.pairB.leader.id,
    battle.pairB.follower.id
  ];

  return dancerIds.reduce(
    function (
      count,
      id
    ) {
      return (
        count +
        (
          avoidIds.has(
            String(id)
          )
            ? 1
            : 0
        )
      );
    },
    0
  );
}

/*
  v31 第2段階:
  Battle順の変更だけではRound境界の連続を0人にできなかった場合のみ使用。

  今Roundに出場する人自体は変更せず、Battle 1の4人・Pair構成を再検討する。
  連続人数を最優先で最小化し、その条件内でPair履歴と対戦履歴を評価する。
*/
function createRoundBattlesWithProtectedFirstBattle(
  selectedLeaders,
  selectedFollowers,
  avoidIds
) {
  const battles = [];

  if (
    selectedLeaders.length < 2 ||
    selectedFollowers.length < 2
  ) {
    return battles;
  }

  const firstBattle =
    selectProtectedFirstBattle(
      selectedLeaders,
      selectedFollowers,
      avoidIds
    );

  if (!firstBattle) {
    return battles;
  }

  battles.push({
    pairA: firstBattle.pairA,
    pairB: firstBattle.pairB,
    judges: []
  });

  const firstBattleLeaderIds =
    new Set([
      String(firstBattle.pairA.leader.id),
      String(firstBattle.pairB.leader.id)
    ]);

  const firstBattleFollowerIds =
    new Set([
      String(firstBattle.pairA.follower.id),
      String(firstBattle.pairB.follower.id)
    ]);

  const remainingLeaders =
    selectedLeaders.filter(
      function (participant) {
        return (
          !firstBattleLeaderIds.has(
            String(participant.id)
          )
        );
      }
    );

  const remainingFollowers =
    selectedFollowers.filter(
      function (participant) {
        return (
          !firstBattleFollowerIds.has(
            String(participant.id)
          )
        );
      }
    );

  if (
    remainingLeaders.length >= 2 &&
    remainingFollowers.length >= 2
  ) {
    const remainingPairs =
      createFairPairs(
        remainingLeaders,
        remainingFollowers
      );

    const remainingBattles =
      createFairBattles(
        remainingPairs
      );

    battles.push(
      ...remainingBattles
    );
  }

  return battles;
}

function selectProtectedFirstBattle(
  leaders,
  followers,
  avoidIds
) {
  let bestScore = null;
  let bestCandidates = [];

  for (
    let leaderAIndex = 0;
    leaderAIndex < leaders.length - 1;
    leaderAIndex++
  ) {
    for (
      let leaderBIndex = leaderAIndex + 1;
      leaderBIndex < leaders.length;
      leaderBIndex++
    ) {
      const leaderA =
        leaders[leaderAIndex];

      const leaderB =
        leaders[leaderBIndex];

      for (
        let followerAIndex = 0;
        followerAIndex < followers.length - 1;
        followerAIndex++
      ) {
        for (
          let followerBIndex = followerAIndex + 1;
          followerBIndex < followers.length;
          followerBIndex++
        ) {
          const followerA =
            followers[followerAIndex];

          const followerB =
            followers[followerBIndex];

          const arrangements = [
            {
              pairA: {
                leader: leaderA,
                follower: followerA
              },
              pairB: {
                leader: leaderB,
                follower: followerB
              }
            },
            {
              pairA: {
                leader: leaderA,
                follower: followerB
              },
              pairB: {
                leader: leaderB,
                follower: followerA
              }
            }
          ];

          arrangements.forEach(
            function (arrangement) {
              const score =
                getProtectedFirstBattleScore(
                  arrangement,
                  avoidIds
                );

              if (
                bestScore === null ||
                compareProtectedFirstBattleScores(
                  score,
                  bestScore
                ) < 0
              ) {
                bestScore = score;
                bestCandidates = [
                  arrangement
                ];

              } else if (
                compareProtectedFirstBattleScores(
                  score,
                  bestScore
                ) === 0
              ) {
                bestCandidates.push(
                  arrangement
                );
              }
            }
          );
        }
      }
    }
  }

  if (bestCandidates.length === 0) {
    return null;
  }

  return getRandomItem(
    bestCandidates
  );
}

function getProtectedFirstBattleScore(
  battle,
  avoidIds
) {
  const people = [
    battle.pairA.leader,
    battle.pairA.follower,
    battle.pairB.leader,
    battle.pairB.follower
  ];

  const continuityPenalty =
    people.reduce(
      function (
        count,
        participant
      ) {
        return (
          count +
          (
            avoidIds &&
            avoidIds.has(
              String(participant.id)
            )
              ? 1
              : 0
          )
        );
      },
      0
    );

  const pairHistoryPenalty =
    getPairHistoryCount(
      battle.pairA.leader,
      battle.pairA.follower
    )
    +
    getPairHistoryCount(
      battle.pairB.leader,
      battle.pairB.follower
    );

  const opponentHistoryPenalty =
    getBattleOpponentScore(
      battle.pairA,
      battle.pairB
    );

  return {
    continuityPenalty:
      continuityPenalty,
    pairHistoryPenalty:
      pairHistoryPenalty,
    opponentHistoryPenalty:
      opponentHistoryPenalty
  };
}

function compareProtectedFirstBattleScores(
  a,
  b
) {
  if (
    a.continuityPenalty !==
    b.continuityPenalty
  ) {
    return (
      a.continuityPenalty -
      b.continuityPenalty
    );
  }

  if (
    a.pairHistoryPenalty !==
    b.pairHistoryPenalty
  ) {
    return (
      a.pairHistoryPenalty -
      b.pairHistoryPenalty
    );
  }

  return (
    a.opponentHistoryPenalty -
    b.opponentHistoryPenalty
  );
}

function createFairPairs(
  leaders,
  followers
) {
  const pairs = [];

  const availableFollowers =
    [...followers];

  const orderedLeaders =
    sortByDanceCount(
      leaders
    );

  orderedLeaders.forEach(
    function (leader) {
      let minimumHistory =
        Infinity;

      let candidates = [];

      availableFollowers.forEach(
        function (follower) {
          const count =
            getPairHistoryCount(
              leader,
              follower
            );

          if (
            count <
            minimumHistory
          ) {
            minimumHistory =
              count;

            candidates =
              [follower];

          } else if (
            count ===
            minimumHistory
          ) {
            candidates.push(
              follower
            );
          }
        }
      );

      const selectedFollower =
        getRandomItem(
          candidates
        );

      pairs.push({
        leader: leader,
        follower: selectedFollower
      });

      const index =
        availableFollowers
          .findIndex(
            function (follower) {
              return (
                follower.id ===
                selectedFollower.id
              );
            }
          );

      availableFollowers.splice(
        index,
        1
      );
    }
  );

  return pairs;
}

function createFairBattles(pairs) {
  const battles = [];

  const availablePairs =
    shuffleArray(
      pairs
    );

  while (
    availablePairs.length >= 2
  ) {
    const pairA =
      availablePairs.shift();

    let minimumScore =
      Infinity;

    let candidates = [];

    availablePairs.forEach(
      function (pair) {
        const score =
          getBattleOpponentScore(
            pairA,
            pair
          );

        if (
          score <
          minimumScore
        ) {
          minimumScore =
            score;

          candidates =
            [pair];

        } else if (
          score ===
          minimumScore
        ) {
          candidates.push(
            pair
          );
        }
      }
    );

    const pairB =
      getRandomItem(
        candidates
      );

    battles.push({
      pairA: pairA,
      pairB: pairB,
      judges: []
    });

    availablePairs.splice(
      availablePairs.indexOf(
        pairB
      ),
      1
    );
  }

  return battles;
}

function getBattleOpponentScore(
  pairA,
  pairB
) {
  return (
    getOpponentHistoryCount(
      leaderOpponentHistory,
      pairA.leader,
      pairB.leader
    )
    +
    getOpponentHistoryCount(
      followerOpponentHistory,
      pairA.follower,
      pairB.follower
    )
  );
}

function selectJudgesForBattle(
  battle,
  requestedCount,
  avoidIds = new Set()
) {
  const dancerIds =
    new Set([
      battle.pairA.leader.id,
      battle.pairA.follower.id,
      battle.pairB.leader.id,
      battle.pairB.follower.id
    ]);

  const allCandidates =
    participants.filter(
      function (participant) {
        return (
          participant.active !== false &&
          participant.judgeAvailable &&
          !dancerIds.has(
            participant.id
          )
        );
      }
    );

  if (allCandidates.length === 0) {
    return [];
  }

  const judgeCount =
    Math.min(
      requestedCount,
      allCandidates.length
    );

  /*
    Battle 1では、前Round最終Battle担当者以外だけで
    Judge必要人数を確保できるなら、その人たちだけを候補にする。
    不足する場合だけ連続担当者を候補へ戻す。
  */
  const restedCandidates =
    allCandidates.filter(
      function (participant) {
        return (
          !avoidIds.has(
            String(participant.id)
          )
        );
      }
    );

  const candidates =
    restedCandidates.length >=
    judgeCount
      ? restedCandidates
      : allCandidates;

  const combinations =
    createCombinations(
      candidates,
      judgeCount
    );

  let bestScore = null;
  let bestCombinations = [];

  combinations.forEach(
    function (combination) {
      const score =
        getJudgeCombinationScore(
          combination,
          avoidIds
        );

      if (
        bestScore === null ||
        compareJudgeScores(
          score,
          bestScore
        ) < 0
      ) {
        bestScore = score;

        bestCombinations =
          [combination];

      } else if (
        compareJudgeScores(
          score,
          bestScore
        ) === 0
      ) {
        bestCombinations.push(
          combination
        );
      }
    }
  );

  return getRandomItem(
    bestCombinations
  );
}

function getJudgeCombinationScore(
  judges,
  avoidIds = new Set()
) {
  const counts =
    judges.map(
      function (judge) {
        return getJudgeFairCount(
          judge
        );
      }
    );

  const maximumCount =
    Math.max(
      ...counts
    );

  const totalCount =
    counts.reduce(
      function (sum, count) {
        return sum + count;
      },
      0
    );

  const continuityPenalty =
    judges.reduce(
      function (
        count,
        judge
      ) {
        return (
          count +
          (
            avoidIds.has(
              String(judge.id)
            )
              ? 1
              : 0
          )
        );
      },
      0
    );

  /*
    JudgeのみはRole構成上は中立扱い。
  */
  const danceJudgeRoles =
    judges
      .filter(
        function (judge) {
          return (
            getParticipationType(
              judge
            ) === "dance"
          );
        }
      )
      .map(
        function (judge) {
          return judge.role;
        }
      );

  const uniqueRoles =
    new Set(
      danceJudgeRoles
    ).size;

  let rolePenalty = 0;

  if (
    danceJudgeRoles.length >= 2
  ) {
    rolePenalty =
      danceJudgeRoles.length -
      uniqueRoles;
  }

  return {
    continuityPenalty:
      continuityPenalty,
    maximumCount: maximumCount,
    totalCount: totalCount,
    rolePenalty: rolePenalty
  };
}

function compareJudgeScores(a, b) {
  /*
    Battle 1ではRound境界の連続回避を最優先。
    連続条件が同じなら従来どおりJudge公平性を優先する。
  */
  if (
    a.continuityPenalty !==
    b.continuityPenalty
  ) {
    return (
      a.continuityPenalty -
      b.continuityPenalty
    );
  }

  if (
    a.maximumCount !==
    b.maximumCount
  ) {
    return (
      a.maximumCount -
      b.maximumCount
    );
  }

  if (
    a.totalCount !==
    b.totalCount
  ) {
    return (
      a.totalCount -
      b.totalCount
    );
  }

  return (
    a.rolePenalty -
    b.rolePenalty
  );
}

function createCombinations(
  array,
  size
) {
  const result = [];

  function build(
    start,
    current
  ) {
    if (
      current.length === size
    ) {
      result.push(
        [...current]
      );
      return;
    }

    for (
      let i = start;
      i < array.length;
      i++
    ) {
      current.push(
        array[i]
      );

      build(
        i + 1,
        current
      );

      current.pop();
    }
  }

  build(
    0,
    []
  );

  return result;
}

function getHistoryKey(a, b) {
  return [
    String(a.id),
    String(b.id)
  ]
    .sort()
    .join("|");
}

function getPairHistoryCount(
  a,
  b
) {
  const item =
    pairHistory[
      getHistoryKey(
        a,
        b
      )
    ];

  return item
    ? item.count
    : 0;
}

function addPairHistory(a, b) {
  const key =
    getHistoryKey(
      a,
      b
    );

  if (!pairHistory[key]) {
    pairHistory[key] = {
      participantAId: a.id,
      participantBId: b.id,
      count: 1
    };

  } else {
    pairHistory[key].count++;
  }
}

function addOpponentHistory(
  history,
  a,
  b
) {
  const key =
    getHistoryKey(
      a,
      b
    );

  if (!history[key]) {
    history[key] = {
      participantAId: a.id,
      participantBId: b.id,
      count: 1
    };

  } else {
    history[key].count++;
  }
}

function getOpponentHistoryCount(
  history,
  a,
  b
) {
  const item =
    history[
      getHistoryKey(
        a,
        b
      )
    ];

  return item
    ? item.count
    : 0;
}

function getDanceFairCount(
  participant
) {
  return getNumberOrZero(
    participant.danceFairCount
  );
}

function getJudgeFairCount(
  participant
) {
  return getNumberOrZero(
    participant.judgeFairCount
  );
}

function serializeRound(
  battles,
  waitingParticipants,
  roundNumber
) {
  return {
    roundNumber: roundNumber,

    battles:
      battles.map(
        function (battle) {
          return {
            pairA: {
              leaderId:
                battle.pairA.leader.id,

              followerId:
                battle.pairA.follower.id
            },

            pairB: {
              leaderId:
                battle.pairB.leader.id,

              followerId:
                battle.pairB.follower.id
            },

            judgeIds:
              battle.judges.map(
                function (judge) {
                  return judge.id;
                }
              )
          };
        }
      ),

    waitingIds:
      waitingParticipants.map(
        function (participant) {
          return participant.id;
        }
      )
  };
}

async function resetRoundData() {
  if (!isCurrentUserAdmin) {
    return;
  }

  const confirmed =
    confirm(
      "Roundデータをリセットしますか？\n\n" +
      "リセットされるもの：\n" +
      "・Round番号\n" +
      "・Dance / Judge回数\n" +
      "・Pair履歴\n" +
      "・対戦履歴\n\n" +
      "参加者の登録情報は残ります。"
    );

  if (!confirmed) {
    return;
  }

  currentRound = 0;

  pairHistory = {};
  leaderOpponentHistory = {};
  followerOpponentHistory = {};

  lastRoundData = null;

  participants.forEach(
    function (participant) {
      participant.danceCount = 0;
      participant.judgeCount = 0;
      participant.danceFairCount = 0;
      participant.judgeFairCount = 0;
    }
  );

  syncStatsFromParticipants();

  await saveEventState();

  renderAll();
}

function renderAll() {
  applyStatsToParticipants();
  renderParticipantList();
  renderPairHistory();
  renderOpponentSummary();
  updateRegistrationDisplay();
  renderCurrentRound();
}

function renderParticipantList() {
  participantList.innerHTML = "";

  participants.forEach(
    function (participant) {
      const isOwn =
        isCurrentParticipant(
          participant
        );

      const canManage =
        isCurrentUserAdmin ||
        isOwn;

      const item =
        document.createElement(
          "div"
        );

      item.className =
        "participant-item";

      const row =
        document.createElement(
          "div"
        );

      row.className =
        "participant-row";

      if (canManage) {
        row.classList.add(
          "can-manage"
        );
      }

      if (
        participant.active === false
      ) {
        row.classList.add(
          "is-resting"
        );
      }

      if (canManage) {
        row.addEventListener(
          "click",
          function () {
            toggleParticipantMenu(
              participant.id
            );
          }
        );
      }

      const main =
        document.createElement(
          "div"
        );

      main.className =
        "participant-main";

      const nameLine =
        document.createElement(
          "div"
        );

      nameLine.className =
        "participant-name-line";

      const name =
        document.createElement(
          "div"
        );

      name.className =
        "participant-name";

      name.textContent =
        participant.name;

      nameLine.appendChild(
        name
      );

      if (isOwn) {
        const badge =
          document.createElement(
            "span"
          );

        badge.className =
          "participant-self-badge";

        badge.textContent =
          "自分";

        nameLine.appendChild(
          badge
        );
      }

      main.appendChild(
        nameLine
      );

      if (
        participant.active === false
      ) {
        const rest =
          document.createElement(
            "div"
          );

        rest.className =
          "participant-rest-status";

        rest.textContent =
          "休憩中";

        main.appendChild(
          rest
        );
      }

      const role =
        document.createElement(
          "div"
        );

      role.className =
        "participant-role";

      role.textContent =
        getParticipationType(
          participant
        ) === "judgeOnly"
          ? "Judgeのみ"
          : getRoleLabel(
              participant.role
            );

      const count =
        document.createElement(
          "div"
        );

      count.className =
        "participant-count";

      count.textContent =
        "D" +
        participant.danceCount +
        " / J" +
        participant.judgeCount;

      const judge =
        document.createElement(
          "div"
        );

      judge.className =
        "participant-judge";

      if (participant.judgeAvailable) {
        judge.textContent = "J✓";

      } else {
        judge.textContent = "－";

        judge.classList.add(
          "unavailable"
        );
      }

      let deleteElement;

      if (isCurrentUserAdmin) {
        deleteElement =
          document.createElement(
            "button"
          );

        deleteElement.type =
          "button";

        deleteElement.className =
          "delete-button";

        deleteElement.textContent =
          "×";

        deleteElement.addEventListener(
          "click",
          function (event) {
            event.stopPropagation();

            deleteParticipant(
              participant.id
            );
          }
        );

      } else {
        deleteElement =
          document.createElement(
            "div"
          );

        deleteElement.className =
          "delete-placeholder";
      }

      row.appendChild(main);
      row.appendChild(role);
      row.appendChild(count);
      row.appendChild(judge);
      row.appendChild(deleteElement);

      item.appendChild(row);

      if (
        canManage &&
        openParticipantMenuId ===
        participant.id
      ) {
        const panel =
          document.createElement(
            "div"
          );

        panel.className =
          "participant-action-panel";

        if (isCurrentUserAdmin) {
          const editButton =
            document.createElement(
              "button"
            );

          editButton.type =
            "button";

          editButton.className =
            "participant-action-button participant-edit-button";

          editButton.textContent =
            "登録内容を編集";

          editButton.addEventListener(
            "click",
            function (event) {
              event.stopPropagation();

              openParticipantEditModal(
                participant.id
              );
            }
          );

          panel.appendChild(
            editButton
          );
        }

        const button =
          document.createElement(
            "button"
          );

        button.type =
          "button";

        button.className =
          "participant-action-button";

        if (
          participant.active === false
        ) {
          button.textContent =
            "復帰する";

          button.addEventListener(
            "click",
            function () {
              resumeParticipant(
                participant.id
              );
            }
          );

        } else {
          button.textContent =
            "休憩にする";

          button.addEventListener(
            "click",
            function () {
              restParticipant(
                participant.id
              );
            }
          );
        }

        const note =
          document.createElement(
            "div"
          );

        note.className =
          "participant-action-note";

        note.textContent =
          participant.active === false
            ? "復帰するとBattle・Judgeの対象に戻ります。"
            : "休憩中はBattle・Judgeの対象外になります。";

        panel.appendChild(button);
        panel.appendChild(note);

        item.appendChild(panel);
      }

      participantList.appendChild(
        item
      );
    }
  );

  const activeCount =
    participants.filter(
      function (participant) {
        return (
          participant.active !== false
        );
      }
    ).length;

  if (participants.length === 0) {
    participantCount.textContent =
      "0人";

  } else if (
    activeCount ===
    participants.length
  ) {
    participantCount.textContent =
      participants.length +
      "人";

  } else {
    participantCount.textContent =
      activeCount +
      "/" +
      participants.length +
      "人参加中";
  }

  emptyMessage.style.display =
    participants.length === 0
      ? "block"
      : "none";
}

function renderPairHistory() {
  pairHistoryList.innerHTML = "";

  const items =
    Object.values(
      pairHistory
    )
      .filter(
        function (item) {
          return (
            findParticipantById(
              item.participantAId
            )
            &&
            findParticipantById(
              item.participantBId
            )
          );
        }
      )
      .sort(
        function (a, b) {
          return (
            b.count -
            a.count
          );
        }
      );

  pairHistoryEmpty.style.display =
    items.length === 0
      ? "block"
      : "none";

  items.forEach(
    function (item) {
      const a =
        findParticipantById(
          item.participantAId
        );

      const b =
        findParticipantById(
          item.participantBId
        );

      const row =
        document.createElement(
          "div"
        );

      row.className =
        "history-row";

      const names =
        document.createElement(
          "div"
        );

      names.className =
        "history-names";

      names.textContent =
        a.name +
        " + " +
        b.name;

      const count =
        document.createElement(
          "div"
        );

      count.className =
        "history-count";

      count.textContent =
        item.count +
        "回";

      row.appendChild(names);
      row.appendChild(count);

      pairHistoryList.appendChild(
        row
      );
    }
  );
}

function renderOpponentSummary() {
  renderOpponentRoleSummary(
    getParticipantsUsedAsRole(
      "leader"
    ),
    leaderOpponentHistory,
    leaderOpponentList,
    leaderOpponentEmpty
  );

  renderOpponentRoleSummary(
    getParticipantsUsedAsRole(
      "follower"
    ),
    followerOpponentHistory,
    followerOpponentList,
    followerOpponentEmpty
  );
}

function renderOpponentRoleSummary(
  roleParticipants,
  history,
  target,
  empty
) {
  target.innerHTML = "";

  empty.style.display =
    roleParticipants.length === 0
      ? "block"
      : "none";

  roleParticipants.forEach(
    function (participant) {
      const summary =
        getTopOpponents(
          participant,
          history
        );

      const row =
        document.createElement(
          "div"
        );

      row.className =
        "opponent-row";

      const name =
        document.createElement(
          "div"
        );

      name.className =
        "opponent-name";

      name.textContent =
        participant.name;

      const arrow =
        document.createElement(
          "div"
        );

      arrow.className =
        "opponent-arrow";

      arrow.textContent =
        "→";

      const opponents =
        document.createElement(
          "div"
        );

      opponents.className =
        "opponent-targets";

      const count =
        document.createElement(
          "div"
        );

      count.className =
        "opponent-count";

      if (summary.count === 0) {
        opponents.textContent =
          "－";

        count.textContent =
          "";

      } else {
        opponents.textContent =
          summary.opponents
            .map(
              function (opponent) {
                return opponent.name;
              }
            )
            .join(" / ");

        count.textContent =
          summary.count +
          "回";
      }

      row.appendChild(name);
      row.appendChild(arrow);
      row.appendChild(opponents);
      row.appendChild(count);

      target.appendChild(row);
    }
  );
}

function getTopOpponents(
  participant,
  history
) {
  let maximumCount = 0;
  let opponents = [];

  Object.values(
    history
  ).forEach(
    function (item) {
      let opponentId = null;

      if (
        String(item.participantAId) ===
        String(participant.id)
      ) {
        opponentId =
          item.participantBId;

      } else if (
        String(item.participantBId) ===
        String(participant.id)
      ) {
        opponentId =
          item.participantAId;
      }

      if (opponentId === null) {
        return;
      }

      const opponent =
        findParticipantById(
          opponentId
        );

      if (!opponent) {
        return;
      }

      if (
        item.count >
        maximumCount
      ) {
        maximumCount =
          item.count;

        opponents =
          [opponent];

      } else if (
        item.count ===
        maximumCount
      ) {
        opponents.push(
          opponent
        );
      }
    }
  );

  return {
    count: maximumCount,
    opponents: opponents
  };
}

function getParticipantsUsedAsRole(
  role
) {
  const ids = new Set();

  const history =
    role === "leader"
      ? leaderOpponentHistory
      : followerOpponentHistory;

  Object.values(
    history
  ).forEach(
    function (item) {
      ids.add(
        String(
          item.participantAId
        )
      );

      ids.add(
        String(
          item.participantBId
        )
      );
    }
  );

  return participants.filter(
    function (participant) {
      return ids.has(
        String(
          participant.id
        )
      );
    }
  );
}

function renderPersonalRoundStatus() {
  if (
    !roundPersonalStatus ||
    !lastRoundData
  ) {
    return;
  }

  const currentParticipant =
    getCurrentParticipant();

  if (!currentParticipant) {
    roundPersonalStatus
      .classList
      .add("hidden");

    roundPersonalStatus.textContent =
      "";

    return;
  }

  const currentId =
    String(
      currentParticipant.id
    );

  const danceBattles = [];
  const judgeBattles = [];

  lastRoundData.battles.forEach(
    function (
      battle,
      index
    ) {
      const battleNumber =
        index + 1;

      const dancerIds = [
        battle.pairA.leaderId,
        battle.pairA.followerId,
        battle.pairB.leaderId,
        battle.pairB.followerId
      ].map(String);

      const judgeIds =
        (battle.judgeIds || [])
          .map(String);

      if (
        dancerIds.includes(
          currentId
        )
      ) {
        danceBattles.push(
          battleNumber
        );
      }

      if (
        judgeIds.includes(
          currentId
        )
      ) {
        judgeBattles.push(
          battleNumber
        );
      }
    }
  );

  const messages = [];

  if (
    getParticipationType(
      currentParticipant
    ) === "judgeOnly"
  ) {
    messages.push(
      "Judgeのみ参加"
    );

  } else if (
    danceBattles.length > 0
  ) {
    messages.push(
      "Dance：Battle " +
      danceBattles.join(" / ")
    );

  } else {
    messages.push(
      "今回はDanceなし"
    );
  }

  if (
    judgeBattles.length > 0
  ) {
    messages.push(
      "Judge：Battle " +
      judgeBattles.join(" / ")
    );
  }

  roundPersonalStatus.textContent =
    messages.join("　");

  roundPersonalStatus
    .classList
    .remove("hidden");
}

function renderCurrentRound() {
  if (!lastRoundData) {
    roundResultCard
      .classList
      .add("hidden");

    roundPersonalStatus
      .classList
      .add("hidden");

    return;
  }

  const battles = [];

  lastRoundData.battles.forEach(
    function (stored) {
      const aLeader =
        findParticipantById(
          stored.pairA.leaderId
        );

      const aFollower =
        findParticipantById(
          stored.pairA.followerId
        );

      const bLeader =
        findParticipantById(
          stored.pairB.leaderId
        );

      const bFollower =
        findParticipantById(
          stored.pairB.followerId
        );

      if (
        !aLeader ||
        !aFollower ||
        !bLeader ||
        !bFollower
      ) {
        return;
      }

      const judges =
        (stored.judgeIds || [])
          .map(
            function (id) {
              return findParticipantById(
                id
              );
            }
          )
          .filter(Boolean);

      battles.push({
        pairA: {
          leader: aLeader,
          follower: aFollower
        },

        pairB: {
          leader: bLeader,
          follower: bFollower
        },

        judges: judges
      });
    }
  );

  const waiting =
    (lastRoundData.waitingIds || [])
      .map(
        function (id) {
          return findParticipantById(
            id
          );
        }
      )
      .filter(Boolean);

  if (battles.length === 0) {
    roundResultCard
      .classList
      .add("hidden");

    return;
  }

  renderRound(
    battles,
    waiting,
    lastRoundData.roundNumber
  );

  renderPersonalRoundStatus();
}

function renderRound(
  battles,
  waiting,
  roundNumber
) {
  roundResultCard
    .classList
    .remove("hidden");

  roundTitle.textContent =
    "Round " +
    roundNumber;

  battleCount.textContent =
    battles.length +
    " Battle";

  battleList.innerHTML = "";

  battles.forEach(
    function (
      battle,
      index
    ) {
      const currentParticipant =
        getCurrentParticipant();

      const currentId =
        currentParticipant
          ? String(
              currentParticipant.id
            )
          : null;

      const dancerIds = [
        battle.pairA.leader.id,
        battle.pairA.follower.id,
        battle.pairB.leader.id,
        battle.pairB.follower.id
      ].map(String);

      const judgeIds =
        battle.judges.map(
          function (judge) {
            return String(
              judge.id
            );
          }
        );

      const isMyDance =
        currentId &&
        dancerIds.includes(
          currentId
        );

      const isMyJudge =
        currentId &&
        judgeIds.includes(
          currentId
        );

      const isMyBattle =
        isMyDance ||
        isMyJudge;

      const card =
        document.createElement(
          "div"
        );

      card.className =
        "battle-card";

      if (isMyBattle) {
        card.classList.add(
          "my-battle"
        );
      }

      const titleRow =
        document.createElement(
          "div"
        );

      titleRow.className =
        "battle-title-row";

      const title =
        document.createElement(
          "div"
        );

      title.className =
        "battle-title";

      title.textContent =
        "Battle " +
        (index + 1);

      titleRow.appendChild(
        title
      );

      if (isMyBattle) {
        const badge =
          document.createElement(
            "span"
          );

        badge.className =
          "my-battle-badge";

        if (isMyDance) {
          badge.textContent =
            "YOUR BATTLE";

        } else {
          badge.textContent =
            "YOU JUDGE";
        }

        titleRow.appendChild(
          badge
        );
      }

      card.appendChild(
        titleRow
      );

      card.appendChild(
        createPairElement(
          "Pair A",
          battle.pairA
        )
      );

      const vs =
        document.createElement(
          "div"
        );

      vs.className =
        "vs";

      vs.textContent =
        "VS";

      card.appendChild(
        vs
      );

      card.appendChild(
        createPairElement(
          "Pair B",
          battle.pairB
        )
      );

      card.appendChild(
        createJudgeElement(
          battle.judges
        )
      );

      battleList.appendChild(
        card
      );
    }
  );

  waitingList.innerHTML = "";

  if (waiting.length === 0) {
    waitingArea
      .classList
      .add("hidden");

  } else {
    waitingArea
      .classList
      .remove("hidden");

    waiting.forEach(
      function (participant) {
        const item =
          document.createElement(
            "span"
          );

        item.className =
          "waiting-person";

        if (
          isCurrentParticipant(
            participant
          )
        ) {
          item.classList.add(
            "my-waiting"
          );
        }

        item.textContent =
          participant.name +
          "（D" +
          participant.danceCount +
          "）";

        waitingList.appendChild(
          item
        );
      }
    );
  }
}

function createPairElement(
  label,
  pair
) {
  const box =
    document.createElement(
      "div"
    );

  box.className =
    "pair-box";

  const labelElement =
    document.createElement(
      "div"
    );

  labelElement.className =
    "pair-label";

  labelElement.textContent =
    label;

  box.appendChild(
    labelElement
  );

  box.appendChild(
    createPersonRow(
      "Leader",
      pair.leader
    )
  );

  box.appendChild(
    createPersonRow(
      "Follower",
      pair.follower
    )
  );

  return box;
}

function createPersonRow(
  role,
  participant
) {
  const row =
    document.createElement(
      "div"
    );

  row.className =
    "pair-person";

  if (
    isCurrentParticipant(
      participant
    )
  ) {
    row.classList.add(
      "my-assignment"
    );
  }

  const roleElement =
    document.createElement(
      "span"
    );

  roleElement.className =
    "person-role";

  roleElement.textContent =
    role;

  const nameElement =
    document.createElement(
      "span"
    );

  nameElement.className =
    "person-name";

  nameElement.textContent =
    participant.name;

  row.appendChild(
    roleElement
  );

  row.appendChild(
    nameElement
  );

  return row;
}

function createJudgeElement(
  judges
) {
  const box =
    document.createElement(
      "div"
    );

  box.className =
    "judge-box";

  const title =
    document.createElement(
      "div"
    );

  title.className =
    "judge-box-title";

  title.textContent =
    "Judge";

  box.appendChild(
    title
  );

  if (judges.length === 0) {
    const warning =
      document.createElement(
        "div"
      );

    warning.className =
      "judge-warning";

    warning.textContent =
      "Judge候補がいません。";

    box.appendChild(
      warning
    );

    return box;
  }

  const list =
    document.createElement(
      "div"
    );

  list.className =
    "judge-list";

  judges.forEach(
    function (judge) {
      const item =
        document.createElement(
          "div"
        );

      item.className =
        "judge-person";

      if (
        isCurrentParticipant(
          judge
        )
      ) {
        item.classList.add(
          "my-judge"
        );
      }

      const name =
        document.createElement(
          "span"
        );

      name.textContent =
        judge.name;

      const role =
        document.createElement(
          "span"
        );

      role.className =
        "judge-role";

      role.textContent =
        getParticipationType(
          judge
        ) === "judgeOnly"
          ? "Judgeのみ"
          : getRoleLabel(
              judge.role
            );

      item.appendChild(name);
      item.appendChild(role);

      list.appendChild(
        item
      );
    }
  );

  box.appendChild(
    list
  );

  if (judges.length < 3) {
    const warning =
      document.createElement(
        "div"
      );

    warning.className =
      "judge-warning";

    warning.style.marginTop =
      "8px";

    warning.textContent =
      "Judge候補不足のため " +
      judges.length +
      "人で選定しています。";

    box.appendChild(
      warning
    );
  }

  return box;
}

function sortByDanceCount(
  array
) {
  return array
    .map(
      function (participant) {
        return {
          participant: participant,
          random: Math.random()
        };
      }
    )
    .sort(
      function (a, b) {
        const diff =
          getDanceFairCount(
            a.participant
          )
          -
          getDanceFairCount(
            b.participant
          );

        if (diff !== 0) {
          return diff;
        }

        return (
          a.random -
          b.random
        );
      }
    )
    .map(
      function (item) {
        return item.participant;
      }
    );
}

function shuffleArray(array) {
  const copied =
    [...array];

  for (
    let i = copied.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );

    [
      copied[i],
      copied[j]
    ] = [
      copied[j],
      copied[i]
    ];
  }

  return copied;
}

function getRandomItem(array) {
  return array[
    Math.floor(
      Math.random() *
      array.length
    )
  ];
}

function findParticipantById(id) {
  return participants.find(
    function (participant) {
      return (
        String(participant.id) ===
        String(id)
      );
    }
  );
}

function getNumberOrZero(value) {
  return (
    typeof value === "number"
      ? value
      : 0
  );
}

function getParticipationType(
  participant
) {
  if (
    participant &&
    participant.participationType ===
    "judgeOnly"
  ) {
    return "judgeOnly";
  }

  return "dance";
}

function getRoleLabel(role) {
  if (role === "leader") {
    return "Leader";
  }

  if (role === "follower") {
    return "Follower";
  }

  return "Both";
}

addButton.addEventListener(
  "click",
  addParticipant
);

nameInput.addEventListener(
  "keydown",
  function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addParticipant();
    }
  }
);

document.querySelectorAll(
  'input[name="participationType"]'
).forEach(
  function (input) {
    input.addEventListener(
      "change",
      updateRegistrationParticipationUI
    );
  }
);

document.querySelectorAll(
  'input[name="editParticipationType"]'
).forEach(
  function (input) {
    input.addEventListener(
      "change",
      updateEditParticipationUI
    );
  }
);

editParticipantCancel.addEventListener(
  "click",
  closeParticipantEditModal
);

editParticipantSave.addEventListener(
  "click",
  saveParticipantEdit
);

editParticipantModal.addEventListener(
  "click",
  function (event) {
    if (
      event.target ===
      editParticipantModal
    ) {
      closeParticipantEditModal();
    }
  }
);

generateRoundButton.addEventListener(
  "click",
  generateRound
);

resetRoundDataButton.addEventListener(
  "click",
  resetRoundData
);

adminLoginButton.addEventListener(
  "click",
  loginAsAdmin
);

adminLogoutButton.addEventListener(
  "click",
  exitAdminMode
);

updateRegistrationParticipationUI();

renderAll();

initializeFirebaseConnection();