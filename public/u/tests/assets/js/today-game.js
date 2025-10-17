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
        creativity: 50,
        passion: 50,
        relationships: 50,
        energy: 50,
        recognition: 50,
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
        if (loaded.energy === undefined) loaded.energy = 50;
        if (loaded.recognition === undefined) loaded.recognition = 50;

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
        if (!gameState.festivalBooths.foodTruck.built) dynamicChoices.push({ text: "푸드 트럭 설치 (아이디어 20, 자금 30)", action: "build_foodTruck" });
        if (!gameState.festivalBooths.craftBooth.built) dynamicChoices.push({ text: "공예 부스 설치 (아이디어 30, 참가자 10)", action: "build_craftBooth" });
        if (!gameState.festivalBooths.mainStage.built) dynamicChoices.push({ text: "중앙 무대 설치 (아이디어 50, 자금 100)", action: "build_mainStage" });
        if (!gameState.festivalBooths.ideaLounge.built) dynamicChoices.push({ text: "아이디어 라운지 설치 (아이디어 80, 참가자 30)", action: "build_ideaLounge" });
        if (gameState.festivalBooths.mainStage.built && !gameState.festivalBooths.mediaStudio.built) {
            dynamicChoices.push({ text: "미디어 스튜디오 설치 (자금 100, 아이디어 50)", action: "build_mediaStudio" });
        }
        Object.keys(gameState.festivalBooths).forEach(key => {
            const booth = gameState.festivalBooths[key];
            if (booth.built && booth.durability < 100) {
                dynamicChoices.push({ text: `${booth.name} 보수 (자금 10, 참가자 5)`, action: "maintain_booth", params: { booth: key } });
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

// --- Game Data (ENFP Themed) ---
const gameScenarios = {
    "intro": { text: "오늘은 축제를 위해 무엇을 할까요?", choices: [
        { text: "브레인스토밍", action: "brainstorm" },
        { text: "아티스트와 교류", action: "scout_artists" },
        { text: "축제 홍보 활동", action: "promo_activities" },
        { text: "자원 확보", action: "show_resource_gathering_options" },
        { text: "축제 부스 관리", action: "show_booth_options" },
        { text: "깜짝 이벤트", action: "show_surprise_events_options" },
        { text: "오늘의 공연", action: "play_minigame" }
    ]},
    "action_resource_gathering": {
        text: "어떤 자원을 확보하시겠습니까?",
        choices: [
            { text: "아이디어 구상", action: "gather_ideas" },
            { text: "참가자 모집", action: "gather_participants" },
            { text: "후원금 모금", action: "gather_funds" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
    "action_booth_management": { text: "어떤 부스를 관리하시겠습니까?", choices: [] },
    "surprise_events_menu": {
        text: "어떤 깜짝 이벤트를 시도해볼까요?",
        choices: [
            { text: "길거리 공연 (행동력 1 소모)", action: "play_street_performance" },
            { text: "숨겨진 장소 탐방 (행동력 1 소모)", action: "explore_hidden_place" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
    "game_over_creativity": { text: "축제의 창의성이 고갈되어 더 이상 새로운 아이디어가 나오지 않습니다. 축제는 활력을 잃었습니다.", choices: [], final: true },
    "game_over_passion": { text: "당신의 열정이 식어버렸습니다. 축제를 이끌어갈 동력을 상실했습니다.", choices: [], final: true },
    "game_over_relationships": { text: "아티스트들과의 관계가 무너졌습니다. 더 이상 당신과 함께하려는 사람이 없습니다.", choices: [], final: true },
    "game_over_energy": { text: "에너지가 모두 소진되었습니다. 당신은 번아웃되었습니다.", choices: [], final: true },
    "game_over_recognition": { text: "축제가 사람들의 기억 속에서 잊혀졌습니다. 당신의 인지도는 바닥을 쳤습니다.", choices: [], final: true },
    "game_over_resources": { text: "축제 자원이 모두 고갈되어 더 이상 진행할 수 없습니다.", choices: [], final: true },
};

const brainstormOutcomes = [
    {
        condition: (gs) => gs.resources.ideas < 20,
        weight: 30,
        effect: (gs) => {
            const ideasGain = getRandomValue(10, 5);
            return { changes: { resources: { ...gs.resources, ideas: gs.resources.ideas + ideasGain } }, message: `브레인스토밍 중 새로운 아이디어를 발견했습니다! (+${ideasGain} 아이디어)` };
        }
    },
    {
        condition: (gs) => true,
        weight: 20,
        effect: (gs) => {
            const creativityGain = getRandomValue(5, 2);
            const passionGain = getRandomValue(5, 2);
            return { changes: { creativity: gs.creativity + creativityGain, passion: gs.passion + passionGain }, message: `자유로운 브레인스토밍으로 창의성과 열정이 샘솟습니다. (+${creativityGain} 창의성, +${passionGain} 열정)` };
        }
    },
    {
        condition: () => true,
        weight: 25,
        effect: (gs) => {
            const actionLoss = getRandomValue(2, 1);
            const energyLoss = getRandomValue(5, 2);
            return { changes: { actionPoints: gs.actionPoints - actionLoss, energy: gs.energy - energyLoss }, message: `너무 많은 아이디어가 떠올라 혼란스럽습니다. 에너지가 소모되었습니다. (-${actionLoss} 행동력, -${energyLoss} 에너지)` };
        }
    }
];

const scoutOutcomes = [
    {
        condition: (gs, artist) => artist.synergy < 60,
        weight: 40,
        effect: (gs, artist) => {
            const synergyGain = getRandomValue(10, 5);
            const relationshipsGain = getRandomValue(5, 2);
            const updatedArtists = gs.artists.map(a => a.id === artist.id ? { ...a, synergy: Math.min(100, a.synergy + synergyGain) } : a);
            return { changes: { artists: updatedArtists, relationships: gs.relationships + relationshipsGain }, message: `${artist.name}${getWaGwaParticle(artist.name)} 깊은 대화를 나누며 시너지를 얻었습니다. (+${synergyGain} ${artist.name} 시너지, +${relationshipsGain} 관계)` };
        }
    },
    {
        condition: (gs, artist) => artist.personality === "열정적인",
        weight: 20,
        effect: (gs, artist) => {
            const passionGain = getRandomValue(10, 3);
            const recognitionGain = getRandomValue(5, 2);
            return { changes: { passion: gs.passion + passionGain, recognition: gs.recognition + recognitionGain }, message: `${artist.name}${getWaGwaParticle(artist.name)} 열정적인 대화를 나누며 당신의 열정과 인지도가 상승했습니다. (+${passionGain} 열정, +${recognitionGain} 인지도)` };
        }
    },
    {
        condition: (gs) => true,
        weight: 25,
        effect: (gs, artist) => {
            const relationshipsGain = getRandomValue(5, 2);
            return { changes: { relationships: gs.relationships + relationshipsGain }, message: `${artist.name}${getWaGwaParticle(artist.name)} 소소한 이야기를 나누며 관계가 조금 더 단단해졌습니다. (+${relationshipsGain} 관계)` };
        }
    },
    {
        condition: (gs, artist) => gs.relationships < 40 || artist.synergy < 40,
        weight: 20,
        effect: (gs, artist) => {
            const synergyLoss = getRandomValue(10, 3);
            const passionLoss = getRandomValue(5, 2);
            const updatedArtists = gs.artists.map(a => a.id === artist.id ? { ...a, synergy: Math.max(0, a.synergy - synergyLoss) } : a);
            return { changes: { artists: updatedArtists, passion: gs.passion - passionLoss }, message: `${artist.name}${getWaGwaParticle(artist.name)} 대화 중 의견 차이로 감정이 상했습니다. (-${synergyLoss} ${artist.name} 시너지, -${passionLoss} 열정)` };
        }
    }
];

const promoOutcomes = [
    {
        condition: (gs) => gs.passion < 40,
        weight: 40,
        effect: (gs) => {
            const recognitionLoss = getRandomValue(10, 4);
            const relationshipsLoss = getRandomValue(5, 2);
            return { changes: { recognition: gs.recognition - recognitionLoss, relationships: gs.relationships - relationshipsLoss }, message: `홍보 활동에 대한 반응이 차갑습니다. 당신의 열정이 부족해 보입니다. (-${recognitionLoss} 인지도, -${relationshipsLoss} 관계)` };
        }
    },
    {
        condition: (gs) => gs.creativity > 70 && gs.relationships > 60,
        weight: 30,
        effect: (gs) => {
            const recognitionGain = getRandomValue(15, 5);
            const participantsGain = getRandomValue(10, 3);
            return { changes: { recognition: gs.recognition + recognitionGain, resources: { ...gs.resources, participants: gs.resources.participants + participantsGain } }, message: `창의적인 홍보 활동이 입소문을 탔습니다! (+${recognitionGain} 인지도, +${participantsGain} 참가자)` };
        }
    },
    {
        condition: () => true,
        weight: 20,
        effect: (gs) => {
            const recognitionGain = getRandomValue(5, 2);
            return { changes: { recognition: gs.recognition + recognitionGain }, message: `평범한 홍보 활동이었지만, 축제의 인지도가 약간 상승했습니다. (+${recognitionGain} 인지도)` };
        }
    }
];

const minigames = [
    {
        name: "새로운 아이디어 스케치",
        description: "화면에 나타나는 단어들을 빠르게 입력하여 새로운 아이디어를 스케치하세요!",
        start: (gameArea, choicesDiv) => {
            const words = ["열정", "축제", "창의력", "사람들", "음악", "예술", "자유", "영감", "소통", "에너지"];
            gameState.minigameState = {
                wordsToType: [...Array(5)].map(() => words[Math.floor(currentRandFn() * words.length)]),
                typedWords: 0,
                startTime: Date.now(),
                score: 0,
            };
            minigames[0].render(gameArea, choicesDiv);
        },
        render: (gameArea, choicesDiv) => {
            const state = gameState.minigameState;
            if (state.typedWords >= state.wordsToType.length) return;
            gameArea.innerHTML = `
                <p><b>진행:</b> ${state.typedWords} / ${state.wordsToType.length}</p>
                <p>아래 단어를 입력하고 Enter를 누르세요:</p>
                <h2 id="minigameWord" style="font-size: 2.5em; color: var(--primary-color);">${state.wordsToType[state.typedWords]}</h2>
                <input type="text" id="minigameInput" style="font-size: 1.5em; padding: 10px; width: 80%; margin-top: 10px;" autocomplete="off">
            `;
            choicesDiv.innerHTML = '';
            const input = document.getElementById('minigameInput');
            input.focus();
            input.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    minigames[0].processAction('submitWord', e.target.value);
                }
            });
        },
        processAction: (actionType, value) => {
            if (actionType === 'submitWord') {
                const state = gameState.minigameState;
                const correctWord = state.wordsToType[state.typedWords];
                if (value.trim().toLowerCase() === correctWord.toLowerCase()) {
                    state.typedWords++;
                    if (state.typedWords >= state.wordsToType.length) {
                        minigames[0].end();
                    } else {
                        minigames[0].render(document.getElementById('gameArea'), document.getElementById('gameChoices'));
                    }
                }
            }
        },
        end: () => {
            const state = gameState.minigameState;
            const timeTaken = (Date.now() - state.startTime) / 1000;
            state.score = Math.max(0, 60 - Math.floor(timeTaken)) * 10;
            const rewards = calculateMinigameReward(minigames[0].name, state.score);
            updateState({
                creativity: gameState.creativity + rewards.creativity,
                passion: gameState.passion + rewards.passion,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
];

function calculateMinigameReward(minigameName, score) {
    let rewards = { creativity: 0, passion: 0, message: "" };
    if (score > 400) {
        rewards.creativity = 15;
        rewards.passion = 10;
        rewards.message = `엄청난 속도! 창의적인 아이디어가 샘솟습니다! (+15 창의성, +10 열정)`;
    } else if (score > 200) {
        rewards.creativity = 10;
        rewards.passion = 5;
        rewards.message = `훌륭해요! 좋은 아이디어가 떠올랐습니다. (+10 창의성, +5 열정)`;
    } else {
        rewards.creativity = 5;
        rewards.message = `아이디어 스케치를 완료했습니다. (+5 창의성)`;
    }
    return rewards;
}

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
        const possibleOutcomes = brainstormOutcomes.filter(o => o.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, o) => sum + o.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(o => (cumulativeWeight += o.weight) >= rand) || possibleOutcomes[0];
        const result = chosenOutcome.effect(gameState);
        updateState({ ...result.changes, dailyActions: { ...gameState.dailyActions, brainstormed: true } }, result.message);
    },
    scout_artists: () => {
        if (!spendActionPoint()) return;
        const artist = gameState.artists[Math.floor(currentRandFn() * gameState.artists.length)];
        if (gameState.dailyActions.scouted.includes(artist.id)) { updateState({}, `${artist.name}${getWaGwaParticle(artist.name)} 이미 충분히 교류했습니다.`); return; }
        const possibleOutcomes = scoutOutcomes.filter(o => o.condition(gameState, artist));
        const totalWeight = possibleOutcomes.reduce((sum, o) => sum + o.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(o => (cumulativeWeight += o.weight) >= rand) || possibleOutcomes[0];
        const result = chosenOutcome.effect(gameState, artist);
        updateState({ ...result.changes, dailyActions: { ...gameState.dailyActions, scouted: [...gameState.dailyActions.scouted, artist.id] } }, result.message);
    },
    promo_activities: () => {
        if (!spendActionPoint()) return;
        const possibleOutcomes = promoOutcomes.filter(o => o.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, o) => sum + o.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(o => (cumulativeWeight += o.weight) >= rand) || possibleOutcomes[0];
        const result = chosenOutcome.effect(gameState);
        updateState(result.changes, result.message);
    },
    gather_ideas: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.promoLevel * 0.1) + (gameState.dailyBonus.creationSuccess || 0));
        let message = "";
        if (currentRandFn() < successChance) {
            const ideasGain = getRandomValue(5, 2);
            message = `새로운 아이디어를 구상했습니다! (+${ideasGain} 아이디어)`;
            updateState({ resources: { ...gameState.resources, ideas: gameState.resources.ideas + ideasGain } }, message);
        } else {
            message = "아이디어 구상에 실패했습니다.";
            updateState({}, message);
        }
    },
    gather_participants: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.promoLevel * 0.1) + (gameState.dailyBonus.creationSuccess || 0));
        let message = "";
        if (currentRandFn() < successChance) {
            const participantsGain = getRandomValue(5, 2);
            message = `새로운 참가자를 모집했습니다! (+${participantsGain} 참가자)`;
            updateState({ resources: { ...gameState.resources, participants: gameState.resources.participants + participantsGain } }, message);
        } else {
            message = "참가자 모집에 실패했습니다.";
            updateState({}, message);
        }
    },
    gather_funds: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.promoLevel * 0.1) + (gameState.dailyBonus.creationSuccess || 0));
        let message = "";
        if (currentRandFn() < successChance) {
            const fundsGain = getRandomValue(5, 2);
            message = `후원금을 모금했습니다! (+${fundsGain} 자금)`;
            updateState({ resources: { ...gameState.resources, funds: gameState.resources.funds + fundsGain } }, message);
        } else {
            message = "후원금 모금에 실패했습니다.";
            updateState({}, message);
        }
    },
    build_foodTruck: () => {
        if (!spendActionPoint()) return;
        const cost = { ideas: 20, funds: 30 };
        if (gameState.resources.ideas >= cost.ideas && gameState.resources.funds >= cost.funds) {
            gameState.festivalBooths.foodTruck.built = true;
            const passionGain = getRandomValue(10, 3);
            updateState({ passion: gameState.passion + passionGain, resources: { ...gameState.resources, ideas: gameState.resources.ideas - cost.ideas, funds: gameState.resources.funds - cost.funds } }, `푸드 트럭을 설치했습니다! (+${passionGain} 열정)`);
        } else {
            updateState({}, "자원이 부족하여 설치할 수 없습니다.");
        }
    },
    maintain_booth: (params) => {
        if (!spendActionPoint()) return;
        const boothKey = params.booth;
        const cost = { funds: 10, participants: 5 };
        if (gameState.resources.funds >= cost.funds && gameState.resources.participants >= cost.participants) {
            gameState.festivalBooths[boothKey].durability = 100;
            updateState({ resources: { ...gameState.resources, funds: gameState.resources.funds - cost.funds, participants: gameState.resources.participants - cost.participants } }, `${gameState.festivalBooths[boothKey].name} 부스의 보수를 완료했습니다.`);
        } else {
            updateState({}, "보수에 필요한 자원이 부족합니다.");
        }
    },
    play_street_performance: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        let message = "";
        if (rand < 0.2) {
            const fundsGain = getRandomValue(20, 5);
            message = `길거리 공연이 대박났습니다! 후원금이 쏟아집니다! (+${fundsGain} 자금)`;
            updateState({ resources: { ...gameState.resources, funds: gameState.resources.funds + fundsGain } }, message);
        } else {
            const recognitionGain = getRandomValue(5, 2);
            message = `성공적인 길거리 공연이었습니다. (+${recognitionGain} 인지도)`;
            updateState({ recognition: gameState.recognition + recognitionGain }, message);
        }
    },
    explore_hidden_place: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        let message = "";
        if (rand < 0.2) {
            const ticketGain = getRandomValue(2, 1);
            message = `숨겨진 장소에서 특별 게스트 티켓을 발견했습니다! (+${ticketGain} 특별 티켓)`;
            updateState({ resources: { ...gameState.resources, special_tickets: (gameState.resources.special_tickets || 0) + ticketGain } }, message);
        } else {
            const ideasGain = getRandomValue(10, 5);
            message = `탐방 중 새로운 아이디어를 얻었습니다. (+${ideasGain} 아이디어)`;
            updateState({ resources: { ...gameState.resources, ideas: gameState.resources.ideas + ideasGain } }, message);
        }
    },
    show_resource_gathering_options: () => updateState({ currentScenarioId: 'action_resource_gathering' }),
    show_booth_options: () => updateState({ currentScenarioId: 'action_booth_management' }),
    show_surprise_events_options: () => updateState({ currentScenarioId: 'surprise_events_menu' }),
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    play_minigame: () => {
        if (gameState.dailyActions.minigamePlayed) { updateGameDisplay("오늘의 공연은 이미 마쳤습니다."); return; }
        if (!spendActionPoint()) return;
        const minigameIndex = (gameState.day - 1) % minigames.length;
        const minigame = minigames[minigameIndex];
        gameState.currentScenarioId = `minigame_${minigame.name}`;
        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } });
        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    },
};

