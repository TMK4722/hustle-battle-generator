/* ========================================
   DOM
======================================== */

const addButton =
  document.getElementById("addParticipant");

const nameInput =
  document.getElementById("name");

const judgeCheckbox =
  document.getElementById("judgeAvailable");

const registrationCard =
  document.getElementById("registrationCard");

const registrationTitle =
  document.getElementById("registrationTitle");

const registrationDescription =
  document.getElementById("registrationDescription");

const participantList =
  document.getElementById("participantList");

const participantCount =
  document.getElementById("participantCount");

const emptyMessage =
  document.getElementById("emptyMessage");

const generateRoundButton =
  document.getElementById("generateRound");

const resetRoundDataButton =
  document.getElementById("resetRoundData");

const roundControlCard =
  document.getElementById("roundControlCard");

const roundResultCard =
  document.getElementById("roundResultCard");

const roundTitle =
  document.getElementById("roundTitle");

const battleCount =
  document.getElementById("battleCount");

const battleList =
  document.getElementById("battleList");

const waitingArea =
  document.getElementById("waitingArea");

const waitingList =
  document.getElementById("waitingList");

const roundPersonalStatus =
  document.getElementById("roundPersonalStatus");

const pairHistoryDetails =
  document.getElementById("pairHistoryDetails");

const pairHistoryList =
  document.getElementById("pairHistoryList");

const pairHistoryEmpty =
  document.getElementById("pairHistoryEmpty");

const opponentHistoryDetails =
  document.getElementById("opponentHistoryDetails");

const leaderOpponentList =
  document.getElementById("leaderOpponentList");

const leaderOpponentEmpty =
  document.getElementById("leaderOpponentEmpty");

const followerOpponentList =
  document.getElementById("followerOpponentList");

const followerOpponentEmpty =
  document.getElementById("followerOpponentEmpty");

const firebaseStatus =
  document.getElementById("firebaseStatus");

const firebaseUserInfo =
  document.getElementById("firebaseUserInfo");

const adminLoginButton =
  document.getElementById("adminLoginButton");

const adminLogoutButton =
  document.getElementById("adminLogoutButton");


/* ========================================
   Firebase
======================================== */

