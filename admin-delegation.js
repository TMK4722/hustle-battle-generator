/* ========================================
   v33：代理管理者機能

   Owner
   ・常設管理者
   ・Operatorの設定 / 解除が可能

   Operator
   ・Round生成
   ・参加者管理
   ・Roundリセット
   ・履歴確認
   ・ただし権限管理は不可

   Operatorは同時に1人だけ。
======================================== */


const ownerDelegationPanel =
  document.getElementById(
    "ownerDelegationPanel"
  );

const currentOperatorInfo =
  document.getElementById(
    "currentOperatorInfo"
  );

const operatorParticipantSelect =
  document.getElementById(
    "operatorParticipantSelect"
  );

const assignOperatorButton =
  document.getElementById(
    "assignOperatorButton"
  );

const revokeOperatorButton =
  document.getElementById(
    "revokeOperatorButton"
  );


let currentAdminRoleV33 = null;

let currentDelegationData = null;

let delegationUnsubscribeV33 = null;


/* ========================================
   Owner判定
======================================== */

async function checkOwnerRoleV33(user) {
  if (
    !user ||
    !firebaseDb
  ) {
    return false;
  }

  try {
    const snapshot =
      await firebaseDb
        .collection("admins")
        .doc(user.uid)
        .get();

    if (!snapshot.exists) {
      return false;
    }

    const data =
      snapshot.data() || {};

    /*
      既存環境との互換性のため
      role:"admin" もOwnerとして扱う。

      将来的には role:"owner" に変更してもよい。
    */
    return (
      data.role === "owner" ||
      data.role === "admin"
    );

  } catch (error) {
    console.error(
      "Owner確認失敗:",
      error
    );

    return false;
  }
}


/* ========================================
   管理者状態をUIへ反映
======================================== */

function applyAdminRoleV33() {
  isCurrentUserAdmin =
    (
      currentAdminRoleV33 === "owner" ||
      currentAdminRoleV33 === "operator"
    );

  if (
    currentAdminRoleV33 === "owner"
  ) {
    updateFirebaseStatus(
      "Owner認証OK",
      currentFirebaseUser &&
      currentFirebaseUser.email
        ? currentFirebaseUser.email
        : "Owner"
    );

    adminLoginButton
      .classList
      .add("hidden");

    adminLogoutButton
      .classList
      .remove("hidden");

  } else if (
    currentAdminRoleV33 === "operator"
  ) {
    updateFirebaseStatus(
      "代理管理者",
      "現在、この端末に代理管理者権限があります。"
    );

    /*
      Operatorは匿名UIDに対して権限を付与しているため、
      Googleログイン・管理者ログアウトは表示しない。
    */
    adminLoginButton
      .classList
      .add("hidden");

    adminLogoutButton
      .classList
      .add("hidden");
  }

  updatePermissionUI();

  renderOwnerDelegationPanelV33();
}


/* ========================================
   Delegationリアルタイム監視

   Ownerが代理管理者を変更・解除すると、
   Operator側の画面も自動的に切り替わる。
======================================== */

function startDelegationListenerV33(user) {
  if (
    !firebaseDb ||
    !user
  ) {
    return;
  }

  if (delegationUnsubscribeV33) {
    delegationUnsubscribeV33();
    delegationUnsubscribeV33 = null;
  }

  delegationUnsubscribeV33 =
    firebaseDb
      .collection("adminDelegation")
      .doc("current")
      .onSnapshot(

        function (snapshot) {
          currentDelegationData =
            snapshot.exists
              ? snapshot.data()
              : null;

          /*
            Ownerは常にOwner。
            Delegation情報によって上書きしない。
          */
          if (
            currentAdminRoleV33 !== "owner"
          ) {
            const isOperator =
              currentDelegationData &&
              String(
                currentDelegationData.operatorUid
              ) ===
              String(user.uid);

            currentAdminRoleV33 =
              isOperator
                ? "operator"
                : null;
          }

          /*
            Operator解除時も即時反映。
          */
          if (
            currentAdminRoleV33 === null
          ) {
            isCurrentUserAdmin = false;

            if (user.isAnonymous) {
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
            }

            updatePermissionUI();

            renderOwnerDelegationPanelV33();

          } else {
            applyAdminRoleV33();
          }
        },

        function (error) {
          console.error(
            "代理管理者情報の監視失敗:",
            error
          );
        }
      );
}


