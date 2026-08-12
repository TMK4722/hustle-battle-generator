/* ========================================
   v32：管理者追加済み参加者との端末紐づけ

   このファイルは既存のscript.jsへ追加する機能です。
   既存の「自分で参加登録する」機能は変更しません。
======================================== */

const existingLinkSection =
  document.getElementById(
    "existingLinkSection"
  );

const existingParticipantSelect =
  document.getElementById(
    "existingParticipantSelect"
  );

const linkExistingParticipantButton =
  document.getElementById(
    "linkExistingParticipantButton"
  );

const existingParticipantMessage =
  document.getElementById(
    "existingParticipantMessage"
  );


/* ========================================
   本人判定を拡張

   従来：Firestoreのdocument ID = Firebase uid
   追加：participant.uid = Firebase uid

   管理者追加済み参加者はdocument IDを変えず、
   uidだけをあとから本人端末と紐づけます。
======================================== */

getCurrentParticipant = function () {
  if (!currentFirebaseUser) {
    return null;
  }

  return participants.find(
    function (participant) {
      return (
        participant.uid ===
          currentFirebaseUser.uid
        ||
        String(participant.id) ===
          currentFirebaseUser.uid
      );
    }
  ) || null;
};


isCurrentParticipant = function (
  participant
) {
  if (
    !participant ||
    !currentFirebaseUser
  ) {
    return false;
  }

  return (
    participant.uid ===
      currentFirebaseUser.uid
    ||
    String(participant.id) ===
      currentFirebaseUser.uid
  );
};


/* ========================================
   未紐づけ参加者
======================================== */

function getUnlinkedParticipants() {
  return participants
    .filter(
      function (participant) {
        return participant.uid === null;
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


function renderExistingParticipantLinkOptions() {
  if (
    !existingParticipantSelect ||
    !linkExistingParticipantButton ||
    !existingParticipantMessage
  ) {
    return;
  }

  const previousValue =
    existingParticipantSelect.value;

  existingParticipantSelect.innerHTML =
    "";

  const placeholder =
    document.createElement(
      "option"
    );

  placeholder.value = "";
  placeholder.textContent =
    "自分の名前を選択";

  existingParticipantSelect.appendChild(
    placeholder
  );

  const candidates =
    getUnlinkedParticipants();

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

      existingParticipantSelect.appendChild(
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
          previousValue
        );
      }
    )
  ) {
    existingParticipantSelect.value =
      previousValue;
  }

  const hasCandidates =
    candidates.length > 0;

  existingParticipantSelect.disabled =
    !hasCandidates;

  linkExistingParticipantButton.disabled =
    !hasCandidates;

  existingParticipantMessage.textContent =
    hasCandidates
      ? "未紐づけの参加者だけ表示しています。"
      : "現在、管理者が追加した未紐づけ参加者はいません。";
}


/* ========================================
   参加登録表示を拡張

   一般参加者でまだ本人登録・紐づけがない場合のみ、
   既存参加者との紐づけ欄を表示します。
======================================== */

updateRegistrationDisplay = function () {
  if (!currentFirebaseUser) {
    registrationCard.classList.add(
      "hidden"
    );
    return;
  }

  if (isCurrentUserAdmin) {
    registrationCard.classList.remove(
      "hidden"
    );

    registrationTitle.textContent =
      "参加者追加";

    registrationDescription.textContent =
      "管理者は参加者を何人でも追加できます。";

    addButton.textContent =
      "参加者を追加";

    existingLinkSection.classList.add(
      "hidden"
    );

    return;
  }

  if (getCurrentParticipant()) {
    registrationCard.classList.add(
      "hidden"
    );

  } else {
    registrationCard.classList.remove(
      "hidden"
    );

    registrationTitle.textContent =
      "参加登録";

    registrationDescription.textContent =
      "この端末を使用する参加者を登録します。";

    addButton.textContent =
      "参加する";

    existingLinkSection.classList.remove(
      "hidden"
    );

    renderExistingParticipantLinkOptions();
  }
};


/* ========================================
   休憩 / 復帰の本人判定も紐づけ対応
======================================== */

changeParticipantActive = async function (
  id,
  active
) {
  if (
    !currentFirebaseUser ||
    !firebaseDb
  ) {
    return;
  }

  const participant =
    findParticipantById(id);

  const isOwn =
    isCurrentParticipant(
      participant
    );

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
};


toggleParticipantMenu = function (id) {
  const participant =
    findParticipantById(id);

  const canManage =
    isCurrentUserAdmin ||
    isCurrentParticipant(
      participant
    );

  if (!canManage) {
    return;
  }

  openParticipantMenuId =
    openParticipantMenuId === id
      ? null
      : id;

  renderParticipantList();
};


/* ========================================
   本人端末との紐づけ
======================================== */

async function linkExistingParticipant() {
  if (
    !currentFirebaseUser ||
    !firebaseDb ||
    isCurrentUserAdmin
  ) {
    return;
  }

  if (getCurrentParticipant()) {
    alert(
      "この端末ではすでに参加者と紐づいています。"
    );
    return;
  }

  const participantId =
    existingParticipantSelect.value;

  if (!participantId) {
    alert(
      "自分の名前を選択してください。"
    );
    return;
  }

  const participant =
    findParticipantById(
      participantId
    );

  if (
    !participant ||
    participant.uid !== null
  ) {
    alert(
      "この参加者はすでに別の端末と紐づいている可能性があります。画面を更新して確認してください。"
    );
    return;
  }

  const confirmed =
    confirm(
      "「" +
      participant.name +
      "」として、この端末を紐づけますか？\n\n" +
      "一度紐づけると、一般参加者側から別の参加者へ変更はできません。"
    );

  if (!confirmed) {
    return;
  }

  linkExistingParticipantButton.disabled =
    true;

  try {
    await firebaseDb
      .collection("participants")
      .doc(String(participant.id))
      .update({
        uid: currentFirebaseUser.uid
      });

    existingParticipantMessage.textContent =
      "紐づけが完了しました。";

  } catch (error) {
    console.error(error);

    alert(
      "参加者との紐づけに失敗しました。\n" +
      (error.code || error.message)
    );

    renderExistingParticipantLinkOptions();
  }
}


linkExistingParticipantButton.addEventListener(
  "click",
  linkExistingParticipant
);


/*
  script.js読み込み時点ではv31の本人判定で一度描画されているため、
  v32の拡張を読み込んだあとに表示を更新します。
*/
updateRegistrationDisplay();
renderParticipantList();
renderCurrentRound();