const firebaseConfig = {

  apiKey:
    "AIzaSyCDgc7y6_gOpdXcqiuakwaBpYZPC0euXlI",

  authDomain:
    "hustle-battle-generator.firebaseapp.com",

  projectId:
    "hustle-battle-generator",

  storageBucket:
    "hustle-battle-generator.firebasestorage.app",

  messagingSenderId:
    "985205666015",

  appId:
    "1:985205666015:web:f17deffad37585696bb96a",

  measurementId:
    "G-E8X2L86JX7"
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


/* ========================================
   アプリ状態
======================================== */

let participants = [];

let currentRound = 0;

let participantStats = {};

let pairHistory = {};

let leaderOpponentHistory = {};

let followerOpponentHistory = {};

let lastRoundData = null;

let openParticipantMenuId = null;


/* ========================================
   Firebase表示
======================================== */

function updateFirebaseStatus(
  status,
  detail = ""
) {

  firebaseStatus.textContent =
    status;

  firebaseUserInfo.textContent =
    detail;
}


/* ========================================
   Firebase初期化
======================================== */

function initializeFirebaseConnection() {

  if (
    typeof firebase ===
    "undefined"
  ) {

    updateFirebaseStatus(
      "接続失敗",
      "Firebase SDKを読み込めませんでした。"
    );

    return;
  }


  try {

    if (
      firebase.apps.length === 0
    ) {

      firebase.initializeApp(
        firebaseConfig
      );
    }


    firebaseAuth =
      firebase.auth();

    firebaseDb =
      firebase.firestore();

    firebaseReady =
      true;


    firebaseAuth.onAuthStateChanged(
      async function (user) {

        currentFirebaseUser =
          user;

        isCurrentUserAdmin =
          false;


        if (!user) {

          stopRealtimeListeners();

          participantsLoaded =
            false;

          eventStateLoaded =
            false;


          updateFirebaseStatus(
            "接続中",
            "匿名認証を準備しています。"
          );


          try {

            await firebaseAuth
              .signInAnonymously();

          } catch (error) {

            console.error(error);

            updateFirebaseStatus(
              "認証失敗",
              error.code ||
              error.message
            );
          }


          return;
        }


        await checkCurrentUserRole(
          user
        );


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


/* ========================================
   管理者確認
======================================== */

async function checkCurrentUserRole(
  user
) {

  if (user.isAnonymous) {

    isCurrentUserAdmin =
      false;


    updateFirebaseStatus(
      "接続OK",
      "匿名認証済み"
    );


    adminLoginButton
      .classList
      .remove("hidden");


    adminLogoutButton
      .classList
      .add("hidden");


    updatePermissionUI();

    return;
  }


  adminLoginButton
    .classList
    .add("hidden");


  adminLogoutButton
    .classList
    .remove("hidden");


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
      snapshot.data().role ===
      "admin";


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

    isCurrentUserAdmin =
      false;


    updateFirebaseStatus(
      "管理者確認失敗",
      error.code ||
      error.message
    );
  }


  updatePermissionUI();
}


/* ========================================
   Google管理者ログイン
======================================== */

async function loginAsAdmin() {

  if (
    !firebaseReady ||
    !firebaseAuth
  ) {
    return;
  }


  const provider =
    new firebase.auth
      .GoogleAuthProvider();


  provider.setCustomParameters({
    prompt:
      "select_account"
  });


  try {

    const user =
      firebaseAuth.currentUser;


    if (
      user &&
      user.isAnonymous
    ) {

      try {

        await user.linkWithPopup(
          provider
        );

        return;

      } catch (error) {

        const fallbackCodes = [
          "auth/credential-already-in-use",
          "auth/email-already-in-use",
          "auth/provider-already-linked"
        ];


        if (
          !fallbackCodes.includes(
            error.code
          )
        ) {
          throw error;
        }
      }
    }


    await firebaseAuth
      .signInWithPopup(
        provider
      );

  } catch (error) {

    console.error(error);


    if (
      error.code ===
      "auth/popup-closed-by-user"
    ) {
      return;
    }


    alert(
      "Googleログインに失敗しました。\n" +
      (
        error.code ||
        error.message
      )
    );
  }
}


/* ========================================
   管理者ログアウト
======================================== */

async function exitAdminMode() {

  if (!firebaseAuth) {
    return;
  }


  try {

    await firebaseAuth
      .signOut();

  } catch (error) {

    console.error(error);
  }
}


/* ========================================
   権限UI
======================================== */

function updatePermissionUI() {

  document.body.classList.toggle(
    "admin-mode",
    isCurrentUserAdmin
  );


  if (isCurrentUserAdmin) {

    roundControlCard
      .classList
      .remove("hidden");

    pairHistoryDetails
      .classList
      .remove("hidden");

    opponentHistoryDetails
      .classList
      .remove("hidden");

  } else {

    roundControlCard
      .classList
      .add("hidden");

    pairHistoryDetails
      .classList
      .add("hidden");

    opponentHistoryDetails
      .classList
      .add("hidden");
  }


  updateRegistrationDisplay();

  renderParticipantList();

  renderCurrentRound();
}


/* ========================================
   参加登録欄
======================================== */

function updateRegistrationDisplay() {

  if (!currentFirebaseUser) {

    registrationCard
      .classList
      .add("hidden");

    return;
  }


  if (isCurrentUserAdmin) {

    registrationCard
      .classList
      .remove("hidden");


    registrationTitle.textContent =
      "参加者追加";


    registrationDescription.textContent =
      "管理者は参加者を何人でも追加できます。";


    addButton.textContent =
      "参加者を追加";

    return;
  }


  if (getCurrentParticipant()) {

    registrationCard
      .classList
      .add("hidden");

  } else {

    registrationCard
      .classList
      .remove("hidden");


    registrationTitle.textContent =
      "参加登録";


    registrationDescription.textContent =
      "この端末を使用する参加者を登録します。";


    addButton.textContent =
      "参加する";
  }
}


/* ========================================
   参加者監視
======================================== */

function startParticipantsListener() {

  if (
    !firebaseDb ||
    !currentFirebaseUser
  ) {
    return;
  }


  if (participantsUnsubscribe) {
    participantsUnsubscribe();
  }


  participantsLoaded =
    false;


  participantsUnsubscribe =
    firebaseDb
      .collection("participants")
      .onSnapshot(

        function (snapshot) {

          const previousMap =
            new Map();


          participants.forEach(
            function (participant) {

              previousMap.set(
                String(
                  participant.id
                ),
                participant
              );
            }
          );


          const incoming =
            [];


          snapshot.forEach(
            function (doc) {

              const remote =
                doc.data();

              const id =
                doc.id;

              const stats =
                participantStats[id] ||
                {};


              incoming.push({

                id:
                  id,

                uid:
                  typeof remote.uid ===
                  "string"
                    ? remote.uid
                    : null,

                name:
                  remote.name || "",

                role:
                  remote.role ||
                  "both",

                judgeAvailable:
                  remote.judgeAvailable !==
                  false,

                active:
                  remote.active !==
                  false,

                danceCount:
                  getNumberOrZero(
                    stats.danceCount
                  ),

                judgeCount:
                  getNumberOrZero(
                    stats.judgeCount
                  ),

                danceFairCount:
                  getNumberOrZero(
                    stats.danceFairCount
                  ),

                judgeFairCount:
                  getNumberOrZero(
                    stats.judgeFairCount
                  )
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


          participants =
            incoming;


          participantsLoaded =
            true;


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
            (
              error.code ||
              error.message
            )
          );
        }
      );
}


/* ========================================
   eventState監視
======================================== */

function startEventStateListener() {

  if (
    !firebaseDb ||
    !currentFirebaseUser
  ) {
    return;
  }


  if (eventStateUnsubscribe) {
    eventStateUnsubscribe();
  }


  eventStateLoaded =
    false;


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
              snapshot.data() ||
              {};


            currentRound =
              getNumberOrZero(
                data.currentRound
              );


            participantStats =
              data.participantStats ||
              {};


            pairHistory =
              data.pairHistory ||
              {};


            leaderOpponentHistory =
              data.leaderOpponentHistory ||
              {};


            followerOpponentHistory =
              data.followerOpponentHistory ||
              {};


            lastRoundData =
              data.lastRoundData ||
              null;

          } else {

            currentRound = 0;

            participantStats = {};

            pairHistory = {};

            leaderOpponentHistory = {};

            followerOpponentHistory = {};

            lastRoundData = null;
          }


          eventStateLoaded =
            true;


          maybeInitializeSharedState();


          applyStatsToParticipants();

          renderAll();

        },

        function (error) {

          console.error(error);


          alert(
            "Round情報を取得できませんでした。\n" +
            (
              error.code ||
              error.message
            )
          );
        }
      );
}


/* ========================================
   初期化
======================================== */

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


  let changed =
    false;


  if (!eventStateExists) {

    initializeMissingParticipantStats();

    await saveEventState();

    return;
  }


  if (
    initializeMissingParticipantStats()
  ) {
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


/* ========================================
   Listener停止
======================================== */

function stopRealtimeListeners() {

  if (participantsUnsubscribe) {

    participantsUnsubscribe();

    participantsUnsubscribe =
      null;
  }


  if (eventStateUnsubscribe) {

    eventStateUnsubscribe();

    eventStateUnsubscribe =
      null;
  }
}


/* ========================================
   参加者追加
======================================== */

async function addParticipant() {

  if (
    !currentFirebaseUser ||
    !firebaseDb
  ) {

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


  const selectedRole =
    document.querySelector(
      'input[name="role"]:checked'
    );


  if (!selectedRole) {

    alert(
      "Roleを選択してください。"
    );

    return;
  }


  addButton.disabled =
    true;


  try {

    if (isCurrentUserAdmin) {

      const docRef =
        firebaseDb
          .collection("participants")
          .doc();


      await docRef.set({

        uid:
          null,

        name:
          name,

        role:
          selectedRole.value,

        judgeAvailable:
          judgeCheckbox.checked,

        active:
          true,

        danceCount:
          0,

        judgeCount:
          0,

        danceFairCount:
          0,

        judgeFairCount:
          0,

        createdAt:
          firebase.firestore
            .FieldValue
            .serverTimestamp()
      });

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


      await docRef.set({

        uid:
          currentFirebaseUser.uid,

        name:
          name,

        role:
          selectedRole.value,

        judgeAvailable:
          judgeCheckbox.checked,

        active:
          true,

        danceCount:
          0,

        judgeCount:
          0,

        danceFairCount:
          0,

        judgeFairCount:
          0,

        createdAt:
          firebase.firestore
            .FieldValue
            .serverTimestamp()
      });
    }


    nameInput.value =
      "";

    selectedRole.checked =
      false;

    judgeCheckbox.checked =
      true;

    nameInput.focus();

  } catch (error) {

    console.error(error);


    alert(
      "参加者を登録できませんでした。\n" +
      (
        error.code ||
        error.message
      )
    );

  } finally {

    addButton.disabled =
      false;
  }
}


/* ========================================
   自分
======================================== */

function getCurrentParticipant() {

  if (!currentFirebaseUser) {
    return null;
  }


  return participants.find(
    function (participant) {

      return (
        String(
          participant.id
        ) ===
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
    String(
      participant.id
    ) ===
    currentFirebaseUser.uid
  );
}


/* ========================================
   削除
======================================== */

async function deleteParticipant(
  id
) {

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


    lastRoundData =
      null;


    await saveEventState();


    openParticipantMenuId =
      null;

  } catch (error) {

    console.error(error);


    alert(
      "参加者を削除できませんでした。\n" +
      (
        error.code ||
        error.message
      )
    );
  }
}


/* ========================================
   削除履歴整理
======================================== */

function removeParticipantFromHistories(
  id
) {

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
        String(
          item.participantAId
        ) === id ||
        String(
          item.participantBId
        ) === id
      ) {

        delete historyObject[key];
      }
    }
  );
}


/* ========================================
   休憩・復帰
======================================== */

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

        active:
          active
      });


    openParticipantMenuId =
      null;

  } catch (error) {

    console.error(error);


    alert(
      "状態を変更できませんでした。\n" +
      (
        error.code ||
        error.message
      )
    );
  }
}