/* ========================================
   Auth状態変更時のv33権限確認

   script.jsの既存Auth処理とは別に動かす。
======================================== */

if (
  firebaseReady &&
  firebaseAuth
) {
  firebaseAuth.onAuthStateChanged(
    async function (user) {

      if (delegationUnsubscribeV33) {
        delegationUnsubscribeV33();
        delegationUnsubscribeV33 = null;
      }

      currentAdminRoleV33 = null;
      currentDelegationData = null;

      if (!user) {
        renderOwnerDelegationPanelV33();
        return;
      }

      const isOwner =
        await checkOwnerRoleV33(
          user
        );

      if (isOwner) {
        currentAdminRoleV33 =
          "owner";
      }

      /*
        Owner / Operatorどちらの場合も
        delegation/currentを監視する。
      */
      startDelegationListenerV33(
        user
      );

      if (isOwner) {
        applyAdminRoleV33();
      }
    }
  );
}


/* ========================================
   Operator候補

   ・本人端末と紐づき済み
   ・Owner本人ではない
======================================== */

function getOperatorCandidatesV33() {
  if (!currentFirebaseUser) {
    return [];
  }

  return participants
    .filter(
      function (participant) {

        if (
          !participant.uid
        ) {
          return false;
        }

        /*
          Owner自身は候補にしない。
        */
        if (
          String(participant.uid) ===
          String(
            currentFirebaseUser.uid
          )
        ) {
          return false;
        }

        return true;
      }
    )
    .sort(
      function (a, b) {
        return a.name.localeCompare(
          b.name,
          "ja"
        );
      }
    );
}


/* ========================================
   現在のOperator参加者を取得
======================================== */

function getCurrentOperatorParticipantV33() {
  if (
    !currentDelegationData
  ) {
    return null;
  }

  const participantId =
    currentDelegationData.participantId;

  if (!participantId) {
    return null;
  }

  return findParticipantById(
    participantId
  );
}


/* ========================================
   Ownerパネル描画
======================================== */

function renderOwnerDelegationPanelV33() {
  if (
    !ownerDelegationPanel ||
    !operatorParticipantSelect ||
    !currentOperatorInfo ||
    !assignOperatorButton ||
    !revokeOperatorButton
  ) {
    return;
  }

  if (
    currentAdminRoleV33 !== "owner"
  ) {
    ownerDelegationPanel
      .classList
      .add("hidden");

    return;
  }

  ownerDelegationPanel
    .classList
    .remove("hidden");


  const previousValue =
    operatorParticipantSelect.value;

  operatorParticipantSelect.innerHTML =
    "";

  const placeholder =
    document.createElement(
      "option"
    );

  placeholder.value = "";

  placeholder.textContent =
    "代理管理者を選択";

  operatorParticipantSelect.appendChild(
    placeholder
  );


  const candidates =
    getOperatorCandidatesV33();

  candidates.forEach(
    function (participant) {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        String(participant.id);

      option.textContent =
        participant.name +
        "（" +
        (
          getParticipationType(
            participant
          ) === "judgeOnly"
            ? "Judgeのみ"
            : getRoleLabel(
                participant.role
              )
        ) +
        "）";

      operatorParticipantSelect
        .appendChild(
          option
        );
    }
  );


  if (
    previousValue &&
    candidates.some(
      function (participant) {
        return (
          String(participant.id) ===
          String(previousValue)
        );
      }
    )
  ) {
    operatorParticipantSelect.value =
      previousValue;
  }


  const currentOperator =
    getCurrentOperatorParticipantV33();

  if (
    currentDelegationData
  ) {
    if (currentOperator) {
      currentOperatorInfo.textContent =
        "現在の代理管理者：" +
        currentOperator.name;

    } else {
      currentOperatorInfo.textContent =
        "現在、代理管理者が設定されています。";
    }

    revokeOperatorButton
      .classList
      .remove("hidden");

  } else {
    currentOperatorInfo.textContent =
      "現在、代理管理者はいません。";

    revokeOperatorButton
      .classList
      .add("hidden");
  }


  const hasCandidates =
    candidates.length > 0;

  operatorParticipantSelect.disabled =
    !hasCandidates;

  assignOperatorButton.disabled =
    !hasCandidates;
}