function applyStatEffects() {
    let message = "";
    if (gameState.creativity >= 70) { gameState.dailyBonus.creationSuccess += 0.1; message += "높은 창의력 덕분에 자원 확보 성공률이 증가합니다. "; }
    if (gameState.passion >= 70) { gameState.maxActionPoints += 1; gameState.actionPoints = gameState.maxActionPoints; message += "넘치는 열정으로 행동력이 증가합니다. "; }
    if (gameState.relationships >= 70) { gameState.artists.forEach(a => a.synergy = Math.min(100, a.synergy + 5)); message += "끈끈한 관계 덕분에 아티스트들의 시너지가 증가합니다. "; }
    if (gameState.energy < 30) { Object.keys(gameState.festivalBooths).forEach(key => { if(gameState.festivalBooths[key].built) gameState.festivalBooths[key].durability -= 2; }); message += "에너지가 부족하여 부스들이 빠르게 노후화됩니다. "; }
    if (gameState.recognition >= 70) { gameState.resources.funds += getRandomValue(5, 2); message += "높은 인지도 덕분에 후원금이 자동으로 모금됩니다. "; }
    return message;
}

const weightedDailyEvents = [
    { id: "rain", weight: 10, condition: () => true, onTrigger: () => {
        const durabilityLoss = getRandomValue(10, 5);
        Object.keys(gameState.festivalBooths).forEach(key => { if(gameState.festivalBooths[key].built) gameState.festivalBooths[key].durability -= durabilityLoss; });
        updateState({}, `예상치 못한 비로 인해 모든 부스의 내구도가 ${durabilityLoss}만큼 감소했습니다.`);
    } },
    { id: "viral", weight: 7, condition: () => gameState.recognition > 50, onTrigger: () => {
        const recognitionGain = getRandomValue(15, 5);
        updateState({ recognition: gameState.recognition + recognitionGain }, `축제의 한 장면이 SNS에서 화제가 되었습니다! (+${recognitionGain} 인지도)`);
    } },
];

