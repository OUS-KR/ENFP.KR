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
        enthusiasm: 50,
        connection: 50,
        recognition: 30, // 인지도
        freedom: 50, // 자유
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
            foodTruck: { built: false, durability: 100, name: "푸드 트럭", description: "축제의 먹거리를 책임집니다.", effect_description: "참가자들의 열정을 유지하고 예산을 확보합니다." },
            artisanBooth: { built: false, durability: 100, name: "공예 부스", description: "독특한 수공예품을 판매합니다.", effect_description: "축제의 창의성을 높이고 영감을 줍니다." },
            mainStage: { built: false, durability: 100, name: "중앙 무대", description: "축제의 메인 공연이 열리는 곳입니다.", effect_description: "새로운 참가자를 유치하고 축제의 인지도를 높입니다." },
            ideaLounge: { built: false, durability: 100, name: "아이디어 라운지", description: "참가자들이 자유롭게 아이디어를 교류하는 공간입니다.", effect_description: "새로운 영감을 얻고 관계를 증진시킵니다." },
            mediaStudio: { built: false, durability: 100, name: "미디어 스튜디오", description: "축제를 기록하고 홍보합니다.", effect_description: "축제의 인지도를 크게 향상시킵니다." }
        },
        promoLevel: 0,
        minigameState: {}
    };
    currentRandFn = mulberry32(getDailySeed() + gameState.day);
}

function saveGameState() {
    localStorage.setItem('enfpFestivalGame', JSON.stringify(gameState));
}

// ... (The rest of the code will be a combination of the old ENFP script and the new ENFJ features, adapted for the ENFP theme)
// This is a placeholder for the full script that will be generated.
