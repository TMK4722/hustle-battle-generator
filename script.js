/* ========================================
   HTML要素
======================================== */

const addButton =
  document.getElementById("addParticipant");

const nameInput =
  document.getElementById("name");

const participantList =
  document.getElementById("participantList");

const participantCount =
  document.getElementById("participantCount");

const emptyMessage =
  document.getElementById("emptyMessage");

const judgeCheckbox =
  document.getElementById("judgeAvailable");

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

const registrationCard =
  document.getElementById("registrationCard");

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
   Firebase設定
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


/* ========================================
   アプリデータ
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
  statusText,
  detailText = ""
) {

  firebaseStatus.textContent =
    statusText;

  firebaseUserInfo.textContent =
    detailText;

}


/* ========================================
   Firebase初期化
======================================== */

function initializeFirebaseConnection() {

  if (
    typeof firebase === "undefined"
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


          updateFirebaseStatus(
            "接続中",
            "匿名認証を準備しています。"
          );


          try {

            await firebaseAuth
              .signInAnonymously();

          } catch (error) {

            console.error(
              error
            );


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

    console.error(
      error
    );


    updateFirebaseStatus(
      "接続失敗",
      error.message
    );

  }

}


/* ========================================
   管理者判定
======================================== */

async function checkCurrentUserRole(
  user
) {

  if (
    user.isAnonymous
  ) {

    isCurrentUserAdmin =
      false;


    updateFirebaseStatus(
      "接続OK",
      "匿名認証済み"
    );


    adminLoginButton
      .classList
      .remove(
        "hidden"
      );


    adminLogoutButton
      .classList
      .add(
        "hidden"
      );


    updateAdminDisplay();

    return;

  }


  adminLoginButton
    .classList
    .add(
      "hidden"
    );


  adminLogoutButton
    .classList
    .remove(
      "hidden"
    );


  updateFirebaseStatus(
    "管理者確認中",
    user.email || ""
  );


  try {

    const snapshot =
      await firebaseDb
        .collection(
          "admins"
        )
        .doc(
          user.uid
        )
        .get();


    isCurrentUserAdmin =
      snapshot.exists &&
      snapshot.data() &&
      snapshot.data().role === "admin";


    if (
      isCurrentUserAdmin
    ) {

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

    isCurrentUserAdmin =
      false;


    console.error(
      error
    );


    updateFirebaseStatus(
      "管理者確認失敗",
      error.code ||
      error.message
    );

  }


  updateAdminDisplay();

}


/* ========================================
   管理者画面表示
======================================== */

function updateAdminDisplay() {

  const adminOnlyElements =
    [
      roundControlCard,
      pairHistoryDetails,
      opponentHistoryDetails
    ];


  adminOnlyElements.forEach(
    function (element) {

      if (!element) {

        return;

      }


      if (
        isCurrentUserAdmin
      ) {

        element.classList.remove(
          "hidden"
        );

      } else {

        element.classList.add(
          "hidden"
        );

      }

    }
  );


  renderParticipantList();

  renderCurrentRound();

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


  provider.setCustomParameters(
    {
      prompt:
        "select_account"
    }
  );


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

        const fallbackCodes =
          [
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

    console.error(
      error
    );


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
   管理者モード終了
======================================== */

async function exitAdminMode() {

  if (
    !firebaseAuth
  ) {

    return;

  }


  try {

    await firebaseAuth.signOut();

  } catch (error) {

    console.error(
      error
    );

  }

}


/* ========================================
   参加者リアルタイム監視
======================================== */

function startParticipantsListener() {

  if (
    !firebaseDb ||
    !currentFirebaseUser
  ) {

    return;

  }


  if (
    participantsUnsubscribe
  ) {

    participantsUnsubscribe();

  }


  participantsUnsubscribe =
    firebaseDb
      .collection(
        "participants"
      )
      .onSnapshot(
        async function (snapshot) {

          const previousParticipants =
            participants;


          const previousMap =
            new Map();


          previousParticipants.forEach(
            function (participant) {

              previousMap.set(
                String(
                  participant.id
                ),
                participant
              );

            }
          );


          const newParticipants =
            [];


          snapshot.forEach(
            function (documentSnapshot) {

              const remote =
                documentSnapshot.data();


              const id =
                documentSnapshot.id;


              const stats =
                participantStats[id] ||
                {};


              newParticipants.push(
                {

                  id:
                    id,

                  uid:
                    id,

                  name:
                    remote.name ||
                    "",

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

                }
              );

            }
          );


          participants =
            newParticipants;


          if (
            isCurrentUserAdmin
          ) {

            const changed =
              initializeMissingParticipantStats();


            const resumed =
              adjustResumedParticipants(
                previousMap
              );


            if (
              changed ||
              resumed
            ) {

              await saveEventState();

            }

          }


          applyStatsToParticipants();

          renderAll();

        },
        function (error) {

          console.error(
            "参加者一覧の取得に失敗しました。",
            error
          );


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
   EventStateリアルタイム監視
======================================== */

function startEventStateListener() {

  if (
    !firebaseDb ||
    !currentFirebaseUser
  ) {

    return;

  }


  if (
    eventStateUnsubscribe
  ) {

    eventStateUnsubscribe();

  }


  eventStateUnsubscribe =
    firebaseDb
      .collection(
        "eventState"
      )
      .doc(
        "current"
      )
      .onSnapshot(
        async function (snapshot) {

          if (
            !snapshot.exists
          ) {

            resetSharedStateInMemory();


            if (
              isCurrentUserAdmin
            ) {

              await saveEventState();

            }


            renderAll();

            return;

          }


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


          if (
            isCurrentUserAdmin
          ) {

            const changed =
              initializeMissingParticipantStats();


            if (
              changed
            ) {

              await saveEventState();

            }

          }


          applyStatsToParticipants();

          renderAll();

        },
        function (error) {

          console.error(
            "Round情報の取得に失敗しました。",
            error
          );


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
   リアルタイム監視停止
======================================== */

function stopRealtimeListeners() {

  if (
    participantsUnsubscribe
  ) {

    participantsUnsubscribe();

    participantsUnsubscribe =
      null;

  }


  if (
    eventStateUnsubscribe
  ) {

    eventStateUnsubscribe();

    eventStateUnsubscribe =
      null;

  }

}


/* ========================================
   EventState初期化
======================================== */

function resetSharedStateInMemory() {

  currentRound =
    0;


  participantStats =
    {};


  pairHistory =
    {};


  leaderOpponentHistory =
    {};


  followerOpponentHistory =
    {};


  lastRoundData =
    null;

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
      .collection(
        "eventState"
      )
      .doc(
        "current"
      )
      .set(
        {

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

        }
      );

  } catch (error) {

    console.error(
      "Round情報を保存できませんでした。",
      error
    );


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
   Stats → participants
======================================== */

function applyStatsToParticipants() {

  participants.forEach(
    function (participant) {

      const stats =
        participantStats[
          String(
            participant.id
          )
        ];


      if (
        !stats
      ) {

        participant.danceCount =
          0;

        participant.judgeCount =
          0;

        participant.danceFairCount =
          0;

        participant.judgeFairCount =
          0;

        return;

      }


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
   participants → Stats
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


      validIds.add(
        id
      );


      participantStats[id] =
        {

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

      if (
        !validIds.has(
          id
        )
      ) {

        delete participantStats[id];

      }

    }
  );

}


/* ========================================
   新規参加者の公平性初期値
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


      if (
        participantStats[id]
      ) {

        return;

      }


      participantStats[id] =
        {

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
   休憩 → 復帰の公平性調整
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


      if (
        !previous
      ) {

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


        if (
          !participantStats[id]
        ) {

          participantStats[id] =
            {};

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
   数値補助
======================================== */

function getNumberOrZero(
  value
) {

  return (
    typeof value === "number"
      ? value
      : 0
  );

}


/* ========================================
   自分の参加者情報
======================================== */

function getCurrentParticipant() {

  if (
    !currentFirebaseUser
  ) {

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


/* ========================================
   参加登録表示
======================================== */

function updateRegistrationDisplay() {

  if (
    !currentFirebaseUser
  ) {

    registrationCard
      .classList
      .add(
        "hidden"
      );

    return;

  }


  if (
    getCurrentParticipant()
  ) {

    registrationCard
      .classList
      .add(
        "hidden"
      );

  } else {

    registrationCard
      .classList
      .remove(
        "hidden"
      );

  }

}


/* ========================================
   参加登録
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


  if (
    getCurrentParticipant()
  ) {

    alert(
      "この端末ではすでに参加登録されています。"
    );

    return;

  }


  const name =
    nameInput.value.trim();


  if (
    name === ""
  ) {

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


  if (
    !selectedRole
  ) {

    alert(
      "Roleを選択してください。"
    );

    return;

  }


  addButton.disabled =
    true;


  try {

    await firebaseDb
      .collection(
        "participants"
      )
      .doc(
        currentFirebaseUser.uid
      )
      .set(
        {

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

        }
      );


    nameInput.value =
      "";


    selectedRole.checked =
      false;

  } catch (error) {

    console.error(
      error
    );


    alert(
      "参加登録に失敗しました。\n" +
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
   参加者削除
======================================== */

async function deleteParticipant(
  id
) {

  if (
    !isCurrentUserAdmin
  ) {

    return;

  }


  const participant =
    findParticipantById(
      id
    );


  if (
    !participant
  ) {

    return;

  }


  const confirmed =
    confirm(
      participant.name +
      " を参加者一覧から削除しますか？"
    );


  if (
    !confirmed
  ) {

    return;

  }


  try {

    await firebaseDb
      .collection(
        "participants"
      )
      .doc(
        String(id)
      )
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

    console.error(
      error
    );


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
   削除参加者を履歴から除去
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
   休憩
======================================== */

async function restParticipant(
  id
) {

  await changeParticipantActive(
    id,
    false
  );

}


/* ========================================
   復帰
======================================== */

async function resumeParticipant(
  id
) {

  await changeParticipantActive(
    id,
    true
  );

}


/* ========================================
   active変更
======================================== */

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
    !isOwn &&
    !isCurrentUserAdmin
  ) {

    return;

  }


  try {

    await firebaseDb
      .collection(
        "participants"
      )
      .doc(
        String(id)
      )
      .update(
        {

          active:
            active

        }
      );


    openParticipantMenuId =
      null;

  } catch (error) {

    console.error(
      error
    );


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
   参加者メニュー
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


  if (
    !canManage
  ) {

    return;

  }


  if (
    openParticipantMenuId ===
    id
  ) {

    openParticipantMenuId =
      null;

  } else {

    openParticipantMenuId =
      id;

  }


  renderParticipantList();

}


/* ========================================
   Dance公平性基準
======================================== */

function getCurrentDanceFairBaseline(
  excludeId = null
) {

  const activeParticipants =
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
    activeParticipants.length === 0
  ) {

    return 0;

  }


  const total =
    activeParticipants.reduce(
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
    activeParticipants.length
  );

}


/* ========================================
   Judge公平性基準
======================================== */

function getCurrentJudgeFairBaseline(
  excludeId = null
) {

  const judgeParticipants =
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
    judgeParticipants.length === 0
  ) {

    return 0;

  }


  const total =
    judgeParticipants.reduce(
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
    judgeParticipants.length
  );

}


/* ========================================
   Round生成
======================================== */

async function generateRound() {

  if (
    !isCurrentUserAdmin
  ) {

    return;

  }


  const activeParticipants =
    participants.filter(
      function (participant) {

        return (
          participant.active !== false
        );

      }
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
      activeParticipants.filter(
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
      activeParticipants.filter(
        function (participant) {

          return (
            participant.role ===
            "both"
          );

        }
      )
    );


  const leaders =
    [
      ...fixedLeaders
    ];


  const followers =
    [
      ...fixedFollowers
    ];


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

      const pairList =
        [
          battle.pairA,
          battle.pairB
        ];


      pairList.forEach(
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


/* ========================================
   Pair生成
======================================== */

function createFairPairs(
  leaders,
  followers
) {

  const pairs =
    [];


  const availableFollowers =
    [
      ...followers
    ];


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

          const historyCount =
            getPairHistoryCount(
              leader,
              follower
            );


          if (
            historyCount <
            minimumHistory
          ) {

            minimumHistory =
              historyCount;


            candidates =
              [
                follower
              ];

          } else if (
            historyCount ===
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


      pairs.push(
        {

          leader:
            leader,

          follower:
            selectedFollower

        }
      );


      const index =
        availableFollowers.findIndex(
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


/* ========================================
   Battle生成
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
      function (candidatePair) {

        const score =
          getBattleOpponentScore(
            pairA,
            candidatePair
          );


        if (
          score <
          minimumScore
        ) {

          minimumScore =
            score;


          candidates =
            [
              candidatePair
            ];

        } else if (
          score ===
          minimumScore
        ) {

          candidates.push(
            candidatePair
          );

        }

      }
    );


    const pairB =
      getRandomItem(
        candidates
      );


    battles.push(
      {

        pairA:
          pairA,

        pairB:
          pairB,

        judges:
          []

      }
    );


    const pairBIndex =
      availablePairs.indexOf(
        pairB
      );


    availablePairs.splice(
      pairBIndex,
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
    ) +
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
    new Set(
      [
        battle.pairA.leader.id,
        battle.pairA.follower.id,
        battle.pairB.leader.id,
        battle.pairB.follower.id
      ]
    );


  const candidates =
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
          [
            combination
          ];

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
      function (
        total,
        count
      ) {

        return (
          total +
          count
        );

      },
      0
    );


  const uniqueRoles =
    new Set(
      judges.map(
        function (judge) {

          return judge.role;

        }
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

      rolePenalty =
        0;

    } else if (
      uniqueRoles === 2
    ) {

      rolePenalty =
        1;

    } else {

      rolePenalty =
        3;

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
  scoreA,
  scoreB
) {

  if (
    scoreA.maximumCount !==
    scoreB.maximumCount
  ) {

    return (
      scoreA.maximumCount -
      scoreB.maximumCount
    );

  }


  if (
    scoreA.totalCount !==
    scoreB.totalCount
  ) {

    return (
      scoreA.totalCount -
      scoreB.totalCount
    );

  }


  return (
    scoreA.rolePenalty -
    scoreB.rolePenalty
  );

}


/* ========================================
   組み合わせ生成
======================================== */

function createCombinations(
  array,
  size
) {

  const results =
    [];


  function build(
    startIndex,
    current
  ) {

    if (
      current.length === size
    ) {

      results.push(
        [
          ...current
        ]
      );

      return;

    }


    for (
      let i =
        startIndex;

      i <
      array.length;

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


  return results;

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
   履歴
======================================== */

function getHistoryKey(
  participantA,
  participantB
) {

  const ids =
    [
      String(
        participantA.id
      ),

      String(
        participantB.id
      )
    ];


  ids.sort();


  return (
    ids[0] +
    "|" +
    ids[1]
  );

}


function getPairHistoryCount(
  participantA,
  participantB
) {

  const key =
    getHistoryKey(
      participantA,
      participantB
    );


  return (
    pairHistory[key]
      ? pairHistory[key].count
      : 0
  );

}


function addPairHistory(
  participantA,
  participantB
) {

  const key =
    getHistoryKey(
      participantA,
      participantB
    );


  if (
    !pairHistory[key]
  ) {

    pairHistory[key] =
      {

        participantAId:
          participantA.id,

        participantBId:
          participantB.id,

        count:
          1

      };

  } else {

    pairHistory[key].count++;

  }

}


function addOpponentHistory(
  historyObject,
  participantA,
  participantB
) {

  const key =
    getHistoryKey(
      participantA,
      participantB
    );


  if (
    !historyObject[key]
  ) {

    historyObject[key] =
      {

        participantAId:
          participantA.id,

        participantBId:
          participantB.id,

        count:
          1

      };

  } else {

    historyObject[key].count++;

  }

}


function getOpponentHistoryCount(
  historyObject,
  participantA,
  participantB
) {

  const key =
    getHistoryKey(
      participantA,
      participantB
    );


  return (
    historyObject[key]
      ? historyObject[key].count
      : 0
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

            pairA:
              {

                leaderId:
                  battle.pairA.leader.id,

                followerId:
                  battle.pairA.follower.id

              },

            pairB:
              {

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


/* ========================================
   Roundリセット
======================================== */

async function resetRoundData() {

  if (
    !isCurrentUserAdmin
  ) {

    return;

  }


  const confirmed =
    confirm(
      "参加者は残したまま、Round回数・D/J回数・Pair履歴・対戦履歴をリセットします。よろしいですか？"
    );


  if (
    !confirmed
  ) {

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

  updateAdminDisplay();

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
        currentFirebaseUser &&
        currentFirebaseUser.uid ===
        String(
          participant.id
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


      if (
        canManage
      ) {

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


      if (
        canManage
      ) {

        row.addEventListener(
          "click",
          function () {

            toggleParticipantMenu(
              participant.id
            );

          }
        );

      }


      const mainElement =
        document.createElement(
          "div"
        );


      mainElement.className =
        "participant-main";


      const nameLine =
        document.createElement(
          "div"
        );


      nameLine.className =
        "participant-name-line";


      const nameElement =
        document.createElement(
          "div"
        );


      nameElement.className =
        "participant-name";


      nameElement.textContent =
        participant.name;


      nameLine.appendChild(
        nameElement
      );


      if (
        isOwn
      ) {

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


      mainElement.appendChild(
        nameLine
      );


      if (
        participant.active === false
      ) {

        const restStatus =
          document.createElement(
            "div"
          );


        restStatus.className =
          "participant-rest-status";


        restStatus.textContent =
          "休憩中";


        mainElement.appendChild(
          restStatus
        );

      }


      const roleElement =
        document.createElement(
          "div"
        );


      roleElement.className =
        "participant-role";


      roleElement.textContent =
        getRoleLabel(
          participant.role
        );


      const countElement =
        document.createElement(
          "div"
        );


      countElement.className =
        "participant-count";


      countElement.textContent =
        "D" +
        participant.danceCount +
        " / J" +
        participant.judgeCount;


      const judgeElement =
        document.createElement(
          "div"
        );


      judgeElement.className =
        "participant-judge";


      if (
        participant.judgeAvailable
      ) {

        judgeElement.textContent =
          "J✓";

      } else {

        judgeElement.textContent =
          "－";


        judgeElement.classList.add(
          "unavailable"
        );

      }


      let deleteElement;


      if (
        isCurrentUserAdmin
      ) {

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


      row.appendChild(
        mainElement
      );


      row.appendChild(
        roleElement
      );


      row.appendChild(
        countElement
      );


      row.appendChild(
        judgeElement
      );


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

        const actionPanel =
          document.createElement(
            "div"
          );


        actionPanel.className =
          "participant-action-panel";


        const actionButton =
          document.createElement(
            "button"
          );


        actionButton.type =
          "button";


        actionButton.className =
          "participant-action-button";


        if (
          participant.active === false
        ) {

          actionButton.textContent =
            "復帰する";


          actionButton.addEventListener(
            "click",
            function () {

              resumeParticipant(
                participant.id
              );

            }
          );

        } else {

          actionButton.textContent =
            "休憩にする";


          actionButton.addEventListener(
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


        actionPanel.appendChild(
          actionButton
        );


        actionPanel.appendChild(
          note
        );


        item.appendChild(
          actionPanel
        );

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


  const validItems =
    Object.values(
      pairHistory
    ).filter(
      function (item) {

        return (
          findParticipantById(
            item.participantAId
          ) &&
          findParticipantById(
            item.participantBId
          )
        );

      }
    );


  if (
    validItems.length === 0
  ) {

    pairHistoryEmpty.style.display =
      "block";

    return;

  }


  pairHistoryEmpty.style.display =
    "none";


  validItems.sort(
    function (
      a,
      b
    ) {

      return (
        b.count -
        a.count
      );

    }
  );


  validItems.forEach(
    function (item) {

      const participantA =
        findParticipantById(
          item.participantAId
        );


      const participantB =
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
        participantA.name +
        " + " +
        participantB.name;


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
  historyObject,
  targetList,
  emptyElement
) {

  targetList.innerHTML =
    "";


  if (
    roleParticipants.length === 0
  ) {

    emptyElement.style.display =
      "block";

    return;

  }


  emptyElement.style.display =
    "none";


  roleParticipants.forEach(
    function (participant) {

      const summary =
        getTopOpponents(
          participant,
          historyObject
        );


      const row =
        document.createElement(
          "div"
        );


      row.className =
        "opponent-row";


      const nameElement =
        document.createElement(
          "div"
        );


      nameElement.className =
        "opponent-name";


      nameElement.textContent =
        participant.name;


      const arrowElement =
        document.createElement(
          "div"
        );


      arrowElement.className =
        "opponent-arrow";


      arrowElement.textContent =
        "→";


      const opponentsElement =
        document.createElement(
          "div"
        );


      opponentsElement.className =
        "opponent-targets";


      const countElement =
        document.createElement(
          "div"
        );


      countElement.className =
        "opponent-count";


      if (
        summary.count === 0
      ) {

        opponentsElement.textContent =
          "－";


        countElement.textContent =
          "";

      } else {

        opponentsElement.textContent =
          summary.opponents
            .map(
              function (opponent) {

                return opponent.name;

              }
            )
            .join(
              " / "
            );


        countElement.textContent =
          summary.count +
          "回";

      }


      row.appendChild(
        nameElement
      );


      row.appendChild(
        arrowElement
      );


      row.appendChild(
        opponentsElement
      );


      row.appendChild(
        countElement
      );


      targetList.appendChild(
        row
      );

    }
  );

}


function getTopOpponents(
  participant,
  historyObject
) {

  let maximumCount =
    0;


  let opponents =
    [];


  Object.values(
    historyObject
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


      if (
        !opponent
      ) {

        return;

      }


      if (
        item.count >
        maximumCount
      ) {

        maximumCount =
          item.count;


        opponents =
          [
            opponent
          ];

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


  const historyObject =
    role === "leader"
      ? leaderOpponentHistory
      : followerOpponentHistory;


  Object.values(
    historyObject
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


/* ========================================
   Round表示
======================================== */

function renderCurrentRound() {

  if (
    !lastRoundData
  ) {

    roundResultCard
      .classList
      .add(
        "hidden"
      );

    return;

  }


  const battles =
    [];


  lastRoundData.battles.forEach(
    function (storedBattle) {

      const pairALeader =
        findParticipantById(
          storedBattle.pairA.leaderId
        );


      const pairAFollower =
        findParticipantById(
          storedBattle.pairA.followerId
        );


      const pairBLeader =
        findParticipantById(
          storedBattle.pairB.leaderId
        );


      const pairBFollower =
        findParticipantById(
          storedBattle.pairB.followerId
        );


      if (
        !pairALeader ||
        !pairAFollower ||
        !pairBLeader ||
        !pairBFollower
      ) {

        return;

      }


      const judges =
        storedBattle.judgeIds
          .map(
            function (id) {

              return findParticipantById(
                id
              );

            }
          )
          .filter(
            Boolean
          );


      battles.push(
        {

          pairA:
            {

              leader:
                pairALeader,

              follower:
                pairAFollower

            },

          pairB:
            {

              leader:
                pairBLeader,

              follower:
                pairBFollower

            },

          judges:
            judges

        }
      );

    }
  );


  const waitingParticipants =
    lastRoundData.waitingIds
      .map(
        function (id) {

          return findParticipantById(
            id
          );

        }
      )
      .filter(
        Boolean
      );


  if (
    battles.length === 0
  ) {

    roundResultCard
      .classList
      .add(
        "hidden"
      );

    return;

  }


  renderRound(
    battles,
    waitingParticipants,
    lastRoundData.roundNumber
  );

}


function renderRound(
  battles,
  waitingParticipants,
  roundNumber
) {

  roundResultCard
    .classList
    .remove(
      "hidden"
    );


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

      const battleCard =
        document.createElement(
          "div"
        );


      battleCard.className =
        "battle-card";


      const title =
        document.createElement(
          "div"
        );


      title.className =
        "battle-title";


      title.textContent =
        "Battle " +
        (
          index + 1
        );


      const pairA =
        createPairElement(
          "Pair A",
          battle.pairA
        );


      const vs =
        document.createElement(
          "div"
        );


      vs.className =
        "vs";


      vs.textContent =
        "VS";


      const pairB =
        createPairElement(
          "Pair B",
          battle.pairB
        );


      const judgeBox =
        createJudgeElement(
          battle.judges
        );


      battleCard.appendChild(
        title
      );


      battleCard.appendChild(
        pairA
      );


      battleCard.appendChild(
        vs
      );


      battleCard.appendChild(
        pairB
      );


      battleCard.appendChild(
        judgeBox
      );


      battleList.appendChild(
        battleCard
      );

    }
  );


  waitingList.innerHTML =
    "";


  if (
    waitingParticipants.length === 0
  ) {

    waitingArea
      .classList
      .add(
        "hidden"
      );

  } else {

    waitingArea
      .classList
      .remove(
        "hidden"
      );


    waitingParticipants.forEach(
      function (participant) {

        const item =
          document.createElement(
            "span"
          );


        item.className =
          "waiting-person";


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

  const pairBox =
    document.createElement(
      "div"
    );


  pairBox.className =
    "pair-box";


  const labelElement =
    document.createElement(
      "div"
    );


  labelElement.className =
    "pair-label";


  labelElement.textContent =
    label;


  pairBox.appendChild(
    labelElement
  );


  pairBox.appendChild(
    createPersonRow(
      "Leader",
      pair.leader.name
    )
  );


  pairBox.appendChild(
    createPersonRow(
      "Follower",
      pair.follower.name
    )
  );


  return pairBox;

}


function createPersonRow(
  role,
  name
) {

  const row =
    document.createElement(
      "div"
    );


  row.className =
    "pair-person";


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
    name;


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
   公平性ソート
======================================== */

function sortByDanceCount(
  array
) {

  const decorated =
    array.map(
      function (participant) {

        return {

          participant:
            participant,

          random:
            Math.random()

        };

      }
    );


  decorated.sort(
    function (
      a,
      b
    ) {

      const difference =
        getDanceFairCount(
          a.participant
        ) -
        getDanceFairCount(
          b.participant
        );


      if (
        difference !== 0
      ) {

        return difference;

      }


      return (
        a.random -
        b.random
      );

    }
  );


  return decorated.map(
    function (item) {

      return item.participant;

    }
  );

}


/* ========================================
   共通
======================================== */

function shuffleArray(
  array
) {

  const copied =
    [
      ...array
    ];


  for (
    let i =
      copied.length - 1;

    i > 0;

    i--
  ) {

    const j =
      Math.floor(
        Math.random() *
        (
          i + 1
        )
      );


    [
      copied[i],
      copied[j]
    ] =
    [
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
    function (participant) {

      return (
        String(
          participant.id
        ) ===
        String(
          id
        )
      );

    }
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
      event.key === "Enter"
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