/* ========================================
   参加者操作
======================================== */

function toggleParticipantMenu(
  id
) {

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


/* ========================================
   EventState保存
======================================== */

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

        currentRound:
          currentRound,

        participantStats:
          participantStats,

        pairHistory:
          pairHistory,

        leaderOpponentHistory:
          leaderOpponentHistory,

        followerOpponentHistory:
          followerOpponentHistory,

        lastRoundData:
          lastRoundData,

        updatedAt:
          firebase.firestore
            .FieldValue
            .serverTimestamp()
      });


    eventStateExists =
      true;

  } catch (error) {

    console.error(error);


    alert(
      "Round情報を保存できませんでした。\n" +
      (
        error.code ||
        error.message
      )
    );
  }
}


/* ========================================
   Stats初期値
======================================== */

function initializeMissingParticipantStats() {

  let changed =
    false;


  participants.forEach(
    function (participant) {

      const id =
        String(
          participant.id
        );


      if (participantStats[id]) {
        return;
      }


      participantStats[id] = {

        danceCount:
          0,

        judgeCount:
          0,

        danceFairCount:
          getCurrentDanceFairBaseline(
            id
          ),

        judgeFairCount:
          participant.judgeAvailable
            ? getCurrentJudgeFairBaseline(
                id
              )
            : 0
      };


      changed =
        true;
    }
  );


  return changed;
}


