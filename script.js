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

const pairHistoryList =
  document.getElementById("pairHistoryList");

const pairHistoryEmpty =
  document.getElementById("pairHistoryEmpty");

const leaderOpponentList =
  document.getElementById("leaderOpponentList");

const leaderOpponentEmpty =
  document.getElementById("leaderOpponentEmpty");

const followerOpponentList =
  document.getElementById("followerOpponentList");

const followerOpponentEmpty =
  document.getElementById("followerOpponentEmpty");


/* ========================================
   保存設定
======================================== */

const STORAGE_KEY =
  "hustleBattleGeneratorStateV17";

const LEGACY_STORAGE_KEY =
  "hustleBattleGeneratorStateV16";


/* ========================================
   データ
======================================== */

let participants = [];

let currentRound = 0;

let pairHistory = {};

let leaderOpponentHistory = {};

let followerOpponentHistory = {};

let lastRoundData = null;

/*
  現在操作メニューを開いている参加者
  保存対象にはしません。
*/

let openParticipantMenuId = null;


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

    if (event.key === "Enter") {

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


/* ========================================
   参加者追加
======================================== */

function addParticipant() {

  const name =
    nameInput.value.trim();


  if (name === "") {

    alert("名前を入力してください。");

    nameInput.focus();

    return;

  }


  const selectedRole =
    document.querySelector(
      'input[name="role"]:checked'
    );


  if (!selectedRole) {

    alert("Roleを選択してください。");

    return;

  }


  /*
    途中参加者は、
    現在参加中の人たちの公平性基準から開始。

    表示されるD/Jの実績は0から。
  */

  const danceFairBaseline =
    getCurrentDanceFairBaseline();

  const judgeFairBaseline =
    getCurrentJudgeFairBaseline();


  const participant = {

    id:
      Date.now() +
      Math.random(),

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
      danceFairBaseline,

    judgeFairCount:
      judgeFairBaseline

  };


  participants.push(
    participant
  );


  saveState();

  renderAll();


  nameInput.value = "";

  nameInput.focus();

}


/* ========================================
   参加者削除
======================================== */

function deleteParticipant(id) {

  participants =
    participants.filter(
      function (participant) {

        return participant.id !== id;

      }
    );


  if (
    openParticipantMenuId === id
  ) {

    openParticipantMenuId =
      null;

  }


  /*
    削除後に古いRoundを再表示すると
    分かりにくいため非表示にする。
  */

  lastRoundData =
    null;


  roundResultCard.classList.add(
    "hidden"
  );


  saveState();

  renderAll();

}


/* ========================================
   休憩
======================================== */

function restParticipant(id) {

  const participant =
    findParticipantById(
      id
    );


  if (!participant) {

    return;

  }


  participant.active =
    false;


  openParticipantMenuId =
    null;


  saveState();

  renderAll();

}


/* ========================================
   復帰
======================================== */

function resumeParticipant(id) {

  const participant =
    findParticipantById(
      id
    );


  if (!participant) {

    return;

  }


  /*
    休憩していたRound分を
    無理に取り戻さないようにする。

    復帰時点の参加中メンバーの
    公平性基準へ内部値を合わせる。
  */

  participant.danceFairCount =
    getCurrentDanceFairBaseline(
      participant.id
    );


  if (
    participant.judgeAvailable
  ) {

    participant.judgeFairCount =
      getCurrentJudgeFairBaseline(
        participant.id
      );

  }


  participant.active =
    true;


  openParticipantMenuId =
    null;


  saveState();

  renderAll();

}


/* ========================================
   参加者操作メニュー
======================================== */

function toggleParticipantMenu(id) {

  if (
    openParticipantMenuId === id
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
   現在のDance公平性基準
======================================== */

function getCurrentDanceFairBaseline(
  excludeId = null
) {

  const activeParticipants =
    participants.filter(
      function (participant) {

        return (
          participant.active !== false &&
          participant.id !== excludeId
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


  return (
    total /
    activeParticipants.length
  );

}


/* ========================================
   現在のJudge公平性基準
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
          participant.id !== excludeId
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


  return (
    total /
    judgeParticipants.length
  );

}


/* ========================================
   Round生成
======================================== */

function generateRound() {

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
    [...fixedLeaders];

  const followers =
    [...fixedFollowers];


  /*
    Bothを不足Roleへ振り分ける
  */

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


  /*
    Pair生成
  */

  const pairs =
    createFairPairs(
      selectedLeaders,
      selectedFollowers
    );


  /*
    Battle生成
  */

  const battles =
    createFairBattles(
      pairs
    );


  const usedIds =
    new Set();


  /*
    Dance・Pair・対戦履歴更新
  */

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


  /*
    Judge選定
  */

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


  /*
    休憩中の人は
    「今回未出場」には表示しない。
  */

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


  saveState();

  renderAll();


  renderRound(
    battles,
    waitingParticipants,
    currentRound
  );

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

function createFairBattles(pairs) {

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

  const leaderScore =
    getOpponentHistoryCount(
      leaderOpponentHistory,
      pairA.leader,
      pairB.leader
    );


  const followerScore =
    getOpponentHistoryCount(
      followerOpponentHistory,
      pairA.follower,
      pairB.follower
    );


  return (
    leaderScore +
    followerScore
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


  /*
    Judge可能
    ＋参加中
    ＋このBattleで踊っていない
  */

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
   Judge組み合わせ評価
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
      function (total, count) {

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


/* ========================================
   Judge評価比較
======================================== */

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
      current.length ===
      size
    ) {

      results.push(
        [...current]
      );

      return;

    }


    for (
      let i = startIndex;
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


  return results;

}


/* ========================================
   Fair Count取得
======================================== */

function getDanceFairCount(
  participant
) {

  if (
    typeof participant.danceFairCount ===
    "number"
  ) {

    return participant.danceFairCount;

  }


  return (
    participant.danceCount ||
    0
  );

}


function getJudgeFairCount(
  participant
) {

  if (
    typeof participant.judgeFairCount ===
    "number"
  ) {

    return participant.judgeFairCount;

  }


  return (
    participant.judgeCount ||
    0
  );

}


/* ========================================
   Pair履歴
======================================== */

function getPairKey(
  participantA,
  participantB
) {

  return getHistoryKey(
    participantA,
    participantB
  );

}


function getPairHistoryCount(
  participantA,
  participantB
) {

  const key =
    getPairKey(
      participantA,
      participantB
    );


  if (
    pairHistory[key] ===
    undefined
  ) {

    return 0;

  }


  return (
    pairHistory[key].count
  );

}


function addPairHistory(
  participantA,
  participantB
) {

  const key =
    getPairKey(
      participantA,
      participantB
    );


  if (
    pairHistory[key] ===
    undefined
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


/* ========================================
   対戦履歴
======================================== */

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
    historyObject[key] ===
    undefined
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


  if (
    historyObject[key] ===
    undefined
  ) {

    return 0;

  }


  return (
    historyObject[key].count
  );

}


/* ========================================
   共通履歴キー
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


/* ========================================
   自動保存
======================================== */

function saveState() {

  const state =
    {

      participants:
        participants,

      currentRound:
        currentRound,

      pairHistory:
        pairHistory,

      leaderOpponentHistory:
        leaderOpponentHistory,

      followerOpponentHistory:
        followerOpponentHistory,

      lastRoundData:
        lastRoundData

    };


  try {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        state
      )
    );

  } catch (error) {

    console.warn(
      "データを保存できませんでした。",
      error
    );

  }

}


/* ========================================
   保存データ読込
======================================== */

function loadState() {

  try {

    let saved =
      localStorage.getItem(
        STORAGE_KEY
      );


    /*
      v16の保存データがあれば
      v17へ引き継ぐ
    */

    if (!saved) {

      saved =
        localStorage.getItem(
          LEGACY_STORAGE_KEY
        );

    }


    if (!saved) {

      return;

    }


    const state =
      JSON.parse(
        saved
      );


    if (
      Array.isArray(
        state.participants
      )
    ) {

      participants =
        state.participants;

    }


    participants.forEach(
      function (participant) {

        if (
          typeof participant.active !==
          "boolean"
        ) {

          participant.active =
            true;

        }


        if (
          typeof participant.danceCount !==
          "number"
        ) {

          participant.danceCount =
            0;

        }


        if (
          typeof participant.judgeCount !==
          "number"
        ) {

          participant.judgeCount =
            0;

        }


        if (
          typeof participant.danceFairCount !==
          "number"
        ) {

          participant.danceFairCount =
            participant.danceCount;

        }


        if (
          typeof participant.judgeFairCount !==
          "number"
        ) {

          participant.judgeFairCount =
            participant.judgeCount;

        }

      }
    );


    currentRound =
      typeof state.currentRound ===
      "number"
        ? state.currentRound
        : 0;


    pairHistory =
      state.pairHistory ||
      {};


    leaderOpponentHistory =
      state.leaderOpponentHistory ||
      {};


    followerOpponentHistory =
      state.followerOpponentHistory ||
      {};


    lastRoundData =
      state.lastRoundData ||
      null;


    /*
      v16から読み込んだ場合も
      v17形式として保存しておく
    */

    saveState();

  } catch (error) {

    console.warn(
      "保存データを読み込めませんでした。",
      error
    );

  }

}


/* ========================================
   Round保存用データ
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
   保存Round復元
======================================== */

function restoreLastRound() {

  if (
    !lastRoundData
  ) {

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
            function (participant) {

              return participant;

            }
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
        function (participant) {

          return participant;

        }
      );


  if (
    battles.length > 0
  ) {

    renderRound(
      battles,
      waitingParticipants,
      lastRoundData.roundNumber
    );

  }

}


/* ========================================
   Roundデータリセット
======================================== */

function resetRoundData() {

  if (
    participants.length === 0 &&
    currentRound === 0
  ) {

    return;

  }


  const confirmed =
    confirm(
      "参加者は残したまま、Round回数・D/J回数・Pair履歴・対戦履歴をリセットします。よろしいですか？"
    );


  if (!confirmed) {

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


  roundResultCard.classList.add(
    "hidden"
  );


  battleList.innerHTML =
    "";


  waitingList.innerHTML =
    "";


  openParticipantMenuId =
    null;


  saveState();

  renderAll();

}


/* ========================================
   全表示更新
======================================== */

function renderAll() {

  renderParticipantList();

  renderPairHistory();

  renderOpponentSummary();

}


/* ========================================
   参加者一覧表示
======================================== */

function renderParticipantList() {

  participantList.innerHTML =
    "";


  participants.forEach(
    function (participant) {

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
        participant.active === false
      ) {

        row.classList.add(
          "is-resting"
        );

      }


      row.tabIndex =
        0;


      row.addEventListener(
        "click",
        function () {

          toggleParticipantMenu(
            participant.id
          );

        }
      );


      row.addEventListener(
        "keydown",
        function (event) {

          if (
            event.key === "Enter" ||
            event.key === " "
          ) {

            event.preventDefault();

            toggleParticipantMenu(
              participant.id
            );

          }

        }
      );


      /*
        名前
      */

      const mainElement =
        document.createElement(
          "div"
        );

      mainElement.className =
        "participant-main";


      const nameElement =
        document.createElement(
          "div"
        );

      nameElement.className =
        "participant-name";

      nameElement.textContent =
        participant.name;


      mainElement.appendChild(
        nameElement
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


      /*
        Role
      */

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


      /*
        D / J
      */

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


      /*
        Judge可否
      */

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


      /*
        削除
      */

      const deleteButton =
        document.createElement(
          "button"
        );

      deleteButton.type =
        "button";

      deleteButton.className =
        "delete-button";

      deleteButton.textContent =
        "×";


      deleteButton.addEventListener(
        "click",
        function (event) {

          event.stopPropagation();


          deleteParticipant(
            participant.id
          );

        }
      );


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
        deleteButton
      );


      item.appendChild(
        row
      );


      /*
        行をタップした人だけ
        操作を表示
      */

      if (
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


        if (
          participant.active === false
        ) {

          note.textContent =
            "復帰するとBattle・Judgeの対象に戻ります。";

        } else {

          note.textContent =
            "休憩中はBattle・Judgeの対象外になります。";

        }


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
    function (a, b) {

      if (
        a.count !==
        b.count
      ) {

        return (
          b.count -
          a.count
        );

      }


      return (
        getPairDisplayName(a)
          .localeCompare(
            getPairDisplayName(b),
            "ja"
          )
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


  const orderedParticipants =
    [...roleParticipants].sort(
      function (a, b) {

        return a.name.localeCompare(
          b.name,
          "ja"
        );

      }
    );


  orderedParticipants.forEach(
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
            .join(" / ");


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
        item.participantAId ===
        participant.id
      ) {

        opponentId =
          item.participantBId;

      } else if (
        item.participantBId ===
        participant.id
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


  opponents.sort(
    function (a, b) {

      return a.name.localeCompare(
        b.name,
        "ja"
      );

    }
  );


  return {

    count:
      maximumCount,

    opponents:
      opponents

  };

}


function getParticipantsUsedAsRole(role) {

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
        item.participantAId
      );

      ids.add(
        item.participantBId
      );

    }
  );


  return participants.filter(
    function (participant) {

      return (
        ids.has(
          participant.id
        )
      );

    }
  );

}


/* ========================================
   出場公平性順
======================================== */

function sortByDanceCount(array) {

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
    function (a, b) {

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

      return (
        item.participant
      );

    }
  );

}


/* ========================================
   共通
======================================== */

function shuffleArray(array) {

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
    ] =
    [
      copied[j],
      copied[i]
    ];

  }


  return copied;

}


function getRandomItem(array) {

  return (
    array[
      Math.floor(
        Math.random() *
        array.length
      )
    ]
  );

}


function findParticipantById(id) {

  return participants.find(
    function (participant) {

      return (
        participant.id === id
      );

    }
  );

}


function getPairDisplayName(item) {

  const participantA =
    findParticipantById(
      item.participantAId
    );

  const participantB =
    findParticipantById(
      item.participantBId
    );


  if (
    !participantA ||
    !participantB
  ) {

    return "";

  }


  return (
    participantA.name +
    participantB.name
  );

}


/* ========================================
   Round表示
======================================== */

function renderRound(
  battles,
  waitingParticipants,
  roundNumber
) {

  roundResultCard.classList.remove(
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
    function (battle, index) {

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
        (index + 1);


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
    waitingParticipants.length ===
    0
  ) {

    waitingArea.classList.add(
      "hidden"
    );

  } else {

    waitingArea.classList.remove(
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

function createJudgeElement(judges) {

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
   Role表示
======================================== */

function getRoleLabel(role) {

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
   起動
======================================== */

loadState();

renderAll();

restoreLastRound();