/* ========================================
   Operator設定
======================================== */

async function assignOperatorV33() {
  if (
    currentAdminRoleV33 !== "owner" ||
    !firebaseDb ||
    !currentFirebaseUser
  ) {
    return;
  }

  const participantId =
    operatorParticipantSelect.value;

  if (!participantId) {
    alert(
      "代理管理者にする参加者を選択してください。"
    );
    return;
  }


  const participant =
    findParticipantById(
      participantId
    );

  if (
    !participant ||
    !participant.uid
  ) {
    alert(
      "この参加者は本人端末と紐づいていません。"
    );
    return;
  }


  const currentOperator =
    getCurrentOperatorParticipantV33();

  let message =
    participant.name +
    " さんを代理管理者に設定しますか？\n\n" +
    "Round生成・参加者管理・Roundリセット等ができるようになります。";

  if (
    currentOperator &&
    String(currentOperator.id) !==
    String(participant.id)
  ) {
    message +=
      "\n\n現在の代理管理者 " +
      currentOperator.name +
      " さんの権限は自動的に解除されます。";
  }


  if (!confirm(message)) {
    return;
  }


  assignOperatorButton.disabled =
    true;

  try {
    await firebaseDb
      .collection("adminDelegation")
      .doc("current")
      .set({
        operatorUid:
          participant.uid,

        participantId:
          String(participant.id),

        updatedAt:
          firebase.firestore
            .FieldValue
            .serverTimestamp()
      });

  } catch (error) {
    console.error(error);

    alert(
      "代理管理者を設定できませんでした。\n" +
      (error.code || error.message)
    );

  } finally {
    assignOperatorButton.disabled =
      false;
  }
}


/* ========================================
   Operator解除
======================================== */

async function revokeOperatorV33() {
  if (
    currentAdminRoleV33 !== "owner" ||
    !firebaseDb
  ) {
    return;
  }

  if (!currentDelegationData) {
    return;
  }


  const currentOperator =
    getCurrentOperatorParticipantV33();

  const name =
    currentOperator
      ? currentOperator.name
      : "現在の代理管理者";


  if (
    !confirm(
      name +
      " さんの代理管理者権限を解除しますか？"
    )
  ) {
    return;
  }


  revokeOperatorButton.disabled =
    true;

  try {
    await firebaseDb
      .collection("adminDelegation")
      .doc("current")
      .delete();

  } catch (error) {
    console.error(error);

    alert(
      "代理管理者を解除できませんでした。\n" +
      (error.code || error.message)
    );

  } finally {
    revokeOperatorButton.disabled =
      false;
  }
}


/* ========================================
   既存renderAllへOwnerパネル描画を追加
======================================== */

const originalRenderAllV33 =
  renderAll;

renderAll = function () {
  originalRenderAllV33();

  renderOwnerDelegationPanelV33();
};


/* ========================================
   イベント
======================================== */

assignOperatorButton.addEventListener(
  "click",
  assignOperatorV33
);

revokeOperatorButton.addEventListener(
  "click",
  revokeOperatorV33
);


/* 初期描画 */
renderOwnerDelegationPanelV33();