/* ========================================
   復帰公平性
======================================== */

function adjustResumedParticipants(
  previousMap
) {

  let changed =
    false;


  participants.forEach(
    function (participant) {

      const previous =
        previousMap.get(
          String(
            participant.id
          )
        );


      if (!previous) {
        return;
      }


      if (
        previous.active === false &&
        participant.active !== false
      ) {

        const id =
          String(
            participant.id
          );


        if (!participantStats[id]) {
          participantStats[id] = {};
        }


        participantStats[id]
          .danceFairCount =
            getCurrentDanceFairBaseline(
              id
            );


        if (
          participant.judgeAvailable
        ) {

          participantStats[id]
            .judgeFairCount =
              getCurrentJudgeFairBaseline(
                id
              );
        }


        changed =
          true;
      }
    }
  );


  return changed;
}


/* ========================================
   Stats反映
======================================== */

function applyStatsToParticipants() {

  participants.forEach(
    function (participant) {

      const stats =
        participantStats[
          String(
            participant.id
          )
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


/* ========================================
   Stats保存
======================================== */

function syncStatsFromParticipants() {

  const validIds =
    new Set();


  participants.forEach(
    function (participant) {

      const id =
        String(
          participant.id
        );


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


/* ========================================
   公平性基準
======================================== */

function getCurrentDanceFairBaseline(
  excludeId = null
) {

  const targets =
    participants.filter(
      function (participant) {

        return (
          participant.active !== false &&
          String(
            participant.id
          ) !==
          String(
            excludeId
          )
        );
      }
    );


  if (
    targets.length === 0
  ) {
    return 0;
  }


  const total =
    targets.reduce(
      function (
        sum,
        participant
      ) {

        return (
          sum +
          getDanceFairCount(
            participant
          )
        );
      },
      0
    );


  return (
    total /
    targets.length
  );
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
          String(
            participant.id
          ) !==
          String(
            excludeId
          )
        );
      }
    );


  if (
    targets.length === 0
  ) {
    return 0;
  }


  const total =
    targets.reduce(
      function (
        sum,
        participant
      ) {

        return (
          sum +
          getJudgeFairCount(
            participant
          )
        );
      },
      0
    );


  return (
    total /
    targets.length
  );
}


/* ========================================
   Round生成
======================================== */

async function generateRound() {

  if (!isCurrentUserAdmin) {
    return;
  }


  const activeParticipants =
    participants.filter(
      participant =>
        participant.active !== false
    );


  if (
    activeParticipants.length < 4
  ) {

    alert(
      "参加中の人が4人以上必要です。"
    );

    return;
  }


  const fixedLeaders =
    sortByDanceCount(
      activeParticipants.filter(
        participant =>
          participant.role ===
          "leader"
      )
    );


  const fixedFollowers =
    sortByDanceCount(
      activeParticipants.filter(
        participant =>
          participant.role ===
          "follower"
      )
    );


  const both =
    sortByDanceCount(
      activeParticipants.filter(
        participant =>
          participant.role ===
          "both"
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

        leaders.push(
          participant
        );

      } else if (
        followers.length <
        leaders.length
      ) {

        followers.push(
          participant
        );

      } else {

        if (
          Math.random() < 0.5
        ) {

          leaders.push(
            participant
          );

        } else {

          followers.push(
            participant
          );
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


  if (
    usablePairCount < 2
  ) {

    alert(
      "2ペアを作成できません。Role構成を確認してください。"
    );

    return;
  }


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


  const pairs =
    createFairPairs(
      selectedLeaders,
      selectedFollowers
    );


  const battles =
    createFairBattles(
      pairs
    );


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
    function (battle) {

      battle.judges =
        selectJudgesForBattle(
          battle,
          3
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
    activeParticipants.filter(
      participant =>
        !usedIds.has(
          participant.id
        )
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


/* ========================================
   Pair作成
======================================== */

function createFairPairs(
  leaders,
  followers
) {

  const pairs =
    [];


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

      let candidates =
        [];


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

        leader:
          leader,

        follower:
          selectedFollower
      });


      const index =
        availableFollowers
          .findIndex(
            follower =>
              follower.id ===
              selectedFollower.id
          );


      availableFollowers.splice(
        index,
        1
      );
    }
  );


  return pairs;
}


/* ========================================
   Battle作成
======================================== */

function createFairBattles(
  pairs
) {

  const battles =
    [];


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

    let candidates =
      [];


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

      pairA:
        pairA,

      pairB:
        pairB,

      judges:
        []
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


/* ========================================
   Battle評価
======================================== */

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


/* ========================================
   Judge選定
======================================== */

function selectJudgesForBattle(
  battle,
  requestedCount
) {

  const dancerIds =
    new Set([
      battle.pairA.leader.id,
      battle.pairA.follower.id,
      battle.pairB.leader.id,
      battle.pairB.follower.id
    ]);


  const candidates =
    participants.filter(
      participant =>
        participant.active !== false &&
        participant.judgeAvailable &&
        !dancerIds.has(
          participant.id
        )
    );


  if (
    candidates.length === 0
  ) {
    return [];
  }


  const judgeCount =
    Math.min(
      requestedCount,
      candidates.length
    );


  const combinations =
    createCombinations(
      candidates,
      judgeCount
    );


  let bestScore =
    null;

  let bestCombinations =
    [];


  combinations.forEach(
    function (combination) {

      const score =
        getJudgeCombinationScore(
          combination
        );


      if (
        bestScore === null ||
        compareJudgeScores(
          score,
          bestScore
        ) < 0
      ) {

        bestScore =
          score;

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


/* ========================================
   Judge評価
======================================== */

function getJudgeCombinationScore(
  judges
) {

  const counts =
    judges.map(
      judge =>
        getJudgeFairCount(
          judge
        )
    );


  const maximumCount =
    Math.max(
      ...counts
    );


  const totalCount =
    counts.reduce(
      (sum, count) =>
        sum + count,
      0
    );


  const uniqueRoles =
    new Set(
      judges.map(
        judge =>
          judge.role
      )
    ).size;


  let rolePenalty =
    0;


  if (
    judges.length === 3
  ) {

    if (
      uniqueRoles === 3
    ) {

      rolePenalty = 0;

    } else if (
      uniqueRoles === 2
    ) {

      rolePenalty = 1;

    } else {

      rolePenalty = 3;
    }

  } else if (
    judges.length === 2
  ) {

    rolePenalty =
      uniqueRoles === 2
        ? 0
        : 1;
  }


  return {

    maximumCount:
      maximumCount,

    totalCount:
      totalCount,

    rolePenalty:
      rolePenalty
  };
}


function compareJudgeScores(
  a,
  b
) {

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


/* ========================================
   組合せ
======================================== */

function createCombinations(
  array,
  size
) {

  const result =
    [];


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


/* ========================================
   履歴
======================================== */

function getHistoryKey(
  a,
  b
) {

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


function addPairHistory(
  a,
  b
) {

  const key =
    getHistoryKey(
      a,
      b
    );


  if (!pairHistory[key]) {

    pairHistory[key] = {

      participantAId:
        a.id,

      participantBId:
        b.id,

      count:
        1
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

      participantAId:
        a.id,

      participantBId:
        b.id,

      count:
        1
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


/* ========================================
   Fair Count
======================================== */

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


/* ========================================
   Round保存形式
======================================== */

function serializeRound(
  battles,
  waitingParticipants,
  roundNumber
) {

  return {

    roundNumber:
      roundNumber,

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
                judge =>
                  judge.id
              )
          };
        }
      ),

    waitingIds:
      waitingParticipants.map(
        participant =>
          participant.id
      )
  };
}


/* ========================================
   Roundリセット
======================================== */

async function resetRoundData() {

  if (!isCurrentUserAdmin) {
    return;
  }


  const firstConfirm =
    confirm(
      "Roundデータをリセットします。\n\n" +
      "削除されるデータ：\n" +
      "・Round番号\n" +
      "・Dance回数\n" +
      "・Judge回数\n" +
      "・Pair履歴\n" +
      "・対戦履歴\n\n" +
      "参加者の登録情報は残ります。\n\n" +
      "本当に続けますか？"
    );


  if (!firstConfirm) {
    return;
  }


  const resetWord =
    prompt(
      "最終確認です。\n\n" +
      "リセットを実行する場合は\n" +
      "半角英大文字で RESET と入力してください。"
    );


  if (resetWord === null) {
    return;
  }


  if (
    resetWord.trim() !==
    "RESET"
  ) {

    alert(
      "RESET と正しく入力されなかったため、\n" +
      "リセットを中止しました。"
    );

    return;
  }


  currentRound =
    0;


  pairHistory =
    {};

  leaderOpponentHistory =
    {};

  followerOpponentHistory =
    {};

  lastRoundData =
    null;


  participants.forEach(
    function (participant) {

      participant.danceCount =
        0;

      participant.judgeCount =
        0;

      participant.danceFairCount =
        0;

      participant.judgeFairCount =
        0;
    }
  );


  syncStatsFromParticipants();


  await saveEventState();


  renderAll();


  alert(
    "Roundデータをリセットしました。\n" +
    "参加者の登録情報は残っています。"
  );
}


/* ========================================
   全表示
======================================== */

function renderAll() {

  applyStatsToParticipants();

  renderParticipantList();

  renderPairHistory();

  renderOpponentSummary();

  updateRegistrationDisplay();

  renderCurrentRound();
}


/* ========================================
   参加者一覧
======================================== */

function renderParticipantList() {

  participantList.innerHTML =
    "";


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
        getRoleLabel(
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


      if (
        participant.judgeAvailable
      ) {

        judge.textContent =
          "J✓";

      } else {

        judge.textContent =
          "－";


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

      row.appendChild(
        deleteElement
      );


      item.appendChild(
        row
      );


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


        panel.appendChild(
          button
        );

        panel.appendChild(
          note
        );


        item.appendChild(
          panel
        );
      }


      participantList.appendChild(
        item
      );
    }
  );


  const activeCount =
    participants.filter(
      participant =>
        participant.active !== false
    ).length;


  if (
    participants.length === 0
  ) {

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


/* ========================================
   Pair履歴表示
======================================== */

function renderPairHistory() {

  pairHistoryList.innerHTML =
    "";


  const items =
    Object.values(
      pairHistory
    )
      .filter(
        item =>
          findParticipantById(
            item.participantAId
          )
          &&
          findParticipantById(
            item.participantBId
          )
      )
      .sort(
        (a, b) =>
          b.count -
          a.count
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


      row.appendChild(
        names
      );


      row.appendChild(
        count
      );


      pairHistoryList.appendChild(
        row
      );
    }
  );
}


/* ========================================
   最多対戦相手
======================================== */

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

  target.innerHTML =
    "";


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


      if (
        summary.count === 0
      ) {

        opponents.textContent =
          "－";

        count.textContent =
          "";

      } else {

        opponents.textContent =
          summary.opponents
            .map(
              opponent =>
                opponent.name
            )
            .join(" / ");


        count.textContent =
          summary.count +
          "回";
      }


      row.appendChild(name);

      row.appendChild(arrow);

      row.appendChild(
        opponents
      );

      row.appendChild(count);


      target.appendChild(
        row
      );
    }
  );
}


function getTopOpponents(
  participant,
  history
) {

  let maximumCount =
    0;

  let opponents =
    [];


  Object.values(
    history
  ).forEach(
    function (item) {

      let opponentId =
        null;


      if (
        String(
          item.participantAId
        ) ===
        String(
          participant.id
        )
      ) {

        opponentId =
          item.participantBId;

      } else if (
        String(
          item.participantBId
        ) ===
        String(
          participant.id
        )
      ) {

        opponentId =
          item.participantAId;
      }


      if (
        opponentId === null
      ) {
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

    count:
      maximumCount,

    opponents:
      opponents
  };
}


function getParticipantsUsedAsRole(
  role
) {

  const ids =
    new Set();


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
    participant =>
      ids.has(
        String(
          participant.id
        )
      )
  );
}


/* ========================================
   自分のRound状況
======================================== */

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


  const danceBattles =
    [];

  const judgeBattles =
    [];


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


  const messages =
    [];


  if (
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


/* ========================================
   Round表示
======================================== */

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


  const battles =
    [];


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
            id =>
              findParticipantById(
                id
              )
          )
          .filter(Boolean);


      battles.push({

        pairA: {

          leader:
            aLeader,

          follower:
            aFollower
        },

        pairB: {

          leader:
            bLeader,

          follower:
            bFollower
        },

        judges:
          judges
      });
    }
  );


  const waiting =
    (lastRoundData.waitingIds || [])
      .map(
        id =>
          findParticipantById(
            id
          )
      )
      .filter(Boolean);


  if (
    battles.length === 0
  ) {

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


  battleList.innerHTML =
    "";


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
          judge =>
            String(
              judge.id
            )
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


  waitingList.innerHTML =
    "";


  if (
    waiting.length === 0
  ) {

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


/* ========================================
   Pair表示
======================================== */

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


/* ========================================
   Judge表示
======================================== */

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


  if (
    judges.length === 0
  ) {

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
        getRoleLabel(
          judge.role
        );


      item.appendChild(
        name
      );


      item.appendChild(
        role
      );


      list.appendChild(
        item
      );
    }
  );


  box.appendChild(
    list
  );


  if (
    judges.length < 3
  ) {

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


/* ========================================
   共通
======================================== */

function sortByDanceCount(
  array
) {

  return array
    .map(
      participant => ({

        participant:
          participant,

        random:
          Math.random()
      })
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


        if (
          diff !== 0
        ) {
          return diff;
        }


        return (
          a.random -
          b.random
        );
      }
    )
    .map(
      item =>
        item.participant
    );
}


function shuffleArray(
  array
) {

  const copied =
    [...array];


  for (
    let i =
      copied.length - 1;
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


function getRandomItem(
  array
) {

  return array[
    Math.floor(
      Math.random() *
      array.length
    )
  ];
}


function findParticipantById(
  id
) {

  return participants.find(
    participant =>
      String(
        participant.id
      ) ===
      String(id)
  );
}


function getNumberOrZero(
  value
) {

  return (
    typeof value ===
    "number"
      ? value
      : 0
  );
}


function getRoleLabel(
  role
) {

  if (
    role === "leader"
  ) {
    return "Leader";
  }


  if (
    role === "follower"
  ) {
    return "Follower";
  }


  return "Both";
}


/* ========================================
   イベント
======================================== */

addButton.addEventListener(
  "click",
  addParticipant
);


nameInput.addEventListener(
  "keydown",
  function (event) {

    if (
      event.key ===
      "Enter"
    ) {

      event.preventDefault();

      addParticipant();
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


/* ========================================
   起動
======================================== */

renderAll();

initializeFirebaseConnection();