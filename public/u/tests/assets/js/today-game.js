// today-game.js - 열정의 축제 기획하기 (Planning a Passionate Festival)

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

function getRandomValue(base, variance) {
    const min = base - variance;
    const max = base + variance;
    return Math.floor(currentRandFn() * (max - min + 1)) + min;
}

function getEulReParticle(word) {
    if (!word || word.length === 0) return "를";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "를";
    return (uni - 0xAC00) % 28 > 0 ? "을" : "를";
}

function getWaGwaParticle(word) {
    if (!word || word.length === 0) return "와";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "와";
    return (uni - 0xAC00) % 28 > 0 ? "과" : "와";
}

// --- Game State Management ---
let gameState = {};
let currentRandFn = null;

function resetGameState() {
    gameState = {
        day: 1,
        creativity: 50, // 창의성
        passion: 50,    // 열정
        relationships: 50, // 관계
        energy: 50,  // 에너지
        recognition: 50,      // 인지도
        actionPoints: 10,
        maxActionPoints: 10,
        resources: { ideas: 10, participants: 10, funds: 5, special_tickets: 0 },
        artists: [
            { id: "leo", name: "레오", personality: "열정적인", skill: "음악", synergy: 70 },
            { id: "bella", name: "벨라", personality: "자유로운 영혼", skill: "미술", synergy: 60 }
        ],
        maxArtists: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { creationSuccess: 0 },
        dailyActions: { brainstormed: false, promoActivities: false, scouted: [], minigamePlayed: false },
        festivalBooths: {
            foodTruck: { built: false, durability: 100, name: "푸드 트럭", description: "축제에 맛있는 먹거리를 제공합니다.", effect_description: "참가자 만족도 및 자금 수입 증가." },
            craftBooth: { built: false, durability: 100, name: "공예 부스", description: "독특한 수공예품을 판매하고 체험 활동을 제공합니다.", effect_description: "아이디어 생성 및 참가자 유입 증가." },
            mainStage: { built: false, durability: 100, name: "중앙 무대", description: "축제의 메인 공연이 열리는 곳입니다.", effect_description: "새로운 아티스트 섭외 및 인지도 상승." },
            ideaLounge: { built: false, durability: 100, name: "아이디어 라운지", description: "참가자들이 자유롭게 아이디어를 교류하는 공간입니다.", effect_description: "과거의 영감을 통해 스탯 및 자원 획득." },
            mediaStudio: { built: false, durability: 100, name: "미디어 스튜디오", description: "축제를 홍보하고 특별 게스트를 인터뷰합니다.", effect_description: "고급 홍보 및 특별 게스트 티켓 활용 잠금 해제." }
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
        if (!loaded.dailyBonus) loaded.dailyBonus = { creationSuccess: 0 };
        if (!loaded.artists || loaded.artists.length === 0) {
            loaded.artists = [
                { id: "leo", name: "레오", personality: "열정적인", skill: "음악", synergy: 70 },
                { id: "bella", name: "벨라", personality: "자유로운 영혼", skill: "미술", synergy: 60 }
            ];
        }
        if (!loaded.energy) loaded.energy = 50;
        if (!loaded.recognition) loaded.recognition = 50;

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
    const artistListHtml = gameState.artists.map(a => `<li>${a.name} (${a.skill}) - 시너지: ${a.synergy}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>축제:</b> ${gameState.day}일차</p>
        <p><b>행동력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>창의성:</b> ${gameState.creativity} | <b>열정:</b> ${gameState.passion} | <b>관계:</b> ${gameState.relationships} | <b>에너지:</b> ${gameState.energy} | <b>인지도:</b> ${gameState.recognition}</p>
        <p><b>자원:</b> 아이디어 ${gameState.resources.ideas}, 참가자 ${gameState.resources.participants}, 자금 ${gameState.resources.funds}, 특별 티켓 ${gameState.resources.special_tickets || 0}</p>
        <p><b>홍보 레벨:</b> ${gameState.promoLevel}</p>
        <p><b>참여 아티스트 (${gameState.artists.length}/${gameState.maxArtists}):</b></p>
        <ul>${artistListHtml}</ul>
        <p><b>설치된 부스:</b></p>
        <ul>${Object.values(gameState.festivalBooths).filter(b => b.built).map(b => `<li>${b.name} (내구성: ${b.durability}) - ${b.effect_description}</li>`).join('') || '없음'}</ul>
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
    } else if (gameState.currentScenarioId === 'action_booth_management') {
        dynamicChoices = gameScenarios.action_booth_management.choices ? [...gameScenarios.action_booth_management.choices] : [];
        if (!gameState.festivalBooths.foodTruck.built) dynamicChoices.push({ text: "푸드 트럭 설치 (아이디어 50, 참가자 20)", action: "build_foodTruck" });
        if (!gameState.festivalBooths.craftBooth.built) dynamicChoices.push({ text: "공예 부스 설치 (참가자 30, 자금 30)", action: "build_craftBooth" });
        if (!gameState.festivalBooths.mainStage.built) dynamicChoices.push({ text: "중앙 무대 설치 (아이디어 100, 참가자 50, 자금 50)", action: "build_mainStage" });
        if (!gameState.festivalBooths.ideaLounge.built) dynamicChoices.push({ text: "아이디어 라운지 설치 (참가자 80, 자금 40)", action: "build_ideaLounge" });
        if (gameState.festivalBooths.craftBooth.built && gameState.festivalBooths.craftBooth.durability > 0 && !gameState.festivalBooths.mediaStudio.built) {
            dynamicChoices.push({ text: "미디어 스튜디오 설치 (참가자 50, 자금 100)", action: "build_mediaStudio" });
        }
        Object.keys(gameState.festivalBooths).forEach(key => {
            const booth = gameState.festivalBooths[key];
            if (booth.built && booth.durability < 100) {
                dynamicChoices.push({ text: `${booth.name} 보수 (참가자 10, 자금 10)`, action: "maintain_booth", params: { booth: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else {
        dynamicChoices = choices ? [...choices] : [];
    }

    choicesDiv.innerHTML = dynamicChoices.map(choice => `<button class="choice-btn" data-action="${choice.action}" data-params='${JSON.stringify(choice.params || {})}'>${choice.text}</button>`).join('');
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

// --- Game Data (to be themed for ENFP) ---
const gameScenarios = {
    "intro": { text: "오늘은 축제를 위해 무엇을 할까요?", choices: [
        { text: "브레인스토밍", action: "brainstorm" },
        { text: "아티스트 섭외하기", action: "scout_artists" },
        { text: "홍보 활동", action: "promo_activities" },
        { text: "자원 모으기", action: "show_resource_gathering_options" },
        { text: "축제 부스 관리", action: "show_booth_options" },
        { text: "깜짝 이벤트", action: "show_surprise_events_options" },
        { text: "오늘의 공연", action: "play_minigame" }
    ]},
    // ... more ENFP-themed scenarios
};

// ... (Full game logic will be implemented here)

// --- Initialization ---
window.onload = function() {
    try {
        initDailyGame();
        document.getElementById('resetGameBtn').addEventListener('click', resetGame);
        document.getElementById('nextDayBtn').addEventListener('click', () => {
            if (gameState.manualDayAdvances >= 5) {
                updateGameDisplay("오늘은 더 이상 수동으로 날짜를 넘길 수 없습니다. 내일 다시 시도해주세요.");
                return;
            }
            updateState({
                manualDayAdvances: gameState.manualDayAdvances + 1,
                day: gameState.day + 1,
                lastPlayedDate: new Date().toISOString().slice(0, 10),
                dailyEventTriggered: false
            });
            processDailyEvents();
        });
    } catch (e) {
        console.error("오늘의 게임 생성 중 오류 발생:", e);
        document.getElementById('gameDescription').innerText = "콘텐츠를 불러오는 데 실패했습니다. 페이지를 새로고침해 주세요.";
    }
};