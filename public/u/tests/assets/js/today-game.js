// today-game.js - 열정의 축제 기획하기 (Planning a Festival of Passion)

// --- Utility Functions ---
function getDailySeed() {
    const today = new Date();
    return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function mulberry32(seed) {
    return function() {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) | 0;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function getEulReParticle(word) {
    if (!word || word.length === 0) return "";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "를";
    return (uni - 0xAC00) % 28 > 0 ? "을" : "를";
}

function getWaGwaParticle(word) {
    if (!word || word.length === 0) return "";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "와";
    return (uni - 0xAC00) % 28 > 0 ? "과" : "와";
}

function showFeedback(isSuccess, message) {
    const feedbackMessage = document.getElementById('feedbackMessage');
    if (feedbackMessage) {
        feedbackMessage.innerText = message;
        feedbackMessage.className = `feedback-message ${isSuccess ? 'correct' : 'incorrect'}`;
    }
}

// --- Game State Management ---
let gameState = {};
let currentRandFn = null;

function resetGameState() {
    gameState = {
        day: 1,
        creativity: 50,
        enthusiasm: 50,
        connection: 50,
        actionPoints: 10,
        maxActionPoints: 10,
        resources: { inspiration: 10, supplies: 10, budget: 5, special_guest_ticket: 0 },
        participants: [
            { id: "leo", name: "레오", personality: "열정적", skill: "공연", engagement: 70 },
            { id: "bella", name: "벨라", personality: "창의적", skill: "미술", engagement: 60 }
        ],
        maxParticipants: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { generationSuccess: 0 },
        dailyActions: { explored: false, brainstormingHeld: false, talkedTo: [], minigamePlayed: false },
        festivalBooths: {
            foodTruck: { built: false, durability: 100 },
            artisanBooth: { built: false, durability: 100 },
            mainStage: { built: false, durability: 100 },
            ideaLounge: { built: false, durability: 100 },
            mediaStudio: { built: false, durability: 100 }
        },
        promoLevel: 0,
        minigameState: {}
    };
    currentRandFn = mulberry32(getDailySeed() + gameState.day);
}

function saveGameState() {
    localStorage.setItem('enfpFestivalGame', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('enfpFestivalGame');
    const today = new Date().toISOString().slice(0, 10);
    if (savedState) {
        let loaded = JSON.parse(savedState);
        if (!loaded.dailyBonus) loaded.dailyBonus = { generationSuccess: 0 };
        if (!loaded.participants || loaded.participants.length === 0) {
            loaded.participants = [
                { id: "leo", name: "레오", personality: "열정적", skill: "공연", engagement: 70 },
                { id: "bella", name: "벨라", personality: "창의적", skill: "미술", engagement: 60 }
            ];
        }
        Object.assign(gameState, loaded);

        currentRandFn = mulberry32(getDailySeed() + gameState.day);

        if (gameState.lastPlayedDate !== today) {
            gameState.day += 1;
            gameState.lastPlayedDate = today;
            gameState.manualDayAdvances = 0;
            gameState.dailyEventTriggered = false;
            processDailyEvents();
        }
    } else {
        resetGameState();
        processDailyEvents();
    }
    renderAll();
}

function updateState(changes, displayMessage = null) {
    Object.keys(changes).forEach(key => {
        if (typeof changes[key] === 'object' && changes[key] !== null && !Array.isArray(changes[key])) {
            gameState[key] = { ...gameState[key], ...changes[key] };
        } else {
            gameState[key] = changes[key];
        }
    });
    saveGameState();
    renderAll(displayMessage);
}

// --- UI Rendering ---
function updateGameDisplay(text) {
    const gameArea = document.getElementById('gameArea');
    if(gameArea && text) gameArea.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
}

function renderStats() {
    const statsDiv = document.getElementById('gameStats');
    if (!statsDiv) return;
    const participantListHtml = gameState.participants.map(p => `<li>${p.name} (${p.skill}) - 참여도: ${p.engagement}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>축제일:</b> ${gameState.day}일</p>
        <p><b>행동력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>창의성:</b> ${gameState.creativity} | <b>열정:</b> ${gameState.enthusiasm} | <b>관계:</b> ${gameState.connection}</p>
        <p><b>자원:</b> 영감 ${gameState.resources.inspiration}, 물품 ${gameState.resources.supplies}, 예산 ${gameState.resources.budget}, 특별 게스트 티켓 ${gameState.resources.special_guest_ticket || 0}</p>
        <p><b>홍보 레벨:</b> ${gameState.promoLevel}</p>
        <p><b>축제 참가자 (${gameState.participants.length}/${gameState.maxParticipants}):</b></p>
        <ul>${participantListHtml}</ul>
    `;
    const manualDayCounter = document.getElementById('manualDayCounter');
    if(manualDayCounter) manualDayCounter.innerText = gameState.manualDayAdvances;
}

function renderChoices(choices) {
    const choicesDiv = document.getElementById('gameChoices');
    if (!choicesDiv) return;
    let dynamicChoices = [];

    if (gameState.currentScenarioId === 'intro') {
        dynamicChoices = gameScenarios.intro.choices;
    } else if (gameState.currentScenarioId === 'action_facility_management') {
        dynamicChoices = gameScenarios.action_facility_management.choices ? [...gameScenarios.action_facility_management.choices] : [];
        if (!gameState.festivalBooths.foodTruck.built) dynamicChoices.push({ text: "푸드 트럭 준비 (영감 50, 물품 20)", action: "build_food_truck" });
        if (!gameState.festivalBooths.artisanBooth.built) dynamicChoices.push({ text: "공예 부스 설치 (물품 30, 예산 30)", action: "build_artisan_booth" });
        if (!gameState.festivalBooths.mainStage.built) dynamicChoices.push({ text: "중앙 무대 건설 (영감 100, 물품 50, 예산 50)", action: "build_main_stage" });
        if (!gameState.festivalBooths.ideaLounge.built) dynamicChoices.push({ text: "아이디어 라운지 개설 (물품 80, 예산 40)", action: "build_idea_lounge" });
        if (gameState.festivalBooths.artisanBooth.built && gameState.festivalBooths.artisanBooth.durability > 0 && !gameState.festivalBooths.mediaStudio.built) {
            dynamicChoices.push({ text: "미디어 스튜디오 건설 (물품 50, 예산 100)", action: "build_media_studio" });
        }
        Object.keys(gameState.festivalBooths).forEach(key => {
            const facility = gameState.festivalBooths[key];
            if (facility.built && facility.durability < 100) {
                dynamicChoices.push({ text: `${key} 보수 (물품 10, 예산 10)`, action: "maintain_facility", params: { facility: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else {
        dynamicChoices = choices ? [...choices] : [];
    }

    choicesDiv.innerHTML = dynamicChoices.map(choice => `<button class="choice-btn" data-action="${choice.action}" data-params='${JSON.stringify(choice.params || {})}''>${choice.text}</button>`).join('');
    choicesDiv.querySelectorAll('.choice-btn').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            if (gameActions[action]) {
                gameActions[action](JSON.parse(button.dataset.params || '{}'));
            }
        });
    });
}

function renderAll(customDisplayMessage = null) {
    const desc = document.getElementById('gameDescription');
    if (desc) desc.style.display = 'none';
    renderStats();
    
    if (!gameState.currentScenarioId.startsWith('minigame_')) {
        const scenario = gameScenarios[gameState.currentScenarioId] || gameScenarios.intro;
        updateGameDisplay(customDisplayMessage || scenario.text);
        renderChoices(scenario.choices);
    }
}

// --- Game Data ---
const gameScenarios = {
    "intro": { text: "어떤 활동으로 축제를 채울까요?", choices: [
        { text: "축제 현장 둘러보기", action: "explore" },
        { text: "참가자와 소통하기", action: "talk_to_participants" },
        { text: "브레인스토밍 세션", action: "hold_brainstorming" },
        { text: "영감/자원 모으기", action: "show_resource_generation_options" },
        { text: "축제 부스 관리", action: "show_facility_options" },
        { text: "오늘의 미니게임", action: "play_minigame" }
    ]},
    "daily_event_conflict": {
        text: "참가자 레오와 벨라 사이에 창작 방향에 대한 의견 충돌이 생겼습니다. 둘 다 당신의 지지를 기다리는 것 같습니다.",
        choices: [
            { text: "레오의 공연 아이디어를 지지한다.", action: "handle_conflict", params: { first: "leo", second: "bella" } },
            { text: "벨라의 미술 컨셉을 지지한다.", action: "handle_conflict", params: { first: "bella", second: "leo" } },
            { text: "둘의 아이디어를 융합할 방법을 찾아본다.", action: "mediate_conflict" },
            { text: "자유롭게 해결하도록 내버려둔다.", action: "ignore_event" }
        ]
    },
    "daily_event_rain": { text: "예상치 못한 비로 인해 축제 물품 일부가 손상되었습니다. (-10 물품)", choices: [{ text: "확인", action: "return_to_intro" }] },
    "daily_event_delay": { text: "물품 공급이 지연되어 예산의 일부를 긴급 조달에 사용했습니다. (-10 예산)", choices: [{ text: "확인", action: "return_to_intro" }] },
    "daily_event_artist_visit": {
        text: "유명 아티스트가 축제에 관심을 보입니다. [예산 50]을 들여 초청하면 축제의 열기를 한껏 끌어올릴 수 있습니다.",
        choices: [
            { text: "초청한다", action: "accept_invitation" },
            { text: "초청하지 않는다", action: "decline_invitation" }
        ]
    },
    "daily_event_new_participant": {
        choices: [
            { text: "환영하고 함께 아이디어를 나눈다.", action: "welcome_new_unique_participant" },
            { text: "그의 재능을 지켜본다.", action: "observe_participant" },
            { text: "축제와 어울리지 않는 것 같다.", action: "reject_participant" }
        ]
    },
    "game_over_creativity": { text: "축제의 창의성이 고갈되어 아이디어가 정체되었습니다. 사람들은 흥미를 잃었습니다.", choices: [], final: true },
    "game_over_enthusiasm": { text: "축제에 대한 열정이 식었습니다. 참가자들은 떠나고, 축제는 막을 내립니다.", choices: [], final: true },
    "game_over_connection": { text: "참가자들 사이의 관계가 무너졌습니다. 더 이상 축제는 열릴 수 없습니다.", choices: [], final: true },
    "game_over_resources": { text: "축제를 이어나갈 자원이 고갈되었습니다.", choices: [], final: true },
    "action_resource_generation": {
        text: "어떤 영감을 얻으시겠습니까?",
        choices: [
            { text: "사람들과 대화하기 (영감)", action: "perform_generate_inspiration" },
            { text: "자재 구하기 (물품)", action: "perform_gather_supplies" },
            { text: "후원 요청하기 (예산)", "action": "perform_raise_budget" },
            { text: "취소", "action": "return_to_intro" }
        ]
    },
    "action_facility_management": {
        text: "어떤 부스를 관리하시겠습니까?",
        choices: []
    },
    "resource_generation_result": {
        text: "",
        choices: [{ text: "확인", action: "show_resource_generation_options" }]
    },
    "facility_management_result": {
        text: "",
        choices: [{ text: "확인", action: "show_facility_options" }]
    },
    "conflict_resolution_result": {
        text: "",
        choices: [{ text: "확인", action: "return_to_intro" }]
    }
};

function calculateMinigameReward(minigameName, score) {
    let rewards = { creativity: 0, enthusiasm: 0, connection: 0, message: "" };

    switch (minigameName) {
        case "기억력 순서 맞추기":
            if (score >= 51) {
                rewards.enthusiasm = 15;
                rewards.creativity = 10;
                rewards.connection = 5;
                rewards.message = "엄청난 집중력이네요! 모두가 당신의 열정에 감탄합니다. (+15 열정, +10 창의성, +5 관계)";
            } else if (score >= 21) {
                rewards.enthusiasm = 10;
                rewards.creativity = 5;
                rewards.message = "훌륭한 기억력입니다! (+10 열정, +5 창의성)";
            } else if (score >= 0) {
                rewards.enthusiasm = 5;
                rewards.message = "미니게임을 완료했습니다. (+5 열정)";
            } else {
                rewards.message = "미니게임을 완료했지만, 아쉽게도 보상은 없습니다.";
            }
            break;
        case "새로운 아이디어 스케치":
            rewards.creativity = 10;
            rewards.message = "멋진 아이디어가 떠올랐습니다! (+10 창의성)";
            break;
        case "즉흥 연기 챌린지":
            rewards.enthusiasm = 5;
            rewards.creativity = 5;
            rewards.message = "성공적인 즉흥 연기였습니다! (+5 열정, +5 창의성)";
            break;
        case "소셜 아이스브레이킹":
            rewards.connection = 10;
            rewards.message = "분위기가 한껏 달아올랐습니다! (+10 관계)";
            break;
        case "랜덤 스토리텔링":
            rewards.creativity = 10;
            rewards.connection = 5;
            rewards.message = "모두가 당신의 이야기에 빠져들었습니다. (+10 창의성, +5 관계)";
            break;
        default:
            rewards.message = `미니게임 ${minigameName}을(를) 완료했습니다.`;
            break;
    }
    return rewards;
}

const minigames = [
    {
        name: "기억력 순서 맞추기",
        description: "화면에 나타나는 숫자 순서를 기억하고 정확하게 입력하세요. 단계가 올라갈수록 어려워집니다!",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { currentSequence: [], playerInput: [], stage: 1, score: 0, showingSequence: false };
            minigames[0].render(gameArea, choicesDiv);
            minigame[0].showSequence();
        },
        render: (gameArea, choicesDiv) => {
            gameArea.innerHTML = `
                <p><b>단계:</b> ${gameState.minigameState.stage} | <b>점수:</b> ${gameState.minigameState.score}</p>
                <p id="sequenceDisplay" style="font-size: 2em; font-weight: bold; min-height: 1.5em;"></p>
                <p>순서를 기억하고 입력하세요:</p>
                <div id="playerInputDisplay" style="font-size: 1.5em; min-height: 1.5em;">${gameState.minigameState.playerInput.join(' ')}</div>
            `;
            choicesDiv.innerHTML = `
                <div class="number-pad">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `<button class="choice-btn num-btn" data-value="${num}">${num}</button>`).join('')}
                    <button class="choice-btn num-btn" data-value="0">0</button>
                    <button class="choice-btn submit-btn" data-action="submitSequence">입력 완료</button>
                    <button class="choice-btn reset-btn" data-action="resetInput">초기화</button>
                </div>
            `;
            choicesDiv.querySelectorAll('.num-btn').forEach(button => {
                button.addEventListener('click', () => minigames[0].processAction('addInput', button.dataset.value));
            });
            choicesDiv.querySelector('.submit-btn').addEventListener('click', () => minigames[0].processAction('submitSequence'));
            choicesDiv.querySelector('.reset-btn').addEventListener('click', () => minigames[0].processAction('resetInput'));
        },
        showSequence: () => {
            gameState.minigameState.showingSequence = true;
            gameState.minigameState.currentSequence = [];
            const sequenceLength = gameState.minigameState.stage + 2;
            for (let i = 0; i < sequenceLength; i++) {
                gameState.minigameState.currentSequence.push(Math.floor(currentRandFn() * 10));
            }

            const sequenceDisplay = document.getElementById('sequenceDisplay');
            let i = 0;
            const interval = setInterval(() => {
                if (i < gameState.minigameState.currentSequence.length) {
                    sequenceDisplay.innerText = gameState.minigameState.currentSequence[i];
                    i++;
                } else {
                    clearInterval(interval);
                    sequenceDisplay.innerText = "입력하세요!";
                    gameState.minigameState.showingSequence = false;
                }
            }, 800);
        },
        processAction: (actionType, value = null) => {
            if (gameState.minigameState.showingSequence) return;

            if (actionType === 'addInput') {
                gameState.minigameState.playerInput.push(parseInt(value));
                document.getElementById('playerInputDisplay').innerText = gameState.minigameState.playerInput.join(' ');
            } else if (actionType === 'resetInput') {
                gameState.minigameState.playerInput = [];
                document.getElementById('playerInputDisplay').innerText = '';
            } else if (actionType === 'submitSequence') {
                const correct = gameState.minigameState.currentSequence.every((num, i) => num === gameState.minigameState.playerInput[i]);

                if (correct && gameState.minigameState.playerInput.length === gameState.minigameState.currentSequence.length) {
                    gameState.minigameState.score += gameState.minigameState.currentSequence.length * 10;
                    gameState.minigameState.stage++;
                    gameState.minigameState.playerInput = [];
                    updateGameDisplay("정답입니다! 다음 단계로 넘어갑니다.");
                    minigames[0].render(document.getElementById('gameArea'), document.getElementById('gameChoices'));
                    setTimeout(() => minigames[0].showSequence(), 1500);
                } else {
                    updateGameDisplay("오답입니다. 게임 종료.");
                    minigames[0].end();
                }
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[0].name, gameState.minigameState.score);
            updateState({
                creativity: gameState.creativity + rewards.creativity,
                enthusiasm: gameState.enthusiasm + rewards.enthusiasm,
                connection: gameState.connection + rewards.connection,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    { name: "새로운 아이디어 스케치", description: "주어진 주제에 대해 3가지 새로운 아이디어를 스케치하세요.", start: (ga, cd) => { ga.innerHTML = "<p>새로운 아이디어 스케치 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[1].end()'>종료</button>"; gameState.minigameState = { score: 10 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[1].name, gameState.minigameState.score); updateState({ creativity: gameState.creativity + r.creativity, enthusiasm: gameState.enthusiasm + r.enthusiasm, connection: gameState.connection + r.connection, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "즉흥 연기 챌린지", description: "주어진 상황에서 즉흥 연기를 펼쳐보세요.", start: (ga, cd) => { ga.innerHTML = "<p>즉흥 연기 챌린지 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[2].end()'>종료</button>"; gameState.minigameState = { score: 15 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[2].name, gameState.minigameState.score); updateState({ creativity: gameState.creativity + r.creativity, enthusiasm: gameState.enthusiasm + r.enthusiasm, connection: gameState.connection + r.connection, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "소셜 아이스브레이킹", description: "어색한 분위기를 깨는 최고의 아이스브레이킹 질문을 던지세요.", start: (ga, cd) => { ga.innerHTML = "<p>소셜 아이스브레이킹 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[3].end()'>종료</button>"; gameState.minigameState = { score: 20 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[3].name, gameState.minigameState.score); updateState({ creativity: gameState.creativity + r.creativity, enthusiasm: gameState.enthusiasm + r.enthusiasm, connection: gameState.connection + r.connection, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "랜덤 스토리텔링", description: "주어진 단어들을 사용해 매력적인 이야기를 만드세요.", start: (ga, cd) => { ga.innerHTML = "<p>랜덤 스토리텔링 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[4].end()'>종료</button>"; gameState.minigameState = { score: 25 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[4].name, gameState.minigameState.score); updateState({ creativity: gameState.creativity + r.creativity, enthusiasm: gameState.enthusiasm + r.enthusiasm, connection: gameState.connection + r.connection, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } }
];

// --- Game Actions ---
function spendActionPoint() {
    if (gameState.actionPoints <= 0) {
        updateGameDisplay("행동력이 부족합니다.");
        return false;
    }
    updateState({ actionPoints: gameState.actionPoints - 1 });
    return true;
}

const gameActions = {
    explore: () => {
        if (!spendActionPoint()) return;
        if (gameState.dailyActions.explored) { updateState({ dailyActions: { ...gameState.dailyActions, explored: true } }, "오늘은 더 이상 새로운 것을 발견하지 못했습니다."); return; }
        
        let changes = { dailyActions: { ...gameState.dailyActions, explored: true } };
        let message = "축제 현장을 둘러보니 활기가 넘칩니다.";
        const rand = currentRandFn();
        if (rand < 0.3) { message += " 멋진 아이디어를 발견했습니다. (+2 영감)"; changes.inspiration = gameState.resources.inspiration + 2; }
        else if (rand < 0.6) { message += " 유용한 물품을 발견했습니다. (+2 물품)"; changes.resources = { ...gameState.resources, supplies: gameState.resources.supplies + 2 }; }
        else { message += " 특별한 것은 발견하지 못했습니다."; }
        
        updateState(changes, message);
    },
    talk_to_participants: () => {
        if (!spendActionPoint()) return;
        const participant = gameState.participants[Math.floor(currentRandFn() * gameState.participants.length)];
        if (gameState.dailyActions.talkedTo.includes(participant.id)) { updateState({ dailyActions: { ...gameState.dailyActions, talkedTo: [...gameState.dailyActions.talkedTo, participant.id] } }, `${participant.name}${getWaGwaParticle(participant.name)} 이미 충분히 소통했습니다.`); return; }
        
        let changes = { dailyActions: { ...gameState.dailyActions, talkedTo: [...gameState.dailyActions.talkedTo, participant.id] } };
        let message = `${participant.name}${getWaGwaParticle(participant.name)} 소통했습니다. `;
        if (participant.engagement > 80) { message += `${participant.name}는 당신의 열정에 감화되어 축제에 대한 아이디어를 공유했습니다. (+5 관계)`; changes.connection = gameState.connection + 5; }
        else if (participant.engagement < 40) { message += `${participant.name}는 아직 축제에 소극적입니다. 더 많은 관심이 필요합니다. (-5 열정)`; changes.enthusiasm = gameState.enthusiasm - 5; }
        else { message += `즐거운 대화를 통해 서로에 대해 알아갔습니다. (+2 열정)`; changes.enthusiasm = gameState.enthusiasm + 2; }
        
        updateState(changes, message);
    },
    hold_brainstorming: () => {
        if (!spendActionPoint()) return;
        if (gameState.dailyActions.brainstormingHeld) {
            const message = "오늘은 이미 브레인스토밍을 진행했습니다. 연속된 회의는 창의성을 떨어뜨립니다. (-5 창의성)";
            gameState.creativity -= 5;
            updateState({ creativity: gameState.creativity }, message);
            return;
        }
        updateState({ dailyActions: { ...gameState.dailyActions, brainstormingHeld: true } });
        const rand = currentRandFn();
        let message = "브레인스토밍 세션을 개최했습니다. ";
        if (rand < 0.5) { message += "참가자들이 자유롭게 의견을 나누며 관계가 돈독해졌습니다. (+10 관계, +5 열정)"; updateState({ connection: gameState.connection + 10, enthusiasm: gameState.enthusiasm + 5 }); }
        else { message += "기발한 아이디어가 쏟아져 나왔습니다. (+5 창의성)"; updateState({ creativity: gameState.creativity + 5 }); }
        updateGameDisplay(message);
    },
    manualNextDay: () => {
        if (gameState.manualDayAdvances >= 5) { updateGameDisplay("오늘은 더 이상 수동으로 날짜를 넘길 수 없습니다. 내일 다시 시도해주세요."); return; }
        updateState({
            manualDayAdvances: gameState.manualDayAdvances + 1,
            day: gameState.day + 1,
            lastPlayedDate: new Date().toISOString().slice(0, 10),
            dailyEventTriggered: false
        });
        processDailyEvents();
    },
    handle_conflict: (params) => {
        if (!spendActionPoint()) return;
        const { first, second } = params;
        let message = "";
        let reward = { creativity: 0, enthusiasm: 0, connection: 0 };
        
        const updatedParticipants = gameState.participants.map(p => {
            if (p.id === first) {
                p.engagement = Math.min(100, p.engagement + 10);
                message += `${p.name}의 아이디어를 지지했습니다. ${p.name}의 참여도가 상승했습니다. `;
                reward.creativity += 5;
            } else if (p.id === second) {
                p.engagement = Math.max(0, p.engagement - 5);
                message += `${second}의 참여도가 약간 하락했습니다. `;
            }
            return p;
        });
        
        updateState({ ...reward, participants: updatedParticipants, currentScenarioId: 'conflict_resolution_result' }, message);
    },
    mediate_conflict: () => {
        if (!spendActionPoint()) return;
        const message = "당신의 중재로 두 아이디어가 융합되어 더 멋진 기획이 탄생했습니다! (+10 관계, +5 창의성)";
        updateState({ connection: gameState.connection + 10, creativity: gameState.creativity + 5, currentScenarioId: 'conflict_resolution_result' }, message);
    },
    ignore_event: () => {
        if (!spendActionPoint()) return;
        const message = "의견 충돌을 무시했습니다. 참가자들의 열정이 식고 관계가 소원해집니다. (-10 열정, -5 관계)";
        const updatedParticipants = gameState.participants.map(p => {
            p.engagement = Math.max(0, p.engagement - 5);
            return p;
        });
        updateState({ enthusiasm: gameState.enthusiasm - 10, connection: gameState.connection - 5, participants: updatedParticipants, currentScenarioId: 'conflict_resolution_result' }, message);
    },
    show_resource_generation_options: () => updateState({ currentScenarioId: 'action_resource_generation' }),
    show_facility_options: () => updateState({ currentScenarioId: 'action_facility_management' }),
    perform_generate_inspiration: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.promoLevel * 0.1) + (gameState.dailyBonus.generationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "새로운 영감을 얻었습니다! (+5 영감)";
            changes.resources = { ...gameState.resources, inspiration: gameState.resources.inspiration + 5 };
        } else {
            message = "영감을 얻는 데 실패했습니다.";
        }
        updateState(changes, message);
    },
    perform_gather_supplies: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.promoLevel * 0.1) + (gameState.dailyBonus.generationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "축제 물품을 구했습니다! (+5 물품)";
            changes.resources = { ...gameState.resources, supplies: gameState.resources.supplies + 5 };
        } else {
            message = "물품을 구하는 데 실패했습니다.";
        }
        updateState(changes, message);
    },
    perform_raise_budget: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.promoLevel * 0.1) + (gameState.dailyBonus.generationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "후원 요청에 성공했습니다! (+5 예산)";
            changes.resources = { ...gameState.resources, budget: gameState.resources.budget + 5 };
        } else {
            message = "후원 요청에 실패했습니다.";
        }
        updateState(changes, message);
    },
    build_food_truck: () => {
        if (!spendActionPoint()) return;
        const cost = { inspiration: 50, supplies: 20 };
        let message = "";
        let changes = {};
        if (gameState.resources.supplies >= cost.supplies && gameState.resources.inspiration >= cost.inspiration) {
            gameState.festivalBooths.foodTruck.built = true;
            message = "푸드 트럭을 준비했습니다!";
            changes.connection = gameState.connection + 10;
            changes.resources = { ...gameState.resources, supplies: gameState.resources.supplies - cost.supplies, inspiration: gameState.resources.inspiration - cost.inspiration };
        } else {
            message = "자원이 부족하여 준비할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_artisan_booth: () => {
        if (!spendActionPoint()) return;
        const cost = { supplies: 30, budget: 30 };
        let message = "";
        let changes = {};
        if (gameState.resources.supplies >= cost.supplies && gameState.resources.budget >= cost.budget) {
            gameState.festivalBooths.artisanBooth.built = true;
            message = "공예 부스를 설치했습니다!";
            changes.enthusiasm = gameState.enthusiasm + 10;
            changes.resources = { ...gameState.resources, supplies: gameState.resources.supplies - cost.supplies, budget: gameState.resources.budget - cost.budget };
        } else {
            message = "자원이 부족하여 설치할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_main_stage: () => {
        if (!spendActionPoint()) return;
        const cost = { inspiration: 100, supplies: 50, budget: 50 };
        let message = "";
        let changes = {};
        if (gameState.resources.supplies >= cost.supplies && gameState.resources.budget >= cost.budget && gameState.resources.inspiration >= cost.inspiration) {
            gameState.festivalBooths.mainStage.built = true;
            message = "중앙 무대를 건설했습니다!";
            changes.connection = gameState.connection + 20;
            changes.enthusiasm = gameState.enthusiasm + 20;
            changes.resources = { ...gameState.resources, supplies: gameState.resources.supplies - cost.supplies, budget: gameState.resources.budget - cost.budget, inspiration: gameState.resources.inspiration - cost.inspiration };
        } else {
            message = "자원이 부족하여 건설할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_idea_lounge: () => {
        if (!spendActionPoint()) return;
        const cost = { supplies: 80, budget: 40 };
        let message = "";
        let changes = {};
        if (gameState.resources.supplies >= cost.supplies && gameState.resources.budget >= cost.budget) {
            gameState.festivalBooths.ideaLounge.built = true;
            message = "아이디어 라운지를 개설했습니다!";
            changes.creativity = gameState.creativity + 15;
            changes.connection = gameState.connection + 10;
            changes.resources = { ...gameState.resources, supplies: gameState.resources.supplies - cost.supplies, budget: gameState.resources.budget - cost.budget };
        } else {
            message = "자원이 부족하여 개설할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_media_studio: () => {
        if (!spendActionPoint()) return;
        const cost = { supplies: 50, budget: 100 };
        let message = "";
        let changes = {};
        if (gameState.resources.supplies >= cost.supplies && gameState.resources.budget >= cost.budget) {
            gameState.festivalBooths.mediaStudio.built = true;
            message = "미디어 스튜디오를 건설했습니다!";
            changes.resources = { ...gameState.resources, supplies: gameState.resources.supplies - cost.supplies, budget: gameState.resources.budget - cost.budget };
        } else {
            message = "자원이 부족하여 건설할 수 없습니다.";
        }
        updateState(changes, message);
    },
    maintain_facility: (params) => {
        if (!spendActionPoint()) return;
        const facilityKey = params.facility;
        const cost = { supplies: 10, budget: 10 };
        let message = "";
        let changes = {};
        if (gameState.resources.supplies >= cost.supplies && gameState.resources.budget >= cost.budget) {
            gameState.festivalBooths[facilityKey].durability = 100;
            message = `${facilityKey} 시설의 보수를 완료했습니다. 내구도가 100으로 회복되었습니다.`;
            changes.resources = { ...gameState.resources, supplies: gameState.resources.supplies - cost.supplies, budget: gameState.resources.budget - cost.budget };
        } else {
            message = "보수에 필요한 자원이 부족합니다.";
        }
        updateState(changes, message);
    },
    promote_festival: () => {
        if (!spendActionPoint()) return;
        const cost = 20 * (gameState.promoLevel + 1);
        if (gameState.resources.supplies >= cost && gameState.resources.budget >= cost) {
            gameState.promoLevel++;
            updateState({ resources: { ...gameState.resources, supplies: gameState.resources.supplies - cost, budget: gameState.resources.budget - cost }, promoLevel: gameState.promoLevel });
            updateGameDisplay(`축제 홍보에 성공했습니다! 모든 자원 획득 성공률이 10% 증가합니다. (현재 레벨: ${gameState.promoLevel})`);
        } else { updateGameDisplay(`홍보에 필요한 자원이 부족합니다. (물품 ${cost}, 예산 ${cost} 필요)`); }
        updateState({ currentScenarioId: 'intro' });
    },
    brainstorm_ideas: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        if (rand < 0.3) { updateState({ resources: { ...gameState.resources, supplies: gameState.resources.supplies + 20, budget: gameState.resources.budget + 20 } }); updateGameDisplay("브레인스토밍 중 새로운 후원사를 발견했습니다! (+20 물품, +20 예산)"); }
        else if (rand < 0.5) { updateState({ creativity: gameState.creativity + 10, connection: gameState.connection + 10 }); updateGameDisplay("기발한 아이디어가 떠올라 참가자들의 관계가 돈독해졌습니다. (+10 창의성, +10 관계)"); }
        else { updateGameDisplay("브레인스토밍을 했지만, 특별한 아이디어는 없었습니다."); }
        updateState({ currentScenarioId: 'intro' });
    },
    accept_invitation: () => {
        if (!spendActionPoint()) return;
        if (gameState.resources.budget >= 50) {
            updateState({ resources: { ...gameState.resources, budget: gameState.resources.budget - 50, special_guest_ticket: (gameState.resources.special_guest_ticket || 0) + 1 } });
            updateGameDisplay("아티스트 초청에 성공했습니다! 축제의 열기가 한껏 달아오릅니다.");
        } else { updateGameDisplay("초청에 필요한 예산이 부족합니다."); }
        updateState({ currentScenarioId: 'intro' });
    },
    decline_invitation: () => {
        if (!spendActionPoint()) return;
        updateGameDisplay("아티스트 초청을 거절했습니다. 다음 기회를 노려봐야겠습니다.");
        updateState({ currentScenarioId: 'intro' });
    },
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    play_minigame: () => {
        if (gameState.dailyActions.minigamePlayed) { updateGameDisplay("오늘의 미니게임은 이미 플레이했습니다."); return; }
        if (!spendActionPoint()) return;
        
        const minigameIndex = (gameState.day - 1) % minigames.length;
        const minigame = minigames[minigameIndex];
        
        gameState.currentScenarioId = `minigame_${minigame.name}`;
        
        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } }); 
        
        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    }
};

function applyStatEffects() {
    let message = "";
    if (gameState.creativity >= 70) {
        gameState.dailyBonus.generationSuccess += 0.1;
        message += "높은 창의성 덕분에 자원 획득 성공률이 증가합니다. ";
    }
    if (gameState.creativity < 30) {
        gameState.participants.forEach(p => p.engagement = Math.max(0, p.engagement - 5));
        message += "낮은 창의성으로 인해 참가자들의 참여도가 하락합니다. ";
    }

    if (gameState.enthusiasm >= 70) {
        gameState.maxActionPoints += 1;
        gameState.actionPoints = gameState.maxActionPoints;
        message += "높은 열정 덕분에 축제에 활기가 넘쳐 행동력이 증가합니다. ";
    }
    if (gameState.enthusiasm < 30) {
        gameState.maxActionPoints = Math.max(5, gameState.maxActionPoints - 1);
        gameState.actionPoints = Math.min(gameState.actionPoints, gameState.maxActionPoints);
        message += "열정이 식어 축제에 침체기가 찾아와 행동력이 감소합니다. ";
    }

    if (gameState.connection >= 70) {
        Object.keys(gameState.festivalBooths).forEach(key => {
            if (gameState.festivalBooths[key].built) gameState.festivalBooths[key].durability = Math.min(100, gameState.festivalBooths[key].durability + 1);
        });
        message += "끈끈한 관계 덕분에 축제 시설 관리가 더 잘 이루어집니다. ";
    }
    if (gameState.connection < 30) {
        Object.keys(gameState.festivalBooths).forEach(key => {
            if (gameState.festivalBooths[key].built) gameState.festivalBooths[key].durability = Math.max(0, gameState.festivalBooths[key].durability - 2);
        });
        message += "관계가 약화되어 축제 시설들이 빠르게 노후화됩니다. ";
    }
    return message;
}

function generateRandomParticipant() {
    const names = ["루나", "아폴로", "클레오", "재스퍼"];
    const personalities = ["몽상가", "모험가", "예술가", "이야기꾼"];
    const skills = ["음악", "미술", "춤", "글쓰기"];
    const randomId = Math.random().toString(36).substring(2, 9);

    return {
        id: randomId,
        name: names[Math.floor(currentRandFn() * names.length)],
        personality: personalities[Math.floor(currentRandFn() * personalities.length)],
        skill: skills[Math.floor(currentRandFn() * skills.length)],
        engagement: 50
    };
}

// --- Daily/Initialization Logic ---
function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);

    updateState({
        actionPoints: 10,
        maxActionPoints: 10,
        dailyActions: { explored: false, brainstormingHeld: false, talkedTo: [], minigamePlayed: false },
        dailyEventTriggered: true,
        dailyBonus: { generationSuccess: 0 }
    });

    const statEffectMessage = applyStatEffects();

    let skillBonusMessage = "";
    let durabilityMessage = "";

    gameState.participants.forEach(p => {
        if (p.skill === '공연') { gameState.resources.inspiration++; skillBonusMessage += `${p.name}의 공연 덕분에 영감을 추가로 얻었습니다. `; }
        else if (p.skill === '미술') { gameState.resources.supplies++; skillBonusMessage += `${p.name}의 작품 덕분에 물품을 추가로 얻었습니다. `; }
        else if (p.skill === '글쓰기') { gameState.resources.inspiration++; skillBonusMessage += `${p.name}의 글 덕분에 영감을 추가로 얻었습니다. `; }
    });

    Object.keys(gameState.festivalBooths).forEach(key => {
        const facility = gameState.festivalBooths[key];
        if(facility.built) {
            facility.durability -= 1;
            if(facility.durability <= 0) {
                facility.built = false;
                durabilityMessage += `${key} 시설이 파손되었습니다! 수리가 필요합니다. `;
            }
        }
    });

    gameState.resources.inspiration -= gameState.participants.length * 2;
    let dailyMessage = "새로운 축제일이 시작되었습니다. ";
    dailyMessage += statEffectMessage + skillBonusMessage + durabilityMessage;
    if (gameState.resources.inspiration < 0) {
        gameState.enthusiasm -= 10;
        dailyMessage += "영감이 부족하여 참가자들이 지루해합니다! (-10 열정)";
    }
    
    const rand = currentRandFn();
    let eventId = "intro";
    if (rand < 0.15) { eventId = "daily_event_rain"; updateState({resources: {...gameState.resources, supplies: Math.max(0, gameState.resources.supplies - 10)}}); }
    else if (rand < 0.30) { eventId = "daily_event_delay"; updateState({resources: {...gameState.resources, budget: Math.max(0, gameState.resources.budget - 10)}}); }
    else if (rand < 0.5 && gameState.participants.length >= 2) { eventId = "daily_event_conflict"; }
    else if (rand < 0.7 && gameState.festivalBooths.mainStage.built && gameState.participants.length < gameState.maxParticipants) {
        eventId = "daily_event_new_participant";
        const newParticipant = generateRandomParticipant();
        gameState.pendingNewParticipant = newParticipant;
        gameScenarios["daily_event_new_participant"].text = `새로운 참가자 ${newParticipant.name}(${newParticipant.personality}, ${newParticipant.skill})이(가) 축제에 합류하고 싶어 합니다. (현재 참가자 수: ${gameState.participants.length} / ${gameState.maxParticipants})`;
    }
    else if (rand < 0.85 && gameState.festivalBooths.mainStage.built) { eventId = "daily_event_artist_visit"; }
    
    gameState.currentScenarioId = eventId;
    updateGameDisplay(dailyMessage + (gameScenarios[eventId]?.text || ''));
    renderChoices(gameScenarios[eventId].choices);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 축제를 초기화하시겠습니까? 모든 진행 상황이 사라집니다.")) {
        localStorage.removeItem('enfpFestivalGame');
        resetGameState();
        saveGameState();
        location.reload();
    }
}

window.onload = function() {
    try {
        initDailyGame();
        document.getElementById('resetGameBtn').addEventListener('click', resetGame);
        document.getElementById('nextDayBtn').addEventListener('click', gameActions.manualNextDay);
    } catch (e) {
        console.error("오늘의 게임 생성 중 오류 발생:", e);
        document.getElementById('gameDescription').innerText = "콘텐츠를 불러오는 데 실패했습니다. 페이지를 새로고침해 주세요.";
    }
};