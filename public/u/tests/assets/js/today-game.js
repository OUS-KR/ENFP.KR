// today-game.js - ENFP - 열정의 축제 기획하기 (Planning a Passionate Festival)

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
        passion: 50,
        relationships: 50,
        energy: 50,
        popularity: 50,
        actionPoints: 10, // Internally actionPoints, but represents '행동력' in UI
        maxActionPoints: 10,
        resources: { ideas: 10, participants: 10, funds: 5, special_guest_tickets: 0 },
        artists: [
            { id: "leo", name: "레오", personality: "열정적인", skill: "음악", synergy: 70 },
            { id: "bella", name: "벨라", personality: "자유로운 영혼", skill: "미술", synergy: 60 }
        ],
        maxArtists: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { creationSuccess: 0 }, // Re-themed from gatheringSuccess
        dailyActions: { brainstormed: false, scouted: false, promoted: false, minigamePlayed: false }, // Re-themed
        festivalBooths: {
            foodTruck: { built: false, durability: 100, name: "푸드 트럭", description: "축제에 맛있는 먹거리를 제공합니다.", effect_description: "참가자 만족도 및 자금 수입 증가." },
            craftBooth: { built: false, durability: 100, name: "공예 부스", description: "독특한 수공예품을 판매하고 체험 활동을 제공합니다.", effect_description: "아이디어 생성 및 참가자 유입 증가." },
            mainStage: { built: false, durability: 100, name: "중앙 무대", description: "축제의 메인 공연이 열리는 곳입니다.", effect_description: "새로운 아티스트 섭외 및 인지도 상승." },
            ideaLounge: { built: false, durability: 100, name: "아이디어 라운지", description: "참가자들이 자유롭게 아이디어를 교류하는 공간입니다.", effect_description: "과거의 영감을 통해 스탯 및 자원 획득." },
            mediaStudio: { built: false, durability: 100, name: "미디어 스튜디오", description: "축제를 홍보하고 특별 게스트를 인터뷰합니다.", effect_description: "고급 홍보 및 특별 게스트 티켓 활용 잠금 해제." }
        },
        festivalLevel: 0, // Re-themed from toolsLevel
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
        // Patch for old save files
        if (!loaded.dailyBonus) loaded.dailyBonus = { creationSuccess: 0 };
        if (!loaded.artists || loaded.artists.length === 0) {
            loaded.artists = [
                { id: "leo", name: "레오", personality: "열정적인", skill: "음악", synergy: 70 },
                { id: "bella", name: "벨라", personality: "자유로운 영혼", skill: "미술", synergy: 60 }
            ];
        }
        // Ensure new stats are initialized if loading old save
        if (loaded.creativity === undefined) loaded.creativity = 50;
        if (loaded.passion === undefined) loaded.passion = 50;
        if (loaded.relationships === undefined) loaded.relationships = 50;
        if (loaded.energy === undefined) loaded.energy = 50;
        if (loaded.popularity === undefined) loaded.popularity = 50;
        if (loaded.festivalLevel === undefined) loaded.festivalLevel = 0;

        Object.assign(gameState, loaded);

        // Always initialize currentRandFn after loading state
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
    const artistListHtml = gameState.artists.map(a => `<li>${a.name} (${a.skill}) - 시너지: ${a.trust}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>날짜:</b> ${gameState.day}일</p>
        <p><b>행동력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>창의성:</b> ${gameState.creativity} | <b>열정:</b> ${gameState.passion} | <b>관계:</b> ${gameState.relationships} | <b>에너지:</b> ${gameState.energy} | <b>인지도:</b> ${gameState.popularity}</p>
        <p><b>자원:</b> 아이디어 ${gameState.resources.ideas}, 참가자 ${gameState.resources.participants}, 자금 ${gameState.resources.funds}, 특별 게스트 티켓 ${gameState.resources.special_guest_tickets || 0}</p>
        <p><b>축제 레벨:</b> ${gameState.festivalLevel}</p>
        <p><b>아티스트 (${gameState.artists.length}/${gameState.maxArtists}):</b></p>
        <ul>${artistListHtml}</ul>
        <p><b>설치된 축제 부스:</b></p>
        <ul>${Object.values(gameState.festivalBooths).filter(b => b.built).map(b => `<li>${b.name} (내구도: ${b.durability}) - ${b.effect_description}</li>`).join('') || '없음'}</ul>
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
        // Build options
        if (!gameState.festivalBooths.foodTruck.built) dynamicChoices.push({ text: "푸드 트럭 설치 (아이디어 50, 자금 20)", action: "build_foodTruck" });
        if (!gameState.festivalBooths.craftBooth.built) dynamicChoices.push({ text: "공예 부스 설치 (자금 30, 참가자 30)", action: "build_craftBooth" });
        if (!gameState.festivalBooths.mainStage.built) dynamicChoices.push({ text: "중앙 무대 설치 (아이디어 100, 자금 50, 참가자 50)", action: "build_mainStage" });
        if (!gameState.festivalBooths.ideaLounge.built) dynamicChoices.push({ text: "아이디어 라운지 설치 (자금 80, 참가자 40)", action: "build_ideaLounge" });
        if (gameState.festivalBooths.craftBooth.built && gameState.festivalBooths.craftBooth.durability > 0 && !gameState.festivalBooths.mediaStudio.built) {
            dynamicChoices.push({ text: "미디어 스튜디오 설치 (자금 50, 참가자 100)", action: "build_mediaStudio" });
        }
        // Maintenance options
        Object.keys(gameState.festivalBooths).forEach(key => {
            const booth = gameState.festivalBooths[key];
            if (booth.built && booth.durability < 100) {
                dynamicChoices.push({ text: `${booth.name} 보수 (자금 10, 참가자 10)`, action: "maintain_booth", params: { booth: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else { // For any other scenario, use its predefined choices
        dynamicChoices = choices ? [...choices] : [];
    }

    choicesDiv.innerHTML = dynamicChoices.map(choice => `<button class="choice-btn" data-action="${choice.action}" data-params='${JSON.stringify(choice.params || {})}' >${choice.text}</button>`).join('');
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
    "intro": { text: "오늘은 축제를 위해 무엇을 할까요?", choices: [
        { text: "브레인스토밍", action: "brainstorm" },
        { text: "아티스트와 교류", action: "scout_artists" },
        { text: "축제 홍보 활동", action: "promo_activities" },
        { text: "자원 확보", action: "show_resource_gathering_options" },
        { text: "축제 부스 관리", action: "show_booth_management_options" },
        { text: "깜짝 이벤트", action: "show_surprise_events_options" },
        { text: "오늘의 공연", action: "play_minigame" }
    ]},
    "daily_event_rain": { 
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_viral_moment": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_artist_dispute": {
        text: "레오와 벨라 사이에 창작 방향에 대한 작은 의견 차이가 생겼습니다. 둘 다 당신의 판단을 기다리는 것 같습니다.",
        choices: [
            { text: "레오의 관점을 먼저 들어준다.", action: "handle_artist_dispute", params: { first: "leo", second: "bella" } },
            { text: "벨라의 관점을 먼저 들어준다.", action: "handle_artist_dispute", params: { first: "bella", second: "leo" } },
            { text: "둘을 불러 조화로운 해결책을 찾는다.", action: "mediate_artist_dispute" },
            { text: "신경 쓰지 않는다.", action: "ignore_event" }
        ]
    },
    "daily_event_new_artist": {
        choices: [
            { text: "유능한 아티스트를 섭외한다.", action: "welcome_new_unique_artist" },
            { text: "축제에 필요한지 좀 더 지켜본다.", action: "observe_artist" },
            { text: "정중히 거절한다.", action: "reject_artist" }
        ]
    },
    "daily_event_anonymous_patron": {
        text: "외부에서 익명의 후원자가 축제 자금을 기부했습니다. 그들은 [자금 50개]를 [특별 게스트 티켓 5개]와 교환하자고 제안합니다.",
        choices: [
            { text: "제안을 수락한다", action: "accept_patronage" },
            { text: "제안을 거절한다", action: "decline_patronage" }
        ]
    },
    "daily_event_inspiration_block": {
        text: "갑자기 창의적인 영감이 떠오르지 않습니다. 축제가 침체되는 것 같습니다.",
        choices: [
            { text: "새로운 자극을 찾아 나선다 (행동력 1 소모)", action: "seek_inspiration" },
            { text: "잠시 쉬면서 기다린다", action: "wait_for_inspiration" }
        ]
    },
    "daily_event_relationship_crisis": {
        text: "아티스트들과의 관계가 흔들리고 있습니다. 서로 소통이 원활하지 않습니다.",
        choices: [
            { text: "아티스트들과 적극적으로 소통하여 관계를 회복한다 (행동력 1 소모)", action: "reconnect_with_artists" },
            { text: "혼자만의 시간을 가진다", action: "take_personal_time" }
        ]
    },
    "game_over_creativity": { text: "축제의 창의성이 고갈되어 더 이상 새로운 아이디어가 나오지 않습니다. 축제는 활력을 잃었습니다.", choices: [], final: true },
    "game_over_passion": { text: "당신의 열정이 식어버렸습니다. 축제를 이끌어갈 동력을 상실했습니다.", choices: [], final: true },
    "game_over_relationships": { text: "아티스트들과의 관계가 무너졌습니다. 더 이상 당신과 함께하려는 사람이 없습니다.", choices: [], final: true },
    "game_over_energy": { text: "에너지가 모두 소진되었습니다. 당신은 번아웃되었습니다.", choices: [], final: true },
    "game_over_popularity": { text: "축제가 사람들의 기억 속에서 잊혀졌습니다. 당신의 인지도는 바닥을 쳤습니다.", choices: [], final: true },
    "game_over_resources": { text: "축제 자원이 모두 고갈되어 더 이상 진행할 수 없습니다.", choices: [], final: true },
    "action_resource_gathering": {
        text: "어떤 자원을 확보하시겠습니까?",
        choices: [
            { text: "아이디어 구상", action: "gather_ideas" },
            { text: "참가자 모집", action: "gather_participants" },
            { text: "후원금 모금", action: "gather_funds" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
    "action_booth_management": {
        text: "어떤 축제 부스를 관리하시겠습니까?",
        choices: [] // Choices will be dynamically added in renderChoices
    },
    "resource_gathering_result": {
        text: "", // Text will be set dynamically by updateGameDisplay
        choices: [{ text: "확인", action: "show_resource_gathering_options" }] // Return to gathering menu
    },
    "booth_management_result": {
        text: "", // Text will be set dynamically by updateGameDisplay
        choices: [{ text: "확인", action: "show_booth_management_options" }] // Return to facility management menu
    },
    "artist_dispute_resolution_result": {
        text: "", // This will be set dynamically
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "surprise_events_menu": {
        text: "어떤 깜짝 이벤트를 시도해볼까요?",
        choices: [
            { text: "길거리 공연 (행동력 1 소모)", action: "play_street_performance" },
            { text: "숨겨진 장소 탐방 (행동력 1 소모)", action: "explore_hidden_place" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
};

const brainstormOutcomes = [
    {
        condition: (gs) => gs.energy < 40,
        weight: 40,
        effect: (gs) => {
            const energyLoss = getRandomValue(10, 4);
            const popularityLoss = getRandomValue(5, 2);
            const creativityLoss = getRandomValue(5, 2);
            return {
                changes: { energy: gs.energy - energyLoss, popularity: gs.popularity - popularityLoss, creativity: gs.creativity - creativityLoss },
                message: `브레인스토밍이 시작되자마자 아티스트들의 불만이 터져 나왔습니다. 낮은 에너지로 인해 분위기가 험악합니다. (-${energyLoss} 에너지, -${popularityLoss} 인기, -${creativityLoss} 창의성)`
            };
        }
    },
    {
        condition: (gs) => gs.creativity > 70 && gs.relationships > 60,
        weight: 30,
        effect: (gs) => {
            const energyGain = getRandomValue(15, 5);
            const popularityGain = getRandomValue(10, 3);
            const creativityGain = getRandomValue(10, 3);
            return {
                changes: { energy: gs.energy + energyGain, popularity: gs.popularity + popularityGain, creativity: gs.creativity + creativityGain },
                message: `높은 창의성과 관계를 바탕으로 건설적인 브레인스토밍이 진행되었습니다! (+${energyGain} 에너지, +${popularityGain} 인기, +${creativityGain} 창의성)`
            };
        }
    },
    {
        condition: (gs) => gs.resources.ideas < gs.artists.length * 4,
        weight: 25,
        effect: (gs) => {
            const passionGain = getRandomValue(10, 3);
            const creativityGain = getRandomValue(5, 2);
            return {
                changes: { passion: gs.passion + passionGain, creativity: gs.creativity + creativityGain },
                message: `아이디어가 부족한 상황에 대해 논의했습니다. 모두가 효율적인 아이디어 구상에 동의하며 당신의 리더십을 신뢰했습니다. (+${passionGain} 열정, +${creativityGain} 창의성)`
            };
        }
    },
    {
        condition: (gs) => gs.artists.some(a => a.trust < 50),
        weight: 20,
        effect: (gs) => {
            const artist = gs.artists.find(a => a.trust < 50);
            const trustGain = getRandomValue(10, 4);
            const energyGain = getRandomValue(5, 2);
            const creativityGain = getRandomValue(5, 2);
            const updatedArtists = gs.artists.map(a => a.id === artist.id ? { ...a, trust: Math.min(100, a.trust + trustGain) } : a);
            return {
                changes: { artists: updatedArtists, energy: gs.energy + energyGain, creativity: gs.creativity + creativityGain },
                message: "브레인스토밍 중, " + artist.name + `이(가) 조심스럽게 불만을 토로했습니다. 그의 의견을 존중하고 해결을 약속하자 신뢰를 얻었습니다. (+${trustGain} ` + artist.name + ` 시너지, +${energyGain} 에너지, +${creativityGain} 창의성)`
            };
        }
    },
    {
        condition: () => true, // Default positive outcome
        weight: 20,
        effect: (gs) => {
            const relationshipsGain = getRandomValue(5, 2);
            const popularityGain = getRandomValue(3, 1);
            return {
                changes: { relationships: gs.relationships + relationshipsGain, popularity: gs.popularity + popularityGain },
                message: `평범한 브레인스토밍이었지만, 모두가 한자리에 모여 아이디어를 나눈 것만으로도 의미가 있었습니다. (+${relationshipsGain} 관계, +${popularityGain} 인기)`
            };
        }
    },
    {
        condition: (gs) => gs.relationships < 40 || gs.creativity < 40,
        weight: 25, // Increased weight when conditions met
        effect: (gs) => {
            const energyLoss = getRandomValue(5, 2);
            const popularityLoss = getRandomValue(5, 2);
            const creativityLoss = getRandomValue(5, 2);
            return {
                changes: { energy: gs.energy - energyLoss, popularity: gs.popularity - popularityLoss, creativity: gs.creativity - creativityLoss },
                message: `브레인스토밍은 길어졌지만, 의견 차이만 확인하고 끝났습니다. 아티스트들의 에너지와 인기, 당신의 창의성이 약간 감소했습니다. (-${energyLoss} 에너지, -${popularityLoss} 인기, -${creativityLoss} 창의성)`
            };
        }
    }
];

const scoutArtistsOutcomes = [
    {
        condition: (gs) => gs.resources.ideas < 20,
        weight: 30,
        effect: (gs) => {
            const ideasGain = getRandomValue(10, 5);
            return {
                changes: { resources: { ...gs.resources, ideas: gs.resources.ideas + ideasGain } },
                message: `아티스트 섭외 중 새로운 아이디어를 발견했습니다! (+${ideasGain} 아이디어)`
            };
        }
    },
    {
        condition: (gs) => gs.resources.participants < 20,
        weight: 25,
        effect: (gs) => {
            const participantsGain = getRandomValue(10, 5);
            return {
                changes: { resources: { ...gs.resources, participants: gs.resources.participants + participantsGain } },
                message: `아티스트 섭외 중 새로운 참가자를 발견했습니다! (+${participantsGain} 참가자)`
            };
        }
    },
    {
        condition: () => true, // General positive discovery
        weight: 20,
        effect: (gs) => {
            const relationshipsGain = getRandomValue(5, 2);
            const passionGain = getRandomValue(5, 2);
            return {
                changes: { relationships: gs.relationships + relationshipsGain, passion: gs.passion + passionGain },
                message: `아티스트를 섭외하며 새로운 관계와 열정을 얻었습니다. (+${relationshipsGain} 관계, +${passionGain} 열정)`
            };
        }
    },
    {
        condition: () => true, // Always possible
        weight: 25, // Increased weight for more frequent occurrence
        effect: (gs) => {
            const actionLoss = getRandomValue(2, 1);
            const energyLoss = getRandomValue(5, 2);
            const popularityLoss = getRandomValue(5, 2);
            return {
                changes: { actionPoints: gs.actionPoints - actionLoss, energy: gs.energy - energyLoss, popularity: gs.popularity - popularityLoss },
                message: `아티스트 섭외에 너무 깊이 빠져 행동력을 소모하고 에너지와 인기가 감소했습니다. (-${actionLoss} 행동력, -${energyLoss} 에너지, -${popularityLoss} 인기)`
            };
        }
    },
    {
        condition: () => true, // Always possible
        weight: 15, // Increased weight for more frequent occurrence
        effect: (gs) => {
            const creativityLoss = getRandomValue(5, 2);
            const relationshipsLoss = getRandomValue(5, 2);
            return {
                changes: { creativity: gs.creativity - creativityLoss, relationships: gs.relationships - relationshipsLoss },
                message: `아티스트 섭외 중 예상치 못한 문제에 부딪혀 창의성과 관계가 약간 감소했습니다. (-${creativityLoss} 창의성, -${relationshipsLoss} 관계)`
            };
        }
    }
];

const promoActivitiesOutcomes = [
    {
        condition: (gs, artist) => artist.trust < 60,
        weight: 40,
        effect: (gs, artist) => {
            const trustGain = getRandomValue(10, 5);
            const popularityGain = getRandomValue(5, 2);
            const energyGain = getRandomValue(5, 2);
            const updatedArtists = gs.artists.map(a => a.id === artist.id ? { ...a, trust: Math.min(100, a.trust + trustGain) } : a);
            return {
                changes: { artists: updatedArtists, popularity: gs.popularity + popularityGain, energy: gs.energy + energyGain },
                message: artist.name + "" + getWaGwaParticle(artist.name) + ` 깊은 홍보 활동을 나누며 신뢰와 당신의 에너지를 얻었습니다. (+${trustGain} ` + artist.name + ` 시너지, +${popularityGain} 인기, +${energyGain} 에너지)`
            };
        }
    },
    {
        condition: (gs, artist) => artist.personality === "자유로운 영혼",
        weight: 20,
        effect: (gs, artist) => {
            const creativityGain = getRandomValue(10, 3);
            const passionGain = getRandomValue(5, 2);
            return {
                changes: { creativity: gs.creativity + creativityGain, passion: gs.passion + passionGain },
                message: artist.name + "" + getWaGwaParticle(artist.name) + `와 자유로운 홍보 활동을 나누며 창의성과 열정이 상승했습니다. (+${creativityGain} 창의성, +${passionGain} 열정)`
            };
        }
    },
    {
        condition: (gs, artist) => artist.skill === "공연",
        weight: 15,
        effect: (gs, artist) => {
            const participantsGain = getRandomValue(5, 2);
            return {
                changes: { resources: { ...gs.resources, participants: gs.resources.participants + participantsGain } },
                message: artist.name + "" + getWaGwaParticle(artist.name) + `의 공연 홍보에 대한 유용한 정보를 얻어 참가자를 추가로 확보했습니다. (+${participantsGain} 참가자)`
            };
        }
    },
    {
        condition: (gs, artist) => true, // Default positive outcome
        weight: 25,
        effect: (gs, artist) => {
            const relationshipsGain = getRandomValue(5, 2);
            const popularityGain = getRandomValue(3, 1);
            return {
                changes: { relationships: gs.relationships + relationshipsGain, popularity: gs.popularity + popularityGain },
                message: artist.name + "" + getWaGwaParticle(artist.name) + ` 소소한 홍보 활동을 나누며 관계와 당신의 인기가 조금 더 단단해졌습니다. (+${relationshipsGain} 관계, +${popularityGain} 인기)`
            };
        }
    },
    {
        condition: (gs, artist) => gs.energy < 40 || artist.trust < 40,
        weight: 20, // Increased weight when conditions met
        effect: (gs, artist) => {
            const trustLoss = getRandomValue(10, 3);
            const energyLoss = getRandomValue(5, 2);
            const popularityLoss = getRandomValue(5, 2);
            const updatedArtists = gs.artists.map(a => a.id === artist.id ? { ...a, trust: Math.max(0, a.trust - trustLoss) } : a);
            return {
                changes: { artists: updatedArtists, energy: gs.energy - energyLoss, popularity: gs.popularity - popularityLoss },
                message: artist.name + "" + getWaGwaParticle(artist.name) + ` 홍보 활동 중 오해를 사서 친밀도와 에너지, 당신의 인기가 감소했습니다. (-${trustLoss} ` + artist.name + ` 시너지, -${energyLoss} 에너지, -${popularityLoss} 인기)`
            };
        }
    },
    {
        condition: (gs) => gs.energy < 30,
        weight: 15, // Increased weight when conditions met
        effect: (gs, artist) => {
            const actionLoss = getRandomValue(1, 0);
            const creativityLoss = getRandomValue(5, 2);
            return {
                changes: { actionPoints: gs.actionPoints - actionLoss, creativity: gs.creativity - creativityLoss },
                message: artist.name + "" + getWaGwaParticle(artist.name) + ` 홍보 활동이 길어졌지만, 특별한 소득은 없었습니다. 당신의 창의성이 감소했습니다. (-${actionLoss} 행동력, -${creativityLoss} 창의성)`
            };
        }
    }
];

function calculateMinigameReward(minigameName, score) {
    let rewards = { creativity: 0, passion: 0, relationships: 0, energy: 0, popularity: 0, message: "" };

    switch (minigameName) {
        case "새로운 아이디어 스케치":
            if (score >= 51) {
                rewards.creativity = 15;
                rewards.passion = 10;
                rewards.relationships = 5;
                rewards.energy = 5;
                rewards.message = "최고의 아이디어 스케치 전문가가 되셨습니다! (+15 창의성, +10 열정, +5 관계, +5 에너지)";
            } else if (score >= 21) {
                rewards.creativity = 10;
                rewards.passion = 5;
                rewards.relationships = 3;
                rewards.message = "훌륭한 아이디어 스케치입니다! (+10 창의성, +5 열정, +3 관계)";
            } else if (score >= 0) {
                rewards.creativity = 5;
                rewards.message = "새로운 아이디어 스케치를 완료했습니다. (+5 창의성)";
            } else {
                rewards.message = "새로운 아이디어 스케치를 완료했지만, 아쉽게도 보상은 없습니다.";
            }
            break;
        case "아티스트 협업 챌린지": // Placeholder for now, but re-themed
            rewards.relationships = 2;
            rewards.passion = 1;
            rewards.message = "아티스트 협업 챌린지를 완료했습니다. (+2 관계, +1 열정)";
            break;
        case "축제 테마 구상": // Placeholder for now, but re-themed
            rewards.creativity = 2;
            rewards.energy = 1;
            rewards.message = "축제 테마 구상을 완료했습니다. (+2 창의성, +1 에너지)";
            break;
        case "홍보 전략 시뮬레이션": // Placeholder for now, but re-themed
            rewards.popularity = 2;
            rewards.relationships = 1;
            rewards.message = "홍보 전략 시뮬레이션을 완료했습니다. (+2 인기, +1 관계)";
            break;
        case "관객 만족도 조사": // Placeholder for now, but re-themed
            rewards.energy = 2;
            rewards.popularity = 1;
            rewards.message = "관객 만족도 조사를 완료했습니다. (+2 에너지, +1 인기)";
            break;
        default:
            rewards.message = `미니게임 ${minigameName}${getEulReParticle(minigameName)} 완료했습니다.`;
            break;
    }
    return rewards;
}

const minigames = [
    {
        name: "새로운 아이디어 스케치",
        description: "주어진 키워드들을 조합하여 새로운 아이디어를 스케치하세요. 독창적이고 풍부한 아이디어일수록 높은 점수를 얻습니다!",
        start: (gameArea, choicesDiv) => {
            const keywords = ["열정", "축제", "창의력", "관계", "에너지", "인지도", "자유", "영감", "소통", "경험"];
            gameState.minigameState = {
                targetIdea: keywords.sort(() => currentRandFn() - 0.5).slice(0, 3).join(' '),
                sketchedIdeas: [],
                score: 0,
                ideaInput: ""
            };
            minigames[0].render(gameArea, choicesDiv);
        },
        render: (gameArea, choicesDiv) => {
            const state = gameState.minigameState;
            gameArea.innerHTML = `
                <p><b>목표 아이디어:</b> ${state.targetIdea}</p>
                <p><b>스케치된 아이디어:</b> ${state.sketchedIdeas.join(', ')}</p>
                <p><b>점수:</b> ${state.score}</p>
                <input type="text" id="ideaSketchInput" placeholder="아이디어를 스케치하세요" style="font-size: 1.2em; padding: 8px; width: 80%; margin-top: 10px;" autocomplete="off">
            `;
            choicesDiv.innerHTML = `
                <button class="choice-btn" data-action="addIdea">아이디어 추가</button>
                <button class="choice-btn" data-action="completeSketch">스케치 완료</button>
            `;
            const input = document.getElementById('ideaSketchInput');
            input.value = state.ideaInput;
            input.focus();
            input.addEventListener('input', (e) => { state.ideaInput = e.target.value; });
            choicesDiv.querySelectorAll('.choice-btn').forEach(button => {
                button.addEventListener('click', () => {
                    const action = button.dataset.action;
                    if (action === "addIdea") {
                        minigames[0].processAction('addIdea', state.ideaInput);
                    } else if (action === "completeSketch") {
                        minigames[0].processAction('completeSketch');
                    }
                });
            });
        },
        processAction: (actionType, value = null) => {
            const state = gameState.minigameState;
            if (actionType === 'addIdea') {
                const idea = value.trim();
                if (idea.length > 0) {
                    state.sketchedIdeas.push(idea);
                    state.score += idea.length * 2; // Score based on idea length
                    state.ideaInput = "";
                    minigames[0].render(document.getElementById('gameArea'), document.getElementById('gameChoices'));
                }
            } else if (actionType === 'completeSketch') {
                if (state.sketchedIdeas.some(idea => state.targetIdea.includes(idea.split(' ')[0]))) {
                    state.score += 100;
                    updateGameDisplay("아이디어 스케치 성공! 독창적인 아이디어를 완성했습니다.");
                    minigames[0].end();
                } else {
                    updateGameDisplay("아이디어 스케치 실패! 목표 아이디어와 관련이 없습니다.");
                    minigames[0].end();
                }
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[0].name, gameState.minigameState.score);
            updateState({
                creativity: gameState.creativity + rewards.creativity,
                passion: gameState.passion + rewards.passion,
                relationships: gameState.relationships + rewards.relationships,
                energy: gameState.energy + rewards.energy,
                popularity: gameState.popularity + rewards.popularity,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "아티스트 협업 챌린지",
        description: "다양한 아티스트들과 협업하여 최고의 작품을 만들어내는 챌린지입니다.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 10 };
            gameArea.innerHTML = `<p>${minigames[1].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[1].processAction('endGame')">게임 종료</button>`;
        },
        render: function() {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[1].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[1].name, gameState.minigameState.score);
            updateState({
                relationships: gameState.relationships + rewards.relationships,
                passion: gameState.passion + rewards.passion,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "축제 테마 구상",
        description: "축제의 성공을 위한 독창적인 테마를 구상하세요.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 15 };
            gameArea.innerHTML = `<p>${minigames[2].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[2].processAction('endGame')">게임 종료</button>`;
        },
        render: function() {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[2].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[2].name, gameState.minigameState.score);
            updateState({
                creativity: gameState.creativity + rewards.creativity,
                energy: gameState.energy + rewards.energy,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "홍보 전략 시뮬레이션",
        description: "최소한의 자원으로 최대한의 홍보 효과를 내는 전략을 시뮬레이션하세요.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 20 };
            gameArea.innerHTML = `<p>${minigames[3].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[3].processAction('endGame')">게임 종료</button>`;
        },
        render: function() {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[3].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[3].name, gameState.minigameState.score);
            updateState({
                popularity: gameState.popularity + rewards.popularity,
                relationships: gameState.relationships + rewards.relationships,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "관객 만족도 조사",
        description: "관객들의 만족도를 조사하고 축제 운영에 반영하세요.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 25 };
            gameArea.innerHTML = `<p>${minigames[4].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[4].processAction('endGame')">게임 종료</button>`;
        },
        render: function() {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[4].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[4].name, gameState.minigameState.score);
            updateState({
                energy: gameState.energy + rewards.energy,
                popularity: gameState.popularity + rewards.popularity,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    }
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
    brainstorm: () => {
        if (!spendActionPoint()) return;

        const possibleOutcomes = brainstormOutcomes.filter(outcome => outcome.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = brainstormOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState);
        updateState({ ...result.changes, dailyActions: { ...gameState.dailyActions, brainstormed: true } }, result.message);
    },
    scout_artists: () => {
        if (!spendActionPoint()) return;
        const artist = gameState.artists[Math.floor(currentRandFn() * gameState.artists.length)];
        if (gameState.dailyActions.scouted) { updateState({ dailyActions: { ...gameState.dailyActions, scouted: true } }, artist.name + "" + getWaGwaParticle(artist.name) + " 이미 충분히 교류했습니다."); return; }

        const possibleOutcomes = scoutArtistsOutcomes.filter(outcome => outcome.condition(gameState, artist));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = scoutArtistsOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState, artist);
        updateState({ ...result.changes, dailyActions: { ...gameState.dailyActions, scouted: true } }, result.message);
    },
    promo_activities: () => {
        if (!spendActionPoint()) return;

        const possibleOutcomes = promoActivitiesOutcomes.filter(outcome => outcome.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = promoActivitiesOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState);
        updateState(result.changes, result.message);
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
    handle_artist_dispute: (params) => {
        if (!spendActionPoint()) return;
        const { first, second } = params;
        let message = "";
        let reward = { creativity: 0, passion: 0, relationships: 0 };

        const trustGain = getRandomValue(10, 3);
        const trustLoss = getRandomValue(5, 2);
        const creativityGain = getRandomValue(5, 2);
        const relationshipsGain = getRandomValue(5, 2);

        const updatedArtists = gameState.artists.map(a => {
            if (a.id === first) {
                a.trust = Math.min(100, a.trust + trustGain);
                message += a.name + "의 관점을 먼저 들어주었습니다. " + a.name + "의 시너지가 상승했습니다. ";
                reward.creativity += creativityGain;
                reward.relationships += relationshipsGain;
            } else if (a.id === second) {
                a.trust = Math.max(0, a.trust - trustLoss);
                message += second + "의 시너지가 약간 하락했습니다. ";
            }
            return a;
        });

        updateState({ ...reward, artists: updatedArtists, currentScenarioId: 'artist_dispute_resolution_result' }, message);
    },
    mediate_artist_dispute: () => {
        if (!spendActionPoint()) return;
        const relationshipsGain = getRandomValue(10, 3);
        const creativityGain = getRandomValue(5, 2);
        const passionGain = getRandomValue(5, 2);
        const message = "당신의 지혜로운 중재로 레오와 벨라의 의견 차이가 조화를 이루었습니다. 축제의 관계와 당신의 창의성이 강화되었습니다! (" + relationshipsGain + " 관계, " + creativityGain + " 창의성, " + passionGain + " 열정)";
        updateState({ relationships: gameState.relationships + relationshipsGain, creativity: gameState.creativity + creativityGain, passion: gameState.passion + passionGain, currentScenarioId: 'artist_dispute_resolution_result' }, message);
    },
    ignore_event: () => {
        if (!spendActionPoint()) return;
        const relationshipsLoss = getRandomValue(10, 3);
        const creativityLoss = getRandomValue(5, 2);
        const message = "의견 차이를 무시했습니다. 아티스트들의 불만이 커지고 축제의 분위기가 침체됩니다. (" + relationshipsLoss + " 관계, " + creativityLoss + " 창의성)";
        const updatedArtists = gameState.artists.map(a => {
            a.trust = Math.max(0, a.trust - 5);
            return a;
        });
        updateState({ relationships: gameState.relationships - relationshipsLoss, creativity: gameState.creativity - creativityLoss, artists: updatedArtists, currentScenarioId: 'artist_dispute_resolution_result' }, message);
    },
    seek_inspiration: () => {
        if (!spendActionPoint()) return;
        const cost = 1; // Action point cost
        let message = "";
        let changes = {};
        if (gameState.actionPoints >= cost) {
            const creativityGain = getRandomValue(10, 3);
            const passionGain = getRandomValue(5, 2);
            message = "새로운 자극을 찾아 영감을 회복했습니다. 당신의 창의성과 열정이 상승합니다. (" + creativityGain + " 창의성, " + passionGain + " 열정)";
            changes.creativity = gameState.creativity + creativityGain;
            changes.passion = gameState.passion + passionGain;
            changes.actionPoints = gameState.actionPoints - cost;
        } else {
            message = "영감을 회복할 행동력이 부족합니다.";
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    wait_for_inspiration: () => {
        if (!spendActionPoint()) return;
        const creativityLoss = getRandomValue(10, 3);
        const passionLoss = getRandomValue(5, 2);
        updateState({ creativity: gameState.creativity - creativityLoss, passion: gameState.passion - passionLoss, currentScenarioId: 'intro' }, "휴식을 취하며 기다렸지만, 창의성과 열정이 감소했습니다. (" + creativityLoss + " 창의성, " + passionLoss + " 열정)");
    },
    reconnect_with_artists: () => {
        if (!spendActionPoint()) return;
        const cost = 1; // Action point cost
        let message = "";
        let changes = {};
        if (gameState.actionPoints >= cost) {
            const relationshipsGain = getRandomValue(10, 3);
            const popularityGain = getRandomValue(5, 2);
            message = "아티스트들과 적극적으로 소통하여 관계를 회복했습니다. 당신의 관계와 인기가 상승합니다. (" + relationshipsGain + " 관계, " + popularityGain + " 인기)";
            changes.relationships = gameState.relationships + relationshipsGain;
            changes.popularity = gameState.popularity + popularityGain;
            changes.actionPoints = gameState.actionPoints - cost;
        } else {
            message = "아티스트들과 소통할 행동력이 부족합니다.";
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    take_personal_time: () => {
        if (!spendActionPoint()) return;
        const relationshipsLoss = getRandomValue(10, 3);
        const popularityLoss = getRandomValue(5, 2);
        updateState({ relationships: gameState.relationships - relationshipsLoss, popularity: gameState.popularity - popularityLoss, currentScenarioId: 'intro' }, "혼자만의 시간을 가졌지만, 관계와 인기가 감소했습니다. (" + relationshipsLoss + " 관계, " + popularityLoss + " 인기)");
    },
    welcome_new_unique_artist: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        if (gameState.artists.length < gameState.maxArtists && gameState.pendingNewArtist) {
            const creativityGain = getRandomValue(10, 3);
            const passionGain = getRandomValue(5, 2);
            const relationshipsGain = getRandomValue(5, 2);
            gameState.artists.push(gameState.pendingNewArtist);
            message = "새로운 아티스트 " + gameState.pendingNewArtist.name + "을(를) 유능한 인재로 섭외했습니다! 축제의 창의성과 열정, 관계가 상승합니다. (" + creativityGain + " 창의성, " + passionGain + " 열정, " + relationshipsGain + " 관계)";
            changes.creativity = gameState.creativity + creativityGain;
            changes.passion = gameState.passion + passionGain;
            changes.relationships = gameState.relationships + relationshipsGain;
            changes.pendingNewArtist = null;
        } else {
            message = "새로운 아티스트를 섭외할 수 없습니다.";
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    observe_artist: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();
        if (rand < 0.7) {
            const passionGain = getRandomValue(5, 2);
            message = "새로운 아티스트를 관찰하며 흥미로운 점을 발견했습니다. 당신의 열정이 상승합니다. (" + passionGain + " 열정)";
            changes.passion = gameState.passion + passionGain;
        } else {
            const creativityLoss = getRandomValue(5, 2);
            message = "아티스트를 관찰하는 동안, 당신의 우유부단함이 축제에 좋지 않은 인상을 주었습니다. (- " + creativityLoss + " 창의성)";
            changes.creativity = gameState.creativity - creativityLoss;
        }
        changes.pendingNewArtist = null;
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    reject_artist: () => {
        if (!spendActionPoint()) return;
        const creativityLoss = getRandomValue(10, 3);
        const passionLoss = getRandomValue(5, 2);
        const relationshipsLoss = getRandomValue(5, 2);
        const message = "새로운 아티스트의 섭외를 거절했습니다. 축제의 창의성과 열정, 관계가 감소합니다. (" + creativityLoss + " 창의성, " + passionLoss + " 열정, " + relationshipsLoss + " 관계)";
        updateState({ creativity: gameState.creativity - creativityLoss, passion: gameState.passion - passionLoss, relationships: gameState.relationships - relationshipsLoss, pendingNewArtist: null, currentScenarioId: 'intro' }, message);
    },
    accept_patronage: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        if (gameState.resources.funds >= 50) {
            const specialGuestTicketsGain = getRandomValue(5, 2);
            message = "익명의 후원자의 기부를 수락하여 특별 게스트 티켓을 얻었습니다! (" + specialGuestTicketsGain + " 특별 게스트 티켓)";
            changes.resources = { ...gameState.resources, funds: gameState.resources.funds - 50, special_guest_tickets: (gameState.resources.special_guest_tickets || 0) + 5 };
            changes.special_guest_tickets = gameState.special_guest_tickets + specialGuestTicketsGain;
        } else {
            message = "기부에 필요한 자금이 부족합니다.";
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    decline_patronage: () => {
        if (!spendActionPoint()) return;
        const specialGuestTicketsLoss = getRandomValue(5, 2);
        updateState({ special_guest_tickets: gameState.resources.special_guest_tickets - specialGuestTicketsLoss, currentScenarioId: 'intro' }, "익명의 후원자의 기부를 거절했습니다. 그는 아쉬워하며 떠났습니다. (" + specialGuestTicketsLoss + " 특별 게스트 티켓)");
    },
    show_resource_gathering_options: () => updateState({ currentScenarioId: 'action_resource_gathering' }),
    show_booth_management_options: () => updateState({ currentScenarioId: 'action_booth_management' }),
    show_surprise_events_options: () => updateState({ currentScenarioId: 'surprise_events_menu' }),
    gather_ideas: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.festivalLevel * 0.1) + (gameState.dailyBonus.creationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const ideasGain = getRandomValue(5, 2);
            message = "아이디어를 성공적으로 구상했습니다! (" + ideasGain + " 아이디어)";
            changes.resources = { ...gameState.resources, ideas: gameState.resources.ideas + ideasGain };
        } else {
            message = "아이디어 구상에 실패했습니다.";
        }
        updateState(changes, message);
    },
    gather_participants: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.festivalLevel * 0.1) + (gameState.dailyBonus.creationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const participantsGain = getRandomValue(5, 2);
            message = "참가자를 성공적으로 모집했습니다! (" + participantsGain + " 참가자)";
            changes.resources = { ...gameState.resources, participants: gameState.resources.participants + participantsGain };
        } else {
            message = "참가자 모집에 실패했습니다.";
        }
        updateState(changes, message);
    },
    gather_funds: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.festivalLevel * 0.1) + (gameState.dailyBonus.creationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const fundsGain = getRandomValue(5, 2);
            message = "후원금을 성공적으로 모금했습니다! (" + fundsGain + " 자금)";
            changes.resources = { ...gameState.resources, funds: gameState.resources.funds + fundsGain };
        } else {
            message = "후원금 모금에 실패했습니다.";
        }
        updateState(changes, message);
    },
    build_foodTruck: () => {
        if (!spendActionPoint()) return;
        const cost = { ideas: 50, funds: 20 };
        let message = "";
        let changes = {};
        if (gameState.resources.ideas >= cost.ideas && gameState.resources.funds >= cost.funds) {
            gameState.festivalBooths.foodTruck.built = true;
            const relationshipsGain = getRandomValue(10, 3);
            message = "푸드 트럭을 설치했습니다! (" + relationshipsGain + " 관계)";
            changes.relationships = gameState.relationships + relationshipsGain;
            changes.resources = { ...gameState.resources, ideas: gameState.resources.ideas - cost.ideas, funds: gameState.resources.funds - cost.funds };
        } else {
            message = "자원이 부족하여 설치할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_craftBooth: () => {
        if (!spendActionPoint()) return;
        const cost = { funds: 30, participants: 30 };
        let message = "";
        let changes = {};
        if (gameState.resources.funds >= cost.funds && gameState.resources.participants >= cost.participants) {
            gameState.festivalBooths.craftBooth.built = true;
            const creativityGain = getRandomValue(10, 3);
            message = "공예 부스를 설치했습니다! (" + creativityGain + " 창의성)";
            changes.creativity = gameState.creativity + creativityGain;
            changes.resources = { ...gameState.resources, funds: gameState.resources.funds - cost.funds, participants: gameState.resources.participants - cost.participants };
        } else {
            message = "자원이 부족하여 설치할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_mainStage: () => {
        if (!spendActionPoint()) return;
        const cost = { ideas: 100, funds: 50, participants: 50 };
        let message = "";
        let changes = {};
        if (gameState.resources.ideas >= cost.ideas && gameState.resources.funds >= cost.funds && gameState.resources.participants >= cost.participants) {
            gameState.festivalBooths.mainStage.built = true;
            const popularityGain = getRandomValue(20, 5);
            const energyGain = getRandomValue(20, 5);
            message = "중앙 무대를 설치했습니다! (" + popularityGain + " 인기, " + energyGain + " 에너지)";
            changes.popularity = gameState.popularity + popularityGain;
            changes.energy = gameState.energy + energyGain;
            changes.resources = { ...gameState.resources, ideas: gameState.resources.ideas - cost.ideas, funds: gameState.resources.funds - cost.funds, participants: gameState.resources.participants - cost.participants };
        } else {
            message = "자원이 부족하여 설치할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_ideaLounge: () => {
        if (!spendActionPoint()) return;
        const cost = { funds: 80, participants: 40 };
        let message = "";
        let changes = {};
        if (gameState.resources.funds >= cost.funds && gameState.resources.participants >= cost.participants) {
            gameState.festivalBooths.ideaLounge.built = true;
            const relationshipsGain = getRandomValue(15, 5);
            const passionGain = getRandomValue(10, 3);
            message = "아이디어 라운지를 설치했습니다! (" + relationshipsGain + " 관계, " + passionGain + " 열정)";
            changes.relationships = gameState.relationships + relationshipsGain;
            changes.passion = gameState.passion + passionGain;
            changes.resources = { ...gameState.resources, funds: gameState.resources.funds - cost.funds, participants: gameState.resources.participants - cost.participants };
        } else {
            message = "자원이 부족하여 설치할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_mediaStudio: () => {
        if (!spendActionPoint()) return;
        const cost = { funds: 50, participants: 100 };
        let message = "";
        let changes = {};
        if (gameState.resources.funds >= cost.funds && gameState.resources.participants >= cost.participants) {
            gameState.festivalBooths.mediaStudio.built = true;
            message = "미디어 스튜디오를 설치했습니다!";
            changes.resources = { ...gameState.resources, funds: gameState.resources.funds - cost.funds, participants: gameState.resources.participants - cost.participants };
        } else {
            message = "자원이 부족하여 설치할 수 없습니다.";
        }
        updateState(changes, message);
    },
    maintain_booth: (params) => {
        if (!spendActionPoint()) return;
        const boothKey = params.booth;
        const cost = { funds: 10, participants: 10 };
        let message = "";
        let changes = {};
        if (gameState.resources.funds >= cost.funds && gameState.resources.participants >= cost.participants) {
            gameState.festivalBooths[boothKey].durability = 100;
            message = gameState.festivalBooths[boothKey].name + " 부스의 보수를 완료했습니다. 내구도가 100으로 회복되었습니다.";
            changes.resources = { ...gameState.resources, funds: gameState.resources.funds - cost.funds, participants: gameState.resources.participants - cost.participants };
        } else {
            message = "보수에 필요한 자원이 부족합니다.";
        }
        updateState(changes, message);
    },
    play_street_performance: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();

        if (rand < 0.1) { // Big Win
            const ideasGain = getRandomValue(30, 10);
            const participantsGain = getRandomValue(20, 5);
            const fundsGain = getRandomValue(15, 5);
            message = "길거리 공연 대성공! 엄청난 자원을 얻었습니다! (" + ideasGain + " 아이디어, " + participantsGain + " 참가자, " + fundsGain + " 자금)";
            changes.resources = { ...gameState.resources, ideas: gameState.resources.ideas + ideasGain, participants: gameState.resources.participants + participantsGain, funds: gameState.resources.funds + fundsGain };
        } else if (rand < 0.4) { // Small Win
            const popularityGain = getRandomValue(10, 5);
            message = "길거리 공연 성공! 인기가 향상됩니다. (" + popularityGain + " 인기)";
            changes.popularity = gameState.popularity + popularityGain;
        } else if (rand < 0.7) { // Small Loss
            const popularityLoss = getRandomValue(5, 2);
            message = "아쉽게도 공연 실패! 인기가 조금 떨어집니다. (- " + popularityLoss + " 인기)";
            changes.popularity = gameState.popularity - popularityLoss;
        } else { // No Change
            message = "길거리 공연 결과는 아무것도 아니었습니다.";
        }
        updateState({ ...changes, currentScenarioId: 'surprise_events_menu' }, message);
    },
    explore_hidden_place: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();

        if (rand < 0.2) { // Big Catch (Special Guest Tickets)
            const specialGuestTicketsGain = getRandomValue(3, 1);
            message = "숨겨진 장소 탐방 대성공! 특별 게스트 티켓을 얻었습니다! (" + specialGuestTicketsGain + " 특별 게스트 티켓)";
            changes.resources = { ...gameState.resources, special_guest_tickets: (gameState.resources.special_guest_tickets || 0) + specialGuestTicketsGain };
        } else if (rand < 0.6) { // Normal Catch (Ideas)
            const ideasGain = getRandomValue(10, 5);
            message = "아이디어를 얻었습니다! (" + ideasGain + " 아이디어)";
            changes.resources = { ...gameState.resources, ideas: gameState.resources.ideas + ideasGain };
        } else { // No Change
            message = "아쉽게도 아무것도 얻지 못했습니다.";
        }
        updateState({ ...changes, currentScenarioId: 'surprise_events_menu' }, message);
    },
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    play_minigame: () => {
        if (gameState.dailyActions.minigamePlayed) { updateGameDisplay("오늘의 공연은 이미 플레이했습니다."); return; }
        if (!spendActionPoint()) return;

        const minigameIndex = (gameState.day - 1) % minigames.length;
        const minigame = minigames[minigameIndex];

        gameState.currentScenarioId = `minigame_${minigame.name}`;

        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } });

        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    },
    show_resource_gathering_options: () => updateState({ currentScenarioId: 'action_resource_gathering' }),
    show_booth_management_options: () => updateState({ currentScenarioId: 'action_booth_management' }),
    show_surprise_events_options: () => updateState({ currentScenarioId: 'surprise_events_menu' }),
};

function applyStatEffects() {
    let message = "";
    // High Creativity: Resource gathering success chance increase
    if (gameState.creativity >= 70) {
        gameState.dailyBonus.creationSuccess += 0.1;
        message += "높은 창의력 덕분에 자원 확보 성공률이 증가합니다. ";
    }
    // Low Creativity: Passion decrease
    if (gameState.creativity < 30) {
        gameState.passion = Math.max(0, gameState.passion - getRandomValue(5, 2));
        message += "창의력 고갈로 열정이 감소합니다. ";
    }

    // High Passion: Action points increase
    if (gameState.passion >= 70) {
        gameState.maxActionPoints += 1;
        gameState.actionPoints = gameState.maxActionPoints;
        message += "넘치는 열정으로 행동력이 증가합니다. ";
    }
    // Low Passion: Action points decrease
    if (gameState.passion < 30) {
        gameState.maxActionPoints = Math.max(5, gameState.maxActionPoints - 1);
        gameState.actionPoints = Math.min(gameState.actionPoints, gameState.maxActionPoints);
        message += "열정이 식어 행동력이 감소합니다. ";
    }

    // High Relationships: Energy and Popularity boost
    if (gameState.relationships >= 70) {
        const energyGain = getRandomValue(5, 2);
        const popularityGain = getRandomValue(5, 2);
        gameState.energy = Math.min(100, gameState.energy + energyGain);
        gameState.popularity = Math.min(100, gameState.popularity + popularityGain);
        message += "당신의 높은 관계 덕분에 축제의 에너지와 인기가 향상됩니다! (" + energyGain + " 에너지, " + popularityGain + " 인기) ";
    }
    // Low Relationships: Energy and Popularity decrease
    if (gameState.relationships < 30) {
        const energyLoss = getRandomValue(5, 2);
        const popularityLoss = getRandomValue(5, 2);
        gameState.energy = Math.max(0, gameState.energy - energyLoss);
        gameState.popularity = Math.max(0, gameState.popularity - popularityLoss);
        message += "관계 부족으로 축제의 에너지와 인기가 흐려집니다. (- " + energyLoss + " 에너지, - " + popularityLoss + " 인기) ";
    }

    // High Energy: Creativity boost or rare resource discovery
    if (gameState.energy >= 70) {
        const creativityGain = getRandomValue(5, 2);
        gameState.creativity = Math.min(100, gameState.creativity + creativityGain);
        message += "당신의 넘치는 에너지 덕분에 새로운 창의력을 불러일으킵니다. (" + creativityGain + " 창의성) ";
        if (currentRandFn() < 0.2) { // 20% chance for special guest tickets discovery
            const amount = getRandomValue(1, 1);
            gameState.resources.special_guest_tickets += amount;
            message += "특별 게스트 티켓을 발견했습니다! (" + amount + " 특별 게스트 티켓) ";
        }
    }
    // Low Energy: Creativity decrease or action point loss
    if (gameState.energy < 30) {
        const creativityLoss = getRandomValue(5, 2);
        gameState.creativity = Math.max(0, gameState.creativity - creativityLoss);
        message += "에너지 부족으로 창의성이 감소합니다. (- " + creativityLoss + " 창의성) ";
        if (currentRandFn() < 0.1) { // 10% chance for action point loss
            const actionLoss = getRandomValue(1, 0);
            gameState.actionPoints = Math.max(0, gameState.actionPoints - actionLoss);
            message += "비효율적인 활동으로 행동력을 낭비했습니다. (- " + actionLoss + " 행동력) ";
        }
    }

    // High Popularity: Artist trust increase
    if (gameState.popularity >= 70) {
        gameState.artists.forEach(a => a.trust = Math.min(100, a.trust + getRandomValue(2, 1)));
        message += "높은 인기 덕분에 아티스트들의 신뢰가 깊어집니다. ";
    }
    // Low Popularity: Artist trust decrease
    if (gameState.popularity < 30) {
        gameState.artists.forEach(a => a.trust = Math.max(0, a.trust - getRandomValue(5, 2)));
        message += "낮은 인기 덕분에 아티스트들의 신뢰가 하락합니다. ";
    }

    return message;
}

function generateRandomArtist() {
    const names = ["루시", "마일로", "니나", "오스카", "페니"];
    const personalities = ["열정적인", "자유로운 영혼", "창의적인", "사교적인"];
    const skills = ["공연", "미술", "글쓰기"];
    const randomId = Math.random().toString(36).substring(2, 9);

    return {
        id: randomId,
        name: names[Math.floor(currentRandFn() * names.length)],
        personality: personalities[Math.floor(currentRandFn() * personalities.length)],
        skill: skills[Math.floor(currentRandFn() * skills.length)],
        trust: 50
    };
}

// --- Daily/Initialization Logic ---
const weightedDailyEvents = [
    { id: "daily_event_rain", weight: 10, condition: () => true, onTrigger: () => {
        const energyLoss = getRandomValue(10, 5);
        gameScenarios.daily_event_rain.text = "예상치 못한 비로 축제의 에너지가 감소합니다. (- " + energyLoss + " 에너지)";
        updateState({ energy: Math.max(0, gameState.energy - energyLoss) });
    } },
    { id: "daily_event_viral_moment", weight: 10, condition: () => true, onTrigger: () => {
        const popularityGain = getRandomValue(10, 5);
        gameScenarios.daily_event_viral_moment.text = "축제의 한 장면이 SNS에서 화제가 되었습니다! 인기가 증가합니다. (" + popularityGain + " 인기)";
        updateState({ popularity: gameState.popularity + popularityGain });
    } },
    { id: "daily_event_artist_dispute", weight: 15, condition: () => gameState.artists.length >= 2 },
    { id: "daily_event_new_artist", weight: 10, condition: () => gameState.festivalBooths.mainStage.built && gameState.artists.length < gameState.maxArtists, onTrigger: () => {
        const newArtist = generateRandomArtist();
        gameState.pendingNewArtist = newArtist;
        gameScenarios["daily_event_new_artist"].text = "새로운 아티스트 " + newArtist.name + "(" + newArtist.personality + ", " + newArtist.skill + ")이(가) 축제에 참여하고 싶어 합니다. (현재 아티스트 수: " + gameState.artists.length + " / " + gameState.maxArtists + ")";
    }},
    { id: "daily_event_anonymous_patron", weight: 10, condition: () => gameState.festivalBooths.mainStage.built },
    { id: "daily_event_inspiration_block", weight: 12, condition: () => gameState.creativity < 50 },
    { id: "daily_event_relationship_crisis", weight: 15, condition: () => gameState.relationships < 50 },
    { id: "daily_event_unexpected_success", weight: 7, condition: () => true, onTrigger: () => {
        const popularityGain = getRandomValue(15, 5);
        const fundsGain = getRandomValue(10, 5);
        gameScenarios.daily_event_unexpected_success.text = "예상치 못한 성공으로 축제의 인기와 자금이 증가합니다! (" + popularityGain + " 인기, " + fundsGain + " 자금)";
        updateState({ popularity: gameState.popularity + popularityGain, resources: { ...gameState.resources, funds: gameState.resources.funds + fundsGain } });
    } },
    { id: "daily_event_technical_difficulty", weight: 8, condition: () => true, onTrigger: () => {
        const energyLoss = getRandomValue(10, 5);
        const creativityLoss = getRandomValue(5, 2);
        gameScenarios.daily_event_technical_difficulty.text = "기술적인 문제로 축제의 에너지와 창의성이 감소합니다. (- " + energyLoss + " 에너지, - " + creativityLoss + " 창의성)";
        updateState({ energy: Math.max(0, gameState.energy - energyLoss), creativity: Math.max(0, gameState.creativity - creativityLoss) });
    } },
];

function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);

    // Reset daily actions and action points
    updateState({
        actionPoints: 10, // Reset to base maxActionPoints
        maxActionPoints: 10, // Reset maxActionPoints to base
        dailyActions: { brainstormed: false, scouted: false, promoted: false, minigamePlayed: false },
        dailyEventTriggered: true,
        dailyBonus: { creationSuccess: 0 } // Reset daily bonus
    });

    // Apply stat effects
    const statEffectMessage = applyStatEffects();

    let skillBonusMessage = "";
    let durabilityMessage = "";

    // Daily skill bonus & durability decay
    gameState.artists.forEach(a => {
        if (a.skill === '음악') { gameState.resources.practice_time++; skillBonusMessage += a.name + "의 음악 재능 덕분에 연습 시간을 추가로 얻었습니다. "; } 
        else if (a.skill === '미술') { gameState.resources.stage_outfits++; skillBonusMessage += a.name + "의 미술 재능 덕분에 무대 의상을 추가로 얻었습니다. "; }
        else if (a.skill === '글쓰기') { gameState.resources.performance_fees++; skillBonusMessage += a.name + "의 글쓰기 재능 덕분에 출연료를 추가로 얻었습니다. "; }
    });

    Object.keys(gameState.festivalBooths).forEach(key => {
        const booth = gameState.festivalBooths[key];
        if(booth.built) {
            booth.durability -= 1;
            if(booth.durability <= 0) {
                booth.built = false;
                durabilityMessage += key + " 부스가 파손되었습니다! 보수가 필요합니다. "; 
            }
        }
    });

    gameState.resources.ideas -= gameState.artists.length * 2; // Ideas consumption
    let dailyMessage = "새로운 날이 시작되었습니다. ";
    dailyMessage += statEffectMessage + skillBonusMessage + durabilityMessage;
    if (gameState.resources.ideas < 0) {
        gameState.creativity -= 10;
        dailyMessage += "아이디어가 부족하여 아티스트들이 힘들어합니다! (-10 창의성)";
    } else {
        dailyMessage += "";
    }

    // Check for game over conditions
    if (gameState.creativity <= 0) { gameState.currentScenarioId = "game_over_creativity"; }
    else if (gameState.passion <= 0) { gameState.currentScenarioId = "game_over_passion"; }
    else if (gameState.relationships <= 0) { gameState.currentScenarioId = "game_over_relationships"; }
    else if (gameState.energy <= 0) { gameState.currentScenarioId = "game_over_energy"; }
    else if (gameState.popularity <= 0) { gameState.currentScenarioId = "game_over_popularity"; }
    else if (gameState.resources.ideas < -(gameState.artists.length * 5)) { gameState.currentScenarioId = "game_over_resources"; }

    // --- New Weighted Random Event Logic ---
    let eventId = "intro";
    const possibleEvents = weightedDailyEvents.filter(event => !event.condition || event.condition());
    const totalWeight = possibleOutcomes.reduce((sum, event) => sum + event.weight, 0);
    const rand = currentRandFn() * totalWeight;

    let cumulativeWeight = 0;
    let chosenEvent = null;

    for (const event of possibleEvents) {
        cumulativeWeight += event.weight;
        if (rand < cumulativeWeight) {
            chosenEvent = event;
            break;
        }
    }

    if (chosenEvent) {
        eventId = chosenEvent.id;
        if (chosenEvent.onTrigger) {
            chosenEvent.onTrigger();
        }
    }

    gameState.currentScenarioId = eventId;
    updateGameDisplay(dailyMessage + (gameScenarios[eventId]?.text || ''));
    renderChoices(gameScenarios[eventId].choices);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 축제 기획을 포기하시겠습니까? 모든 노력이 사라집니다.")) {
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