function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);
    updateState({ actionPoints: 10, maxActionPoints: 10, dailyActions: { brainstormed: false, promoActivities: false, scouted: [], minigamePlayed: false }, dailyEventTriggered: true, dailyBonus: { creationSuccess: 0 } });
    const statEffectMessage = applyStatEffects();
    let dailyMessage = "새로운 축제일이 시작되었습니다. " + statEffectMessage;
    if (gameState.creativity <= 0) { gameState.currentScenarioId = "game_over_creativity"; }
    else if (gameState.passion <= 0) { gameState.currentScenarioId = "game_over_passion"; }
    else if (gameState.relationships <= 0) { gameState.currentScenarioId = "game_over_relationships"; }
    else if (gameState.energy <= 0) { gameState.currentScenarioId = "game_over_energy"; }
    else if (gameState.recognition <= 0) { gameState.currentScenarioId = "game_over_recognition"; }
    else if (gameState.resources.funds < 0) { gameState.currentScenarioId = "game_over_resources"; }
    let eventId = "intro";
    const possibleEvents = weightedDailyEvents.filter(event => !event.condition || event.condition());
    const totalWeight = possibleEvents.reduce((sum, event) => sum + event.weight, 0);
    const rand = currentRandFn() * totalWeight;
    let cumulativeWeight = 0;
    let chosenEvent = possibleEvents.find(event => (cumulativeWeight += event.weight) >= rand);
    if (chosenEvent) {
        eventId = chosenEvent.id;
        if (chosenEvent.onTrigger) chosenEvent.onTrigger();
    }
    gameState.currentScenarioId = eventId;
    updateGameDisplay(dailyMessage + (gameScenarios[eventId]?.text || ''));
    renderChoices(gameScenarios[eventId]?.choices);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 게임을 초기화하시겠습니까? 모든 진행 상황이 사라집니다.")) {
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
