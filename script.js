// --- 1. GLOBALA VARIABLER ---
var creationPoints = 100;
var playerCreated = false;
var tickInterval = 15;
var currentTickTime = tickInterval;

var tempStats = { 
  health: 0, strength: 0, endurance: 0, initiative: 0, avoidance: 0, luck: 0,
  learning: 0, discipline: 0, leadership: 0, provocation: 0,
  sword: 0, blunt: 0, axe: 0, ranged: 0, flail: 0, stabbingWeapons: 0, shield: 0 
};

var player = {
  name: "",
  hp: 100,
  maxHp: 100,
  coins: 0,
  xp: 0,              // XP within current level
  level: 1,
  // xpToNext is now computed dynamically from level
  energy: 50,
  condition: 37,
  portrait: "",
  race: "",
  gender: "",
  skills: {},
  unspentPoints: 0,   // Level-up points not yet allocated
  inventory: [],      // Stores item keys, e.g. "rustyShank"
  equipment: {
    mainHand: null,
    offHand:  null,
    head: null,
    torso: null,
    shoulders: null,
    legs: null,
    hands: null,
    feet: null
  },
  accessories: {
    necklace: null,
    cloak: null,
    belt: null,
    ring1: null,
    ring2: null,
    armband: null,
    charm: null
  },
  dailyHuntCount: 0,
  dailyHuntDate: "",
  isHospitalized: false,
  hospitalEndsAt: 0,
  isDead: false,
  totalXpGained: 0,
  pvpTactic: "Normal",
  pvpSurrenderAt: 30,
  pvpTeamClashAt: 30,
  pveTactic: "Normal",
  pveSurrenderAt: 30
};

var HUNT_DAILY_CAP = 100;
var currentNpcDetailKey = null;
var combatLogReturnPage = "hunt";

// --- Persistence (MMO-ready event history + current-state cache) ---
// For this prototype build, we implement a local "server" using localStorage.
// The server-authoritative + WebSocket transport will be swapped later.
var PERSIST_VERSION = "v1";
var PERSIST_PREFIX = "arenan_" + PERSIST_VERSION + "_";
var PERSIST_CHAR_STATE_KEY = PERSIST_PREFIX + "char_state_";     // + characterId
var PERSIST_CHAR_SEQ_KEY = PERSIST_PREFIX + "char_seq_";         // + characterId
var PERSIST_CHAR_EVENTS_KEY = PERSIST_PREFIX + "char_events_";   // + characterId (append-only array)
var PERSIST_BATTLES_KEY = PERSIST_PREFIX + "battles_";           // map battleId -> metadata
var PERSIST_BATTLE_SEQ_KEY = PERSIST_PREFIX + "battle_seq_";    // number
var PERSIST_CHAR_CURRENT_MAP_KEY = PERSIST_PREFIX + "characters_current_map_"; // map characterId -> current fields
var PERSIST_PROCESSED_BATTLES_KEY = PERSIST_PREFIX + "processed_battles_"; // + characterId
var PERSIST_CLIENT_LAST_SEQ_KEY = PERSIST_PREFIX + "client_last_seq_"; // + characterId

// Event types: we treat each "game-changing action" as one or more events.
// Canonical history is the event stream; the server also maintains a cached current state.
var EVENT_TYPES = {
  STATE_SNAPSHOT: "STATE_SNAPSHOT",     // payload: { state }
  BATTLE_RESOLVED: "BATTLE_RESOLVED",   // payload: { battle, battleLog, outcomeSummary }
  LEVEL_UP: "LEVEL_UP",                 // payload: { level, xp, skillsDelta }
  DEATH: "DEATH",                       // payload: { hp, isDead }
  HOSPITALIZED: "HOSPITALIZED",       // payload: { hp, untilMs }
  INVENTORY_CHANGED: "INVENTORY_CHANGED", // payload: { inventory }
  EQUIPMENT_CHANGED: "EQUIPMENT_CHANGED", // payload: { equipment }
  COINS_DELTA: "COINS_DELTA",           // payload: { delta }
  XP_DELTA: "XP_DELTA",                 // payload: { delta, totalXpGained }
  CONDITION_DELTA: "CONDITION_DELTA", // payload: { delta }
  ENERGY_DELTA: "ENERGY_DELTA",       // payload: { delta }
  GENERIC_PATCH: "GENERIC_PATCH"      // payload: { patch } for future event types
};

function persistNowMs() { return Date.now(); }

function getLocalCharacterId() {
  // Prototype has only one player; later this becomes server-issued characterId.
  return "local_player";
}

function safeJsonParse(txt, fallback) {
  if (txt == null || txt === "") return fallback;
  try {
    var v = JSON.parse(txt);
    if (v === null || v === undefined) return fallback;
    return v;
  } catch (e) {
    return fallback;
  }
}

function getPersistCharacterSeq(characterId) {
  var raw = localStorage.getItem(PERSIST_CHAR_SEQ_KEY + characterId);
  var n = raw != null ? parseInt(raw, 10) : 0;
  return isNaN(n) ? 0 : n;
}

function setPersistCharacterSeq(characterId, seq) {
  localStorage.setItem(PERSIST_CHAR_SEQ_KEY + characterId, String(seq));
}

function getPersistCharacterEvents(characterId) {
  var raw = localStorage.getItem(PERSIST_CHAR_EVENTS_KEY + characterId);
  return safeJsonParse(raw, []);
}

function setPersistCharacterEvents(characterId, events) {
  localStorage.setItem(PERSIST_CHAR_EVENTS_KEY + characterId, JSON.stringify(events || []));
}

function getPersistCharacterStateSnapshot(characterId) {
  var raw = localStorage.getItem(PERSIST_CHAR_STATE_KEY + characterId);
  return safeJsonParse(raw, null);
}

function setPersistCharacterStateSnapshot(characterId, state) {
  localStorage.setItem(PERSIST_CHAR_STATE_KEY + characterId, JSON.stringify(state));
}

function getPersistCharactersCurrentMap() {
  var raw = localStorage.getItem(PERSIST_CHAR_CURRENT_MAP_KEY);
  return safeJsonParse(raw, {});
}

function setPersistCharactersCurrentMap(map) {
  localStorage.setItem(PERSIST_CHAR_CURRENT_MAP_KEY, JSON.stringify(map || {}));
}

function getPersistBattlesMap() {
  var raw = localStorage.getItem(PERSIST_BATTLES_KEY);
  return safeJsonParse(raw, {});
}

function setPersistBattlesMap(map) {
  localStorage.setItem(PERSIST_BATTLES_KEY, JSON.stringify(map || {}));
}

function getPersistProcessedBattles(characterId) {
  var raw = localStorage.getItem(PERSIST_PROCESSED_BATTLES_KEY + characterId);
  var m = safeJsonParse(raw, {});
  if (m && typeof m === "object" && !Array.isArray(m)) return m;
  return {};
}

function setPersistProcessedBattles(characterId, map) {
  localStorage.setItem(PERSIST_PROCESSED_BATTLES_KEY + characterId, JSON.stringify(map || {}));
}

function isBattleProcessed(characterId, battleId) {
  if (!characterId || !battleId) return false;
  var map = getPersistProcessedBattles(characterId);
  if (!map || typeof map !== "object") return false;
  return !!map[battleId];
}

function markBattleProcessed(characterId, battleId) {
  if (!characterId || !battleId) return;
  var map = getPersistProcessedBattles(characterId);
  if (!map || typeof map !== "object") map = {};
  map[battleId] = true;
  setPersistProcessedBattles(characterId, map);
}

function getNextBattleId() {
  var raw = localStorage.getItem(PERSIST_BATTLE_SEQ_KEY);
  var n = raw != null ? parseInt(raw, 10) : 0;
  if (isNaN(n)) n = 0;
  n++;
  localStorage.setItem(PERSIST_BATTLE_SEQ_KEY, String(n));
  return "battle_" + n;
}

function applySnapshotStateToPlayer(snapshot) {
  if (!snapshot) return;
  // Only overwrite known fields; ignore unknown snapshot keys to reduce breakage risk.
  player = snapshot.player || snapshot;
  playerCreated = !!playerCreated;
}

function getSerializablePlayerState() {
  // Store only what matters for reload correctness (avoid circular structures).
  return {
    name: player.name,
    hp: player.hp,
    maxHp: player.maxHp,
    coins: player.coins,
    xp: player.xp,
    level: player.level,
    energy: player.energy,
    condition: player.condition,
    portrait: player.portrait,
    race: player.race,
    gender: player.gender,
    skills: player.skills,
    unspentPoints: player.unspentPoints,
    inventory: player.inventory,
    equipment: player.equipment,
    accessories: player.accessories,
    dailyHuntCount: player.dailyHuntCount,
    dailyHuntDate: player.dailyHuntDate,
    isHospitalized: player.isHospitalized,
    hospitalEndsAt: player.hospitalEndsAt,
    isDead: player.isDead,
    totalXpGained: player.totalXpGained,
    pvpTactic: player.pvpTactic,
    pvpSurrenderAt: player.pvpSurrenderAt,
    pvpTeamClashAt: player.pvpTeamClashAt,
    pveTactic: player.pveTactic,
    pveSurrenderAt: player.pveSurrenderAt
  };
}

function appendCharacterEvents(characterId, events, expectedSeq) {
  if (!events || !events.length) return;
  var currSeq = getPersistCharacterSeq(characterId);
  if (expectedSeq != null && expectedSeq !== currSeq) {
    throw new Error("Seq mismatch for " + characterId + ": expected " + expectedSeq + ", got " + currSeq);
  }
  var stored = getPersistCharacterEvents(characterId);
  var out = [];
  for (var i = 0; i < events.length; i++) {
    currSeq++;
    var ev = events[i] || {};
    out.push({
      eventId: ev.eventId || (String(currSeq) + "_" + Math.random().toString(16).slice(2)),
      characterId: characterId,
      seq: currSeq,
      ts: persistNowMs(),
      type: ev.type,
      payload: ev.payload || {}
    });
  }
  stored = (stored || []).concat(out);
  setPersistCharacterSeq(characterId, currSeq);
  setPersistCharacterEvents(characterId, stored);
  return out;
}

function persistSnapshot(stateEventPayload) {
  var characterId = getLocalCharacterId();
  var state = stateEventPayload && stateEventPayload.state ? stateEventPayload.state : getSerializablePlayerState();

  // Write reload-critical snapshot first so F5 still restores if event append fails (quota, etc.).
  setPersistCharacterStateSnapshot(characterId, { player: state });

  try {
    var appended = appendCharacterEvents(characterId, [{
      type: EVENT_TYPES.STATE_SNAPSHOT,
      payload: { state: state }
    }]);
    var lastSeq = (appended && appended.length) ? appended[appended.length - 1].seq : getPersistCharacterSeq(characterId);

    var curr = getPersistCharactersCurrentMap();
    curr[characterId] = {
      hp: state.hp,
      maxHp: state.maxHp,
      energy: state.energy,
      condition: state.condition,
      coins: state.coins,
      xp: state.xp,
      level: state.level,
      isHospitalized: !!state.isHospitalized,
      hospitalEndsAt: state.hospitalEndsAt,
      isDead: !!state.isDead,
      versionSeq: lastSeq,
      updatedAtMs: persistNowMs()
    };
    setPersistCharactersCurrentMap(curr);

    broadcastCharacterMessage({
      type: "STATE_UPDATED",
      characterId: characterId,
      current: curr[characterId]
    });
  } catch (e) {}
}

function persistBattleResolvedEvent(beastKey, state, win, battleId) {
  var characterId = getLocalCharacterId();
  battleId = battleId || getNextBattleId();
  if (isBattleProcessed(characterId, battleId)) return battleId;

  var now = persistNowMs();
  var battle = {
    battleId: battleId,
    combatType: state.combatType || "Hunt",
    tactic: state.tactic,
    opponentKey: beastKey,
    playerName: state.playerName,
    npcName: state.npcName,
    startedAtMs: now,
    resolvedAtMs: now,
    win: !!win,
    surrendered: !!state.surrendered
  };

  var outcomeSummary = {
    playerHpAfter: state.playerHp,
    npcHpAfter: state.npcHp,
    surrenderPercent: state.surrenderPercent,
    surrenderHp: state.surrenderHp
  };

  appendCharacterEvents(characterId, [{
    type: EVENT_TYPES.BATTLE_RESOLVED,
    payload: {
      battle: battle,
      battleLog: (state.log || []).slice(),
      outcomeSummary: outcomeSummary
    }
  }]);

  var battles = getPersistBattlesMap();
  battles[battleId] = battle;
  setPersistBattlesMap(battles);

  try {
    broadcastCharacterMessage({
      type: "BATTLE_RESOLVED",
      characterId: characterId,
      battleId: battleId,
      battle: battle,
      outcomeSummary: outcomeSummary,
      battleLog: (state.log || []).slice()
    });
  } catch (e) {}

  // Mark as processed after persisting + caching.
  markBattleProcessed(characterId, battleId);
  return battleId;
}

function snapshotRecordToPlayer(snap) {
  if (!snap || typeof snap !== "object") return null;
  if (snap.player && typeof snap.player === "object") return snap.player;
  if (typeof snap.name === "string" && snap.skills && typeof snap.skills === "object") return snap;
  return null;
}

function resetCreationDraftState() {
  for (var k in tempStats) {
    if (Object.prototype.hasOwnProperty.call(tempStats, k)) tempStats[k] = 0;
  }
  creationPoints = 100;
  for (var pk in pendingLevelupStats) {
    if (Object.prototype.hasOwnProperty.call(pendingLevelupStats, pk)) pendingLevelupStats[pk] = 0;
  }
}

function showGameShellAfterLoad() {
  var box = document.querySelector(".creation-box");
  var wb = document.getElementById("welcome-back");
  if (box) box.style.display = "none";
  if (wb) wb.style.display = "block";
  var dn = document.getElementById("display-player-name");
  if (dn) dn.innerText = player.name || "";
  var menuImg = document.getElementById("menu-portrait");
  if (menuImg && player.portrait) menuImg.src = player.portrait;
  var raceEl = document.getElementById("select-race");
  var genderEl = document.getElementById("select-gender");
  var nameInput = document.getElementById("input-name");
  if (raceEl && player.race) raceEl.value = player.race;
  if (genderEl && player.gender) genderEl.value = player.gender;
  if (nameInput && player.name) nameInput.value = player.name;
  resetCreationDraftState();
  renderBeastList();
  showPage("info");
  updateInfoPage();
  refreshStatsUI();
}

function loadPersistedStateIfAny() {
  var characterId = getLocalCharacterId();
  var snap = getPersistCharacterStateSnapshot(characterId);
  var loaded = snapshotRecordToPlayer(snap);
  if (!loaded) return false;
  player = loaded;
  playerCreated = true;
  // Sanitize legacy/invalid snapshots so combat gating doesn't break.
  if (typeof player.level !== "number" || isNaN(player.level) || player.level < 1) player.level = 1;
  if (typeof player.hp !== "number" || isNaN(player.hp)) player.hp = 100;
  if (typeof player.maxHp !== "number" || isNaN(player.maxHp) || player.maxHp <= 0) player.maxHp = 100;
  if (typeof player.energy !== "number" || isNaN(player.energy)) player.energy = 50;
  if (typeof player.condition !== "number" || isNaN(player.condition)) player.condition = 37;
  if (!player.skills || typeof player.skills !== "object") player.skills = {};
  if (typeof player.unspentPoints !== "number" || isNaN(player.unspentPoints)) player.unspentPoints = 0;
  if (!Array.isArray(player.inventory)) player.inventory = [];
  if (!player.equipment || typeof player.equipment !== "object") {
    player.equipment = { mainHand: null, offHand: null };
  } else {
    if (player.equipment.mainHand === undefined) player.equipment.mainHand = null;
    if (player.equipment.offHand === undefined) player.equipment.offHand = null;
  }
  if (typeof player.isHospitalized !== "boolean") player.isHospitalized = false;
  if (typeof player.hospitalEndsAt !== "number" || isNaN(player.hospitalEndsAt)) player.hospitalEndsAt = 0;
  if (typeof player.isDead !== "boolean") player.isDead = false;
  if (!player.accessories || typeof player.accessories !== "object") player.accessories = {};

  // Ensure derived values remain consistent after reload.
  if (typeof player.maxHp === "number" && typeof player.skills === "object") {
    updateMaxHp();
    player.hp = Math.min(player.hp, player.maxHp);
  }
  try { reconcileOfflineEvents(characterId); } catch (e) {}
  try { showGameShellAfterLoad(); } catch (e) {}
  return true;
}

function maybePersistSnapshotDebounced() {
  // Cheap debounce: flush at most every ~500ms. In MMO, this becomes server-side event persistence.
  if (maybePersistSnapshotDebounced.timer) return;
  maybePersistSnapshotDebounced.timer = setTimeout(function() {
    maybePersistSnapshotDebounced.timer = null;
    if (!playerCreated) return;
    try { persistSnapshot(); } catch (e) {}
  }, 500);
}

function getClientLastSeq(characterId) {
  var raw = localStorage.getItem(PERSIST_CLIENT_LAST_SEQ_KEY + characterId);
  var n = raw != null ? parseInt(raw, 10) : 0;
  return isNaN(n) ? 0 : n;
}

function setClientLastSeq(characterId, seq) {
  localStorage.setItem(PERSIST_CLIENT_LAST_SEQ_KEY + characterId, String(seq));
}

function reconcileOfflineEvents(characterId) {
  // “Client reconciliation” step:
  // - Load current state from snapshot (fast).
  // - Fetch events newer than last-seen seq (for logs/UI).
  // Prototype behavior: store new events on window for future UI wiring.
  var lastSeq = getClientLastSeq(characterId);
  var currSeq = getPersistCharacterSeq(characterId);
  if (currSeq <= lastSeq) return [];

  var all = getPersistCharacterEvents(characterId) || [];
  var fresh = [];
  for (var i = 0; i < all.length; i++) {
    if ((all[i] && all[i].seq) > lastSeq) fresh.push(all[i]);
  }
  setClientLastSeq(characterId, currSeq);
  try { window.__pendingReconciledEvents = fresh; } catch (e) {}
  return fresh;
}

// Simulated WebSocket push: BroadcastChannel delivers updates instantly to other tabs.
// Later, this becomes real WS subscriptions from the server.
var persistenceBc = null;
var persistenceSubscribers = {}; // characterId -> [cb]
var PERSIST_BC_NAME = "arenan_persist_" + PERSIST_VERSION;

function initPersistenceMessaging() {
  if (typeof BroadcastChannel === "undefined") return;
  if (persistenceBc) return;
  persistenceBc = new BroadcastChannel(PERSIST_BC_NAME);
  persistenceBc.onmessage = function(ev) {
    var msg = (ev && ev.data) ? ev.data : null;
    if (!msg || !msg.characterId) return;
    var subs = persistenceSubscribers[msg.characterId] || [];
    for (var i = 0; i < subs.length; i++) {
      try { subs[i](msg); } catch (e) {}
    }
  };
}

function subscribeCharacterUpdates(characterId, cb) {
  if (!characterId || typeof cb !== "function") return function() {};
  if (!persistenceSubscribers[characterId]) persistenceSubscribers[characterId] = [];
  persistenceSubscribers[characterId].push(cb);
  return function unsubscribe() {
    var arr = persistenceSubscribers[characterId];
    if (!arr) return;
    var idx = arr.indexOf(cb);
    if (idx !== -1) arr.splice(idx, 1);
  };
}

function broadcastCharacterMessage(message) {
  if (!message || !message.characterId) return;
  var subs = persistenceSubscribers[message.characterId] || [];
  for (var i = 0; i < subs.length; i++) {
    try { subs[i](message); } catch (e) {}
  }
  if (persistenceBc) {
    try { persistenceBc.postMessage(message); } catch (e) {}
  }
}

try { initPersistenceMessaging(); } catch (e) {}

// Vendor list (Merchant's Row). Thumbnail 19:15 = 76×60 px; profile image 19:15 = 380×300 px.
var VENDOR_DATABASE = {
  "grizlow": {
    name: "Grizlow the Greedy",
    trade: "Diverse Arms & Armor",
    raceGender: "Goblin Male",
    description: "To Grizlow, every customer is a necessary evil—a noisy, demanding obstacle standing between him and his next handful of coin. He doesn't toil for glory, and he certainly isn't doing you any favors; he pounds the anvil because silver is the only way to feed his bottomless craving for the bottle. His workshop is a cramped, soot-stained den where the quality of the wares is as unpredictable as his temperament. On a rare days he's sober and focused, he can hammer out steel sturdy enough for any veteran's equipment. On other days, you might leave with a breastplate that smells faintly of cheap ale and questionable choices.\n\nHe has no patience for pleasantries or stories of heroism. Whether you are a nobleman or a common thief, Grizlow's interest in you begins and ends with the weight of your purse. He offers a vast range of equipment, from reliable chainmail to heavy war-axes, all sold with a grunt and a glare. He doesn't care who wears his work or what causes they fight for, as long as the payment is upfront and the haggling is kept to a minimum. Step in, pay up, and get out—Grizlow has coin to count and a bottle to find."
  },
  "barundin": {
    name: "Master Barundin Aurumforge",
    trade: "Jewelry, Accessories & Magical Artifacts – For the wealthy and accomplished",
    raceGender: "Dwarf Male",
    description: "Master Barundin is a living legend whose beard turned silver long before the city walls were raised. As one of the few remaining Dwarven Runesmiths, he doesn't just craft jewelry—he weaves destiny into precious metals. His boutique smells of ancient parchment and raw gemstones. Barundin is highly selective; he believes his masterpieces should only be worn by those who have proven their worth through grand achievements or immense wealth. Here, you will find rings that bolster your strength and amulets that ward you in combat. If you have conquered great foes or amassed a small fortune, Barundin is the only merchant capable of providing equipment that truly sets you apart from the masses."
  },
  "elara": {
    name: "Elara Valerius",
    trade: "High-Tier Arms & Armor – For the trustworthy and honorable",
    raceGender: "Elf Female",
    description: "Elara possesses a timeless beauty that belies the three centuries of warfare etched into her memory. Though she carries herself with the grace of a woman in her prime, her eyes harbor the cold steel of a veteran who has seen empires fall. The Valerius name has been synonymous with elite smithing for generations, and Elara continues this legacy by forging equipment of unparalleled precision. Yet, her forge serves a moral purpose as much as a practical one. Haunted by the atrocities of ancient wars, she refuses to arm the \"dark-blooded\" Orcish and Troll kin aswell as the restless Undead, and any Kyshari who has not yet sworn a formal oath to the light.\n\nHer refusal is rooted in the trauma of seeing her homeland scorched by those very forces centuries ago. To Elara, a blade is a responsibility, and she will not risk her family's steel falling into the hands of those with a history of malice. She caters exclusively to the \"Red-Blooded\" lineages—Humans, Dwarves, and her fellow Elves—alongside the Sworn Kyshari who have proven their honor. Her inventory consists of sophisticated weaponry and armor tailored for the most agile of warrior, offering masterwork finesse and protection to those who favor speed and technique over brute force, but for those she distrusts, no amount of gold will ever open the doors to her shop."
  },
  "mogra": {
    name: "Mogra the Mad",
    trade: "Brutal Plate & Devious Weaponry – The Outcast's Forge",
    raceGender: "Orc Female",
    description: "Mogra's manic laughter echoes through the soot-stained streets long before you reach her forge, a place that feels more like a site of execution than a place of business. To Mogra, the hammer is not just a tool for creation, but an instrument of vengeance. Her hatred for the city's elite is a cold, hard coal that never stops burning. Years ago, the Imperial Guard executed her kin under the cold guise of \"The Law\"—a decree she viewed as a spineless, dishonorable betrayal of her family's honor. Since that day, she has renounced the Emperor and his \"civilized\" puppets, swearing that those who stand with the government are the true architects of evil in this world.\n\nShe refuses to hammer a single nail for the Red-Blooded races or any Kyshari who has knelt to take a \"Sacred Oath.\" To her, they are nothing more than lackeys for the tyrants who murdered her bloodline. Her forge is reserved for the Black-Blooded, the Undead, and the Outlaw Kyshari—those who, like her, live outside the reach of the Emperor's shadow. Mogra's work is brutal, jagged, and heavy, designed for those who survive through raw power, cheap tricks and uncompromising violence. If you carry the stench of the law upon you, Mogra will sooner use her hammer on your skull than sell you a single plate of steel."
  },
  "viconia": {
    name: "Viconia the Nightwhisper",
    trade: "Potions, Elixirs & Enchantments",
    raceGender: "Dark Elf",
    description: "Hidden in a dimly lit cellar where the air is thick with the copper scent of blood and the sweet sting of ozone, Viconia conducts her tireless research. As an outcast from the subterranean realms, she views the surface world not with malice, but with a detached, clinical curiosity. To Viconia, the ongoing conflicts in Aethelgard are merely a sprawling laboratory. She does not care for the \"Red-Blooded\" ideals of honor, nor does she find kinship in the \"Black-Blooded\" hunger for chaos. To her, every customer is a test subject, and every battle is an opportunity to gather data on how her enchantments interact with different soul-signatures.\n\nHer doors are open to everyone—not out of kindness, but out of a necessity for a diverse range of catalysts. Whether you are a saint or a slayer, your coin is simply the fee for participating in her grand experiments. She offers highly potent elixirs and intricate incantations that can bind raw power to your steel, but she delivers them with a cold, unsettling indifference. She will watch you walk away with her charms, her eyes already calculating how long it will take for the magic to consume you, or how much stronger it will make you before you fall. In Viconia's shop, you aren't a hero; you are a variable in an equation that you can never hope to solve."
  }
};

var VENDOR_IMAGE_BASE = "https://raw.githubusercontent.com/BinoBRUCHHH/Vendors-jpg/main/";
var VENDOR_IMAGE_VERSION = "1";
var VENDOR_IMAGE_FILES = {
  "grizlow":   { full: "Grizlow.jpg",    mini: "Grizlow-mini.jpg" },
  "barundin":  { full: "Barundin.jpg",   mini: "Barundin-mini.jpg" },
  "elara":     { full: "Elara.jpg",      mini: "Elara-mini.jpg" },
  "mogra":     { full: "Mogra.jpg",      mini: "Mogra-mini.jpg" },
  "viconia":   { full: "Viconia.jpg",    mini: "Viconia-mini.jpg" }
};

function getVendorImageUrl(vendorKey, isMini) {
  var files = VENDOR_IMAGE_FILES[vendorKey];
  if (!files) return "";
  var name = isMini ? files.mini : files.full;
  if (!name) return "";
  return VENDOR_IMAGE_BASE + encodeURIComponent(name) + "?v=" + (VENDOR_IMAGE_VERSION || "1");
}

var NPC_IMAGE_BASE = "https://raw.githubusercontent.com/BinoBRUCHHH/Hunt-and-Scavenge-jpg/main/";
var NPC_IMAGE_VERSION = "2";
var NPC_IMAGE_FILES = {
  "rabbit": "Wild-Rabbit.jpg",
  "boar": "Wild-Boar.jpg",
  "mangy-wolf": "Stray-Mangy-Wolf.jpg",
  "shellcreeper": "Moss-Back-Shellcreeper-(passive).jpg",
  "forest-spider": "Giant-Forest-Spider.jpg",
  "goblin-scavenger": "Goblin-Scavenger.jpg",
  "venomous-viper": "Venomous-Viper.jpg",
  "silver-gazelle": "Silver-Horned-Gazelle-(passive).jpg",
  "crazed-brigand": "Crazed-Brigand.jpg",
  "feral-bobcat": "Feral-Bobcat.jpg",
  "skeletal-sentry": "Skeletal-Sentry.jpg",
  "orc-brawler": "Orc-Brawler.jpg",
  "aurelian-sun-stag": "Aurelian-Sun-Stag-(passive).jpg",
  "mountain-lion": "Mountain-Lion.jpg",
  "iron-mercenary": "Iron-Clad-Mercenary.jpg",
  "harpy-screecher": "Harpy-Screecher.jpg",
  "crystalback-tortoise": "Crystal-Back-Tortoise-(passive).jpg",
  "young-manticore": "Young-Manticore.jpg",
  "gnoll-pack-leader": "Gnoll-Pack-Leader.jpg",
  "stone-golem": "Stone-Golem-Prototype.jpg",
  "feral-lion": "Feral-Lion.jpg",
  "cloud-mane-bison": "Cloud-Mane-Bison-(passive).jpg",
  "centaur-skirmisher": "Centaur-Skirmisher.jpg",
  "corrupted-paladin": "Corrupted-Paladin.jpg",
  "elder-grove-hydra": "Elder-Grove-Hydra-(passive).jpg",
  "cyclops-runt": "Cyclops-Runt.jpg",
  "minotaur-berserker": "Minotaur-Berserker.jpg",
  "shadow-assassin": "Shadow-Assassin.jpg",
  "twin-headed-ettin": "Twin-Headed-Ettin.jpg",
  "ancient-wyvern": "Ancient-Wyvern.jpg",
  "astral-whale": "Astral-Whale-(Passive).jpg",
  "undead-gladiator-king": "Undead-Gladiator-King.jpg",
  "frost-giant": "Frost-Giant-Exile.jpg",
  "nine-headed-hydra": "Nine-Headed-Hydra.jpg",
  "chimera-alpha": "Chimera-Alpha.jpg",
  "behemoth-juggernaut": "Behemoth-Juggernaut.jpg",
  "arch-demon-overlord": "Arch-Demon-Overlord.jpg",
  "void-eater-colossus": "Void-Eater-Colossus.jpg"
};

function getNpcImageUrl(beastKey) {
  var file = NPC_IMAGE_FILES[beastKey];
  if (!file) return null;
  var encoded = file.replace(/\(/g, "%28").replace(/\)/g, "%29");
  return NPC_IMAGE_BASE + encoded + "?v=" + (NPC_IMAGE_VERSION || "1");
}

// Pending allocations from level-ups that are not yet saved into player.skills
var pendingLevelupStats = {
  health: 0, strength: 0, endurance: 0, initiative: 0, avoidance: 0,
  sword: 0, blunt: 0, axe: 0, ranged: 0, flail: 0, stabbingWeapons: 0, shield: 0
};

// challengeMin/challengeMax = level range; challengeMaxPrestige = max 60+X for prestige (optional)
// loot: [{ name: string, chance: "high"|"medium"|"low" }]
const BEAST_DATABASE = {
  rabbit: {
    name: "Wild Rabbit", level: 1,
    stats: { health: 15, strength: 5, endurance: 10, initiative: 15, avoidance: 15, stabbingWeapons: 5 },
    equipment: {
      mainHand: { name: "Rabbit Teeth", type: "stabbingWeapons", damage: 2, weight: 0.5, durability: 100, reqSkill: 10 },
      offHand: { name: "Small Paw", type: "shield", block: 0, durability: 50 }
    },
    xpReward: 15, goldReward: [1, 3],
    description: "Don't let its size fool you; this jittery herbivore is surprisingly hard to corner in the open heat of the arena.",
    challengeMin: 1, challengeMax: 5,
    loot: [
      { name: "Pelt fragment", chance: "high" },
      { name: "Rabbit fur", chance: "medium" },
      { name: "Intact small brain", chance: "low" }
    ]
  },
  boar: {
    name: "Wild Boar", level: 3,
    stats: { health: 25, strength: 20, endurance: 15, initiative: 10, avoidance: 5, stabbingWeapons: 15 },
    equipment: {
      mainHand: { name: "Tusk Charge", type: "blunt", damage: 12, weight: 4, durability: 500, reqSkill: 25 },
      offHand: null
    },
    xpReward: 15, goldReward: [1, 3],
    description: "A low-slung engine of muscle and tusks; it doesn't care about finesse, it only knows how to charge.",
    challengeMin: 1, challengeMax: 7,
    loot: [
      { name: "Boar tusk", chance: "medium" },
      { name: "Tough hide", chance: "high" }
    ]
  },
  "mangy-wolf": {
    name: "Stray Mangy Wolf", level: 5,
    stats: { health: 30, strength: 20, endurance: 20, initiative: 10, avoidance: 10, stabbingWeapons: 10 },
    equipment: {
      mainHand: { name: "Fangs", type: "stabbingWeapons", damage: 8, weight: 1, durability: 200, reqSkill: 15 },
      offHand: null
    },
    xpReward: 20, goldReward: [2, 4],
    description: "A desperate predator driven by hunger; its erratic movements make it harder to hit than a common boar.",
    challengeMin: 3, challengeMax: 7,
    loot: [
      { name: "Wolf pelt", chance: "medium" },
      { name: "Fang", chance: "high" }
    ]
  },
  "shellcreeper": {
    name: "Moss-Back Shellcreeper (passive)", level: 7,
    stats: { health: 50, strength: 25, endurance: 30, initiative: 5, avoidance: 5, stabbingWeapons: 5 },
    equipment: {
      mainHand: { name: "Shell bash", type: "blunt", damage: 6, weight: 8, durability: 400, reqSkill: 10 },
      offHand: null
    },
    xpReward: 20, goldReward: [2, 4],
    description: "A sluggish, moss-covered turtle that minds its own business; it's a living boulder that requires patience to overcome.",
    challengeMin: 4, challengeMax: 10,
    loot: [
      { name: "Moss", chance: "high" },
      { name: "Shell fragment", chance: "medium" }
    ]
  },
  "forest-spider": {
    name: "Giant Forest Spider", level: 9,
    stats: { health: 35, strength: 15, endurance: 20, initiative: 20, avoidance: 20, stabbingWeapons: 30 },
    equipment: {
      mainHand: { name: "Venom bite", type: "stabbingWeapons", damage: 6, weight: 0.5, durability: 100, reqSkill: 20 },
      offHand: null
    },
    xpReward: 20, goldReward: [2, 5],
    description: "Be wary of its silk; this arachnid relies on slowing its prey before delivering a numbing bite.",
    challengeMin: 7, challengeMax: 10,
    loot: [{ name: "Spider silk", chance: "high" }, { name: "Venom sac", chance: "medium" }]
  },
  "goblin-scavenger": {
    name: "Goblin Scavenger", level: 11,
    stats: { health: 50, strength: 30, endurance: 15, initiative: 20, avoidance: 10, stabbingWeapons: 35 },
    equipment: { mainHand: { name: "Rusted Shiv", type: "stabbingWeapons", damage: 10, weight: 1, durability: 80, reqSkill: 25 }, offHand: null },
    xpReward: 25, goldReward: [3, 6],
    description: "Armed with nothing but a rusted shiv and malice, this small foe is surprisingly cunning in close quarters.",
    challengeMin: 8, challengeMax: 12,
    loot: [{ name: "Rusty blade", chance: "high" }, { name: "Goblin ear", chance: "low" }]
  },
  "venomous-viper": {
    name: "Venomous Viper", level: 13,
    stats: { health: 30, strength: 20, endurance: 10, initiative: 35, avoidance: 35, stabbingWeapons: 30 },
    equipment: { mainHand: { name: "Venom fang", type: "stabbingWeapons", damage: 8, weight: 0.5, durability: 100, reqSkill: 25 }, offHand: null },
    xpReward: 25, goldReward: [3, 6],
    description: "It may be small, but one successful strike can leave a gladiator fighting the clock against spreading poison.",
    challengeMin: 10, challengeMax: 14,
    loot: [{ name: "Venom gland", chance: "medium" }, { name: "Snakeskin", chance: "high" }]
  },
  "silver-gazelle": {
    name: "Silver-Horned Gazelle (passive)", level: 15,
    stats: { health: 55, strength: 20, endurance: 45, initiative: 15, avoidance: 45, stabbingWeapons: 20 },
    equipment: { mainHand: { name: "Silver horn", type: "sword", damage: 6, weight: 2, durability: 200, reqSkill: 15 }, offHand: null },
    xpReward: 20, goldReward: [2, 5],
    description: "It glides across the arena like a ghost; striking it is nearly impossible, and it will surely outlast a weary fighter.",
    challengeMin: 10, challengeMax: 18,
    loot: [{ name: "Silver horn fragment", chance: "low" }, { name: "Gazelle hide", chance: "medium" }]
  },
  "crazed-brigand": {
    name: "Crazed Brigand", level: 17,
    stats: { health: 65, strength: 55, endurance: 15, initiative: 25, avoidance: 20, stabbingWeapons: 40 },
    equipment: { mainHand: { name: "Crude blade", type: "sword", damage: 18, weight: 3, durability: 150, reqSkill: 35 }, offHand: null },
    xpReward: 30, goldReward: [3, 7],
    description: "A low-life criminal forced into the arena; he fights dirty and cares little for the rules of engagement.",
    challengeMin: 14, challengeMax: 18,
    loot: [{ name: "Stolen coin purse", chance: "high" }, { name: "Dented blade", chance: "medium" }]
  },
  "feral-bobcat": {
    name: "Feral Bobcat", level: 19,
    stats: { health: 55, strength: 40, endurance: 25, initiative: 45, avoidance: 40, stabbingWeapons: 55 },
    equipment: { mainHand: { name: "Claws", type: "stabbingWeapons", damage: 14, weight: 0.5, durability: 120, reqSkill: 45 }, offHand: null },
    xpReward: 30, goldReward: [3, 7],
    description: "Faster and more aggressive than a house cat, its razor-sharp claws can shred leather armor in seconds.",
    challengeMin: 15, challengeMax: 19,
    loot: [{ name: "Bobcat pelt", chance: "medium" }, { name: "Sharp claw", chance: "high" }]
  },
  "skeletal-sentry": {
    name: "Skeletal Sentry", level: 21,
    stats: { health: 60, strength: 70, endurance: 35, initiative: 10, avoidance: 5, stabbingWeapons: 80 },
    equipment: { mainHand: { name: "Rusty sword", type: "sword", damage: 22, weight: 3, durability: 200, reqSkill: 70 }, offHand: null },
    xpReward: 35, goldReward: [4, 8],
    description: "A mindless pile of bones held together by weak magic, it feels no pain and never tires.",
    challengeMin: 17, challengeMax: 21,
    loot: [{ name: "Bone fragment", chance: "high" }, { name: "Ancient blade", chance: "low" }]
  },
  "orc-brawler": {
    name: "Orc Brawler", level: 23,
    stats: { health: 80, strength: 90, endurance: 30, initiative: 15, avoidance: 10, stabbingWeapons: 55 },
    equipment: { mainHand: { name: "Spiked club", type: "blunt", damage: 28, weight: 6, durability: 300, reqSkill: 50 }, offHand: null },
    xpReward: 35, goldReward: [4, 8],
    description: "He doesn't use a shield because he enjoys the feeling of steel hitting his skin; a brute who fights with pure rage.",
    challengeMin: 19, challengeMax: 23,
    loot: [{ name: "Orc tusk", chance: "medium" }, { name: "Heavy club", chance: "low" }]
  },
  "aurelian-sun-stag": {
    name: "Aurelian Sun-Stag (passive)", level: 25,
    stats: { health: 70, strength: 35, endurance: 50, initiative: 35, avoidance: 70, stabbingWeapons: 40 },
    equipment: { mainHand: { name: "Golden antler", type: "sword", damage: 12, weight: 2, durability: 250, reqSkill: 35 }, offHand: null },
    xpReward: 30, goldReward: [3, 6],
    description: "A creature of myth with a coat that shimmers like a summer noon; its radiance makes it a nightmare to corner.",
    challengeMin: 18, challengeMax: 28,
    loot: [{ name: "Golden antler shard", chance: "low" }, { name: "Sun-stag hide", chance: "medium" }]
  },
  "mountain-lion": {
    name: "Mountain Lion", level: 27,
    stats: { health: 65, strength: 50, endurance: 30, initiative: 55, avoidance: 50, stabbingWeapons: 50 },
    equipment: { mainHand: { name: "Razor claws", type: "stabbingWeapons", damage: 18, weight: 1, durability: 150, reqSkill: 45 }, offHand: null },
    xpReward: 40, goldReward: [4, 9],
    description: "It stalks the high ledges of the arena, waiting for the perfect moment to deliver a pounce that can snap a neck.",
    challengeMin: 22, challengeMax: 27,
    loot: [{ name: "Lion pelt", chance: "medium" }, { name: "Predator fang", chance: "high" }]
  },
  "iron-mercenary": {
    name: "Iron-Clad Mercenary", level: 29,
    stats: { health: 90, strength: 80, endurance: 35, initiative: 25, avoidance: 30, stabbingWeapons: 80 },
    equipment: { mainHand: { name: "Steel longsword", type: "sword", damage: 26, weight: 4, durability: 400, reqSkill: 75 }, offHand: null },
    xpReward: 40, goldReward: [4, 9],
    description: "A professional who views the arena as a job; he waits for you to make a mistake, hidden behind reinforced steel.",
    challengeMin: 24, challengeMax: 29,
    loot: [{ name: "Reinforced plate", chance: "medium" }, { name: "Mercenary contract", chance: "low" }]
  },
  "harpy-screecher": {
    name: "Harpy Screecher", level: 31,
    stats: { health: 60, strength: 40, endurance: 25, initiative: 65, avoidance: 70, stabbingWeapons: 80 },
    equipment: { mainHand: { name: "Talons", type: "stabbingWeapons", damage: 16, weight: 0.5, durability: 100, reqSkill: 70 }, offHand: null },
    xpReward: 40, goldReward: [4, 9],
    description: "Its cries pierce the soul and scramble the mind; fighting a Harpy is a test of focus as much as it is of steel.",
    challengeMin: 26, challengeMax: 31,
    loot: [{ name: "Harpy feather", chance: "high" }, { name: "Curved talon", chance: "medium" }]
  },
  "crystalback-tortoise": {
    name: "Crystalback Tortoise (passive)", level: 33,
    stats: { health: 120, strength: 100, endurance: 40, initiative: 5, avoidance: 5, stabbingWeapons: 70 },
    equipment: { mainHand: { name: "Crystal shell", type: "blunt", damage: 20, weight: 10, durability: 500, reqSkill: 65 }, offHand: null },
    xpReward: 40, goldReward: [4, 8],
    description: "A slow-moving mountain of jagged gems; attacking its shell is more likely to break your sword than harm the beast.",
    challengeMin: 28, challengeMax: 45,
    loot: [{ name: "Crystal shard", chance: "medium" }, { name: "Gem scale", chance: "low" }]
  },
  "young-manticore": {
    name: "Young Manticore", level: 35,
    stats: { health: 85, strength: 80, endurance: 40, initiative: 45, avoidance: 45, stabbingWeapons: 85 },
    equipment: { mainHand: { name: "Venom tail", type: "stabbingWeapons", damage: 22, weight: 2, durability: 200, reqSkill: 80 }, offHand: null },
    xpReward: 45, goldReward: [5, 10],
    description: "Though it hasn't reached full size, its hunger is endless and its scorpion-like tail is already dripping with venom.",
    challengeMin: 29, challengeMax: 35,
    loot: [{ name: "Manticore spine", chance: "high" }, { name: "Venom sac", chance: "medium" }]
  },
  "gnoll-pack-leader": {
    name: "Gnoll Pack-Leader", level: 37,
    stats: { health: 95, strength: 90, endurance: 35, initiative: 50, avoidance: 30, stabbingWeapons: 100 },
    equipment: { mainHand: { name: "Chieftain axe", type: "axe", damage: 30, weight: 5, durability: 350, reqSkill: 95 }, offHand: null },
    xpReward: 45, goldReward: [5, 10],
    description: "He leads with a cackle that echoes through the stands; his movements are frantic, but every swing is calculated.",
    challengeMin: 31, challengeMax: 37,
    loot: [{ name: "Gnoll insignia", chance: "medium" }, { name: "Chieftain headdress", chance: "low" }]
  },
  "stone-golem": {
    name: "Stone Golem Prototype", level: 39,
    stats: { health: 120, strength: 130, endurance: 50, initiative: 10, avoidance: 10, stabbingWeapons: 80 },
    equipment: { mainHand: { name: "Stone fist", type: "blunt", damage: 38, weight: 12, durability: 600, reqSkill: 75 }, offHand: null },
    xpReward: 50, goldReward: [5, 10],
    description: "A lumbering experiment of clay and magic; it lacks a soul, but its fists carry the weight of a falling castle.",
    challengeMin: 33, challengeMax: 39,
    loot: [{ name: "Rune stone", chance: "medium" }, { name: "Golem core", chance: "low" }]
  },
  "feral-lion": {
    name: "Feral Lion", level: 41,
    stats: { health: 100, strength: 110, endurance: 45, initiative: 50, avoidance: 50, stabbingWeapons: 105 },
    equipment: { mainHand: { name: "Savage fangs", type: "stabbingWeapons", damage: 28, weight: 1, durability: 180, reqSkill: 100 }, offHand: null },
    xpReward: 50, goldReward: [5, 10],
    description: "The true king of the arena sands; its roar alone is enough to make a novice drop their sword and pray.",
    challengeMin: 35, challengeMax: 41,
    loot: [{ name: "Lion heart", chance: "low" }, { name: "Royal mane", chance: "medium" }]
  },
  "cloud-mane-bison": {
    name: "Cloud-Mane Bison (passive)", level: 43,
    stats: { health: 150, strength: 140, endurance: 55, initiative: 15, avoidance: 10, stabbingWeapons: 110 },
    equipment: { mainHand: { name: "Thunder hooves", type: "blunt", damage: 32, weight: 8, durability: 450, reqSkill: 105 }, offHand: null },
    xpReward: 45, goldReward: [4, 9],
    description: "A majestic wanderer with fur like storm clouds; it moves with the weight of a landslide.",
    challengeMin: 38, challengeMax: 51,
    loot: [{ name: "Storm wool", chance: "medium" }, { name: "Cloud mane", chance: "low" }]
  },
  "centaur-skirmisher": {
    name: "Centaur Skirmisher", level: 45,
    stats: { health: 110, strength: 90, endurance: 50, initiative: 60, avoidance: 60, stabbingWeapons: 130 },
    equipment: { mainHand: { name: "War spear", type: "stabbingWeapons", damage: 26, weight: 4, durability: 300, reqSkill: 120 }, offHand: null },
    xpReward: 55, goldReward: [5, 11],
    description: "Master of the hit-and-run; he keeps you at the end of his spear while he gallops circles around you.",
    challengeMin: 39, challengeMax: 45,
    loot: [{ name: "Centaur hoof", chance: "medium" }, { name: "Spear tip", chance: "high" }]
  },
  "corrupted-paladin": {
    name: "Corrupted Paladin", level: 47,
    stats: { health: 140, strength: 150, endurance: 45, initiative: 30, avoidance: 25, stabbingWeapons: 150 },
    equipment: { mainHand: { name: "Dark blade", type: "sword", damage: 40, weight: 5, durability: 500, reqSkill: 145 }, offHand: null },
    xpReward: 55, goldReward: [6, 11],
    description: "A fallen warrior in tattered holy robes; his heavy plate armor is as formidable as his dark resolve.",
    challengeMin: 41, challengeMax: 47,
    loot: [{ name: "Darkened sigil", chance: "medium" }, { name: "Broken oath", chance: "low" }]
  },
  "elder-grove-hydra": {
    name: "Elder Grove Hydra (passive)", level: 49,
    stats: { health: 220, strength: 160, endurance: 60, initiative: 5, avoidance: 5, stabbingWeapons: 90 },
    equipment: { mainHand: { name: "Vine strike", type: "blunt", damage: 28, weight: 6, durability: 400, reqSkill: 85 }, offHand: null },
    xpReward: 50, goldReward: [5, 10],
    description: "A sluggish plant-beast; it is peaceful until you step within reach of its many snapping vine-heads.",
    challengeMin: 43, challengeMax: 59,
    loot: [{ name: "Ancient seed", chance: "low" }, { name: "Hydra vine", chance: "high" }]
  },
  "cyclops-runt": {
    name: "Cyclops Runt", level: 51,
    stats: { health: 170, strength: 200, endurance: 50, initiative: 15, avoidance: 10, stabbingWeapons: 115 },
    equipment: { mainHand: { name: "Tree trunk", type: "blunt", damage: 48, weight: 15, durability: 700, reqSkill: 110 }, offHand: null },
    xpReward: 60, goldReward: [6, 12],
    description: "Even a 'runt' among giants can swing a tree trunk with the force of a battering ram; don't be fooled.",
    challengeMin: 45, challengeMax: 51,
    loot: [{ name: "Cyclops eye", chance: "low" }, { name: "Giant finger", chance: "medium" }]
  },
  "minotaur-berserker": {
    name: "Minotaur Berserker", level: 53,
    stats: { health: 160, strength: 220, endurance: 55, initiative: 40, avoidance: 25, stabbingWeapons: 120 },
    equipment: { mainHand: { name: "War axe", type: "axe", damage: 46, weight: 8, durability: 450, reqSkill: 115 }, offHand: null },
    xpReward: 60, goldReward: [6, 12],
    description: "Locked in a permanent state of rage, this beast will charge through stone walls just to gore its target.",
    challengeMin: 47, challengeMax: 53,
    loot: [{ name: "Minotaur horn", chance: "medium" }, { name: "Berserker totem", chance: "low" }]
  },
  "shadow-assassin": {
    name: "Shadow Assassin", level: 55,
    stats: { health: 110, strength: 90, endurance: 40, initiative: 85, avoidance: 80, stabbingWeapons: 175 },
    equipment: { mainHand: { name: "Shadow blade", type: "stabbingWeapons", damage: 32, weight: 2, durability: 250, reqSkill: 170 }, offHand: null },
    xpReward: 65, goldReward: [6, 12],
    description: "You cannot hit what you cannot see; this foe strikes with surgical precision from the cold darkness.",
    challengeMin: 49, challengeMax: 55,
    loot: [{ name: "Shadow silk", chance: "medium" }, { name: "Assassin contract", chance: "low" }]
  },
  "twin-headed-ettin": {
    name: "Twin-Headed Ettin", level: 57,
    stats: { health: 190, strength: 230, endurance: 50, initiative: 30, avoidance: 20, stabbingWeapons: 120 },
    equipment: { mainHand: { name: "Dual club", type: "blunt", damage: 50, weight: 10, durability: 500, reqSkill: 115 }, offHand: null },
    xpReward: 65, goldReward: [6, 13],
    description: "With two heads watching every angle, it is nearly impossible to flank this massive, club-wielding giant.",
    challengeMin: 51, challengeMax: 57,
    loot: [{ name: "Ettin skull", chance: "low" }, { name: "Double club", chance: "medium" }]
  },
  "ancient-wyvern": {
    name: "Ancient Wyvern", level: 59,
    stats: { health: 180, strength: 180, endurance: 60, initiative: 60, avoidance: 50, stabbingWeapons: 110 },
    equipment: { mainHand: { name: "Toxic bite", type: "stabbingWeapons", damage: 38, weight: 3, durability: 350, reqSkill: 105 }, offHand: null },
    xpReward: 65, goldReward: [7, 13],
    description: "A cousin to dragons, this winged nightmare fills the arena with toxic fumes and bone-crushing dives.",
    challengeMin: 53, challengeMax: 59,
    loot: [{ name: "Wyvern scale", chance: "medium" }, { name: "Toxic gland", chance: "high" }]
  },
  "astral-whale": {
    name: "Astral Whale (passive)", level: 61,
    stats: { health: 350, strength: 150, endurance: 65, initiative: 5, avoidance: 5, stabbingWeapons: 85 },
    equipment: { mainHand: { name: "Tail slam", type: "blunt", damage: 35, weight: 20, durability: 1000, reqSkill: 80 }, offHand: null },
    xpReward: 65, goldReward: [5, 11],
    description: "It drifts like a dream made of starlight; it is indifferent to you, but its hide is harder than mortal steel.",
    challengeMin: 55, challengeMax: 60, challengeMaxPrestige: 100,
    loot: [{ name: "Starlight fragment", chance: "low" }, { name: "Astral hide", chance: "medium" }]
  },
  "undead-gladiator-king": {
    name: "Undead Gladiator King", level: 63,
    stats: { health: 180, strength: 190, endurance: 55, initiative: 60, avoidance: 45, stabbingWeapons: 150 },
    equipment: { mainHand: { name: "Ghostly blade", type: "sword", damage: 42, weight: 4, durability: 999, reqSkill: 145 }, offHand: null },
    xpReward: 70, goldReward: [7, 12],
    description: "A champion from a forgotten era, fighting with a ghostly blade that ignores the physical laws of armor.",
    challengeMin: 57, challengeMax: 60, challengeMaxPrestige: 100,
    loot: [{ name: "Crown fragment", chance: "low" }, { name: "Phantom steel", chance: "medium" }]
  },
  "frost-giant": {
    name: "Frost Giant Exile", level: 65,
    stats: { health: 240, strength: 280, endurance: 55, initiative: 20, avoidance: 15, stabbingWeapons: 110 },
    equipment: { mainHand: { name: "Ice maul", type: "blunt", damage: 55, weight: 18, durability: 800, reqSkill: 105 }, offHand: null },
    xpReward: 70, goldReward: [7, 12],
    description: "Standing three men tall, he brings the freezing chill of the north into the heat of the arena sands.",
    challengeMin: 59, challengeMax: 60, challengeMaxPrestige: 100,
    loot: [{ name: "Frost heart", chance: "low" }, { name: "Ice shard", chance: "high" }]
  },
  "nine-headed-hydra": {
    name: "Nine-Headed Hydra", level: 67,
    stats: { health: 280, strength: 250, endurance: 65, initiative: 35, avoidance: 20, stabbingWeapons: 110 },
    equipment: { mainHand: { name: "Multi bite", type: "stabbingWeapons", damage: 40, weight: 5, durability: 600, reqSkill: 105 }, offHand: null },
    xpReward: 75, goldReward: [7, 12],
    description: "Every time you think you've gained the upper hand, another snapping jaw appears from the scales.",
    challengeMin: 60, challengeMax: 60, challengeMaxPrestige: 100,
    loot: [{ name: "Hydra head", chance: "medium" }, { name: "Regeneration gland", chance: "low" }]
  },
  "chimera-alpha": {
    name: "Chimera Alpha", level: 69,
    stats: { health: 200, strength: 210, endurance: 50, initiative: 80, avoidance: 70, stabbingWeapons: 130 },
    equipment: { mainHand: { name: "Lion bite", type: "stabbingWeapons", damage: 36, weight: 4, durability: 350, reqSkill: 125 }, offHand: null },
    xpReward: 75, goldReward: [7, 12],
    description: "A terrifying fusion of lion, goat, and serpent; it attacks with fire and venom with deadly agility.",
    challengeMin: 60, challengeMax: 60, challengeMaxPrestige: 100,
    loot: [{ name: "Chimera mane", chance: "medium" }, { name: "Triple essence", chance: "low" }]
  },
  "behemoth-juggernaut": {
    name: "Behemoth Juggernaut", level: 71,
    stats: { health: 320, strength: 330, endurance: 65, initiative: 10, avoidance: 5, stabbingWeapons: 110 },
    equipment: { mainHand: { name: "Crushing fist", type: "blunt", damage: 62, weight: 25, durability: 1200, reqSkill: 105 }, offHand: null },
    xpReward: 90, goldReward: [8, 12],
    description: "A creature of such scale that the ground trembles; regular armor is useless against its crushing weight.",
    challengeMin: 60, challengeMax: 60, challengeMaxPrestige: 100,
    loot: [{ name: "Behemoth bone", chance: "medium" }, { name: "Titan heart", chance: "low" }]
  },
  "arch-demon-overlord": {
    name: "Arch-Demon Overlord", level: 73,
    stats: { health: 250, strength: 280, endurance: 70, initiative: 65, avoidance: 55, stabbingWeapons: 140 },
    equipment: { mainHand: { name: "Soul reaper", type: "sword", damage: 52, weight: 6, durability: 999, reqSkill: 135 }, offHand: null },
    xpReward: 90, goldReward: [8, 12],
    description: "Bound by ancient chains, he seeks to trade his freedom for your soul; the ultimate test of a gladiator.",
    challengeMin: 60, challengeMax: 60, challengeMaxPrestige: 100,
    loot: [{ name: "Demon horn", chance: "low" }, { name: "Soul shard", chance: "medium" }]
  },
  "void-eater-colossus": {
    name: "Void-Eater Colossus", level: 75,
    stats: { health: 300, strength: 320, endurance: 70, initiative: 30, avoidance: 0, stabbingWeapons: 100 },
    equipment: { mainHand: { name: "Abyss crush", type: "blunt", damage: 58, weight: 30, durability: 999, reqSkill: 95 }, offHand: null },
    xpReward: 100, goldReward: [10, 15],
    description: "A titan composed of compressed stars and eternal silence; he does not flinch, he does not dodge. To face him is to fight the inevitable end of all things, for every strike he lands feels like the crushing weight of the abyss itself.",
    challengeMin: 60, challengeMax: 60, challengeMaxPrestige: 100,
    loot: [{ name: "Void shard", chance: "low" }, { name: "Compressed star fragment", chance: "low" }]
  }
};

// Combat flavor text: pick randomly and replace {A_NAME}, {D_NAME}, {W_NAME}, etc.
var COMBAT_FLAVOR = {
  roundOpeners: [
    "{A_NAME} seizes the moment and forces {D_NAME} onto the defensive.",
    "With a surge of adrenaline, {A_NAME} takes control of the engagement.",
    "{A_NAME} reacts with blinding speed, leaving {D_NAME} struggling to keep up.",
    "The crowd roars as {A_NAME} dictates the pace of this exchange.",
    "{A_NAME} finds a gap in the rhythm and strikes first.",
    "With cold calculation, {A_NAME} initiates a carefully timed assault.",
    "{A_NAME} displays superior focus, moving before {D_NAME} can even blink.",
    "The air crackles with tension as {A_NAME} launches a sudden offensive.",
    "{A_NAME} refuses to give ground and presses the attack immediately.",
    "{A_NAME} senses an opening and moves to exploit it without hesitation."
  ],
  universalAttack: [
    "{A_NAME} focuses their energy and unleashes an attack toward {D_NAME}.",
    "With lethal intent, {A_NAME} directs a strike at {D_NAME}.",
    "{A_NAME} attempts to breach {D_NAME}'s guard with a powerful effort.",
    "A decisive movement follows as {A_NAME} targets {D_NAME}.",
    "{A_NAME} commits to a high-stakes maneuver against {D_NAME}.",
    "Using {W_NAME}, {A_NAME} delivers a calculated strike toward the opponent.",
    "{A_NAME} channels their resolve into a focused assault on {D_NAME}.",
    "The momentum shifts as {A_NAME} executes a dangerous offensive move.",
    "{A_NAME} looks for a vital spot and lets loose an attack.",
    "{A_NAME} puts the pressure on, aiming a heavy blow at {D_NAME}."
  ],
  offHandAttack: [
    "{A_NAME} sees another opportunity and immediately follows up!",
    "Not letting up for a second, {A_NAME} strikes again.",
    "{A_NAME} maintains the pressure with a swift secondary action.",
    "Taking advantage of the chaos, {A_NAME} manages an extra maneuver.",
    "{A_NAME} doubles down, refusing to let the offensive end.",
    "A second opening appears, and {A_NAME} is quick to take it.",
    "{A_NAME} flows seamlessly into another attack.",
    "{D_NAME} is caught off guard as {A_NAME} presses the advantage once more.",
    "With relentless aggression, {A_NAME} finds room for one more strike.",
    "{A_NAME} capitalizes on a stumble and lashes out again."
  ],
  rangedAttack: [
    "{A_NAME} takes a steady breath and lets fly with {W_NAME}.",
    "With a sharp snap, {A_NAME} sends a projectile whistling toward {D_NAME}.",
    "{A_NAME} gauges the distance and releases a shot with {W_NAME}.",
    "{A_NAME} tracks {D_NAME}'s movement before unleashing a ranged strike.",
    "A projectile streaks across the arena as {A_NAME} fires.",
    "{A_NAME} stays at a distance, expertly utilizing {W_NAME} to attack.",
    "With mechanical precision, {A_NAME} launches a deadly bolt at the target.",
    "{A_NAME} draws back and releases, aiming for {D_NAME}'s vitals.",
    "The sound of {W_NAME} echoing fills the air as {A_NAME} attacks.",
    "{A_NAME} lofts a projectile high, hoping to catch {D_NAME} from afar."
  ],
  misses: [
    "{A_NAME} miscalculates the timing and the attack sails wide.",
    "{D_NAME} shifts at the last second, causing {A_NAME} to miss completely.",
    "The effort is wasted as {A_NAME} fails to find the mark.",
    "{A_NAME}'s concentration wavers, resulting in a clumsy attempt.",
    "A momentary distraction causes {A_NAME}'s attack to go astray.",
    "{A_NAME} overextends and loses the rhythm of the strike.",
    "The attack lacks the necessary precision and harmlessly misses {D_NAME}.",
    "{A_NAME} fumbles the execution, leaving the opponent untouched.",
    "{A_NAME}'s attempt is mistimed, hitting nothing but empty air.",
    "Luck is not on {A_NAME}'s side as the assault falls short."
  ],
  victoryLoss: [
    "{WINNER_NAME} raises a weapon in triumph while {LOSER_NAME} staggers away, nursing both bruised ribs and a bruised ego.",
    "The crowd erupts as {WINNER_NAME} stands tall; meanwhile, {LOSER_NAME} looks toward the dirt in silent contemplation of the defeat.",
    "{WINNER_NAME} offers a mocking bow to the stands, leaving {LOSER_NAME} to limp out of the arena under a hail of boos.",
    "Exhausted but victorious, {WINNER_NAME} wipes the sweat from their brow as {LOSER_NAME} storms off, fueled by a new-found grudge.",
    "{WINNER_NAME} accepts the referee's nod with a smirk, while {LOSER_NAME} collapses momentarily, reeling from the intensity of the duel.",
    "A display of dominance ends with {WINNER_NAME} looking completely unfazed, leaving a frustrated {LOSER_NAME} to curse under their breath.",
    "{WINNER_NAME} points a finger at the sky in gratitude, whereas {LOSER_NAME} simply turns and disappears into the shadows of the tunnel.",
    "With a final surge of pride, {WINNER_NAME} celebrates the win as {LOSER_NAME} begrudgingly acknowledges the superior skill shown today.",
    "{WINNER_NAME} basks in the glory of the arena, while {LOSER_NAME} is seen shaking their head in disbelief at the sudden turn of events.",
    "{WINNER_NAME} lets out a victory cry that echoes through the halls, leaving {LOSER_NAME} to crawl toward the exit in total exhaustion."
  ],
  kia: [
    "{LOSER_NAME} collapses to the arena floor, breathing their last after sustaining life-threatening injuries. Rest in peace! {WINNER_NAME} immediately kneels over the body, greedily pocketing the silver coins found in the deceased's belt pouch.",
    "The light fades from {LOSER_NAME}'s eyes as the final blow proves fatal. A somber silence falls over the crowd, but {WINNER_NAME} shows no remorse, quickly stripping the corpse of any loose valuables before the guards arrive.",
    "{LOSER_NAME} falls motionless, claimed by the cold embrace of death. While the healers turn away in mourning, {WINNER_NAME} seizes the opportunity to scavenge through {LOSER_NAME}'s belongings, claiming a handful of silver as a grim trophy."
  ],
  hospitalized: [
    "{LOSER_NAME} is carried away on a stretcher, bound for the infirmary after suffering severe, bone-breaking injuries during the fray.",
    "The battle is over for {LOSER_NAME}, who is rushed to the healers' quarters to be treated for deep wounds and exhaustion.",
    "{LOSER_NAME} will be spending the coming days in the hospital, recovering from the brutal punishment endured in this match."
  ],
  dodgeSuccess: [
    "{D_NAME} nimbly dodges the attack.",
    "{D_NAME} sidesteps at the last moment, and the blow finds only air.",
    "{D_NAME} slips aside; the strike misses cleanly."
  ],
  dodgeFail: [
    "{D_NAME} attempts to dodge but fails.",
    "{D_NAME} tries to evade but is too slow.",
    "{D_NAME} cannot get out of the way in time."
  ],
  block: [
    "{D_NAME} blocks with {SHIELD_NAME}, absorbing {ABSORBED} damage ({PARRY_LEFT} durability left).",
    "{D_NAME} catches the blow on {SHIELD_NAME}, absorbing {ABSORBED} damage ({PARRY_LEFT} durability left)."
  ],
  parry: [
    "{D_NAME} parries with {W_NAME}, absorbing {ABSORBED} damage ({PARRY_LEFT} durability left).",
    "{D_NAME} turns the strike aside with {W_NAME}, absorbing {ABSORBED} damage ({PARRY_LEFT} durability left)."
  ],
  fistParryFail: [
    "{D_NAME} throws up a bare fist to parry—useless; the blow lands clean.",
    "{D_NAME} tries to slap the attack aside bare-handed and fails completely."
  ],
  parryFail: [
    "{D_NAME} fails to parry in time; the strike gets through.",
    "{D_NAME}'s parry is late—the blow connects."
  ],
  blockFail: [
    "{D_NAME} fails to bring the shield up in time; the strike gets through.",
    "{D_NAME}'s block is late—the blow finds a gap."
  ],
  exhausted: [
    "{D_NAME} failed to dodge, and is too exhausted to lift {SHIELD_OR_WEAPON_NAME} in time.",
    "{D_NAME} cannot raise their guard in time; exhaustion betrays them."
  ],
  hitBody: [
    "{A_NAME} hits {D_NAME} on the {BODY_PART}, dealing {SEVERITY} damage ({AMOUNT}).",
    "{A_NAME} strikes {D_NAME} on the {BODY_PART}, dealing {SEVERITY} damage ({AMOUNT})."
  ],
  equipmentBroken: [
    "{D_NAME} throws {ITEM_NAME} in the sands and continues the fight without it.",
    "{ITEM_NAME} has taken so much damage that {D_NAME} can no longer use it. {D_NAME} casts it aside and fights on."
  ]
};

// Body-part hit distribution (used only for flavor text for now).
// The damage tier/severity is NOT affected by body part selection.
var BODY_PARTS = [
  { part: "head", weight: 15 },
  { part: "shoulders", weight: 15 },
  { part: "torso", weight: 25 },
  { part: "legs", weight: 25 },
  { part: "feet", weight: 10 },
  { part: "hands", weight: 10 }
];

function pickBodyPart() {
  var total = 0;
  for (var i = 0; i < BODY_PARTS.length; i++) total += BODY_PARTS[i].weight || 0;
  var r = Math.random() * total;
  for (var j = 0; j < BODY_PARTS.length; j++) {
    r -= (BODY_PARTS[j].weight || 0);
    if (r <= 0) return BODY_PARTS[j].part;
  }
  return BODY_PARTS[BODY_PARTS.length - 1].part;
}
function getSeverity(dmg, maxHp) {
  var hp = (typeof maxHp === "number" && maxHp > 0) ? maxHp : 1;
  var frac = dmg / hp;
  // Your tier scheme:
  // Very light: < 5%
  // Light: 5–9%
  // Moderate: 10–19%
  // Heavy: 20–34%
  // Crushing: 35–49%
  // Shattering: 50–74%
  // Catastrophic: 75–99%
  // Fatal: above 100%
  if (frac > 1) return "fatal";
  if (frac >= 0.75) return "catastrophic";
  if (frac >= 0.50) return "shattering";
  if (frac >= 0.35) return "crushing";
  if (frac >= 0.20) return "heavy";
  if (frac >= 0.10) return "moderate";
  if (frac >= 0.05) return "light";
  return "very light";
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function subst(template, obj) {
  return template.replace(/\{(\w+)\}/g, function(_, k) { return obj[k] != null ? String(obj[k]) : "{" + k + "}"; });
}

function getNpcChallengeRangeText(beast) {
  var min = beast.challengeMin || 1;
  var max = beast.challengeMax || 60;
  var prestige = beast.challengeMaxPrestige;
  if (prestige != null && prestige > 0) return "Level " + min + "-" + max + " or " + MAX_LEVEL + "+1 to " + MAX_LEVEL + "+" + prestige;
  return "Level " + min + "-" + max;
}

function canFightNpc(beastKey) {
  var beast = BEAST_DATABASE[beastKey];
  if (!beast) return false;
  var pl = player.level;
  var min = beast.challengeMin || 1;
  var max = beast.challengeMax || 60;
  var prestige = beast.challengeMaxPrestige;
  if (pl <= MAX_LEVEL) return pl >= min && pl <= max;
  var pRest = pl - MAX_LEVEL;
  return max >= MAX_LEVEL && prestige != null && pRest >= 1 && pRest <= prestige;
}

function isNpcAbovePlayerLevel(beastKey) {
  var beast = BEAST_DATABASE[beastKey];
  if (!beast) return false;
  var pl = player.level;
  var min = beast.challengeMin || 1;
  if (pl <= MAX_LEVEL) return pl < min;
  return beast.challengeMax < MAX_LEVEL || beast.challengeMaxPrestige == null;
}

function isNpcBelowPlayerLevel(beastKey) {
  var beast = BEAST_DATABASE[beastKey];
  if (!beast) return false;
  var pl = player.level;
  var max = beast.challengeMax || 60;
  var prestige = beast.challengeMaxPrestige;
  if (pl <= MAX_LEVEL) return pl > max;
  return prestige != null && (pl - MAX_LEVEL) > prestige;
}

const ABILITY_STRUCTURE = {
  "Physique": ["health", "strength", "endurance"],
  "Agility": ["initiative", "avoidance"],
  "Luck": ["luck"],
  "Intelligence": ["learning", "discipline", "leadership", "provocation"],
  "Weapon Skills": ["sword", "blunt", "axe", "ranged", "flail", "stabbingWeapons", "shield"]
};

// Stats affected by condition in combat only (all except health). Not used for display or equip requirements.
var CONDITION_AFFECTED_STATS = ["strength", "endurance", "initiative", "avoidance", "luck",
  "learning", "discipline", "leadership", "provocation",
  "sword", "blunt", "axe", "ranged", "flail", "stabbingWeapons", "shield", "unarmed"];

// Combat copy of skills: player.skills already includes racial + gender multipliers from creation/level-up;
// non-health stats are then scaled by current condition (see CONDITION_AFFECTED_STATS).
function getPlayerCombatStats() {
  if (playerCreated && player.skills && player.skills.unarmed == null)
    player.skills.unarmed = HIDDEN_UNARMED_SKILL;
  var c = (player.condition != null && player.condition !== undefined) ? player.condition : 100;
  var mult = Math.max(0, Math.min(100, c)) / 100;
  var out = {};
  for (var key in player.skills) {
    if (key === "health") out[key] = player.skills[key];
    else out[key] = (player.skills[key] || 0) * mult;
  }
  return out;
}

// Racial bonuses: multiplier per stat (e.g. +10% = 1.10, -15% = 0.85). "Light blades" = stabbingWeapons.
const RACIAL_BONUSES = {
  elf: {
    health: 0.85, strength: 0.90, endurance: 1.30, initiative: 1.20, avoidance: 1.50,
    luck: 1.10, learning: 1.30, discipline: 1.20, leadership: 1.10, provocation: 1.00,
    sword: 1.15, blunt: 1.05, axe: 1.10, ranged: 1.15, flail: 1.05, stabbingWeapons: 1.15, shield: 1.05,
    unarmed: 1.00
  },
  human: {
    health: 1.10, strength: 1.10, endurance: 1.10, initiative: 1.10, avoidance: 1.15,
    luck: 1.10, learning: 1.15, discipline: 1.10, leadership: 1.15, provocation: 1.10,
    sword: 1.10, blunt: 1.10, axe: 1.10, ranged: 1.10, flail: 1.10, stabbingWeapons: 1.10, shield: 1.15,
    unarmed: 1.00
  },
  orc: {
    health: 1.20, strength: 1.25, endurance: 1.00, initiative: 1.00, avoidance: 0.80,
    luck: 1.05, learning: 0.80, discipline: 1.10, leadership: 1.15, provocation: 1.25,
    sword: 1.10, blunt: 1.15, axe: 1.15, ranged: 1.00, flail: 1.15, stabbingWeapons: 1.00, shield: 1.05,
    unarmed: 1.00
  },
  troll: {
    health: 1.50, strength: 1.50, endurance: 0.75, initiative: 0.60, avoidance: 0.50,
    luck: 1.10, learning: 0.70, discipline: 1.00, leadership: 0.80, provocation: 1.20,
    sword: 0.75, blunt: 0.80, axe: 0.80, ranged: 0.60, flail: 0.80, stabbingWeapons: 0.70, shield: 0.70,
    unarmed: 1.00
  },
  undead: {
    health: 1.15, strength: 1.10, endurance: 1.70, initiative: 0.85, avoidance: 1.10,
    luck: 0.90, learning: 0.80, discipline: 1.15, leadership: 1.10, provocation: 1.10,
    sword: 1.05, blunt: 1.05, axe: 1.05, ranged: 1.05, flail: 1.05, stabbingWeapons: 1.05, shield: 1.10,
    unarmed: 1.00
  },
  dwarf: {
    health: 1.35, strength: 1.20, endurance: 0.80, initiative: 0.85, avoidance: 0.70,
    luck: 1.15, learning: 1.10, discipline: 1.15, leadership: 1.15, provocation: 1.15,
    sword: 1.05, blunt: 1.15, axe: 1.15, ranged: 1.00, flail: 1.10, stabbingWeapons: 1.05, shield: 1.15,
    unarmed: 1.00
  },
  kyshari: {
    health: 0.75, strength: 0.85, endurance: 1.40, initiative: 1.40, avoidance: 1.60,
    luck: 1.10, learning: 1.00, discipline: 0.90, leadership: 0.80, provocation: 1.00,
    sword: 1.10, blunt: 0.90, axe: 0.90, ranged: 1.00, flail: 1.00, stabbingWeapons: 1.15, shield: 1.05,
    unarmed: 1.00
  }
};

const RACE_LORE = {
  human: "Versatile and ambitious, humans adapt to any weapon and find luck where others find despair.",
  elf: "Swift as the wind and unnaturally agile, elves prefer finesse over brute force.",
  orc: "Born for the fray, orcs possess a savage strength and a presence that unnerves their foes.",
  troll: "Massive behemoths of raw power. What they lack in speed, they more than make up for in sheer durability.",
  undead: "Relentless and tireless, the undead do not feel fatigue like the living.",
  dwarf: "Stoic and sturdy, dwarfs are masters of the shield and possess immense natural health.",
  kyshari: "Ethereal and predatory, the Kyshari are the ultimate masters of evasion."
};

// Base body weight (WP) by race — affects total carry weight & player hit chance (heavier = harder to land hits unless offset by Strength).
var RACE_BASE_WEIGHT_WP = {
  elf: 0,
  kyshari: 3,
  human: 5,
  orc: 8,
  troll: 15,
  undead: 4,
  dwarf: 10
};

function getRaceBaseWeight(race) {
  var r = (race || "").toLowerCase();
  if (RACE_BASE_WEIGHT_WP[r] != null) return RACE_BASE_WEIGHT_WP[r];
  return 5;
}

// --- 2. NAVIGATION ---
function nextStep(step) {
  if (typeof step === 'number') {
    var nameInput = document.getElementById('input-name');
    var nameVal = nameInput ? nameInput.value.trim() : "";
    if (step === 2 && !isValidName(nameVal)) { return; }
    player.name = nameVal;
    var menuName = document.getElementById('menu-char-name');
    if (menuName) menuName.innerText = nameVal;

    document.getElementById('creation-step-1').style.display = 'none';
    document.getElementById('creation-step-2').style.display = 'none';
    document.getElementById('creation-step-3').style.display = 'none';
    
    var target = document.getElementById('creation-step-' + step);
    if (target) target.style.display = 'block';

    if (step === 3) {
      resetCreationDraftState();
      generateAbilityList('creation-ability-list', true, 'creation');
      updateCreationUI();
    }
  } else {
    showPage('hunt');
  }
}

function isValidName(name) {
  if (!name) return false;
  var trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 20) return false;
  // Allow A–Z, a–z, 0–9, spaces and hyphen. No other special characters.
  return /^[A-Za-z0-9\s-]+$/.test(trimmed);
}

function validateNameInput() {
  var nameInput = document.getElementById('input-name');
  var btn = document.getElementById('continue-btn');
  if (!nameInput || !btn) return;
  var value = nameInput.value || "";
  btn.disabled = !isValidName(value);
}

// --- 3. ABILITY LIST GENERATOR (CREATION + LEVEL-UP) ---
function getRaceGenderMultiplier(stat, race, gender) {
  var rB = RACIAL_BONUSES[race] || {};
  var mult = rB[stat] || 1.0;
  var isPhysique = (stat === "health" || stat === "strength" || stat === "endurance");
  var isAgility = (stat === "initiative" || stat === "avoidance");
  var isWeapon = WEAPON_SKILL_KEYS.indexOf(stat) !== -1;

  if (gender === "male" && isPhysique) mult *= 1.05;
  if (gender === "female" && (isAgility || isWeapon)) mult *= 1.05;
  return mult;
}

function generateAbilityList(targetId, editMode, mode) {
  mode = mode || 'creation'; // 'creation' or 'levelup'
  var container = document.getElementById(targetId);
  if (!container) return;
  container.innerHTML = "";

  for (var category in ABILITY_STRUCTURE) {
    var catDiv = document.createElement('div');
    catDiv.className = "ability-category";
    var isLocked = (category === "Intelligence" || category === "Luck");
    if (isLocked) catDiv.classList.add("locked-category");
    var raceEl = document.getElementById('select-race');
    var genderEl = document.getElementById('select-gender');
    var raceVal = raceEl ? raceEl.value : (player.race || "");
    var genderVal = genderEl ? genderEl.value : (player.gender || "");

    var headerHtml = category;
    if (genderVal === "male" && category === "Physique") {
      headerHtml += ' <span class="bonus-hint">(+5% gender bonus)</span>';
    }
    if (genderVal === "female" && (category === "Agility" || category === "Weapon Skills")) {
      headerHtml += ' <span class="bonus-hint">(+5% gender bonus)</span>';
    }
    catDiv.innerHTML = "<h3>" + headerHtml + "</h3>";

    ABILITY_STRUCTURE[category].forEach(function(stat) {
      var spent, base, displayTotal;

      if (mode === 'creation') {
        spent = tempStats[stat] || 0;
        base = 0;
        // Visar slutvärdet om spelaren är skapad
        displayTotal = playerCreated ? (player.skills[stat] || 0) : (base + spent);
      } else {
        // levelup mode: work from existing skills + pending allocations
        spent = pendingLevelupStats[stat] || 0;
        base = 0;
        var current = player.skills[stat] || 0;
        displayTotal = current + spent;
      }
      var displayTotalDisplay = Math.round(displayTotal);

      var displayName = stat.replace(/([A-Z])/g, ' $1').toLowerCase();
      var bonusText = "";
      if (raceVal) {
        var mult = (RACIAL_BONUSES[raceVal] && RACIAL_BONUSES[raceVal][stat]) || 1.0;
        var pct = Math.round((mult - 1) * 100);
        if (pct !== 0) {
          var sign = pct > 0 ? "+" : "";
          bonusText = ' <span class="bonus-hint">(' + sign + pct + '% racial bonus)</span>';
        }
      }
      var line = document.createElement('div');
      line.className = "stat-line";
      var isEditable = editMode && !isLocked;
      
      var html = '<div class="stat-name">' + displayName + bonusText + '</div><div class="stat-values-container">';
      if (!isLocked) {
        var modeArg = mode;
        html += '<div class="spent-control-group">' +
                (isEditable ? '<div class="stat-controls"><button onclick="changeStat(\'' + stat + '\', -1, \'' + modeArg + '\')">-</button></div>' : "") +
                '<input type="number" class="box-spent-input" value="' + spent + '" ' + 
                (isEditable ? '' : 'disabled') + 
                ' onchange="manualStatEntry(\'' + stat + '\', this.value, \'' + modeArg + '\')">' +
                (isEditable ? '<div class="stat-controls"><button onclick="changeStat(\'' + stat + '\', 1, \'' + modeArg + '\')">+</button></div>' : "") +
              '</div>';
      } else {
        html += '<div class="spent-control-group" style="width:30px;"></div>';
      }
      html += '<div class="box-total">' + displayTotalDisplay + '</div></div>';
      line.innerHTML = html;
      if (stat === "endurance") {
        var nameEl = line.querySelector(".stat-name");
        if (nameEl) {
          var roundsHint = document.createElement("div");
          roundsHint.className = "endurance-rounds-hint";
          roundsHint.textContent = "(" + getCombatRoundCapFromEndurance(displayTotalDisplay) + " rounds)";
          nameEl.appendChild(roundsHint);
        }
      }
      catDiv.appendChild(line);
    });
    container.appendChild(catDiv);
  }
}

// --- 4. STEP 2 LOGIC ---
function updateRacePreview() {
  const race = document.getElementById('select-race').value;
  const gender = document.getElementById('select-gender').value;
  const portraitBox = document.getElementById('portrait-selector');

  // Changing race or gender clears any previously chosen portrait
  // and re-evaluates whether Awaken Potential should be enabled.
  player.portrait = "";
  checkStep2Completion();

  if (race && gender && portraitBox) {
    portraitBox.innerHTML = "";
    // Din 90x90 inställning
    portraitBox.style.display = "grid";
    portraitBox.style.gridTemplateColumns = "repeat(3, 1fr)";
    portraitBox.style.gap = "10px";

    for (let i = 1; i <= 9; i++) {
    const img = document.createElement('img');
    
    // Formatera namnet: t.ex. "human" blir "Human"
    let rCap = race.charAt(0).toUpperCase() + race.slice(1);
    let gCap = gender.charAt(0).toUpperCase() + gender.slice(1);
    
    // DIN NYA OPTIMERADE LÄNK (.jpg och mappen Portraits)
    img.src = `https://raw.githubusercontent.com/BinoBRUCHHH/Combatant-profile-pics-jpg/main/Portraits/${rCap}_${gCap}_${i}.jpg`;
    
    img.style.width = "90px";
    img.style.height = "90px";
    img.style.objectFit = "cover";
    img.style.border = "3px solid #8b4513";
    img.style.cursor = "pointer";
    img.className = "portrait-option";

    // Felhantering: Om en bild saknas visar vi en snygg guld-ruta istället för ett rött kryss
    img.onerror = function() {
        this.src = `https://placehold.co/90x90/2b1d0e/gold?text=Saknas`;
    };

    img.onclick = function() {
        // Visuell feedback: Guldram på vald bild
        document.querySelectorAll('.portrait-option').forEach(el => {
            el.style.borderColor = "#8b4513";
        });
        this.style.borderColor = "gold";
        
        // Spara bilden till spelaren
        player.portrait = this.src;
        // Låt den centrala koll-funktionen avgöra om knappen ska aktiveras
        checkStep2Completion();
    };

    portraitBox.appendChild(img);
}
  }
}

function checkStep2Completion() {
  const race = document.getElementById('select-race').value;
  const gender = document.getElementById('select-gender').value;
  const btn = document.getElementById('awaken-btn');
  if (btn) {
    if (race !== "" && gender !== "" && player.portrait !== "") {
      btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer"; btn.style.filter = "grayscale(0%)";
    } else {
      btn.disabled = true; btn.style.opacity = "0.3"; btn.style.cursor = "not-allowed"; btn.style.filter = "grayscale(100%)";
    }
  }
}

// --- 5. STATS & UI (CREATION + LEVEL-UP) ---
function changeStat(stat, amt, mode) {
  mode = mode || 'creation';

  if (mode === 'creation') {
    if (amt < 0 && tempStats[stat] <= 0) return;
    if (amt > 0 && creationPoints <= 0) return;
    tempStats[stat] += amt;
    creationPoints -= amt;
    updateCreationUI();
    generateAbilityList('creation-ability-list', true, 'creation');
  } else if (mode === 'levelup') {
    // Level-up allocation uses unspentPoints and pendingLevelupStats
    var currentSpent = pendingLevelupStats[stat] || 0;
    if (amt < 0 && currentSpent <= 0) return;
    if (amt > 0 && player.unspentPoints <= 0) return;

    pendingLevelupStats[stat] = currentSpent + amt;
    player.unspentPoints -= amt;
    generateAbilityList('main-ability-list', true, 'levelup');
    updateLevelupUI();
  }
}

function updateCreationUI() {
  var counter = document.getElementById('spare-points');
  var btn = document.getElementById('start-game-btn');
  if (counter) counter.innerText = creationPoints;
  if (btn) btn.disabled = (creationPoints !== 0);
}

var WEAPON_SKILL_KEYS = ["sword", "blunt", "axe", "ranged", "flail", "stabbingWeapons", "shield", "unarmed"];
var HIDDEN_UNARMED_SKILL = 25;
var DEFAULT_COMBAT_DURABILITY_IF_MISSING = 12;
var FIST_STRENGTH_DAMAGE_SCALE = 0.023;

function finalizeCharacter() {
  var race = document.getElementById('select-race').value;
  var gender = document.getElementById('select-gender').value;
  player.race = race;
  player.gender = gender;

  player.level = 1;
  player.xp = 0;
  player.unspentPoints = 0;
  for (var pk0 in pendingLevelupStats) {
    if (Object.prototype.hasOwnProperty.call(pendingLevelupStats, pk0)) pendingLevelupStats[pk0] = 0;
  }

  for (var stat in tempStats) {
    var base = 0;
    var val = (base + tempStats[stat]);
    var mult = getRaceGenderMultiplier(stat, race, gender);
    player.skills[stat] = val * mult;
  }

  updateMaxHp();
  player.hp = player.maxHp * 0.90; 
  player.energy = (100 + (player.skills.discipline || 0)) * 0.90;
  player.condition = 95;
  player.coins = 100; // Start with 100 Coin immediately after character creation
  player.inventory = [];
  player.totalXpGained = 0;
  player.pvpTactic = "Normal";
  player.pvpSurrenderAt = 30;
  player.pvpTeamClashAt = 30;
  player.pveTactic = "Normal";
    player.pveSurrenderAt = 30;
    player.skills.unarmed = HIDDEN_UNARMED_SKILL;
    playerCreated = true;
  
  // 1. Tvinga UI:t att uppdateras DIREKT (bilden och namnet på infosidan)
    updateInfoPage();
    
    // 2. Byt sida till kartan eller välkomstskärmen direkt
    // Om din "karta" heter något annat i HTML, byt ut 'map' mot det ID:t
    showPage('info');

  document.querySelector('.creation-box').style.display = 'none';
  document.getElementById('welcome-back').style.display = 'block';
  document.getElementById('display-player-name').innerText = player.name;
  
  var menuImg = document.getElementById('menu-portrait');
  if (player.portrait && menuImg) {
    menuImg.src = player.portrait;
  }
  
  renderBeastList();
  refreshStatsUI();
  try { persistSnapshot(); } catch (e) {}
}

function updateMaxHp() {
  player.maxHp = 5 + (player.skills.health || 0);
}

function formatHospitalTimeLeft(ms) {
  if (ms <= 0) return "0 hours, 0 minutes and 0 seconds";
  var s = Math.floor(ms / 1000) % 60;
  var m = Math.floor(ms / 60000) % 60;
  var h = Math.floor(ms / 3600000);
  return h + " hours, " + m + " minutes and " + s + " seconds";
}

function updateHospitalUI() {
  if (!playerCreated) return;
  if (player.hospitalEndsAt && Date.now() >= player.hospitalEndsAt) {
    player.isHospitalized = false;
    player.hospitalEndsAt = 0;
  }
  var show = !!player.isHospitalized;
  var overlay = document.getElementById('hospital-overlay');
  if (overlay) overlay.style.display = show ? 'block' : 'none';
  var menuCount = document.getElementById('hospital-countdown');
  var infoCount = document.getElementById('info-hospital-countdown');
  var left = player.hospitalEndsAt ? Math.max(0, player.hospitalEndsAt - Date.now()) : 0;
  var text = "Hospitalized for " + formatHospitalTimeLeft(left);
  if (menuCount) { menuCount.style.display = show ? 'flex' : 'none'; menuCount.textContent = text; }
  if (infoCount) { infoCount.style.display = show ? 'flex' : 'none'; infoCount.textContent = text; }
}

function refreshStatsUI() {
  if (playerCreated) updateMaxHp();
  updateHospitalUI();
  var rightMenu = document.getElementById("right-menu");
  var hpText = rightMenu ? rightMenu.querySelector("#menu-hp-text") : document.getElementById("menu-hp-text");
  var hpBar = rightMenu ? rightMenu.querySelector("#hp-bar") : document.getElementById("hp-bar");
  var hpCurrentClamped = Math.max(0, Math.min(player.hp, player.maxHp || 0));
  var hpPercent = player.maxHp > 0 ? Math.round((hpCurrentClamped / player.maxHp) * 100) : 0;
  var hpCurrentDisplay = Math.round(player.hp);
  var hpMaxDisplay = Math.round(player.maxHp || 0);
  var hpPercentBar = player.maxHp > 0 ? (hpCurrentClamped / player.maxHp * 100) : 0;
  if (hpText) {
    hpText.textContent = hpCurrentDisplay + " / " + hpMaxDisplay + " (" + hpPercent + "%)";
  }
  if (hpBar) {
    hpBar.style.width = String(hpPercentBar) + "%";
  }
  var maxE = 100 + (player.skills.discipline || 0);
  var eb = document.getElementById('energy-bar'); var et = document.getElementById('energy-text');
  if (eb) eb.style.width = (player.energy / maxE * 100) + "%";
  if (et) et.innerText = Math.floor(player.energy) + " / " + maxE;
  var cb = document.getElementById('condition-bar'); var ct = document.getElementById('condition-text');
  if (cb) cb.style.width = (player.condition || 0) + "%";
  if (ct) ct.innerText = Math.floor(player.condition || 0) + "%";

  var coinsEl = document.getElementById('coins-val');
  if (coinsEl) coinsEl.textContent = Math.floor(player.coins || 0);

  // XP bar and text
  var xpBar = document.getElementById('xp-bar');
  var xpText = document.getElementById('menu-xp-text');
  if (xpBar) {
    var xpNeeded = xpNeededForLevel(player.level);
    var xpPercent = Math.min(100, (xpNeeded > 0 ? (player.xp / xpNeeded) * 100 : 0));
    xpBar.style.width = xpPercent + "%";
  }
  if (xpText) {
    var xpNeededText = xpNeededForLevel(player.level);
    xpText.innerText = Math.floor(player.xp) + " / " + xpNeededText;
  }

  // Update right-menu name line with race, gender, and level
  var menuName = document.getElementById('menu-char-name');
  if (menuName && playerCreated) {
    var rEl = document.getElementById('select-race');
    var gEl = document.getElementById('select-gender');
    var rVal = rEl ? rEl.value : "";
    var gVal = gEl ? gEl.value : "";
    var raceText = rVal ? rVal.charAt(0).toUpperCase() + rVal.slice(1) : "";
    var genderText = gVal ? gVal.charAt(0).toUpperCase() + gVal.slice(1) : "";
    menuName.innerText = player.name + (raceText || genderText ? " - " + raceText + " " + genderText : "") + " - " + formatLevel(player.level);
  }
}

function triggerGlow(elementId, color) {
  var el = document.getElementById(elementId);
  if (!el) return;
  el.style.boxShadow = `0 0 15px ${color}`; el.style.filter = "brightness(1.5)";
  setTimeout(() => { el.style.boxShadow = "none"; el.style.filter = "brightness(1)"; }, 800);
}

function startTickTimer() {
  setInterval(function() {
    if (!playerCreated) return;
    updateHospitalUI();
    currentTickTime--;
    var displaySec = currentTickTime < 10 ? "0" + currentTickTime : currentTickTime;
    var timerDisplay = document.getElementById('tick-timer');
    if (timerDisplay) timerDisplay.innerText = "00:" + displaySec;
    var timerBar = document.getElementById('timer-bar');
    if (timerBar) timerBar.style.width = (currentTickTime / tickInterval * 100) + "%";

    if (currentTickTime <= 0) {
      currentTickTime = tickInterval;
      if (!player.isHospitalized && !player.isDead) {
        var maxE = 100 + (player.skills.discipline || 0);
        player.energy = Math.min(maxE, player.energy + 8);
        triggerGlow('energy-bar', '#00e5ff');
        player.hp = Math.min(player.maxHp, player.hp + (player.maxHp * 0.34));
        triggerGlow('hp-bar', '#ff0000');
        player.condition = Math.min(100, (player.condition || 0) + 1);
        triggerGlow('condition-bar', '#ffea00');
      }
      refreshStatsUI();
      // 1. Lilla bilden i högermenyn
      const menuImg = document.getElementById('menu-portrait');
      if (menuImg && player.portrait) {
          menuImg.src = player.portrait;
      }

      // 2. Stora bilden på Infosidan
      const infoImg = document.getElementById('info-portrait');
      if (infoImg && player.portrait) {
          infoImg.src = player.portrait;
      }

      // 3. Texten under bilden (uppdateras via updateInfoPage)
      updateInfoPage();
      try { maybePersistSnapshotDebounced(); } catch (e) {}
    }
  }, 1000);
}

// --- 6. MENY LOGIK ---
function toggleMenu(id) {
  if (!playerCreated) return;
  var menu = document.getElementById(id); var overlay = document.getElementById('overlay');
  if (menu && menu.classList.contains('open')) { closeAllMenus(); } 
  else if (menu) { closeAllMenus(); menu.classList.add('open'); if (overlay) overlay.classList.add('active'); }
}
function closeAllMenus() {
  var menus = document.querySelectorAll('.side-menu');
  for (var i = 0; i < menus.length; i++) menus[i].classList.remove('open');
  var overlay = document.getElementById('overlay'); if (overlay) overlay.classList.remove('active');
}
function showPage(id) {
  var pages = document.querySelectorAll('.page');
  for (var i = 0; i < pages.length; i++) pages[i].style.display = 'none';
  var target = document.getElementById('page-' + id) || document.getElementById(id);
  if (target) target.style.display = 'block';
  if (id === 'inventory') renderInventoryPage();
  closeAllMenus();
  maybeShowDeathOverlay();
}
function checkAbilityAccess() {
  if (!playerCreated) {
    showPage('start');
    nextStep(3);
  } else {
    var editMode = hasPendingLevelupChanges() || player.unspentPoints > 0;
    generateAbilityList('main-ability-list', editMode, 'levelup');
    showPage('abilities');
    updateLevelupUI();
  }
}

// --- 7. COMBAT ENGINE ---
function ensureDailyHuntReset() {
  var today = new Date().toDateString();
  if (player.dailyHuntDate !== today) {
    player.dailyHuntCount = 0;
    player.dailyHuntDate = today;
  }
}

function npcDisplayName(b) {
  return (b.name || "").replace("(P)", "(passive)");
}

function renderBeastList() {
  var container = document.getElementById('beast-list');
  var dailyEl = document.getElementById('hunt-daily-counter');
  if (!container) return;
  ensureDailyHuntReset();
  var filter = document.getElementById('hunt-filter-checkbox');
  var showAlsoBelow = filter && filter.checked;
  var keys = Object.keys(BEAST_DATABASE).sort(function(a, b) {
    var minA = BEAST_DATABASE[a].challengeMin || 1;
    var minB = BEAST_DATABASE[b].challengeMin || 1;
    return minA - minB;
  });
  container.innerHTML = "";
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var b = BEAST_DATABASE[key];
    var belowLevel = isNpcBelowPlayerLevel(key);
    if (!showAlsoBelow && belowLevel) continue;
    var canFight = canFightNpc(key);
    var div = document.createElement('div');
    div.className = "beast-card" + (canFight ? "" : " too-low");
    div.onclick = function(k) { return function() { showNpcDetail(k); }; }(key);
    div.innerHTML = "<h3>" + npcDisplayName(b) + "</h3><p style='margin:0; font-size:0.85em;'>" + getNpcChallengeRangeText(b) + "</p>";
    container.appendChild(div);
  }
  if (dailyEl) dailyEl.textContent = "You have fought " + (player.dailyHuntCount || 0) + " / " + HUNT_DAILY_CAP + " Hunt & Scavenge encounters today.";
}

function showNpcDetail(beastKey) {
  var b = BEAST_DATABASE[beastKey];
  if (!b) return;
  currentNpcDetailKey = beastKey;
  var g = b.goldReward;
  var goldStr = Array.isArray(g) ? (g[0] + (g[0] !== g[1] ? "-" + g[1] : "")) : String(g);
  document.getElementById('npc-detail-name').textContent = npcDisplayName(b);
  var imgEl = document.getElementById('npc-detail-image');
  imgEl.className = "npc-detail-image";
  var imgUrl = getNpcImageUrl(beastKey);
  if (imgUrl) {
    imgEl.innerHTML = "<img src=\"" + imgUrl + "\" alt=\"" + (b.name || "") + "\">";
  } else {
    imgEl.innerHTML = "";
  }
  document.getElementById('npc-detail-description').textContent = b.description || "";
  document.getElementById('npc-detail-level').textContent = "Level " + b.level;
  document.getElementById('npc-detail-range').textContent = "To fight this enemy you need to be " + getNpcChallengeRangeText(b).toLowerCase() + ".";
  document.getElementById('npc-detail-reward').textContent = "Reward: " + b.xpReward + " XP + " + goldStr + " Coins";
  var lootEl = document.getElementById('npc-detail-loot');
  lootEl.innerHTML = "";
  if (b.loot && b.loot.length) {
    var lTitle = document.createElement('strong');
    lTitle.textContent = "Possible loot: ";
    lootEl.appendChild(lTitle);
    b.loot.forEach(function(item) {
      var span = document.createElement('div');
      span.textContent = " - " + item.name + " - " + item.chance + " chance";
      lootEl.appendChild(span);
    });
  }
  ensureDailyHuntReset();
  document.getElementById('npc-detail-daily').textContent = "You have fought " + (player.dailyHuntCount || 0) + " / " + HUNT_DAILY_CAP + " Hunt & Scavenge encounters today.";
  // Hook up tactic and surrender-at dropdowns to current PVE defaults
  var tacticSel = document.getElementById('npc-detail-tactic');
  if (tacticSel) {
    fillTacticSelect(tacticSel);
    tacticSel.value = player.pveTactic || "Normal";
  }
  var surrenderSel = document.getElementById('npc-detail-surrender');
  if (surrenderSel) {
    fillSurrenderSelect(surrenderSel, player.maxHp || 100);
    surrenderSel.value = String(player.pveSurrenderAt != null ? player.pveSurrenderAt : 30);
  }
  var fightBtn = document.getElementById('npc-detail-fight-btn');
  var canFight = canFightNpc(beastKey);
  var atCap = (player.dailyHuntCount || 0) >= HUNT_DAILY_CAP;
  var levelMsg = document.getElementById('npc-detail-level-msg');
  fightBtn.disabled = !canFight || atCap || (player.isHospitalized) || (player.isDead);
  fightBtn.style.display = "block";
  if (levelMsg) {
    if (!canFight && !atCap && !player.isHospitalized && !player.isDead) {
      levelMsg.style.display = "block";
      levelMsg.textContent = isNpcBelowPlayerLevel(beastKey) ? "Your level is too high!" : "Your level is too low!";
    } else {
      levelMsg.style.display = "none";
    }
  }
  showPage('npc-detail');
}

function startCombatFromDetail() {
  if (!currentNpcDetailKey) return;
  if (player.isHospitalized || player.isDead) return;
  ensureDailyHuntReset();
  if (player.dailyHuntCount >= HUNT_DAILY_CAP) { alert("Daily Hunt limit reached."); return; }
  if (!canFightNpc(currentNpcDetailKey)) { alert("You are not in the challenge range for this enemy."); return; }
  combatLogReturnPage = "npc-detail";
  player.dailyHuntCount = (player.dailyHuntCount || 0) + 1;
  // Use NPC-detail surrender-at if set, otherwise fall back to PVE default
  var surrenderSel = document.getElementById('npc-detail-surrender');
  var surrenderPct = player.pveSurrenderAt != null ? player.pveSurrenderAt : 30;
  if (surrenderSel && surrenderSel.value) {
    var parsed = parseInt(surrenderSel.value, 10);
    if (!isNaN(parsed)) surrenderPct = parsed;
  }
  var tacticUi = null;
  var tacticSelFight = document.getElementById('npc-detail-tactic');
  if (tacticSelFight && tacticSelFight.value) tacticUi = tacticSelFight.value;
  startCombat(currentNpcDetailKey, surrenderPct, tacticUi);
  showPage("combat-log");
}

function goBackFromCombatLog() {
  var page = combatLogReturnPage || "hunt";
  if (page === "npc-detail" && currentNpcDetailKey) {
    showNpcDetail(currentNpcDetailKey);
  } else if (page === "hunt") {
    showPage("hunt");
    renderBeastList();
  } else {
    showPage(page);
  }
}

function renderVendorList() {
  var container = document.getElementById("vendor-list");
  if (!container) return;
  container.innerHTML = "";
  var keys = Object.keys(VENDOR_DATABASE);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var v = VENDOR_DATABASE[key];
    var div = document.createElement("div");
    div.className = "vendor-card";
    div.onclick = (function(k) { return function() { showVendorDetail(k); }; })(key);
    var thumb = document.createElement("div");
    thumb.className = "vendor-thumb";
    var imgUrl = getVendorImageUrl(key, true);
    if (imgUrl) {
      var img = document.createElement("img");
      img.src = imgUrl;
      img.alt = v.name || "";
      thumb.appendChild(img);
    }
    var text = document.createElement("div");
    text.className = "vendor-card-text";
    text.innerHTML = "<h3>" + (v.name || "") + "</h3><p>" + (v.trade || "") + "</p>";
    div.appendChild(thumb);
    div.appendChild(text);
    container.appendChild(div);
  }
}

function showVendorDetail(vendorKey) {
  var v = VENDOR_DATABASE[vendorKey];
  if (!v) return;
  document.getElementById("vendor-detail-name").textContent = v.name || "";
  var imgEl = document.getElementById("vendor-detail-image");
  var imgUrl = getVendorImageUrl(vendorKey, false);
  if (imgUrl) {
    imgEl.innerHTML = "<img src=\"" + imgUrl + "\" alt=\"" + (v.name || "").replace(/"/g, "&quot;") + "\">";
    imgEl.style.background = "none";
  } else {
    imgEl.innerHTML = "";
    imgEl.style.background = "#666";
  }
  document.getElementById("vendor-detail-trade").textContent = "Trade: " + (v.trade || "");
  document.getElementById("vendor-detail-description").textContent = v.description || "";

  // Grizlow-only merchant UI
  var grizlowUi = document.getElementById("grizlow-merchant-ui");
  if (grizlowUi) grizlowUi.style.display = (vendorKey === "grizlow") ? "block" : "none";
  if (vendorKey === "grizlow") {
    setGrizlowMerchantMode("sale");
    showGrizlowCategory(""); // clear subcategory buttons
  }
  showPage("vendor-detail");
}

// --- Item database (for weapon popups) ---
// Weapon art: 380×300 / 38×30 frames; object-fit:contain. Seven ranged pieces use wider art — CSS uses
// white frame backgrounds so pillarboxing reads as neutral mat (see style: .weapon-detail-picture, .inventory-equip-thumb).
// Bundle of Jagged Shuriken, Cracked Shortbow, Hemp Sling, Improvised Blowpipe, Knotted Bullwhip,
// Rusted Hand-Crossbow, Warped Javelins.
var ITEM_DATABASE = {
  rustyShank: {
    name: "Rusty Shank",
    description: "A crude, battered stabbing weapon held together by grit and stubborn intent.",
    category: "weapons",
    subcategory: "Stabbing",
    typeLabel: "Stabbing Weapon - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 1,
    damageMax: 5,
    weight: 1,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "stabbingWeapons",
    costByVendor: { grizlow: 25 }, // Coin cost shown in popups (vendor-specific)
    criteria: {
      requiredStrength: 10,
      offhandStrengthRequired: 20,
      recommendedStabbingSkill: 15,
      blood: "Both",
      race: "All"
    },
    buffs: [
      { label: "+1 Stabbing Weapons" },
      { label: "+1 Avoidance" }
    ]
  },

  dulledShortsword: {
    name: "Dulled Shortsword",
    description: "A basic steel blade that has lost its bite from years of neglect. It gets the job done, but you will need some muscle behind it.",
    category: "weapons",
    subcategory: "Swords",
    typeLabel: "Sword - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 4,
    weight: 3,
    durabilityMax: 12,
    durabilityCurrent: 12,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "sword",
    costByVendor: { grizlow: 28 },
    criteria: { requiredStrength: 20, offhandStrengthRequired: 30, recommendedWeaponSkill: 30, blood: "Both", race: "All" },
    buffs: []
  },
  rustedGladius: {
    name: "Rusted Gladius",
    description: "A straight, double-edged blade covered in a thick layer of orange rust. It looks like it was pulled straight out of an old battlefield mud pit.",
    category: "weapons",
    subcategory: "Swords",
    typeLabel: "Sword - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 1,
    damageMax: 5,
    weight: 4,
    durabilityMax: 15,
    durabilityCurrent: 15,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "sword",
    costByVendor: { grizlow: 32 },
    criteria: { requiredStrength: 30, offhandStrengthRequired: 40, recommendedWeaponSkill: 35, blood: "Both", race: "All" },
    buffs: []
  },
  notchedFalchion: {
    name: "Notched Falchion",
    description: "A heavy-backed, single-edged sword with several visible chips along the edge. Great for hacking through light armor, despite its poor condition.",
    category: "weapons",
    subcategory: "Swords",
    typeLabel: "Sword - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 6,
    weight: 5,
    durabilityMax: 18,
    durabilityCurrent: 18,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "sword",
    costByVendor: { grizlow: 42 },
    criteria: { requiredStrength: 45, offhandStrengthRequired: 55, recommendedWeaponSkill: 40, blood: "Both", race: "All" },
    buffs: []
  },
  makeshiftMachete: {
    name: "Makeshift Machete",
    description: "A beaten strip of industrial sheet metal, roughly sharpened and wrapped in dirty leather strips for a grip. Crude but effective.",
    category: "weapons",
    subcategory: "Swords",
    typeLabel: "Sword - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 1,
    damageMax: 7,
    weight: 3,
    durabilityMax: 10,
    durabilityCurrent: 10,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "sword",
    costByVendor: { grizlow: 35 },
    criteria: { requiredStrength: 35, offhandStrengthRequired: 45, recommendedWeaponSkill: 50, blood: "Both", race: "All" },
    buffs: []
  },
  batteredArmingSword: {
    name: "Battered Arming Sword",
    description: "Once a proud weapon of a low-ranking foot soldier. It is scratched, slightly bent, and the crossguard rattles when you swing it.",
    category: "weapons",
    subcategory: "Swords",
    typeLabel: "Sword - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 4,
    damageMax: 7,
    weight: 5,
    durabilityMax: 22,
    durabilityCurrent: 22,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "sword",
    costByVendor: { grizlow: 58 },
    criteria: { requiredStrength: 50, offhandStrengthRequired: 60, recommendedWeaponSkill: 65, blood: "Both", race: "All" },
    buffs: []
  },
  scavengedCutlass: {
    name: "Scavenged Cutlass",
    description: "A short, curved blade with a solid hand guard. It smells faintly of salt and decay, likely looted from a shipwreck or a desperate pirate.",
    category: "weapons",
    subcategory: "Swords",
    typeLabel: "Sword - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 8,
    weight: 7,
    durabilityMax: 20,
    durabilityCurrent: 20,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "sword",
    costByVendor: { grizlow: 62 },
    criteria: { requiredStrength: 60, offhandStrengthRequired: 70, recommendedWeaponSkill: 50, blood: "Both", race: "All" },
    buffs: []
  },
  nickedGreatsword: {
    name: "Nicked Greatsword",
    description: "A massive blade that requires two hands to even lift properly. It features several deep notches along the blade, proving it has seen many desperate fights.",
    category: "weapons",
    subcategory: "Swords",
    typeLabel: "Sword - 2-handed",
    handedness: "2h",
    requiredLevel: 1,
    damageMin: 6,
    damageMax: 10,
    weight: 12,
    durabilityMax: 28,
    durabilityCurrent: 28,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "sword",
    costByVendor: { grizlow: 88 },
    criteria: { requiredStrength: 50, offhandStrengthRequired: 50, recommendedWeaponSkill: 50, blood: "Both", race: "All" },
    buffs: []
  },
  crudeZweihander: {
    name: "Crude Zweihänder",
    description: "An oversized, poorly balanced slab of iron welded to a long, cloth-wrapped handle. It relies much more on pure crushing weight than actual sharpness.",
    category: "weapons",
    subcategory: "Swords",
    typeLabel: "Sword - 2-handed",
    handedness: "2h",
    requiredLevel: 1,
    damageMin: 3,
    damageMax: 12,
    weight: 15,
    durabilityMax: 30,
    durabilityCurrent: 30,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "sword",
    costByVendor: { grizlow: 95 },
    criteria: { requiredStrength: 70, offhandStrengthRequired: 70, recommendedWeaponSkill: 40, blood: "Both", race: "All" },
    buffs: []
  },

  splinteredWoodenClub: {
    name: "Splintered Wooden Club",
    description: "A heavy tree branch stripped of its bark. It is rough on the hands and prone to leaving splinters, but it delivers a solid, satisfying thud.",
    category: "weapons",
    subcategory: "Blunt",
    typeLabel: "Blunt - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 1,
    damageMax: 4,
    weight: 4,
    durabilityMax: 10,
    durabilityCurrent: 10,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "blunt",
    costByVendor: { grizlow: 22 },
    criteria: { requiredStrength: 25, offhandStrengthRequired: 35, recommendedWeaponSkill: 20, blood: "Both", race: "All" },
    buffs: []
  },
  rustedFlangedMace: {
    name: "Rusted Flanged Mace",
    description: "The metal flanges are pitted and dull from oxidation. Despite the rust, the concentrated weight makes it excellent for denting armor.",
    category: "weapons",
    subcategory: "Blunt",
    typeLabel: "Blunt - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 6,
    weight: 6,
    durabilityMax: 18,
    durabilityCurrent: 18,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "blunt",
    costByVendor: { grizlow: 40 },
    criteria: { requiredStrength: 40, offhandStrengthRequired: 50, recommendedWeaponSkill: 30, blood: "Both", race: "All" },
    buffs: []
  },
  wornWorkHammer: {
    name: "Worn Work Hammer",
    description: "A heavy tool borrowed from a blacksmith or carpenter. It wasn't made for war, but its solid iron head makes no distinction between nails and skulls.",
    category: "weapons",
    subcategory: "Blunt",
    typeLabel: "Blunt - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 5,
    weight: 3,
    durabilityMax: 8,
    durabilityCurrent: 8,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "blunt",
    costByVendor: { grizlow: 30 },
    criteria: { requiredStrength: 30, offhandStrengthRequired: 40, recommendedWeaponSkill: 30, blood: "Both", race: "All" },
    buffs: []
  },
  nailedBranch: {
    name: "Nailed Branch",
    description: "A thick piece of wood with several large, rusty iron nails driven through the top. It looks absolutely vicious and inflicts painful, jagged wounds.",
    category: "weapons",
    subcategory: "Blunt",
    typeLabel: "Blunt - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 5,
    weight: 5,
    durabilityMax: 13,
    durabilityCurrent: 13,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "blunt",
    costByVendor: { grizlow: 36 },
    criteria: { requiredStrength: 35, offhandStrengthRequired: 45, recommendedWeaponSkill: 35, blood: "Both", race: "All" },
    buffs: []
  },
  ironShodCudgel: {
    name: "Iron-Shod Cudgel",
    description: "A sturdy wooden baton reinforced with crude iron bands around the hitting end. It offers a decent balance between durability and swinging speed.",
    category: "weapons",
    subcategory: "Blunt",
    typeLabel: "Blunt - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 4,
    damageMax: 6,
    weight: 4,
    durabilityMax: 15,
    durabilityCurrent: 15,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "blunt",
    costByVendor: { grizlow: 44 },
    criteria: { requiredStrength: 30, offhandStrengthRequired: 40, recommendedWeaponSkill: 50, blood: "Both", race: "All" },
    buffs: []
  },
  scavengedFemur: {
    name: "Scavenged Femur",
    description: "A large, sun-bleached leg bone from some unfortunate beast. It is surprisingly heavy, unnervingly sturdy, and carries a primitive intimidation factor.",
    category: "weapons",
    subcategory: "Blunt",
    typeLabel: "Blunt - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 3,
    damageMax: 8,
    weight: 7,
    durabilityMax: 15,
    durabilityCurrent: 15,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "blunt",
    costByVendor: { grizlow: 52 },
    criteria: { requiredStrength: 55, offhandStrengthRequired: 65, recommendedWeaponSkill: 40, blood: "Both", race: "All" },
    buffs: []
  },
  knottedGreatclub: {
    name: "Knotted Greatclub",
    description: "A massive, two-handed log featuring thick, natural wooden knots. Swinging it requires immense effort, but the sheer impact can easily shatter bones.",
    category: "weapons",
    subcategory: "Blunt",
    typeLabel: "Blunt - 2-handed",
    handedness: "2h",
    requiredLevel: 1,
    damageMin: 5,
    damageMax: 11,
    weight: 14,
    durabilityMax: 24,
    durabilityCurrent: 24,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "blunt",
    costByVendor: { grizlow: 82 },
    criteria: { requiredStrength: 60, offhandStrengthRequired: 60, recommendedWeaponSkill: 30, blood: "Both", race: "All" },
    buffs: []
  },
  rustySledgehammer: {
    name: "Rusty Sledgehammer",
    description: "A heavy, long-handled tool originally used for demolition. The head is covered in a thick layer of rust, making it incredibly heavy and awkward, but unstoppable once in motion.",
    category: "weapons",
    subcategory: "Blunt",
    typeLabel: "Blunt - 2-handed",
    handedness: "2h",
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 14,
    weight: 17,
    durabilityMax: 28,
    durabilityCurrent: 28,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "blunt",
    costByVendor: { grizlow: 98 },
    criteria: { requiredStrength: 80, offhandStrengthRequired: 80, recommendedWeaponSkill: 50, blood: "Both", race: "All" },
    buffs: []
  },

  dullHatchet: {
    name: "Dull Hatchet",
    description: "A small tool meant for chopping firewood. The edge is blunt and rounded from hitting too many knots and stones, requiring a lot of force to cut.",
    category: "weapons",
    subcategory: "Axes",
    typeLabel: "Axe - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 4,
    weight: 5,
    durabilityMax: 12,
    durabilityCurrent: 12,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "axe",
    costByVendor: { grizlow: 26 },
    criteria: { requiredStrength: 20, offhandStrengthRequired: 30, recommendedWeaponSkill: 30, blood: "Both", race: "All" },
    buffs: []
  },
  rustyHandaxe: {
    name: "Rusty Handaxe",
    description: "A simple steel handaxe covered in deep pitting and orange rust. It is poorly balanced, but the heavy head still delivers a punishing blow.",
    category: "weapons",
    subcategory: "Axes",
    typeLabel: "Axe - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 1,
    damageMax: 5,
    weight: 4,
    durabilityMax: 13,
    durabilityCurrent: 13,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "axe",
    costByVendor: { grizlow: 30 },
    criteria: { requiredStrength: 25, offhandStrengthRequired: 35, recommendedWeaponSkill: 35, blood: "Both", race: "All" },
    buffs: []
  },
  chippedTomahawk: {
    name: "Chipped Tomahawk",
    description: "A light, fast-swinging axe with a narrow blade. A large chip in the center of the edge makes it less effective than it once was.",
    category: "weapons",
    subcategory: "Axes",
    typeLabel: "Axe - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 1,
    damageMax: 7,
    weight: 4,
    durabilityMax: 13,
    durabilityCurrent: 13,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "axe",
    costByVendor: { grizlow: 38 },
    criteria: { requiredStrength: 40, offhandStrengthRequired: 50, recommendedWeaponSkill: 45, blood: "Both", race: "All" },
    buffs: []
  },
  weatheredCleaver: {
    name: "Weathered Cleaver",
    description: "A heavy kitchen cleaver with a stained blade and a loose wooden handle. It hacks through soft targets easily enough, despite its crude nature.",
    category: "weapons",
    subcategory: "Axes",
    typeLabel: "Axe - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 1,
    damageMax: 3,
    weight: 2,
    durabilityMax: 8,
    durabilityCurrent: 8,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "axe",
    costByVendor: { grizlow: 18 },
    criteria: { requiredStrength: 20, offhandStrengthRequired: 30, recommendedWeaponSkill: 15, blood: "Both", race: "All" },
    buffs: []
  },
  crudeScrapAxe: {
    name: "Crude Scrap Axe",
    description: "A jagged piece of sharp sheet metal bolted onto a sturdy wooden branch. It looks incredibly unstable, but it is surprisingly sharp.",
    category: "weapons",
    subcategory: "Axes",
    typeLabel: "Axe - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 3,
    damageMax: 6,
    weight: 5,
    durabilityMax: 12,
    durabilityCurrent: 12,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "axe",
    costByVendor: { grizlow: 48 },
    criteria: { requiredStrength: 50, offhandStrengthRequired: 60, recommendedWeaponSkill: 40, blood: "Both", race: "All" },
    buffs: []
  },
  pittedBeardAxe: {
    name: "Pitted Beard Axe",
    description: "An old fighting axe with a hooked lower blade. The steel is dark and pitted with age, though the design still allows for hooking shields or limbs.",
    category: "weapons",
    subcategory: "Axes",
    typeLabel: "Axe - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 8,
    weight: 6,
    durabilityMax: 18,
    durabilityCurrent: 18,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "axe",
    costByVendor: { grizlow: 68 },
    criteria: { requiredStrength: 70, offhandStrengthRequired: 80, recommendedWeaponSkill: 55, blood: "Both", race: "All" },
    buffs: []
  },
  longHandledWoodaxe: {
    name: "Long-Handled Woodaxe",
    description: "A heavy felling axe with a long, worn wooden shaft that is slick with sweat and age. It requires wide, slow swings but delivers massive force.",
    category: "weapons",
    subcategory: "Axes",
    typeLabel: "Axe - 2-handed",
    handedness: "2h",
    requiredLevel: 1,
    damageMin: 5,
    damageMax: 10,
    weight: 13,
    durabilityMax: 22,
    durabilityCurrent: 22,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "axe",
    costByVendor: { grizlow: 78 },
    criteria: { requiredStrength: 50, offhandStrengthRequired: 50, recommendedWeaponSkill: 45, blood: "Both", race: "All" },
    buffs: []
  },
  batteredGreataxe: {
    name: "Battered Greataxe",
    description: "A large, double-bitted axe head on a thick pole. One of the blades is cracked and the other is dull, making it a heavy, intimidating brute of a weapon.",
    category: "weapons",
    subcategory: "Axes",
    typeLabel: "Axe - 2-handed",
    handedness: "2h",
    requiredLevel: 1,
    damageMin: 4,
    damageMax: 12,
    weight: 16,
    durabilityMax: 27,
    durabilityCurrent: 27,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "axe",
    costByVendor: { grizlow: 92 },
    criteria: { requiredStrength: 75, offhandStrengthRequired: 75, recommendedWeaponSkill: 50, blood: "Both", race: "All" },
    buffs: []
  },

  bentShortspear: {
    name: "Bent Shortspear",
    description: "A short wooden spear with a metal head that is noticeably crooked. It makes aiming a bit unpredictable, but it effectively extends your reach.",
    category: "weapons",
    subcategory: "Stabbing",
    typeLabel: "Stabbing Weapon - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 5,
    weight: 4,
    durabilityMax: 12,
    durabilityCurrent: 12,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "stabbingWeapons",
    costByVendor: { grizlow: 34 },
    criteria: { requiredStrength: 25, offhandStrengthRequired: 35, recommendedStabbingSkill: 50, blood: "Both", race: "All" },
    buffs: []
  },
  rustyShiv: {
    name: "Rusty Shiv",
    description: "A crude blade fashioned from a sharpened scrap of metal, wrapped in dirty cloth. It is small enough to hide, though it looks ready to snap.",
    category: "weapons",
    subcategory: "Stabbing",
    typeLabel: "Stabbing Weapon - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 1,
    damageMax: 2,
    weight: 1,
    durabilityMax: 8,
    durabilityCurrent: 8,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "stabbingWeapons",
    costByVendor: { grizlow: 14 },
    criteria: { requiredStrength: 10, offhandStrengthRequired: 20, recommendedStabbingSkill: 25, blood: "Both", race: "All" },
    buffs: []
  },
  chippedDirk: {
    name: "Chipped Dirk",
    description: "A traditional straight-bladed dagger. The point is intact, but the edges are badly chipped from poor maintenance and abuse.",
    category: "weapons",
    subcategory: "Stabbing",
    typeLabel: "Stabbing Weapon - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 3,
    weight: 1,
    durabilityMax: 10,
    durabilityCurrent: 10,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "stabbingWeapons",
    costByVendor: { grizlow: 22 },
    criteria: { requiredStrength: 20, offhandStrengthRequired: 30, recommendedStabbingSkill: 50, blood: "Both", race: "All" },
    buffs: []
  },
  crudeIronSpike: {
    name: "Crude Iron Spike",
    description: "A heavy, square-headed spike originally meant for construction. It has no edge at all, but the thick point will punch through soft targets easily.",
    category: "weapons",
    subcategory: "Stabbing",
    typeLabel: "Stabbing Weapon - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 5,
    weight: 4,
    durabilityMax: 18,
    durabilityCurrent: 18,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "stabbingWeapons",
    costByVendor: { grizlow: 32 },
    criteria: { requiredStrength: 30, offhandStrengthRequired: 40, recommendedStabbingSkill: 50, blood: "Both", race: "All" },
    buffs: []
  },
  improvisedHarpoon: {
    name: "Improvised Harpoon",
    description: "A short pole tipped with a rusted, jagged iron head. It is awkward to wield as a standard weapon, but the tip is incredibly wicked.",
    category: "weapons",
    subcategory: "Stabbing",
    typeLabel: "Stabbing Weapon - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 1,
    damageMax: 6,
    weight: 4,
    durabilityMax: 15,
    durabilityCurrent: 15,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "stabbingWeapons",
    costByVendor: { grizlow: 38 },
    criteria: { requiredStrength: 40, offhandStrengthRequired: 50, recommendedStabbingSkill: 45, blood: "Both", race: "All" },
    buffs: []
  },
  charredStake: {
    name: "Charred Stake",
    description: "A thick wooden branch sharpened to a jagged point. The tip has been blackened in a fire to harden the wood, making it a viable, if primitive, thrusting tool.",
    category: "weapons",
    subcategory: "Stabbing",
    typeLabel: "Stabbing Weapon - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 3,
    damageMax: 4,
    weight: 3,
    durabilityMax: 12,
    durabilityCurrent: 12,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "stabbingWeapons",
    costByVendor: { grizlow: 28 },
    criteria: { requiredStrength: 35, offhandStrengthRequired: 45, recommendedStabbingSkill: 40, blood: "Both", race: "All" },
    buffs: []
  },
  rustedBoarSpear: {
    name: "Rusted Boar Spear",
    description: "A stout hunting spear with cross-guards to prevent prey from sliding down the shaft. The broad head is heavily pitted with rust.",
    category: "weapons",
    subcategory: "Stabbing",
    typeLabel: "Stabbing Weapon - 2-handed",
    handedness: "2h",
    requiredLevel: 1,
    damageMin: 3,
    damageMax: 9,
    weight: 7,
    durabilityMax: 20,
    durabilityCurrent: 20,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "stabbingWeapons",
    costByVendor: { grizlow: 72 },
    criteria: { requiredStrength: 50, offhandStrengthRequired: 50, recommendedStabbingSkill: 65, blood: "Both", race: "All" },
    buffs: []
  },
  fireHardenedPike: {
    name: "Fire-Hardened Pike",
    description: "A very long, heavy wooden pole with a point sharpened and hardened over a fire. It is unwieldy in close quarters but keeps enemies at a safe distance.",
    category: "weapons",
    subcategory: "Stabbing",
    typeLabel: "Stabbing Weapon - 2-handed",
    handedness: "2h",
    requiredLevel: 1,
    damageMin: 4,
    damageMax: 7,
    weight: 5,
    durabilityMax: 16,
    durabilityCurrent: 16,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "stabbingWeapons",
    costByVendor: { grizlow: 58 },
    criteria: { requiredStrength: 45, offhandStrengthRequired: 45, recommendedStabbingSkill: 55, blood: "Both", race: "All" },
    buffs: []
  },

  wornThreshingFlail: {
    name: "Worn Threshing Flail",
    description: "A simple farmer's tool adapted for war. It consists of two pieces of weathered wood joined by a frayed hemp rope.",
    category: "weapons",
    subcategory: "Flail",
    typeLabel: "Flail - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 5,
    weight: 4,
    durabilityMax: 14,
    durabilityCurrent: 14,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "flail",
    costByVendor: { grizlow: 32 },
    criteria: { requiredStrength: 25, offhandStrengthRequired: 35, recommendedWeaponSkill: 35, blood: "Both", race: "All" },
    buffs: []
  },
  ropeAndHorseshoe: {
    name: "Rope and Horseshoe",
    description: "A thick, frayed rope tied tightly to a heavy, rusted horseshoe. It is crude, but the swinging momentum carries a surprising punch.",
    category: "weapons",
    subcategory: "Flail",
    typeLabel: "Flail - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 1,
    damageMax: 6,
    weight: 2,
    durabilityMax: 7,
    durabilityCurrent: 7,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "flail",
    costByVendor: { grizlow: 24 },
    criteria: { requiredStrength: 25, offhandStrengthRequired: 35, recommendedWeaponSkill: 40, blood: "Both", race: "All" },
    buffs: []
  },
  pittedBallAndChain: {
    name: "Pitted Ball and Chain",
    description: "A classic small flail where the iron ball is heavily oxidized and the chain links look thin and ready to snap under pressure.",
    category: "weapons",
    subcategory: "Flail",
    typeLabel: "Flail - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 3,
    damageMax: 9,
    weight: 8,
    durabilityMax: 18,
    durabilityCurrent: 18,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "flail",
    costByVendor: { grizlow: 58 },
    criteria: { requiredStrength: 55, offhandStrengthRequired: 65, recommendedWeaponSkill: 50, blood: "Both", race: "All" },
    buffs: []
  },
  knottedBullwhip: {
    name: "Knotted Bullwhip",
    description: "A long, heavy whip made of braided cowhide that is cracked and dry from age. Several frayed sections have been crudely reinforced with tight knots and leather twine.",
    category: "weapons",
    subcategory: "Flail",
    typeLabel: "Flail - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 10,
    weight: 3,
    durabilityMax: 12,
    durabilityCurrent: 12,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "flail",
    costByVendor: { grizlow: 62 },
    criteria: { requiredStrength: 60, offhandStrengthRequired: 70, recommendedWeaponSkill: 50, blood: "Both", race: "All" },
    buffs: []
  },
  nailedWoodFlail: {
    name: "Nailed Wood Flail",
    description: "A square block of wood with several rusted nails hammered into it, attached to a short handle by a couple of iron chain links.",
    category: "weapons",
    subcategory: "Flail",
    typeLabel: "Flail - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 3,
    damageMax: 6,
    weight: 6,
    durabilityMax: 15,
    durabilityCurrent: 15,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "flail",
    costByVendor: { grizlow: 40 },
    criteria: { requiredStrength: 40, offhandStrengthRequired: 50, recommendedWeaponSkill: 35, blood: "Both", race: "All" },
    buffs: []
  },
  frayedFishermansNet: {
    name: "Frayed Fisherman's Net",
    description: "A salt-crusted, tangled mess of hemp rope. It's seen better days and has a few gaping holes, but it's still sturdy enough to snare an opponent's limb or weapon.",
    category: "weapons",
    subcategory: "Flail",
    typeLabel: "Flail - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 1,
    damageMax: 1,
    weight: 1,
    durabilityMax: 12,
    durabilityCurrent: 12,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "flail",
    costByVendor: { grizlow: 16 },
    criteria: { requiredStrength: 10, offhandStrengthRequired: 20, recommendedWeaponSkill: 25, blood: "Both", race: "All" },
    buffs: []
  },
  weightedCoarseNet: {
    name: "Weighted Coarse Net",
    description: "A heavy, dark-colored net with small lead weights or smooth stones lashed to the edges. The extra weight makes it easier to throw over a blade, though the rope is stiff and prone to cracking.",
    category: "weapons",
    subcategory: "Flail",
    typeLabel: "Flail - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 1,
    damageMax: 2,
    weight: 4,
    durabilityMax: 22,
    durabilityCurrent: 22,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "flail",
    costByVendor: { grizlow: 42 },
    criteria: { requiredStrength: 35, offhandStrengthRequired: 45, recommendedWeaponSkill: 65, blood: "Both", race: "All" },
    buffs: []
  },
  lashedBoneFlail: {
    name: "Lashed Bone Flail",
    description: "A heavy animal knucklebone tied to a wooden handle with a length of dirty leather cord. It looks primitive and brutal.",
    category: "weapons",
    subcategory: "Flail",
    typeLabel: "Flail - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 4,
    damageMax: 12,
    weight: 9,
    durabilityMax: 14,
    durabilityCurrent: 14,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "flail",
    costByVendor: { grizlow: 78 },
    criteria: { requiredStrength: 70, offhandStrengthRequired: 80, recommendedWeaponSkill: 55, blood: "Both", race: "All" },
    buffs: []
  },
  heavyBarnFlail: {
    name: "Heavy Barn Flail",
    description: "A long, two-handed wooden pole connected to a heavy swinging log by thick leather straps. It is hard to aim, but it hits like a runaway cart.",
    category: "weapons",
    subcategory: "Flail",
    typeLabel: "Flail - 2-handed",
    handedness: "2h",
    requiredLevel: 1,
    damageMin: 1,
    damageMax: 18,
    weight: 19,
    durabilityMax: 18,
    durabilityCurrent: 18,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "flail",
    costByVendor: { grizlow: 92 },
    criteria: { requiredStrength: 75, offhandStrengthRequired: 75, recommendedWeaponSkill: 50, blood: "Both", race: "All" },
    buffs: []
  },
  weatheredGreatflail: {
    name: "Weathered Greatflail",
    description: "A massive spiked iron head on a long, heavy chain. The handle is worn smooth by years of use, and the spikes have become rounded over time.",
    category: "weapons",
    subcategory: "Flail",
    typeLabel: "Flail - 2-handed",
    handedness: "2h",
    requiredLevel: 1,
    damageMin: 6,
    damageMax: 13,
    weight: 15,
    durabilityMax: 24,
    durabilityCurrent: 24,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "flail",
    costByVendor: { grizlow: 86 },
    criteria: { requiredStrength: 50, offhandStrengthRequired: 50, recommendedWeaponSkill: 45, blood: "Both", race: "All" },
    buffs: []
  },

  crackedShortbow: {
    name: "Cracked Shortbow",
    description: "A simple bow carved from a flexible but aging piece of yew. The wood shows hairline fractures, and the string is a frayed length of animal gut.",
    category: "weapons",
    subcategory: "Ranged",
    typeLabel: "Ranged - 2-handed",
    handedness: "2h",
    requiredLevel: 1,
    damageMin: 1,
    damageMax: 3,
    weight: 3,
    durabilityMax: 12,
    durabilityCurrent: 12,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "ranged",
    costByVendor: { grizlow: 36 },
    criteria: { requiredStrength: 15, offhandStrengthRequired: 30, recommendedWeaponSkill: 50, blood: "Both", race: "All" },
    buffs: []
  },
  rustedHandCrossbow: {
    name: "Rusted Hand-Crossbow",
    description: "A small, mechanical device with a stiff, oxidised iron trigger. It creaks ominously when drawn, but it can still spit a bolt with surprising force.",
    category: "weapons",
    subcategory: "Ranged",
    typeLabel: "Ranged - 2-handed",
    handedness: "2h",
    requiredLevel: 1,
    damageMin: 8,
    damageMax: 11,
    weight: 7,
    durabilityMax: 20,
    durabilityCurrent: 20,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "ranged",
    costByVendor: { grizlow: 118 },
    criteria: { requiredStrength: 70, offhandStrengthRequired: 70, recommendedWeaponSkill: 75, blood: "Both", race: "All" },
    buffs: []
  },
  bundleOfJaggedShuriken: {
    name: "Bundle of Jagged Shuriken",
    description: "A set of flat, star-shaped pieces of scrap metal. Their edges are unevenly sharpened, and they are carried in a simple, grime-stained leather pouch.",
    category: "weapons",
    subcategory: "Ranged",
    typeLabel: "Ranged - 2-handed",
    handedness: "2h",
    requiredLevel: 1,
    damageMin: 3,
    damageMax: 5,
    weight: 1,
    durabilityMax: 1,
    durabilityCurrent: 1,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "ranged",
    costByVendor: { grizlow: 48 },
    criteria: { requiredStrength: 15, offhandStrengthRequired: 15, recommendedWeaponSkill: 65, blood: "Both", race: "All" },
    buffs: []
  },
  hempSling: {
    name: "Hemp Sling",
    description: "A long strip of woven hemp with a small leather cradle in the center. It comes with a bag of smooth river stones, perfect for cracking skulls from a distance.",
    category: "weapons",
    subcategory: "Ranged",
    typeLabel: "Ranged - 2-handed",
    handedness: "2h",
    requiredLevel: 1,
    damageMin: 1,
    damageMax: 8,
    weight: 2,
    durabilityMax: 3,
    durabilityCurrent: 3,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "ranged",
    costByVendor: { grizlow: 28 },
    criteria: { requiredStrength: 30, offhandStrengthRequired: 30, recommendedWeaponSkill: 60, blood: "Both", race: "All" },
    buffs: []
  },
  warpedJavelins: {
    name: "Warped Javelins",
    description: "Light throwing spears bundled together with twine. The shafts are slightly bent from moisture, making their flight path a bit erratic.",
    category: "weapons",
    subcategory: "Ranged",
    typeLabel: "Ranged - 2-handed",
    handedness: "2h",
    requiredLevel: 1,
    damageMin: 4,
    damageMax: 15,
    weight: 8,
    durabilityMax: 15,
    durabilityCurrent: 15,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "ranged",
    costByVendor: { grizlow: 72 },
    criteria: { requiredStrength: 45, offhandStrengthRequired: 45, recommendedWeaponSkill: 100, blood: "Both", race: "All" },
    buffs: []
  },
  improvisedBlowpipe: {
    name: "Improvised Blowpipe",
    description: "A hollowed-out reed pipe, smoothed on the inside but rough on the outside. It uses small, fire-hardened wooden needles as ammunition.",
    category: "weapons",
    subcategory: "Ranged",
    typeLabel: "Ranged - 2-handed",
    handedness: "2h",
    requiredLevel: 1,
    damageMin: 5,
    damageMax: 9,
    weight: 2,
    durabilityMax: 10,
    durabilityCurrent: 10,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "ranged",
    costByVendor: { grizlow: 62 },
    criteria: { requiredStrength: 35, offhandStrengthRequired: 35, recommendedWeaponSkill: 80, blood: "Both", race: "All" },
    buffs: []
  },

  testHead: {
    name: "(test) Cloth Hood",
    description: "Padded cloth to soften cuts and flying debris.",
    category: "armor",
    subcategory: "Head",
    typeLabel: "Armor - Head",
    handedness: "-",
    requiredLevel: 1,
    damageMin: 0,
    damageMax: 0,
    weight: 1,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "head",
    armorValue: 3,
    costByVendor: { grizlow: 20 },
    criteria: { requiredStrength: 5, offhandStrengthRequired: 10, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Avoidance" }]
  },
  testShoulders: {
    name: "(test) Leather Shoulders",
    description: "Rugged shoulder wraps with stitched reinforcements.",
    category: "armor",
    subcategory: "Shoulders",
    typeLabel: "Armor - Shoulders",
    handedness: "-",
    requiredLevel: 1,
    damageMin: 0,
    damageMax: 0,
    weight: 2,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "shoulders",
    armorValue: 4,
    costByVendor: { grizlow: 22 },
    criteria: { requiredStrength: 8, offhandStrengthRequired: 16, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Endurance" }]
  },
  testChest: {
    name: "(test) Chain Shirt",
    description: "An entry-level chain shirt for pit brawlers on a budget.",
    category: "armor",
    subcategory: "Chest",
    typeLabel: "Armor - Torso",
    handedness: "-",
    requiredLevel: 1,
    damageMin: 0,
    damageMax: 0,
    weight: 4,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "torso",
    armorValue: 12,
    costByVendor: { grizlow: 30 },
    criteria: { requiredStrength: 14, offhandStrengthRequired: 20, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Health" }]
  },
  testLegs: {
    name: "(test) Padded Leggings",
    description: "Layered cloth strips for knees and thighs.",
    category: "armor",
    subcategory: "Legs",
    typeLabel: "Armor - Legs",
    handedness: "-",
    requiredLevel: 1,
    damageMin: 0,
    damageMax: 0,
    weight: 2,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "legs",
    armorValue: 5,
    costByVendor: { grizlow: 24 },
    criteria: { requiredStrength: 8, offhandStrengthRequired: 16, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Initiative" }]
  },
  testFeet: {
    name: "(test) Cloth Boots",
    description: "Light boots that keep your footing in blood-soaked sand.",
    category: "armor",
    subcategory: "Feet",
    typeLabel: "Armor - Feet",
    handedness: "-",
    requiredLevel: 1,
    damageMin: 0,
    damageMax: 0,
    weight: 1,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "feet",
    armorValue: 2,
    costByVendor: { grizlow: 18 },
    criteria: { requiredStrength: 5, offhandStrengthRequired: 10, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Avoidance" }]
  },
  testHands: {
    name: "(test) Leather Gloves",
    description: "Worn gloves that help grip steel and rope alike.",
    category: "armor",
    subcategory: "Hands",
    typeLabel: "Armor - Hands",
    handedness: "-",
    requiredLevel: 1,
    damageMin: 0,
    damageMax: 0,
    weight: 1,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "hands",
    armorValue: 2,
    costByVendor: { grizlow: 17 },
    criteria: { requiredStrength: 5, offhandStrengthRequired: 10, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Strength" }]
  },
  testRing: {
    name: "(test) Silver Ring",
    description: "A polished ring with a subtle enchantment etched within.",
    category: "accessories",
    subcategory: "Rings",
    typeLabel: "Accessory - Ring",
    handedness: "-",
    requiredLevel: 1,
    damageMin: 0,
    damageMax: 0,
    weight: 1,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "Yes",
    equipGroup: "accessories",
    equipSlot: "ring",
    costByVendor: { grizlow: 55 },
    criteria: { requiredStrength: 5, offhandStrengthRequired: 10, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Avoidance" }]
  },
  testNecklace: {
    name: "(test) Copper Necklace",
    description: "A simple necklace carrying a tiny warding charm.",
    category: "accessories",
    subcategory: "Necklaces",
    typeLabel: "Accessory - Necklace",
    handedness: "-",
    requiredLevel: 1,
    damageMin: 0,
    damageMax: 0,
    weight: 1,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "accessories",
    equipSlot: "necklace",
    costByVendor: { grizlow: 28 },
    criteria: { requiredStrength: 5, offhandStrengthRequired: 10, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Health" }]
  },
  testCloak: {
    name: "(test) Traveler Cloak",
    description: "A coarse cloak that dulls wind and light rain.",
    category: "accessories",
    subcategory: "Cloaks",
    typeLabel: "Accessory - Cloak",
    handedness: "-",
    requiredLevel: 1,
    damageMin: 0,
    damageMax: 0,
    weight: 2,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "accessories",
    equipSlot: "cloak",
    costByVendor: { grizlow: 26 },
    criteria: { requiredStrength: 8, offhandStrengthRequired: 16, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Avoidance" }]
  },
  testBelt: {
    name: "(test) Reinforced Belt",
    description: "A sturdy belt with reinforced stitching and hooks.",
    category: "accessories",
    subcategory: "Belts",
    typeLabel: "Accessory - Belt",
    handedness: "-",
    requiredLevel: 1,
    damageMin: 0,
    damageMax: 0,
    weight: 1,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "accessories",
    equipSlot: "belt",
    costByVendor: { grizlow: 22 },
    criteria: { requiredStrength: 5, offhandStrengthRequired: 10, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Endurance" }]
  },
  testArmband: {
    name: "(test) Bronze Armband",
    description: "A fitted armband that feels warm on impact.",
    category: "accessories",
    subcategory: "Armbands",
    typeLabel: "Accessory - Armband",
    handedness: "-",
    requiredLevel: 1,
    damageMin: 0,
    damageMax: 0,
    weight: 1,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "accessories",
    equipSlot: "armband",
    costByVendor: { grizlow: 24 },
    criteria: { requiredStrength: 5, offhandStrengthRequired: 10, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Strength" }]
  },
  testCharm: {
    name: "(test) Bone Charm",
    description: "A carved charm said to ward off one bad strike each day.",
    category: "accessories",
    subcategory: "Charms",
    typeLabel: "Accessory - Charm",
    handedness: "-",
    requiredLevel: 1,
    damageMin: 0,
    damageMax: 0,
    weight: 1,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "accessories",
    equipSlot: "charm",
    costByVendor: { grizlow: 20 },
    criteria: { requiredStrength: 5, offhandStrengthRequired: 10, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Luck" }]
  }
};

var GRIZLOW_SALE_CATALOG = {
  Weapons: {
    Swords: ["dulledShortsword", "rustedGladius", "notchedFalchion", "makeshiftMachete", "batteredArmingSword", "scavengedCutlass", "nickedGreatsword", "crudeZweihander"],
    Blunt: ["splinteredWoodenClub", "rustedFlangedMace", "wornWorkHammer", "nailedBranch", "ironShodCudgel", "scavengedFemur", "knottedGreatclub", "rustySledgehammer"],
    Axes: ["dullHatchet", "rustyHandaxe", "chippedTomahawk", "weatheredCleaver", "crudeScrapAxe", "pittedBeardAxe", "longHandledWoodaxe", "batteredGreataxe"],
    Ranged: ["crackedShortbow", "rustedHandCrossbow", "bundleOfJaggedShuriken", "hempSling", "warpedJavelins", "improvisedBlowpipe"],
    Flail: ["wornThreshingFlail", "ropeAndHorseshoe", "pittedBallAndChain", "knottedBullwhip", "nailedWoodFlail", "frayedFishermansNet", "weightedCoarseNet", "lashedBoneFlail", "heavyBarnFlail", "weatheredGreatflail"],
    Stabbing: ["rustyShank", "bentShortspear", "rustyShiv", "chippedDirk", "crudeIronSpike", "improvisedHarpoon", "charredStake", "rustedBoarSpear", "fireHardenedPike"]
  },
  Shields: [],
  Armor: {
    Head: ["testHead"],
    Shoulders: ["testShoulders"],
    Chest: ["testChest"],
    Legs: ["testLegs"],
    Feet: ["testFeet"],
    Hands: ["testHands"]
  },
  Accessories: {
    Rings: ["testRing"],
    Necklaces: ["testNecklace"],
    Cloaks: ["testCloak"],
    Belts: ["testBelt"],
    Armbands: ["testArmband"],
    Charms: ["testCharm"]
  }
};

function stripTwoHandedSuffixFromNames() {
  var keys = Object.keys(ITEM_DATABASE);
  for (var i = 0; i < keys.length; i++) {
    var item = ITEM_DATABASE[keys[i]];
    if (!item || !item.name) continue;
    item.name = item.name.replace(/\s*\(2h\)\s*$/i, "");
  }
}
stripTwoHandedSuffixFromNames();

function ensureOffhandStrengthRules() {
  var keys = Object.keys(ITEM_DATABASE);
  for (var i = 0; i < keys.length; i++) {
    var item = ITEM_DATABASE[keys[i]];
    if (!item || item.category !== "weapons" || !item.criteria) continue;
    if (item.handedness === "2h") {
      item.criteria.offhandStrengthRequired = null;
      continue;
    }
    var req = item.criteria.requiredStrength;
    if (req != null) item.criteria.offhandStrengthRequired = req * 2;
  }
}
ensureOffhandStrengthRules();

function setWeaponDetailStrengthHintSpan(el, required, playerStr) {
  if (!el) return;
  if (required == null || required === "") {
    el.textContent = "";
    return;
  }
  var req = Number(required);
  var p = Math.floor(Number(playerStr) || 0);
  var met = p >= req;
  el.textContent = "";
  el.appendChild(document.createTextNode(" ("));
  var icon = document.createElement("span");
  icon.className = met ? "weapon-detail-metric-ok" : "weapon-detail-metric-fail";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = met ? "✓" : "✗";
  el.appendChild(icon);
  el.appendChild(document.createTextNode(" You have " + p + " Strength)"));
}

/** https://github.com/BinoBRUCHHH/Weapons-level-1 — 380×300 and 38×30 art; filenames = item name with spaces → hyphens + .jpg */
var WEAPONS_LEVEL1_RAW_BASE = "https://raw.githubusercontent.com/BinoBRUCHHH/Weapons-level-1/main";
var WEAPON_IMAGE_FOLDER_BY_TYPE = {
  sword: "Sword",
  blunt: "Blunt",
  axe: "Axe",
  ranged: "Ranged",
  flail: "Flail",
  stabbingWeapons: "Stabbing"
};

function weaponDisplayNameToImageFilenameBase(name) {
  if (!name) return "";
  return String(name).replace(/\s+/g, "-");
}

/** @param {"detail"|"thumb"} size - detail: 380x300/Folder/name.jpg — thumb: 380x300/38x30/Folder/name.jpg */
function getWeaponsLevel1ImageUrl(item, size) {
  if (!item || item.category !== "weapons" || !item.weaponType) return null;
  var folder = WEAPON_IMAGE_FOLDER_BY_TYPE[item.weaponType];
  if (!folder) return null;
  var base = weaponDisplayNameToImageFilenameBase(item.name);
  if (!base) return null;
  var file = encodeURIComponent(base + ".jpg");
  if (size === "thumb") {
    return WEAPONS_LEVEL1_RAW_BASE + "/380x300/38x30/" + folder + "/" + file;
  }
  return WEAPONS_LEVEL1_RAW_BASE + "/380x300/" + folder + "/" + file;
}

function setWeaponDetailPictureFromItem(item) {
  var picEl = document.getElementById("weapon-detail-picture");
  if (!picEl) return;
  picEl.innerHTML = "";
  var url = getWeaponsLevel1ImageUrl(item, "detail");
  if (!url) return;
  var img = document.createElement("img");
  img.className = "weapon-detail-picture-img";
  img.src = url;
  img.alt = item.name || "";
  img.loading = "lazy";
  img.onerror = function() {
    picEl.innerHTML = "";
  };
  picEl.appendChild(img);
}

var weaponDetailState = { itemKey: null };
var inventoryFilter = "all";
var inventoryInlineMessage = "";
var currentGrizlowCategory = "";
var currentGrizlowSubcategory = "";

function openWeaponDetailModal(itemKey, showBuy) {
  var overlay = document.getElementById("weapon-detail-overlay");
  if (!overlay) return;
  var item = ITEM_DATABASE[itemKey];
  if (!item) return;

  weaponDetailState.itemKey = itemKey;

  setWeaponDetailPictureFromItem(item);

  document.getElementById("weapon-detail-name").textContent = item.name || "";
  document.getElementById("weapon-detail-description").textContent = item.description || "";
  document.getElementById("weapon-detail-type").textContent = item.typeLabel || "";
  document.getElementById("weapon-detail-level").textContent = item.requiredLevel != null ? String(item.requiredLevel) : "";
  document.getElementById("weapon-detail-damage").textContent = item.damageMin + "-" + item.damageMax;
  document.getElementById("weapon-detail-weight").textContent = item.weight + " WP";
  document.getElementById("weapon-detail-durability").textContent = item.durabilityCurrent + "/" + item.durabilityMax;
  document.getElementById("weapon-detail-soulbound").textContent = item.soulbound || "No";

  document.getElementById("weapon-detail-unique").textContent = item.unique || "No";

  document.getElementById("weapon-detail-req-str").textContent = item.criteria.requiredStrength;
  var playerStr = (player.skills && player.skills.strength != null) ? player.skills.strength : 0;
  var reqStrHintEl = document.getElementById("weapon-detail-req-str-hint");
  setWeaponDetailStrengthHintSpan(reqStrHintEl, item.criteria.requiredStrength, playerStr);

  var offhandReqEl = document.getElementById("weapon-detail-offhand-req");
  var offhandHintEl = document.getElementById("weapon-detail-offhand-hint");
  var offhandReqRow = offhandReqEl ? offhandReqEl.parentElement : null;
  if (offhandReqEl && item.handedness === "2h") {
    if (offhandReqRow) offhandReqRow.style.display = "none";
    if (offhandHintEl) offhandHintEl.textContent = "";
  } else if (offhandReqEl) {
    if (offhandReqRow) offhandReqRow.style.display = "";
    offhandReqEl.textContent = "To wield this weapon in your Off-hand you need " + item.criteria.offhandStrengthRequired + " Strength";
    setWeaponDetailStrengthHintSpan(offhandHintEl, item.criteria.offhandStrengthRequired, playerStr);
  } else if (offhandHintEl) {
    offhandHintEl.textContent = "";
  }
  var recSkillSpan = document.getElementById("weapon-detail-rec-skill");
  var recSkillHintEl = document.getElementById("weapon-detail-rec-skill-hint");
  var recSkillLabel = document.getElementById("weapon-detail-rec-skill-label");
  var recSkillRow = recSkillSpan ? recSkillSpan.parentElement : null;
  var recommendedSkill = "";
  if (item.criteria) {
    if (item.criteria.recommendedWeaponSkill != null) recommendedSkill = item.criteria.recommendedWeaponSkill;
    else if (item.criteria.recommendedStabbingSkill != null) recommendedSkill = item.criteria.recommendedStabbingSkill;
  }
  var recLabelByType = {
    stabbingWeapons: "Recommended Stabbing weapons skill:",
    sword: "Recommended Sword weapon skill:",
    blunt: "Recommended Blunt weapon skill:",
    axe: "Recommended Axe weapon skill:",
    ranged: "Recommended Ranged weapon skill:",
    flail: "Recommended Flail weapon skill:",
    shield: "Recommended Shield skill:",
    unarmed: "Recommended Unarmed skill:"
  };
  var recSkillHintPhraseByType = {
    stabbingWeapons: "Stabbing weapons skill",
    sword: "Sword skill",
    blunt: "Blunt skill",
    axe: "Axe skill",
    ranged: "Ranged skill",
    flail: "Flail skill",
    shield: "Shield skill",
    unarmed: "Unarmed skill"
  };
  if (item.category === "weapons" && recSkillRow) {
    recSkillRow.style.display = "";
    if (recSkillLabel) recSkillLabel.textContent = recLabelByType[item.weaponType] || "Recommended weapon skill:";
    recSkillSpan.textContent = recommendedSkill;
    if (recSkillHintEl) {
      var wt = item.weaponType;
      var mySkill = Math.floor((player.skills && wt && player.skills[wt] != null) ? player.skills[wt] : 0);
      var skillPhrase = recSkillHintPhraseByType[wt] || "weapon skill";
      recSkillHintEl.textContent = " (You have " + mySkill + " " + skillPhrase + ")";
    }
  } else if (recSkillRow) {
    recSkillRow.style.display = "none";
    if (recSkillSpan) recSkillSpan.textContent = "";
    if (recSkillHintEl) recSkillHintEl.textContent = "";
  }
  document.getElementById("weapon-detail-blood").textContent = item.criteria.blood;
  document.getElementById("weapon-detail-race").textContent = item.criteria.race;

  var buffsEl = document.getElementById("weapon-detail-buffs");
  var buffsHeading = document.getElementById("weapon-detail-buffs-heading");
  if (buffsEl) {
    buffsEl.innerHTML = "";
    var buffList = item.buffs || [];
    if (buffList.length === 0) {
      if (buffsHeading) buffsHeading.style.display = "none";
      var none = document.createElement("p");
      none.className = "weapon-detail-buffs-none";
      none.textContent = "Buffs: None";
      buffsEl.appendChild(none);
    } else {
      if (buffsHeading) buffsHeading.style.display = "";
      for (var i = 0; i < buffList.length; i++) {
        var line = document.createElement("div");
        line.className = "weapon-detail-buff-line";
        line.textContent = buffList[i].label;
        buffsEl.appendChild(line);
      }
    }
  }

  var buyBtn = document.getElementById("weapon-detail-buy-btn");
  if (buyBtn) {
    var cost = item.costByVendor && item.costByVendor.grizlow != null ? item.costByVendor.grizlow : null;
    var canShowBuy = (showBuy !== false);
    buyBtn.style.display = canShowBuy ? "inline-block" : "none";
    if (canShowBuy && cost != null) {
      buyBtn.textContent = "Buy for " + cost + " Coin";
      buyBtn.disabled = false;
    } else if (canShowBuy) {
      buyBtn.textContent = "Cannot buy";
      buyBtn.disabled = true;
    }
  }

  overlay.style.display = "flex";
}

function closeWeaponDetailModal() {
  var overlay = document.getElementById("weapon-detail-overlay");
  if (overlay) overlay.style.display = "none";
  // Also close the warning modal if it's open
  closeBuyWeaponWarningModal();
}

var buyWarningState = { itemKey: null };

function openBuyWeaponWarningModal() {
  var overlay = document.getElementById("buy-warning-overlay");
  if (!overlay) return;
  var itemKey = weaponDetailState.itemKey;
  var item = ITEM_DATABASE[itemKey];
  if (!item) return;

  buyWarningState.itemKey = itemKey;

  var cost = item.costByVendor && item.costByVendor.grizlow != null ? item.costByVendor.grizlow : null;
  if (cost == null) return;

  var txt = "Are you sure you want to buy " + item.name + " for " + cost + " Coin?";
  var textEl = document.getElementById("buy-warning-text");
  if (textEl) textEl.textContent = txt;

  var yesBtn = document.getElementById("buy-warning-yes-btn");
  if (yesBtn) {
    var canAfford = (player.coins || 0) >= cost;
    yesBtn.disabled = !canAfford;
  }

  overlay.style.display = "flex";
}

function closeBuyWeaponWarningModal() {
  var overlay = document.getElementById("buy-warning-overlay");
  if (overlay) overlay.style.display = "none";
}

// HTML calls this exact name
function closeBuyWarningModal() {
  closeBuyWeaponWarningModal();
}

function findItemKeyByName(name) {
  if (!name) return null;
  var keys = Object.keys(ITEM_DATABASE);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (ITEM_DATABASE[k] && ITEM_DATABASE[k].name === name) return k;
  }
  return null;
}

function getItemKeyFromSlot(itemObj) {
  if (!itemObj) return null;
  if (itemObj.itemKey && ITEM_DATABASE[itemObj.itemKey]) return itemObj.itemKey;
  return findItemKeyByName(itemObj.name);
}

// Recommended weapon skill used in combat hit chance (vs item.reqSkill on equipped copy).
function getRecommendedWeaponSkill(item) {
  if (!item || !item.criteria) return 0;
  if (item.criteria.recommendedWeaponSkill != null) return item.criteria.recommendedWeaponSkill;
  return item.criteria.recommendedStabbingSkill != null ? item.criteria.recommendedStabbingSkill : 0;
}

// Hit chance (before dodge): base 75% at neutral perceived weight & matching recommended weapon skill.
var HIT_CHANCE_BASE_PERCENT = 75;
var HIT_CHANCE_NEUTRAL_PERCEIVED_WP = 6;
/** Weapon parry: base 50% at neutral WP 6; ±1% vs 6 for each side’s perceived WP (player + NPC). Skill vs recommended: defending weapon vs weapon used for this hit. Clamped 5–95%. */
var PARRY_CHANCE_BASE_PERCENT = 50;
/** Shield block: same formula as parry, but base 65%. */
var SHIELD_BLOCK_CHANCE_BASE_PERCENT = 65;
var PARRY_RELATIVE_SKILL_PAIR_DIVISOR = 2;
var PARRY_CHANCE_MIN_PERCENT = 5;
var PARRY_CHANCE_MAX_PERCENT = 95;
/** Who strikes first each round: +15% to the side with higher initiative (ties: no bonus). WP > neutral only penalizes that side (−1% per WP over neutral). */
var FIRST_STRIKE_HIGHER_INIT_BONUS_PERCENT = 15;
var FIRST_STRIKE_CHANCE_MIN_PERCENT = 5;
var FIRST_STRIKE_CHANCE_MAX_PERCENT = 95;
/** Defender dodge: +2% per perceived WP below neutral (stacks with no “heavy defender” penalty at 6). */
var DODGE_LIGHT_DEFENDER_WP_BONUS_PER_POINT = 2;
/** Dodge only (not parry / first-strike): maximum avoid chance. */
var DODGE_CHANCE_MAX_PERCENT = 80;
var TACTIC_HEAVY_HIT_PENALTY = 15;
var TACTIC_HEAVY_DAMAGE_BONUS = 0.15;
var TACTIC_LIGHT_HIT_BONUS = 15;
var TACTIC_LIGHT_DAMAGE_PENALTY = 0.15;
// Perceived carry (raw skills.strength): 1st WP drop at 50 Str, then each next drop needs +30, +32, +34, +36, repeating.
// Max (total − perceived) = 25 WP; further Strength does not lower perceived below that floor.
var PERCEIVED_WEIGHT_FIRST_THRESHOLD = 50;
var PERCEIVED_WEIGHT_GAP_CYCLE = [30, 32, 34, 36];
var PERCEIVED_WEIGHT_MAX_REDUCTION_WP = 25;

function getItemWeightWpFromSlotObj(itemObj) {
  var k = getItemKeyFromSlot(itemObj);
  if (!k || !ITEM_DATABASE[k]) return 0;
  var w = ITEM_DATABASE[k].weight;
  return w != null ? w : 0;
}

/** Combat clone / beast inline gear: use .weight on object if set, else DB via itemKey. */
function getEquippedItemWeightWpFromCombatItem(itemObj) {
  if (!itemObj) return 0;
  if (itemObj.weight != null) return Number(itemObj.weight);
  return getItemWeightWpFromSlotObj(itemObj);
}

function getPlayerTotalCarriedWeightWp() {
  var total = getRaceBaseWeight(player.race);
  var eq = player.equipment || {};
  var acc = player.accessories || {};
  var ek = Object.keys(eq);
  for (var i = 0; i < ek.length; i++) {
    total += getItemWeightWpFromSlotObj(eq[ek[i]]);
  }
  var ak = Object.keys(acc);
  for (var j = 0; j < ak.length; j++) {
    total += getItemWeightWpFromSlotObj(acc[ak[j]]);
  }
  var inv = player.inventory || [];
  for (var n = 0; n < inv.length; n++) {
    var invKey = inv[n];
    if (invKey && ITEM_DATABASE[invKey] && ITEM_DATABASE[invKey].weight != null)
      total += ITEM_DATABASE[invKey].weight;
  }
  return Math.round(total);
}

/** NPC/beast carry WP: race base + current combat equipment (weights on clone or DB). No inventory yet. */
function getNpcTotalCarriedWeightWp(state) {
  if (!state || !state.opp) return 0;
  var race = (state.opp.race != null && state.opp.race !== "") ? state.opp.race : "";
  var total = getRaceBaseWeight(race);
  var eq = state.npcEquip || {};
  var keys = Object.keys(eq);
  for (var i = 0; i < keys.length; i++) {
    total += getEquippedItemWeightWpFromCombatItem(eq[keys[i]]);
  }
  return Math.round(total);
}

function strengthToPerceivedWeightReduction(strength) {
  var S = strength || 0;
  if (S < PERCEIVED_WEIGHT_FIRST_THRESHOLD) return 0;
  var reduction = 1;
  var pos = PERCEIVED_WEIGHT_FIRST_THRESHOLD;
  var gi = 0;
  while (reduction < PERCEIVED_WEIGHT_MAX_REDUCTION_WP) {
    var g = PERCEIVED_WEIGHT_GAP_CYCLE[gi % PERCEIVED_WEIGHT_GAP_CYCLE.length];
    if (S < pos + g) break;
    pos += g;
    reduction++;
    gi++;
  }
  return reduction;
}

function computePerceivedCarriedWeightWp(totalWp, strength) {
  var t = Math.round(totalWp);
  if (t <= 0) return 0;
  var fromStr = strengthToPerceivedWeightReduction(strength);
  var maxReduction = Math.min(PERCEIVED_WEIGHT_MAX_REDUCTION_WP, t);
  var reduction = Math.min(fromStr, maxReduction);
  return Math.max(0, t - reduction);
}

function getWeightLoadCategoryLabel(wp) {
  var w = Math.round(wp);
  if (w < 0) w = 0;
  if (w <= 5) return "Very light";
  if (w <= 12) return "Light";
  if (w <= 20) return "Medium";
  if (w <= 28) return "Heavy";
  if (w <= 35) return "Very heavy";
  return "Extremely heavy";
}

function formatWeightWithCategory(wp) {
  var w = Math.round(wp);
  return getWeightLoadCategoryLabel(w) + " (" + w + " WP)";
}

function getPlayerTotalArmorValueEquipped() {
  var bodySlots = ["head", "torso", "shoulders", "legs", "hands", "feet"];
  var eq = player.equipment || {};
  var sum = 0;
  for (var i = 0; i < bodySlots.length; i++) {
    var k = getItemKeyFromSlot(eq[bodySlots[i]]);
    if (k && ITEM_DATABASE[k] && ITEM_DATABASE[k].armorValue != null)
      sum += ITEM_DATABASE[k].armorValue;
  }
  return sum;
}

// Uses raw player.skills.strength (already includes racial + gender from finalizeCharacter / level-up).
function getPlayerPerceivedWeightWpForCombat() {
  if (!playerCreated) return HIT_CHANCE_NEUTRAL_PERCEIVED_WP;
  var total = getPlayerTotalCarriedWeightWp();
  var rawStr = (player.skills && player.skills.strength) ? player.skills.strength : 0;
  return computePerceivedCarriedWeightWp(total, rawStr);
}

/**
 * Same perceived-carry rules as the player: total carried WP + raw Strength → perceived WP.
 * Uses opp.stats.strength (template / raw), not condition-scaled combat stats.
 */
function getNpcPerceivedWeightWpForCombat(state) {
  if (!state || !state.opp) return HIT_CHANCE_NEUTRAL_PERCEIVED_WP;
  var total = getNpcTotalCarriedWeightWp(state);
  var rawStr = (state.opp.stats && state.opp.stats.strength != null) ? state.opp.stats.strength : 0;
  return computePerceivedCarriedWeightWp(total, rawStr);
}

/** Perceived WP for hit chance and parry: player from gear + Str; NPC from opp race + npcEquip + opp.stats.strength. */
function getCombatantPerceivedWpForCombat(combatantKey, state) {
  if (combatantKey === "player") return Math.round(getPlayerPerceivedWeightWpForCombat());
  return Math.round(getNpcPerceivedWeightWpForCombat(state));
}

/**
 * Player's chance % to strike first this round (then roll d100 < chance).
 * Base: 100 * playerInit / (playerInit + npcInit); equal init → 50%.
 * WP: only points above neutral hurt that side (−1% per point over); net shift to player = npcPenalty − playerPenalty. No bonus for WP below neutral.
 * +FIRST_STRIKE_HIGHER_INIT_BONUS_PERCENT to whoever has higher initiative (ties: 0).
 */
function computePlayerFirstStrikeChancePercent(state) {
  var pInit = Math.max(0, state.playerStats.initiative || 0);
  var nInit = Math.max(0, state.npcStats.initiative || 0);
  var sum = pInit + nInit;
  var p = sum <= 0 ? 50 : (100 * pInit / sum);

  var pWp = getCombatantPerceivedWpForCombat("player", state);
  var nWp = getCombatantPerceivedWpForCombat("npc", state);
  var penP = Math.max(0, pWp - HIT_CHANCE_NEUTRAL_PERCEIVED_WP);
  var penN = Math.max(0, nWp - HIT_CHANCE_NEUTRAL_PERCEIVED_WP);
  p += penN - penP;

  if (pInit > nInit) p += FIRST_STRIKE_HIGHER_INIT_BONUS_PERCENT;
  else if (nInit > pInit) p -= FIRST_STRIKE_HIGHER_INIT_BONUS_PERCENT;

  return Math.max(FIRST_STRIKE_CHANCE_MIN_PERCENT, Math.min(FIRST_STRIKE_CHANCE_MAX_PERCENT, p));
}

/**
 * Dodge % after a hit connects: 100 * avoidance / (avoidance + attackerWeaponSkill for this weapon type).
 * 0 avoidance → always 0% (cannot dodge). No minimum clamp; only cap at 80% (raw can go negative — roll treats ≤0 as no dodge).
 * Defender WP > neutral: −1% per point over. Defender WP < neutral: +2% per point under.
 * Attacker WP > neutral: +1% to defender’s dodge per point over (no effect if attacker WP < neutral).
 * Maximum DODGE_CHANCE_MAX_PERCENT (80%).
 */
function computeDodgeChancePercent(defAvoidance, attackerWeaponSkill, defenderPerceivedWp, attackerPerceivedWp) {
  var A = Math.max(0, defAvoidance || 0);
  if (A <= 0) return 0;

  var W = Math.max(0, attackerWeaponSkill || 0);
  var base = (100 * A) / (A + W);

  var dWp = Math.round(defenderPerceivedWp);
  var aWp = Math.round(attackerPerceivedWp);
  var neutral = HIT_CHANCE_NEUTRAL_PERCEIVED_WP;

  if (dWp > neutral) base -= dWp - neutral;
  if (dWp < neutral) base += DODGE_LIGHT_DEFENDER_WP_BONUS_PER_POINT * (neutral - dWp);
  if (aWp > neutral) base += aWp - neutral;

  return Math.min(DODGE_CHANCE_MAX_PERCENT, base);
}

/** Relative % above/below recommended weapon skill: 100 * (skill − rec) / rec. rec ≤ 0 → 0 (NPC placeholder weapons). */
function computeRelativeSkillVsRecommendedPercent(weaponSkill, recommendedSkill) {
  var rec = recommendedSkill || 0;
  if (rec <= 0) return 0;
  var s = weaponSkill || 0;
  return ((s - rec) / rec) * 100;
}

/**
 * Shared: parry (weapon) and block (shield). Same WP and relative-skill rules; only base % differs.
 * defenderSkill/defenderRec: shield or weapon used to defend; attackerSkill/attackerRec: weapon used for this hit.
 */
function computeDefenseReactionChancePercent(basePercent, defenderPerceivedWp, attackerPerceivedWp, defenderSkill, defenderRec, attackerSkill, attackerRec) {
  var dWp = Math.round(defenderPerceivedWp);
  var aWp = Math.round(attackerPerceivedWp);
  var defWpAdj = HIT_CHANCE_NEUTRAL_PERCEIVED_WP - dWp;
  var attWpAdj = aWp - HIT_CHANCE_NEUTRAL_PERCEIVED_WP;
  var relDef = computeRelativeSkillVsRecommendedPercent(defenderSkill, defenderRec);
  var relAtt = computeRelativeSkillVsRecommendedPercent(attackerSkill, attackerRec);
  var raw = basePercent + defWpAdj + attWpAdj + (relDef - relAtt) / PARRY_RELATIVE_SKILL_PAIR_DIVISOR;
  return Math.max(PARRY_CHANCE_MIN_PERCENT, Math.min(PARRY_CHANCE_MAX_PERCENT, raw));
}

function computeParryChancePercent(defenderPerceivedWp, attackerPerceivedWp, defenderSkill, defenderRec, attackerSkill, attackerRec) {
  return computeDefenseReactionChancePercent(PARRY_CHANCE_BASE_PERCENT, defenderPerceivedWp, attackerPerceivedWp, defenderSkill, defenderRec, attackerSkill, attackerRec);
}

function computeShieldBlockChancePercent(defenderPerceivedWp, attackerPerceivedWp, defenderSkill, defenderRec, attackerSkill, attackerRec) {
  return computeDefenseReactionChancePercent(SHIELD_BLOCK_CHANCE_BASE_PERCENT, defenderPerceivedWp, attackerPerceivedWp, defenderSkill, defenderRec, attackerSkill, attackerRec);
}

// PVE tactic: "* - Heavy" / "* - Light" (Normal/Offensive/Defensive all behave the same for this).
function getPveTacticAttackModifiers(tactic) {
  var t = tactic || "";
  if (t.indexOf(" - Heavy") !== -1) {
    return { hitChanceAdd: -TACTIC_HEAVY_HIT_PENALTY, damageMult: 1 + TACTIC_HEAVY_DAMAGE_BONUS };
  }
  if (t.indexOf(" - Light") !== -1) {
    return { hitChanceAdd: TACTIC_LIGHT_HIT_BONUS, damageMult: 1 - TACTIC_LIGHT_DAMAGE_PENALTY };
  }
  return { hitChanceAdd: 0, damageMult: 1 };
}

// Hit roll: no hard cap — values ≥100 always hit, ≤0 always miss; otherwise d100 < chance.
function rollMeleeHitSuccess(hitChancePercent) {
  var h = hitChancePercent;
  if (h >= 100) return true;
  if (h <= 0) return false;
  return Math.random() * 100 < h;
}

// perceived WP: +1% hit per WP below 6, −1% per WP above 6.
// weaponSkill: use combat stats (getPlayerCombatStats) so racial + condition apply.
// Skill vs recommended (when recommended > 0): hit change = ((actual − rec) / rec) × 100 ÷ 3 percentage points.
//   Example: rec 100, actual 80 → (80−100)/100 = −20% relative → −20/3 ≈ −6.67% hit (1% hit per 3% below).
//   Same formula when above recommended (+1% hit per 3% over).
// If recommended ≤ 0 (e.g. some NPC weapons), fall back to +0.5% hit per weapon skill point (legacy PVE scaling).
function computeHitChancePercent(perceivedWp, weaponSkill, recommendedSkill) {
  var p = Math.round(perceivedWp);
  var weightAdj = HIT_CHANCE_NEUTRAL_PERCEIVED_WP - p;
  var rec = recommendedSkill || 0;
  var actual = weaponSkill || 0;
  var skillAdj = 0;
  if (rec > 0) {
    skillAdj = ((actual - rec) / rec) * 100 / 3;
  } else {
    skillAdj = actual * 0.5;
  }
  return HIT_CHANCE_BASE_PERCENT + weightAdj + skillAdj;
}

function removeOneItemFromInventory(itemKey) {
  if (!player.inventory) return false;
  var idx = player.inventory.indexOf(itemKey);
  if (idx === -1) return false;
  player.inventory.splice(idx, 1);
  return true;
}

function cloneItemForEquip(itemKey) {
  var item = ITEM_DATABASE[itemKey];
  if (!item) return null;
  var o = {
    itemKey: itemKey,
    name: item.name,
    type: item.weaponType || item.category || "item",
    damageMin: item.damageMin,
    damageMax: item.damageMax,
    weight: item.weight,
    durability: item.durabilityCurrent != null ? item.durabilityCurrent : item.durabilityMax,
    reqSkill: getRecommendedWeaponSkill(item),
    handedness: item.handedness
  };
  if (item.criteria) {
    if (item.criteria.requiredStrength != null) o.requiredStrength = item.criteria.requiredStrength;
    if (item.criteria.offhandStrengthRequired != null) o.offhandStrengthRequired = item.criteria.offhandStrengthRequired;
  }
  if (item.block != null) o.block = item.block;
  var durPool = o.durability;
  if (durPool == null || isNaN(durPool)) durPool = 100;
  o.parryRemaining = durPool;
  return o;
}

function isItemEquipped(itemKey) {
  var eq = player.equipment || {};
  var acc = player.accessories || {};
  var keysEq = Object.keys(eq);
  for (var i = 0; i < keysEq.length; i++) {
    var eqItem = eq[keysEq[i]];
    if (getItemKeyFromSlot(eqItem) === itemKey) return true;
  }
  var keysAcc = Object.keys(acc);
  for (var j = 0; j < keysAcc.length; j++) {
    var acItem = acc[keysAcc[j]];
    if (getItemKeyFromSlot(acItem) === itemKey) return true;
  }
  return false;
}

function equipInventoryItem(itemKey, slot) {
  var item = ITEM_DATABASE[itemKey];
  if (!item) return;

  if (item.unique === "Yes" && isItemEquipped(itemKey)) {
    inventoryInlineMessage = "This item is Unique. you already have one " + item.name + " equipped";
    renderInventoryPage();
    return;
  }

  if (!removeOneItemFromInventory(itemKey)) return;

  // Shields cannot be equipped in main hand.
  if (item.handedness === "Off-hand" && slot === "main") {
    player.inventory.push(itemKey);
    inventoryInlineMessage = item.name + " can only be equipped in Off-hand.";
    renderInventoryPage();
    return;
  }

  // 2h weapons can only be equipped in main hand.
  if (item.handedness === "2h" && slot === "off") {
    player.inventory.push(itemKey);
    inventoryInlineMessage = item.name + " is a 2-handed weapon and can only be equipped in Main-hand.";
    renderInventoryPage();
    return;
  }

  var currentStrength = (player.skills && player.skills.strength) ? player.skills.strength : 0;
  var requiredStr = (slot === "off" && item.criteria.offhandStrengthRequired != null)
    ? item.criteria.offhandStrengthRequired
    : (item.criteria.requiredStrength || 0);

  if (currentStrength < requiredStr) {
    // Put item back if equip requirement fails.
    player.inventory.push(itemKey);
    inventoryInlineMessage = "You need " + requiredStr + " Strength to equip " + item.name + " in " + (slot === "off" ? "Off-hand" : "Main-hand") + ".";
    renderInventoryPage();
    return;
  }

  var slotMap = {
    main: { group: "equipment", key: "mainHand" },
    off: { group: "equipment", key: "offHand" },
    head: { group: "equipment", key: "head" },
    shoulders: { group: "equipment", key: "shoulders" },
    torso: { group: "equipment", key: "torso" },
    legs: { group: "equipment", key: "legs" },
    hands: { group: "equipment", key: "hands" },
    feet: { group: "equipment", key: "feet" },
    necklace: { group: "accessories", key: "necklace" },
    cloak: { group: "accessories", key: "cloak" },
    belt: { group: "accessories", key: "belt" },
    ring1: { group: "accessories", key: "ring1" },
    ring2: { group: "accessories", key: "ring2" },
    armband: { group: "accessories", key: "armband" },
    charm: { group: "accessories", key: "charm" }
  };
  var targetInfo = slotMap[slot || "main"];
  if (!targetInfo) {
    player.inventory.push(itemKey);
    return;
  }

  var prev = player[targetInfo.group][targetInfo.key];
  var prevKey = getItemKeyFromSlot(prev);
  if (prevKey) player.inventory.push(prevKey);

  player[targetInfo.group][targetInfo.key] = cloneItemForEquip(itemKey);

  // Equipping a 2h main-hand weapon automatically clears off-hand.
  if (targetInfo.group === "equipment" && targetInfo.key === "mainHand" && item.handedness === "2h") {
    var offItem = player.equipment.offHand;
    var offKey = getItemKeyFromSlot(offItem);
    if (offKey) player.inventory.push(offKey);
    player.equipment.offHand = null;
  }

  inventoryInlineMessage = "";
  renderInventoryPage();
}

function setInventoryFilter(filter) {
  inventoryFilter = filter || "all";
  renderInventoryPage();
}

function renderInventorySlot(container, label, slotKey, sourceKey) {
  var row = document.createElement("div");
  row.className = "inventory-row inventory-row-equipment";
  var item = player[sourceKey] && player[sourceKey][slotKey] ? player[sourceKey][slotKey] : null;
  var itemKey = getItemKeyFromSlot(item);

  var mainLeft = document.createElement("div");
  mainLeft.className = "inventory-equip-row-main";

  if (item && itemKey) {
    var thumb = document.createElement("div");
    thumb.className = "inventory-equip-thumb";
    thumb.setAttribute("aria-hidden", "true");
    var dbItem = ITEM_DATABASE[itemKey];
    var thumbUrl = dbItem ? getWeaponsLevel1ImageUrl(dbItem, "thumb") : null;
    if (thumbUrl) {
      var timg = document.createElement("img");
      timg.src = thumbUrl;
      timg.alt = "";
      timg.loading = "lazy";
      timg.className = "inventory-equip-thumb-img";
      timg.onerror = function() {
        if (timg.parentNode) timg.parentNode.removeChild(timg);
      };
      thumb.appendChild(timg);
    }
    mainLeft.appendChild(thumb);
  }

  var left = document.createElement("div");
  left.className = "inventory-row-left inventory-equip-slot";

  var primary = document.createElement("div");
  primary.className = "inventory-equip-primary";

  if (item && itemKey) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "inventory-item-link";
    btn.textContent = item.name || "Unknown item";
    btn.onclick = function(k) {
      return function() { openWeaponDetailModal(k, false); };
    }(itemKey);
    primary.appendChild(btn);
  } else {
    var span = document.createElement("span");
    span.className = "inventory-empty";
    span.textContent = "Not Equipped";
    primary.appendChild(span);
  }

  var slotLabel = document.createElement("div");
  slotLabel.className = "inventory-equip-slot-label";
  slotLabel.textContent = label;

  left.appendChild(primary);
  left.appendChild(slotLabel);
  mainLeft.appendChild(left);
  row.appendChild(mainLeft);

  var right = document.createElement("div");
  right.className = "inventory-row-right";
  if (item && itemKey) {
    var x = document.createElement("button");
    x.type = "button";
    x.className = "inventory-unequip-btn";
    x.textContent = "✖";
    x.title = "Unequip";
    x.onclick = function(sk, src, key) {
      return function() {
        if (!player.inventory) player.inventory = [];
        player.inventory.push(key);
        player[src][sk] = null;
        refreshStatsUI();
        renderInventoryPage();
      };
    }(slotKey, sourceKey, itemKey);
    right.appendChild(x);
  }
  row.appendChild(right);
  container.appendChild(row);
}

function renderInventoryItemsArea() {
  var area = document.getElementById("inventory-items-area");
  if (!area) return;
  area.innerHTML = "";
  var list = player.inventory || [];

  var matchesFilter = function(item) {
    if (!item) return false;
    if (inventoryFilter === "all") return true;
    return item.category === inventoryFilter;
  };

  var shown = 0;
  for (var i = 0; i < list.length; i++) {
    var key = list[i];
    var item = ITEM_DATABASE[key];
    if (!matchesFilter(item)) continue;
    shown++;

    var row = document.createElement("div");
    row.className = "inventory-row inventory-item-row";
    var left = document.createElement("div");
    left.className = "inventory-row-left";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "inventory-item-link";
    btn.textContent = item.name;
    btn.onclick = function(k) {
      return function() { openWeaponDetailModal(k, false); };
    }(key);
    left.appendChild(btn);
    row.appendChild(left);

    var right = document.createElement("div");
    right.className = "inventory-row-right";
    if (item.category === "weapons") {
      var actions = document.createElement("div");
      actions.className = "inventory-actions";

      var mh = document.createElement("button");
      mh.type = "button";
      mh.className = "inventory-equip-btn";
      mh.textContent = "Equip MH";
      mh.onclick = function(k) {
        return function() { equipInventoryItem(k, "main"); };
      }(key);
      if (item.handedness !== "Off-hand") {
        actions.appendChild(mh);
      }

      if (item.handedness !== "Off-hand" && item.handedness !== "2h") {
        var oh = document.createElement("button");
        oh.type = "button";
        oh.className = "inventory-equip-btn";
        oh.textContent = "Equip OH";
        oh.onclick = function(k) {
          return function() { equipInventoryItem(k, "off"); };
        }(key);
        actions.appendChild(oh);
      }

      right.appendChild(actions);
    } else if (item.category === "armor") {
      var armorActions = document.createElement("div");
      armorActions.className = "inventory-actions";
      var armorBtn = document.createElement("button");
      armorBtn.type = "button";
      armorBtn.className = "inventory-equip-btn";
      armorBtn.textContent = "Equip";
      armorBtn.onclick = function(k) {
        return function() {
          var equipSlot = ITEM_DATABASE[k] && ITEM_DATABASE[k].equipSlot ? ITEM_DATABASE[k].equipSlot : null;
          if (equipSlot) equipInventoryItem(k, equipSlot);
        };
      }(key);
      armorActions.appendChild(armorBtn);
      right.appendChild(armorActions);
    } else if (item.category === "accessories") {
      var accActions = document.createElement("div");
      accActions.className = "inventory-actions";
      if (item.equipSlot === "ring") {
        var r1 = document.createElement("button");
        r1.type = "button";
        r1.className = "inventory-equip-btn";
        r1.textContent = "Equip Ring 1";
        r1.onclick = function(k) { return function() { equipInventoryItem(k, "ring1"); }; }(key);
        accActions.appendChild(r1);

        var r2 = document.createElement("button");
        r2.type = "button";
        r2.className = "inventory-equip-btn";
        r2.textContent = "Equip Ring 2";
        r2.onclick = function(k) { return function() { equipInventoryItem(k, "ring2"); }; }(key);
        accActions.appendChild(r2);
      } else {
        var accBtn = document.createElement("button");
        accBtn.type = "button";
        accBtn.className = "inventory-equip-btn";
        accBtn.textContent = "Equip";
        accBtn.onclick = function(k) {
          return function() {
            var s = ITEM_DATABASE[k] && ITEM_DATABASE[k].equipSlot ? ITEM_DATABASE[k].equipSlot : null;
            if (s) equipInventoryItem(k, s);
          };
        }(key);
        accActions.appendChild(accBtn);
      }
      right.appendChild(accActions);
    }
    row.appendChild(right);
    area.appendChild(row);
  }

  if (shown === 0) {
    var empty = document.createElement("div");
    empty.className = "inventory-empty";
    empty.textContent = "No items in this category.";
    area.appendChild(empty);
  }
}

function renderInventoryPage() {
  var eq = document.getElementById("inventory-equipment-list");
  var acc = document.getElementById("inventory-accessories-list");
  if (!eq || !acc) return;
  eq.innerHTML = "";
  acc.innerHTML = "";

  renderInventorySlot(eq, "Main-hand weapon", "mainHand", "equipment");
  var mainKey = getItemKeyFromSlot(player.equipment && player.equipment.mainHand);
  var mainItem = mainKey ? ITEM_DATABASE[mainKey] : null;
  var hideOffhand = !!(mainItem && mainItem.handedness === "2h");
  if (!hideOffhand) {
    renderInventorySlot(eq, "Off-hand weapon", "offHand", "equipment");
  }
  renderInventorySlot(eq, "Head", "head", "equipment");
  renderInventorySlot(eq, "Torso", "torso", "equipment");
  renderInventorySlot(eq, "Shoulders", "shoulders", "equipment");
  renderInventorySlot(eq, "Legs", "legs", "equipment");
  renderInventorySlot(eq, "Hands", "hands", "equipment");
  renderInventorySlot(eq, "Feet", "feet", "equipment");

  renderInventorySlot(acc, "Necklace", "necklace", "accessories");
  renderInventorySlot(acc, "Cloak", "cloak", "accessories");
  renderInventorySlot(acc, "Belt", "belt", "accessories");
  renderInventorySlot(acc, "Ring 1", "ring1", "accessories");
  renderInventorySlot(acc, "Ring 2", "ring2", "accessories");
  renderInventorySlot(acc, "Armband", "armband", "accessories");
  renderInventorySlot(acc, "Charm", "charm", "accessories");

  var btns = document.querySelectorAll(".inventory-category-btn");
  for (var i = 0; i < btns.length; i++) {
    var txt = (btns[i].textContent || "").toLowerCase();
    var map = txt === "all" ? "all" : txt;
    btns[i].classList.toggle("active", map === inventoryFilter);
  }

  var msgEl = document.getElementById("inventory-inline-message");
  var twEl = document.getElementById("inventory-total-weight");
  var pwEl = document.getElementById("inventory-perceived-weight");
  var arEl = document.getElementById("inventory-total-armor");
  if (twEl && pwEl && arEl) {
    if (playerCreated) {
      var tw = getPlayerTotalCarriedWeightWp();
      var str = (player.skills && player.skills.strength) ? player.skills.strength : 0;
      var pw = computePerceivedCarriedWeightWp(tw, str);
      twEl.textContent = formatWeightWithCategory(tw);
      pwEl.textContent = formatWeightWithCategory(pw);
      arEl.textContent = String(getPlayerTotalArmorValueEquipped());
    } else {
      twEl.textContent = formatWeightWithCategory(0);
      pwEl.textContent = formatWeightWithCategory(0);
      arEl.textContent = "0";
    }
  }

  if (msgEl) {
    if (inventoryInlineMessage) {
      msgEl.textContent = inventoryInlineMessage;
      msgEl.style.display = "block";
    } else {
      msgEl.textContent = "";
      msgEl.style.display = "none";
    }
  }

  renderInventoryItemsArea();
}

function confirmBuyWeapon() {
  var itemKey = buyWarningState.itemKey;
  var item = ITEM_DATABASE[itemKey];
  if (!item) return;

  var cost = item.costByVendor && item.costByVendor.grizlow != null ? item.costByVendor.grizlow : null;
  if (cost == null) return;

  if ((player.coins || 0) < cost) return;

  player.coins = (player.coins || 0) - cost;
  if (!player.inventory) player.inventory = [];
  player.inventory.push(itemKey);
  refreshStatsUI();
  renderInventoryPage();

  closeBuyWeaponWarningModal();
  closeWeaponDetailModal();
}

function setGrizlowMerchantMode(mode) {
  window.grizlowMode = mode;
  var saleBtn = document.getElementById("grizlow-mode-sale-btn");
  var invBtn = document.getElementById("grizlow-mode-inventory-btn");
  if (saleBtn) saleBtn.classList.toggle("active", mode === "sale");
  if (invBtn) invBtn.classList.toggle("active", mode === "inventory");
  if (currentGrizlowCategory) showGrizlowCategory(currentGrizlowCategory);
}

function getSellValue(item) {
  var buy = item && item.costByVendor && item.costByVendor.grizlow != null ? item.costByVendor.grizlow : 0;
  return Math.floor(buy * 0.25);
}

function getSellableKeysFor(category, subcategory) {
  var inv = player.inventory || [];
  var out = [];
  for (var i = 0; i < inv.length; i++) {
    var key = inv[i];
    var item = ITEM_DATABASE[key];
    if (!item) continue;
    if (category === "Shields") {
      if (item.subcategory === "Shields") out.push(key);
      continue;
    }
    if (item.category !== String(category || "").toLowerCase()) continue;
    if (subcategory && item.subcategory !== subcategory) continue;
    out.push(key);
  }
  return out;
}

function getAllSaleCatalogKeys() {
  var out = [];
  var seen = {};
  var add = function(k) {
    if (!k || seen[k]) return;
    seen[k] = true;
    out.push(k);
  };

  var topKeys = Object.keys(GRIZLOW_SALE_CATALOG);
  for (var i = 0; i < topKeys.length; i++) {
    var group = GRIZLOW_SALE_CATALOG[topKeys[i]];
    if (Array.isArray(group)) {
      for (var a = 0; a < group.length; a++) add(group[a]);
      continue;
    }
    if (!group) continue;
    var sub = Object.keys(group);
    for (var j = 0; j < sub.length; j++) {
      var arr = group[sub[j]] || [];
      for (var n = 0; n < arr.length; n++) add(arr[n]);
    }
  }
  out.sort(function(k1, k2) {
    var n1 = (ITEM_DATABASE[k1] && ITEM_DATABASE[k1].name) ? ITEM_DATABASE[k1].name.toLowerCase() : "";
    var n2 = (ITEM_DATABASE[k2] && ITEM_DATABASE[k2].name) ? ITEM_DATABASE[k2].name.toLowerCase() : "";
    if (n1 < n2) return -1;
    if (n1 > n2) return 1;
    return 0;
  });
  return out;
}

function getAllInventoryKeysSorted() {
  var inv = player.inventory || [];
  var copy = inv.slice();
  copy.sort(function(k1, k2) {
    var n1 = (ITEM_DATABASE[k1] && ITEM_DATABASE[k1].name) ? ITEM_DATABASE[k1].name.toLowerCase() : "";
    var n2 = (ITEM_DATABASE[k2] && ITEM_DATABASE[k2].name) ? ITEM_DATABASE[k2].name.toLowerCase() : "";
    if (n1 < n2) return -1;
    if (n1 > n2) return 1;
    return 0;
  });
  return copy;
}

function sellInventoryItem(itemKey) {
  if (!removeOneItemFromInventory(itemKey)) return;
  var item = ITEM_DATABASE[itemKey];
  var value = getSellValue(item);
  player.coins = (player.coins || 0) + value;
  refreshStatsUI();
}

/** Merchant table: 1h before 2h before other; then by grizlow cost ascending. */
function handednessSortRank(h) {
  if (!h || h === "-") return 99;
  if (h === "1h") return 0;
  if (h === "2h") return 1;
  return 2;
}

function sortGrizlowItemKeys(keys) {
  var out = keys.slice();
  out.sort(function(a, b) {
    var ia = ITEM_DATABASE[a];
    var ib = ITEM_DATABASE[b];
    if (!ia) return 1;
    if (!ib) return -1;
    var ra = handednessSortRank(ia.handedness);
    var rb = handednessSortRank(ib.handedness);
    if (ra !== rb) return ra - rb;
    var ca = ia.costByVendor && ia.costByVendor.grizlow != null ? Number(ia.costByVendor.grizlow) : 0;
    var cb = ib.costByVendor && ib.costByVendor.grizlow != null ? Number(ib.costByVendor.grizlow) : 0;
    if (ca !== cb) return ca - cb;
    return (ia.name || "").localeCompare(ib.name || "");
  });
  return out;
}

function formatGrizlowHandednessLabel(h) {
  if (!h || h === "-") return "—";
  if (h === "Off-hand") return "Off";
  return h;
}

function renderGrizlowItemTable(targetEl, itemKeys) {
  targetEl.innerHTML = "";
  var table = document.createElement("div");
  table.className = "grizlow-weapon-table";
  var isSellMode = window.grizlowMode === "inventory";

  var sortedKeys = sortGrizlowItemKeys(itemKeys);

  var headerRow = document.createElement("div");
  headerRow.className = "grizlow-weapon-grid-record grizlow-weapon-table-header grizlow-weapon-grid-header";
  var h1 = document.createElement("div");
  h1.className = "grizlow-weapon-col-name";
  h1.textContent = "Name";

  var hHands = document.createElement("div");
  hHands.className = "grizlow-weapon-header-stacked grizlow-weapon-cell-center";
  hHands.innerHTML = "<span class=\"grizlow-hdr-line\">1h/</span><span class=\"grizlow-hdr-line\">2h</span>";

  var hReq = document.createElement("div");
  hReq.className = "grizlow-weapon-header-stacked grizlow-weapon-cell-center";
  hReq.innerHTML = "<span class=\"grizlow-hdr-line\">Req</span><span class=\"grizlow-hdr-line\">lvl</span>";

  var hDmg = document.createElement("div");
  hDmg.className = "grizlow-weapon-cell-center grizlow-weapon-hdr-plain";
  hDmg.textContent = "Dmg";

  var hWgt = document.createElement("div");
  hWgt.className = "grizlow-weapon-cell-center grizlow-weapon-hdr-plain";
  hWgt.textContent = "Wgt";

  var hCost = document.createElement("div");
  hCost.className = "grizlow-weapon-cell-center grizlow-weapon-hdr-plain";
  hCost.textContent = isSellMode ? "Sell" : "Cost";

  headerRow.appendChild(h1);
  headerRow.appendChild(hHands);
  headerRow.appendChild(hReq);
  headerRow.appendChild(hDmg);
  headerRow.appendChild(hWgt);
  headerRow.appendChild(hCost);
  table.appendChild(headerRow);

  for (var i = 0; i < sortedKeys.length; i++) {
    var key = sortedKeys[i];
    var item = ITEM_DATABASE[key];
    if (!item) continue;

    var cost = item.costByVendor && item.costByVendor.grizlow != null ? item.costByVendor.grizlow : "";
    var sellValue = getSellValue(item);
    var dmgText = (item.damageMin != null && item.damageMax != null && (item.damageMin !== 0 || item.damageMax !== 0))
      ? (item.damageMin + "-" + item.damageMax)
      : "-";

    var rowEl = document.createElement("div");
    rowEl.className = "grizlow-weapon-grid-record grizlow-weapon-table-row";

    var col1 = document.createElement("div");
    col1.className = "grizlow-weapon-grid-name";
    var nameBtn = document.createElement("button");
    nameBtn.type = "button";
    nameBtn.className = "grizlow-weapon-name-btn";
    nameBtn.textContent = item.name;
    nameBtn.onclick = function(itemKey) {
      return function(e) {
        if (e && e.preventDefault) e.preventDefault();
        openWeaponDetailModal(itemKey, window.grizlowMode !== "inventory");
      };
    }(key);
    col1.appendChild(nameBtn);

    var colHands = document.createElement("div");
    colHands.className = "grizlow-weapon-cell-center";
    colHands.textContent = formatGrizlowHandednessLabel(item.handedness);

    var colReq = document.createElement("div");
    colReq.className = "grizlow-weapon-cell-center";
    colReq.textContent = item.requiredLevel != null ? String(item.requiredLevel) : "?";

    var colDmg = document.createElement("div");
    colDmg.className = "grizlow-weapon-cell-center";
    colDmg.textContent = dmgText;

    var colWgt = document.createElement("div");
    colWgt.className = "grizlow-weapon-cell-center";
    colWgt.textContent = (item.weight != null ? item.weight + " WP" : "-");

    var colCost = document.createElement("div");
    colCost.className = "grizlow-weapon-cell-center grizlow-weapon-cell-cost";
    if (isSellMode) {
      var sellBtn = document.createElement("button");
      sellBtn.type = "button";
      sellBtn.className = "grizlow-weapon-sell-btn";
      sellBtn.textContent = "Sell (" + sellValue + ")";
      sellBtn.onclick = function(k) {
        return function() {
          sellInventoryItem(k);
          showGrizlowCategory(currentGrizlowCategory);
        };
      }(key);
      colCost.appendChild(sellBtn);
    } else {
      colCost.textContent = cost;
    }

    rowEl.appendChild(col1);
    rowEl.appendChild(colHands);
    rowEl.appendChild(colReq);
    rowEl.appendChild(colDmg);
    rowEl.appendChild(colWgt);
    rowEl.appendChild(colCost);
    table.appendChild(rowEl);
  }

  targetEl.appendChild(table);
}

function syncGrizlowCategoryRowActive(category) {
  var catRow = document.querySelector(".grizlow-category-row");
  if (!catRow) return;
  var btns = catRow.querySelectorAll(".grizlow-merchant-category-btn");
  for (var i = 0; i < btns.length; i++) {
    var c = btns[i].getAttribute("data-grizlow-category");
    btns[i].classList.toggle("active", c === category);
  }
}

function showGrizlowCategory(category) {
  var row = document.getElementById("grizlow-subcategory-row");
  var placeholder = document.getElementById("grizlow-subcategory-placeholder");
  if (!row || !placeholder) return;
  row.innerHTML = "";
  placeholder.textContent = "";

  if (!category) {
    currentGrizlowCategory = "";
    currentGrizlowSubcategory = "";
    syncGrizlowCategoryRowActive("");
    return;
  }
  currentGrizlowCategory = category;
  currentGrizlowSubcategory = "";
  syncGrizlowCategoryRowActive(category);

  if (category === "All") {
    row.innerHTML = "";
    var allKeys = window.grizlowMode === "inventory" ? getAllInventoryKeysSorted() : getAllSaleCatalogKeys();
    if (allKeys.length === 0) {
      placeholder.textContent = window.grizlowMode === "inventory"
        ? "No items in your inventory."
        : "No items available.";
      return;
    }
    renderGrizlowItemTable(placeholder, allKeys);
    return;
  }

  var makeBtn = function(label) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "grizlow-subcategory-btn";
    b.textContent = label;
    b.onclick = function() {
      // Default: coming soon text (may be overridden below)
      placeholder.textContent = label + " coming soon.";
    };
    return b;
  };

  if (category === "Shields") {
    var shieldKeys = (window.grizlowMode === "inventory")
      ? getSellableKeysFor("Shields")
      : (GRIZLOW_SALE_CATALOG.Shields || []);
    renderGrizlowItemTable(placeholder, shieldKeys);
    return;
  }

  var group = GRIZLOW_SALE_CATALOG[category];
  if (!group || Array.isArray(group)) return;
  var subKeys = Object.keys(group);
  for (var i = 0; i < subKeys.length; i++) {
    (function(sub) {
      var btn = makeBtn(sub);
      btn.onclick = function() {
        currentGrizlowSubcategory = sub;
        var siblings = row.querySelectorAll(".grizlow-subcategory-btn");
        for (var si = 0; si < siblings.length; si++) siblings[si].classList.remove("active");
        btn.classList.add("active");
        var list = window.grizlowMode === "inventory"
          ? getSellableKeysFor(category, sub)
          : (group[sub] || []);
        if (list.length === 0) {
          placeholder.textContent = window.grizlowMode === "inventory"
            ? ("No " + sub.toLowerCase() + " in your inventory.")
            : (sub + " coming soon.");
          return;
        }
        renderGrizlowItemTable(placeholder, list);
      };
      row.appendChild(btn);
    })(subKeys[i]);
  }
  var promptMap = { Weapons: "weapon", Armor: "armor", Accessories: "accessory" };
  placeholder.textContent = "Choose a " + (promptMap[category] || "item") + " type.";
}

function renderInfirmaryPage() {
  var ledger = document.getElementById('infirmary-ledger');
  var empty = document.getElementById('infirmary-empty');
  if (!ledger || !empty) return;
  ledger.innerHTML = "";
  empty.style.display = "none";
  var patients = [];
  if (player.isHospitalized && player.hospitalEndsAt) patients.push({ name: player.name, endsAt: player.hospitalEndsAt });
  if (patients.length === 0) {
    empty.style.display = "block";
    empty.textContent = "The halls are completely silent, no combatants are currently being cared for in Julius's Infirmary...";
    empty.style.fontStyle = "italic";
  } else {
    patients.forEach(function(p) {
      var row = document.createElement("div");
      row.className = "ledger-row";
      var left = Math.max(0, p.endsAt - Date.now());
      var h = Math.floor(left / 3600000);
      var m = Math.floor((left % 3600000) / 60000);
      row.innerHTML = "<span><strong>" + p.name + "</strong> – " + h + " hour" + (h !== 1 ? "s" : "") + " " + m + " minute" + (m !== 1 ? "s" : "") + "</span> <input type='number' placeholder='Energy' min='0' max='999' maxlength='3'> <button class='next-btn' style='margin:0; width:auto; padding:6px 12px;'>Help out</button>";
      ledger.appendChild(row);
    });
  }
}

/** Body contribution: damage per point of counted Strength (Req + effective excess). */
var STRENGTH_TO_BASE_DAMAGE = 0.1;

/**
 * Diminishing returns on excess Strength (E = max(0, Str − Req)), in brackets measured vs Req.
 * Band A: first Req points at 100%. Band B: next 0.5·Req at 75%. C: next 0.5·Req at 50%. D: next 0.5·Req at 25%.
 * Beyond: each further 0.5·Req chunk at half the previous weight (0.125, 0.0625, …).
 * If Req ≤ 0, returns raw E (no brackets).
 */
function computeEffectiveStrengthExcess(str, req) {
  var s = Number(str) || 0;
  var r = Number(req) || 0;
  var E = Math.max(0, s - r);
  if (r <= 0) return E;
  var remaining = E;
  var total = 0;
  var take;

  take = Math.min(remaining, r);
  total += take * 1.0;
  remaining -= take;

  take = Math.min(remaining, 0.5 * r);
  total += take * 0.75;
  remaining -= take;

  take = Math.min(remaining, 0.5 * r);
  total += take * 0.5;
  remaining -= take;

  take = Math.min(remaining, 0.5 * r);
  total += take * 0.25;
  remaining -= take;

  var w = 0.125;
  while (remaining > 1e-9) {
    take = Math.min(remaining, 0.5 * r);
    total += take * w;
    remaining -= take;
    w *= 0.5;
  }
  return total;
}

function getWeaponRequiredStrengthForAttack(weapon, slot) {
  if (!weapon || weapon.isFist) return 0;
  slot = slot || "main";
  if (slot === "off" && weapon.offhandStrengthRequired != null) return Number(weapon.offhandStrengthRequired);
  if (weapon.requiredStrength != null) return Number(weapon.requiredStrength);
  var key = weapon.itemKey;
  if (key && ITEM_DATABASE[key] && ITEM_DATABASE[key].criteria) {
    var c = ITEM_DATABASE[key].criteria;
    if (slot === "off" && c.offhandStrengthRequired != null) return c.offhandStrengthRequired;
    return c.requiredStrength || 0;
  }
  return 0;
}

/** Counted Str = Req + effective excess (bands A–D). Drives body base damage at STRENGTH_TO_BASE_DAMAGE per point. */
function computeCountedStrengthForDamage(str, req) {
  var r = Number(req) || 0;
  var eff = computeEffectiveStrengthExcess(str, r);
  return r + eff;
}

/** Weapon damage roll only (no Strength); used with body base for equipped weapons. */
function getWeaponRollDamage(weapon) {
  if (weapon.damageMin != null && weapon.damageMax != null) {
    var min = Number(weapon.damageMin);
    var max = Number(weapon.damageMax);
    if (Math.floor(min) === min && Math.floor(max) === max) {
      var range = max - min + 1;
      return min + Math.floor(Math.random() * range);
    }
    return min + Math.random() * (max - min);
  }
  return Number(weapon.damage) || 0;
}

function makeFistWeapon(fistOfSlot) {
  return {
    name: "Fist",
    type: "unarmed",
    damageMin: 0.25,
    damageMax: 1,
    weight: 0,
    reqSkill: 50,
    isFist: true,
    handedness: "1h",
    fistOf: fistOfSlot || "main"
  };
}

/** Block/parry absorption pool uses durability (same as weapon break). */
function ensureCombatParryRemaining(item) {
  if (!item || item.isFist) return;
  var isShield = item.type === "shield";
  var isWeapon = item.damageMin != null || item.damageMax != null || item.damage != null;
  if (!isShield && !isWeapon) return;
  var d = item.durability;
  if (d == null || isNaN(d)) d = DEFAULT_COMBAT_DURABILITY_IF_MISSING;
  if (item.parryRemaining == null) item.parryRemaining = d;
}

function isCombatAttackSlotBroken(w) {
  if (!w) return true;
  if (w.isFist) return false;
  if (w.type === "shield") return true;
  return w.parryRemaining != null && w.parryRemaining <= 0;
}

function syncCombatDefenseDurability(item) {
  if (!item || item.isFist) return;
  if (item.parryRemaining != null) item.durability = item.parryRemaining;
}

function parryPoolCanUse(item) {
  return item && (item.parryRemaining == null || item.parryRemaining > 0);
}

function shieldCanBlockCombat(item) {
  return item && item.type === "shield" && parryPoolCanUse(item);
}

function weaponCanParryCombat(w) {
  return w && !w.isFist && w.type !== "shield" && parryPoolCanUse(w);
}

function offHandBlocksMainHandParry(off, offSlotUsed) {
  if (!off || offSlotUsed) return false;
  if (shieldCanBlockCombat(off)) return true;
  if (weaponCanParryCombat(off)) return true;
  return false;
}

/** Shield → off-hand weapon → main-hand weapon; bare-hand “parry” fails but spends that slot. */
function getCombatParryBlockChoice(defEquip, defUsed) {
  if (!defEquip || !defUsed) return null;
  var off = defEquip.offHand;
  var main = defEquip.mainHand;
  if (off && !defUsed.off && shieldCanBlockCombat(off))
    return { kind: "shield", slot: "off", item: off };
  if (off && !defUsed.off && weaponCanParryCombat(off))
    return { kind: "weapon", slot: "off", item: off };
  var mainCanParry = main && !defUsed.main && weaponCanParryCombat(main);
  if (mainCanParry && !offHandBlocksMainHandParry(off, defUsed.off))
    return { kind: "weapon", slot: "main", item: main };
  if (off && off.isFist && !defUsed.off && !mainCanParry)
    return { kind: "fist_fail", slot: "off", item: off };
  if (main && main.isFist && !defUsed.main)
    return { kind: "fist_fail", slot: "main", item: main };
  return null;
}

function computeMeleeAttackDamage(weapon, atkStats, tacticMod, slot) {
  var str = atkStats.strength || 0;
  var mult = tacticMod && tacticMod.damageMult != null ? tacticMod.damageMult : 1;
  var req = getWeaponRequiredStrengthForAttack(weapon, slot);
  var dmg;
  if (weapon.isFist) {
    var roll = getWeaponRollDamage(weapon);
    dmg = Math.round((roll + str * FIST_STRENGTH_DAMAGE_SCALE) * mult);
    var strPen = str < 10 ? Math.max(0.25, str / 10) : 1;
    dmg = Math.round(dmg * strPen);
  } else {
    var countedStr = computeCountedStrengthForDamage(str, req);
    var bodyBase = STRENGTH_TO_BASE_DAMAGE * countedStr;
    var weaponRoll = getWeaponRollDamage(weapon);
    dmg = Math.round((bodyBase + weaponRoll) * mult);
  }
  dmg = Math.max(1, dmg);
  if (weapon.isFist) dmg = Math.min(10, dmg);
  return dmg;
}

function applyCombatBodyHit(state, defKey, atkName, defName, dmg, atkSum, defSum) {
  var defenderMaxHp = defKey === "player"
    ? (player.maxHp || 1)
    : (((state.opp && state.opp.stats && state.opp.stats.health) || 1));
  if (defKey === "player") state.playerHp -= dmg; else state.npcHp -= dmg;
  state.log.push(subst(pick(COMBAT_FLAVOR.hitBody), { A_NAME: atkName, D_NAME: defName, BODY_PART: pickBodyPart(), SEVERITY: getSeverity(dmg, defenderMaxHp), AMOUNT: dmg }));
  atkSum.damageDealt += dmg;
  atkSum.successfulAttacks++;
  if (dmg > atkSum.highestHit) atkSum.highestHit = dmg;
}

function breakDefenderWeaponToFist(state, defEquip, slot, brokenName, defName) {
  if (slot === "main") defEquip.mainHand = makeFistWeapon("main");
  else defEquip.offHand = makeFistWeapon("off");
  state.log.push(subst(pick(COMBAT_FLAVOR.equipmentBroken), { D_NAME: defName, ITEM_NAME: brokenName }));
}

function cloneEquip(eq) {
  if (!eq) return { mainHand: null, offHand: null };
  var o = { mainHand: null, offHand: null };
  if (eq.mainHand) {
    o.mainHand = {};
    for (var m in eq.mainHand) o.mainHand[m] = eq.mainHand[m];
    if (o.mainHand.durability == null) o.mainHand.durability = 100;
    ensureCombatParryRemaining(o.mainHand);
  }
  if (eq.offHand) {
    o.offHand = {};
    for (var n in eq.offHand) o.offHand[n] = eq.offHand[n];
    if (o.offHand.durability == null) o.offHand.durability = 100;
    ensureCombatParryRemaining(o.offHand);
  }
  return o;
}

function getAttackerSlots(equip, slotsUsed) {
  var slots = [];
  if (!equip) return slots;
  slotsUsed = slotsUsed || { main: false, off: false };
  var main = equip.mainHand;
  var off = equip.offHand;
  var main2h = main && main.handedness === "2h";
  if (!slotsUsed.main && main && main.type !== "shield" && !isCombatAttackSlotBroken(main))
    slots.push("main");
  if (!main2h && !slotsUsed.off && off && off.type !== "shield" && !isCombatAttackSlotBroken(off))
    slots.push("off");
  return slots;
}

function getWeaponFromSlot(equip, slot) {
  if (!equip) return null;
  if (slot === "off") return equip.offHand;
  return equip.mainHand;
}

var NPC_TEMP_WEAPON = {
  name: "Crooked Teeth",
  type: "stabbingWeapons",
  damageMin: 1,
  damageMax: 5,
  weight: 0.5,
  durability: 100,
  reqSkill: 0,
  requiredStrength: 0,
  handedness: "1h",
  parryRemaining: 100
};

function getCombatRoundCapFromEndurance(endurance) {
  var e = endurance || 0;
  return Math.min(25, 3 + Math.floor(e / 5));
}

function buildCombatState(beastKey, surrenderPercent, tacticOverride) {
  var opp = JSON.parse(JSON.stringify(BEAST_DATABASE[beastKey]));
  if (opp.equipment) opp.equipment.mainHand = JSON.parse(JSON.stringify(NPC_TEMP_WEAPON));
  var pStats = getPlayerCombatStats();
  var npcStats = {};
  var srcStats = opp.stats || {};
  for (var nk in srcStats) npcStats[nk] = srcStats[nk];
  if (npcStats.unarmed == null) npcStats.unarmed = HIDDEN_UNARMED_SKILL;
  var surrenderPct = (typeof surrenderPercent === "number" && surrenderPercent >= 0) ? surrenderPercent : 0;
  var surrenderHp = 0;
  if (surrenderPct > 0 && player.maxHp) {
    surrenderHp = Math.round(player.maxHp * (surrenderPct / 100));
  }
  return {
    playerHp: player.hp,
    npcHp: opp.stats.health,
    playerEquip: cloneEquip(player.equipment),
    npcEquip: cloneEquip(opp.equipment),
    playerStats: pStats,
    npcStats: npcStats,
    playerSlotsUsed: { main: false, off: false },
    npcSlotsUsed: { main: false, off: false },
    playerName: player.name,
    playerGender: player.gender || "",
    npcName: opp.name,
    playerRoundCap: getCombatRoundCapFromEndurance(pStats.endurance || 0),
    npcRoundCap: getCombatRoundCapFromEndurance(opp.stats.endurance || 0),
    playerForfeitedByFatigue: false,
    npcForfeitedByFatigue: false,
    playerSummary: { damageDealt: 0, damageDealtTotal: 0, highestHit: 0, successfulAttacks: 0, parries: 0, blocks: 0, attacksReceived: 0, misses: 0, dodges: 0 },
    npcSummary: { damageDealt: 0, damageDealtTotal: 0, highestHit: 0, successfulAttacks: 0, parries: 0, blocks: 0, attacksReceived: 0, misses: 0, dodges: 0 },
    log: [],
    opp: opp,
    round: 0,
    surrenderHp: surrenderHp,
    surrenderPercent: surrenderPct,
    surrendered: false,
    combatType: "Hunt and Scavenge",
    tactic: (tacticOverride != null && tacticOverride !== "") ? tacticOverride : (player.pveTactic || "Normal")
  };
}

function resolveOneAttack(state, atkKey, defKey, slot, actionIndex, firstStrikerThisRound) {
  var atkName = atkKey === "player" ? state.playerName : state.npcName;
  var defName = defKey === "player" ? state.playerName : state.npcName;
  var atkEquip = atkKey === "player" ? state.playerEquip : state.npcEquip;
  var defEquip = defKey === "player" ? state.playerEquip : state.npcEquip;
  var atkStats = atkKey === "player" ? state.playerStats : state.npcStats;
  var defStats = defKey === "player" ? state.playerStats : state.npcStats;
  var atkUsed = atkKey === "player" ? state.playerSlotsUsed : state.npcSlotsUsed;
  var defUsed = defKey === "player" ? state.playerSlotsUsed : state.npcSlotsUsed;
  var atkSum = atkKey === "player" ? state.playerSummary : state.npcSummary;
  var defSum = defKey === "player" ? state.playerSummary : state.npcSummary;
  var weapon = getWeaponFromSlot(atkEquip, slot);
  if (!weapon || (!weapon.isFist && weapon.type !== "shield" && weapon.parryRemaining != null && weapon.parryRemaining <= 0)) {
    if (atkName) state.log.push(atkName + " has no weapon ready and cannot attack.");
    return;
  }
  atkUsed[slot] = true;

  var tacticMod = atkKey === "player" ? getPveTacticAttackModifiers(state.tactic) : { hitChanceAdd: 0, damageMult: 1 };

  var perceivedWp = getCombatantPerceivedWpForCombat(atkKey, state);
  var recommended = weapon.reqSkill != null ? weapon.reqSkill : 0;
  var wSkill = atkStats[weapon.type] || 0;
  var hitChance = computeHitChancePercent(perceivedWp, wSkill, recommended) + tacticMod.hitChanceAdd;
  if (!rollMeleeHitSuccess(hitChance)) {
    state.log.push(subst(pick(COMBAT_FLAVOR.misses), { A_NAME: atkName, D_NAME: defName }));
    atkSum.misses++;
    return;
  }
  defSum.attacksReceived++;
  var defWpDodge = getCombatantPerceivedWpForCombat(defKey, state);
  var attWpDodge = getCombatantPerceivedWpForCombat(atkKey, state);
  var dodgeChance = computeDodgeChancePercent(defStats.avoidance, wSkill, defWpDodge, attWpDodge);
  if (Math.random() * 100 < dodgeChance) {
    state.log.push(subst(pick(COMBAT_FLAVOR.dodgeSuccess), { D_NAME: defName }));
    defSum.dodges++;
    return;
  }
  state.log.push(subst(pick(COMBAT_FLAVOR.dodgeFail), { D_NAME: defName }));

  var dmg = computeMeleeAttackDamage(weapon, atkStats, tacticMod, slot);
  atkSum.damageDealtTotal += dmg;

  var choice = getCombatParryBlockChoice(defEquip, defUsed);
  if (!choice) {
    applyCombatBodyHit(state, defKey, atkName, defName, dmg, atkSum, defSum);
    return;
  }

  if (choice.kind === "fist_fail") {
    defUsed[choice.slot] = true;
    state.log.push(subst(pick(COMBAT_FLAVOR.fistParryFail), { D_NAME: defName }));
    applyCombatBodyHit(state, defKey, atkName, defName, dmg, atkSum, defSum);
    return;
  }

  if (choice.kind === "shield") {
    defUsed[choice.slot] = true;
    var sItem = choice.item;
    var defWpBlock = getCombatantPerceivedWpForCombat(defKey, state);
    var attWpBlock = getCombatantPerceivedWpForCombat(atkKey, state);
    var shieldRec = sItem.reqSkill != null ? sItem.reqSkill : 0;
    var shieldSkill = defStats[sItem.type] || 0;
    var attHitRecBlock = weapon.reqSkill != null ? weapon.reqSkill : 0;
    var attHitSkillBlock = atkStats[weapon.type] || 0;
    var blockChance = computeShieldBlockChancePercent(defWpBlock, attWpBlock, shieldSkill, shieldRec, attHitSkillBlock, attHitRecBlock);
    if (!rollMeleeHitSuccess(blockChance)) {
      state.log.push(subst(pick(COMBAT_FLAVOR.blockFail), { D_NAME: defName }));
      applyCombatBodyHit(state, defKey, atkName, defName, dmg, atkSum, defSum);
      return;
    }
    var sPrev = sItem.parryRemaining != null ? sItem.parryRemaining : 0;
    var sAbsorbed = Math.min(dmg, sPrev);
    var sNext = sPrev - dmg;
    defSum.blocks++;
    if (sNext > 0) {
      sItem.parryRemaining = sNext;
      syncCombatDefenseDurability(sItem);
      state.log.push(subst(pick(COMBAT_FLAVOR.block), { D_NAME: defName, SHIELD_NAME: sItem.name, ABSORBED: sAbsorbed, PARRY_LEFT: sItem.parryRemaining }));
    } else {
      sItem.parryRemaining = 0;
      syncCombatDefenseDurability(sItem);
      state.log.push(subst(pick(COMBAT_FLAVOR.block), { D_NAME: defName, SHIELD_NAME: sItem.name, ABSORBED: sAbsorbed, PARRY_LEFT: 0 }));
      state.log.push(subst(pick(COMBAT_FLAVOR.equipmentBroken), { D_NAME: defName, ITEM_NAME: sItem.name }));
      if (choice.slot === "main") defEquip.mainHand = null; else defEquip.offHand = null;
      var sOverflow = dmg - sPrev;
      if (sOverflow > 0) applyCombatBodyHit(state, defKey, atkName, defName, sOverflow, atkSum, defSum);
    }
    return;
  }

  if (choice.kind === "weapon") {
    defUsed[choice.slot] = true;
    var defWpParry = getCombatantPerceivedWpForCombat(defKey, state);
    var attWpParry = getCombatantPerceivedWpForCombat(atkKey, state);
    var parryWeapon = choice.item;
    var attackWeapon = weapon;
    var defParryRec = parryWeapon.reqSkill != null ? parryWeapon.reqSkill : 0;
    var defParrySkill = defStats[parryWeapon.type] || 0;
    var attHitRec = attackWeapon.reqSkill != null ? attackWeapon.reqSkill : 0;
    var attHitSkill = atkStats[attackWeapon.type] || 0;
    var parryChance = computeParryChancePercent(defWpParry, attWpParry, defParrySkill, defParryRec, attHitSkill, attHitRec);
    if (!rollMeleeHitSuccess(parryChance)) {
      state.log.push(subst(pick(COMBAT_FLAVOR.parryFail), { D_NAME: defName }));
      applyCombatBodyHit(state, defKey, atkName, defName, dmg, atkSum, defSum);
      return;
    }
    var item = choice.item;
    var prevParry = item.parryRemaining != null ? item.parryRemaining : 0;
    var absorbed = Math.min(dmg, prevParry);
    var nextParry = prevParry - dmg;
    defSum.parries++;
    if (nextParry > 0) {
      item.parryRemaining = nextParry;
      syncCombatDefenseDurability(item);
      state.log.push(subst(pick(COMBAT_FLAVOR.parry), { D_NAME: defName, W_NAME: item.name, ABSORBED: absorbed, PARRY_LEFT: item.parryRemaining }));
      return;
    }
    item.parryRemaining = 0;
    syncCombatDefenseDurability(item);
    var brokenName = item.name;
    state.log.push(subst(pick(COMBAT_FLAVOR.parry), { D_NAME: defName, W_NAME: brokenName, ABSORBED: absorbed, PARRY_LEFT: 0 }));
    breakDefenderWeaponToFist(state, defEquip, choice.slot, brokenName, defName);
    var overflowW = dmg - prevParry;
    if (overflowW > 0) applyCombatBodyHit(state, defKey, atkName, defName, overflowW, atkSum, defSum);
    return;
  }
}

function runCombat(state) {
  var maxRounds = 80;
  while (!state.surrendered && state.playerHp > 0 && state.npcHp > 0 && state.round < maxRounds) {
    state.round++;
    if (state.round > state.playerRoundCap && state.round > state.npcRoundCap) {
      state.playerForfeitedByFatigue = true;
      state.npcForfeitedByFatigue = true;
      state.log.push(state.playerName + " and " + state.npcName + " are both too exhausted to continue.");
      state.playerHp = 0;
      state.npcHp = 0;
      break;
    }
    if (state.round > state.playerRoundCap) {
      state.playerForfeitedByFatigue = true;
      state.log.push(state.playerName + " is too exhausted to continue and forfeits the match.");
      state.playerHp = 0;
      break;
    }
    if (state.round > state.npcRoundCap) {
      state.npcForfeitedByFatigue = true;
      state.log.push(state.npcName + " is too exhausted to continue and forfeits the match.");
      state.npcHp = 0;
      break;
    }
    state.playerSlotsUsed = { main: false, off: false };
    state.npcSlotsUsed = { main: false, off: false };
    state.log.push("<strong>Round " + state.round + "</strong>");

    var firstStriker = rollMeleeHitSuccess(computePlayerFirstStrikeChancePercent(state)) ? "player" : "npc";

    var pOpen = getAttackerSlots(state.playerEquip, state.playerSlotsUsed);
    var nOpen = getAttackerSlots(state.npcEquip, state.npcSlotsUsed);
    if (pOpen.length === 0 && nOpen.length === 0) break;
    var pActionIndex = 0;
    var nActionIndex = 0;

    function logPlayerAttackSwing(slot) {
      var isFirst = pActionIndex === 0;
      if (isFirst && firstStriker === "player")
        state.log.push(subst(pick(COMBAT_FLAVOR.roundOpeners), { A_NAME: state.playerName, D_NAME: state.npcName }));
      var pw = getWeaponFromSlot(state.playerEquip, slot);
      if (slot === "off" && state.playerSlotsUsed.main)
        state.log.push(subst(pick(COMBAT_FLAVOR.offHandAttack), { A_NAME: state.playerName, D_NAME: state.npcName }));
      else
        state.log.push(subst(pick(COMBAT_FLAVOR.universalAttack), { A_NAME: state.playerName, D_NAME: state.npcName, W_NAME: (pw && pw.name) || "weapon" }));
    }
    function logNpcAttackSwing(slot) {
      var isFirst = nActionIndex === 0;
      if (isFirst && firstStriker === "npc")
        state.log.push(subst(pick(COMBAT_FLAVOR.roundOpeners), { A_NAME: state.npcName, D_NAME: state.playerName }));
      var nw = getWeaponFromSlot(state.npcEquip, slot);
      if (slot === "off" && state.npcSlotsUsed.main)
        state.log.push(subst(pick(COMBAT_FLAVOR.offHandAttack), { A_NAME: state.npcName, D_NAME: state.playerName }));
      else
        state.log.push(subst(pick(COMBAT_FLAVOR.universalAttack), { A_NAME: state.npcName, D_NAME: state.playerName, W_NAME: (nw && nw.name) || "weapon" }));
    }

    if (firstStriker === "player") {
      while (state.npcHp > 0) {
        var pSlotsNow = getAttackerSlots(state.playerEquip, state.playerSlotsUsed);
        if (pSlotsNow.length === 0) break;
        var pSlot = pSlotsNow[0];
        logPlayerAttackSwing(pSlot);
        resolveOneAttack(state, "player", "npc", pSlot, pActionIndex, firstStriker);
        pActionIndex++;
        if (state.npcHp <= 0) break;
      }
      if (state.npcHp <= 0) continue;
      while (state.playerHp > 0) {
        var nSlotsNow = getAttackerSlots(state.npcEquip, state.npcSlotsUsed);
        if (nSlotsNow.length === 0) break;
        var nSlot = nSlotsNow[0];
        logNpcAttackSwing(nSlot);
        resolveOneAttack(state, "npc", "player", nSlot, nActionIndex, firstStriker);
        nActionIndex++;
        if (state.playerHp <= 0) break;
      }
    } else {
      while (state.playerHp > 0) {
        var nSlotsNow2 = getAttackerSlots(state.npcEquip, state.npcSlotsUsed);
        if (nSlotsNow2.length === 0) break;
        var nSlot2 = nSlotsNow2[0];
        logNpcAttackSwing(nSlot2);
        resolveOneAttack(state, "npc", "player", nSlot2, nActionIndex, firstStriker);
        nActionIndex++;
        if (state.surrenderHp && state.playerHp <= state.surrenderHp && !state.surrendered) {
          state.surrendered = true;
          var pronoun = (state.playerGender === "female") ? "her" : "his";
          state.log.push(state.playerName + " falls to " + pronoun + " knees, signaling to the crowd to show mercy and spare " + pronoun + " life.");
          break;
        }
        if (state.playerHp <= 0) break;
      }
      if (state.surrendered || state.playerHp <= 0) continue;
      while (state.npcHp > 0) {
        var pSlotsNow2 = getAttackerSlots(state.playerEquip, state.playerSlotsUsed);
        if (pSlotsNow2.length === 0) break;
        var pSlot2 = pSlotsNow2[0];
        logPlayerAttackSwing(pSlot2);
        resolveOneAttack(state, "player", "npc", pSlot2, pActionIndex, firstStriker);
        pActionIndex++;
        if (state.npcHp <= 0) break;
      }
    }
  }
}

// Used by Hunt NPC combat and any future combat (Skirmish, Challenges, etc.).
// HP is already set from combat in startCombat; addXp only full-heals on level-up, not on every win.
function renderCombatResult(win, state, rewards) {
  var opp = state.opp;
  var baseLog = state.log.slice();
  var log = [];
  var blueColor = "#2e86ff";
  var orangeColor = "#d97900";
  var colorSpan = function(txt, color) { return "<span style='color:" + color + "; font-weight:bold'>" + txt + "</span>"; };
  var escapeRegExp = function(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
  var colorizeNames = function(line) {
    var out = String(line);
    if (state.playerName) out = out.replace(new RegExp(escapeRegExp(state.playerName), "g"), colorSpan(state.playerName, blueColor));
    if (state.npcName) out = out.replace(new RegExp(escapeRegExp(state.npcName), "g"), colorSpan(state.npcName, orangeColor));
    return out;
  };
  var combatType = state.combatType || "Unknown";
  var tactic = state.tactic || (player.pveTactic || "Normal");
  var surrenderPct = (typeof state.surrenderPercent === "number") ? state.surrenderPercent : 0;
  var raceText = (player.race || "").charAt(0).toUpperCase() + (player.race || "").slice(1);
  var genderText = (player.gender || "").charAt(0).toUpperCase() + (player.gender || "").slice(1);
  log.push("Type: " + combatType);
  log.push("Your tactic: " + tactic + " - surrender at " + surrenderPct + "%");
  log.push(colorSpan("Team Blue:", blueColor) + " " + colorSpan(state.playerName, blueColor) + " (" + raceText + " " + genderText + " " + formatLevel(player.level) + ")");
  var oppLevel = opp && typeof opp.level !== "undefined" ? opp.level : (state.npcStats && state.npcStats.level);
  log.push(colorSpan("Team Orange:", orangeColor) + " " + colorSpan(state.npcName, orangeColor) + " (Level " + (oppLevel != null ? oppLevel : "?") + ")");
  log.push("");
  for (var bi = 0; bi < baseLog.length; bi++) {
    log.push(colorizeNames(baseLog[bi]));
  }
  if (win) {
    var xpGained = (rewards && typeof rewards.xpGained === "number") ? rewards.xpGained : (opp.xpReward || 0);
    var coinsGained = (rewards && typeof rewards.coinsGained === "number") ? rewards.coinsGained : null;
    if (coinsGained == null) {
      var gold = opp.goldReward;
      coinsGained = 0;
      if (Array.isArray(gold)) {
        var min = Number(gold[0]) || 0;
        var max = Number(gold[1]) || min;
        if (max < min) { var tmp = min; min = max; max = tmp; }
        coinsGained = Math.floor(Math.random() * (max - min + 1)) + min;
      } else if (gold) {
        coinsGained = gold;
      }
    }
    var winHeader = "<h4 style='color:" + blueColor + "'>Team Blue is Victorious</h4>";
    log.push(winHeader);
    log.push(colorizeNames(subst(pick(COMBAT_FLAVOR.victoryLoss), { WINNER_NAME: state.playerName, LOSER_NAME: state.npcName })));
    log.push(colorizeNames(state.playerName + " is rewarded " + xpGained + " Exp and " + coinsGained + " coins for this extraordinary performance."));
  } else {
    var loseHeader = "<h4 style='color:" + orangeColor + "'>Team Orange is Victorious</h4>";
    log.push(loseHeader);
    if (player.hp <= 0 && player.isDead)
      log.push(colorizeNames(subst(pick(COMBAT_FLAVOR.kia), { WINNER_NAME: state.npcName, LOSER_NAME: state.playerName })));
    else if (player.hp <= 0)
      log.push(colorizeNames(subst(pick(COMBAT_FLAVOR.hospitalized), { LOSER_NAME: state.playerName })));
    else
      log.push(colorizeNames(subst(pick(COMBAT_FLAVOR.victoryLoss), { WINNER_NAME: state.npcName, LOSER_NAME: state.playerName })));
  }
  log.push("<h4 style='margin-top:12px; color:#000000'>Post-Match Statistics</h4>");
  log.push("<table style='width:100%; border-collapse:collapse; font-size:0.9em; color:#000000'>");
  log.push("<tr><th style='text-align:left; border:1px solid #666'>Stat</th><th style='border:1px solid #666; color:#2e86ff'>" + state.playerName + "</th><th style='border:1px solid #666; color:#d97900'>" + state.npcName + "</th></tr>");
  var p = state.playerSummary;
  var n = state.npcSummary;
  log.push("<tr><td style='border:1px solid #666'>Damage Dealt</td><td style='border:1px solid #666'>" + p.damageDealt + " (Total " + p.damageDealtTotal + ")</td><td style='border:1px solid #666'>" + n.damageDealt + " (Total " + n.damageDealtTotal + ")</td></tr>");
  log.push("<tr><td style='border:1px solid #666'>Highest Hit</td><td style='border:1px solid #666'>" + p.highestHit + "</td><td style='border:1px solid #666'>" + n.highestHit + "</td></tr>");
  log.push("<tr><td style='border:1px solid #666'>Successful Attacks</td><td style='border:1px solid #666'>" + p.successfulAttacks + "</td><td style='border:1px solid #666'>" + n.successfulAttacks + "</td></tr>");
  log.push("<tr><td style='border:1px solid #666'>Dodges</td><td style='border:1px solid #666'>" + p.dodges + "</td><td style='border:1px solid #666'>" + n.dodges + "</td></tr>");
  log.push("<tr><td style='border:1px solid #666'>Parries</td><td style='border:1px solid #666'>" + p.parries + "</td><td style='border:1px solid #666'>" + n.parries + "</td></tr>");
  log.push("<tr><td style='border:1px solid #666'>Blocks</td><td style='border:1px solid #666'>" + p.blocks + "</td><td style='border:1px solid #666'>" + n.blocks + "</td></tr>");
  log.push("<tr><td style='border:1px solid #666'>Times Attacked</td><td style='border:1px solid #666'>" + p.attacksReceived + "</td><td style='border:1px solid #666'>" + n.attacksReceived + "</td></tr>");
  log.push("<tr><td style='border:1px solid #666'>Misses</td><td style='border:1px solid #666'>" + p.misses + "</td><td style='border:1px solid #666'>" + n.misses + "</td></tr>");
  var playerHpAfter = Math.max(0, Math.min(state.playerHp, player.maxHp || 9999));
  var npcMaxHp = (state.opp && state.opp.stats && state.opp.stats.health) || 0;
  log.push("<tr><td style='border:1px solid #666'>HP after battle</td><td style='border:1px solid #666'>" + Math.round(playerHpAfter) + " / " + Math.round(player.maxHp || 0) + "</td><td style='border:1px solid #666'>" + Math.round(state.npcHp) + " / " + Math.round(npcMaxHp) + "</td></tr>");
  log.push("</table>");
  var t = document.getElementById("combat-log-text");
  if (t) {
    t.innerHTML = log.map(function(l) { return "<div class='combat-log-line'>" + l + "</div>"; }).join("");
  }
  var main = document.querySelector(".main-content");
  if (main && typeof main.scrollTop === "number") {
    main.scrollTop = 0;
  }
  showPage("combat-log");
}

// Server-authoritative battle resolver (prototype: runs locally, persists outcomes + cached state).
function serverResolveBattle(beastKey, surrenderPercent, tacticOverride) {
  var state = buildCombatState(beastKey, surrenderPercent, tacticOverride);
  runCombat(state);
  var winNow = !state.surrendered && state.playerHp > 0;
  var battleId = getNextBattleId();
  var rewards = { xpGained: 0, coinsGained: 0 };
  if (winNow) {
    var opp = state.opp || {};
    rewards.xpGained = opp.xpReward || 0;
    var gold = opp.goldReward;
    if (Array.isArray(gold)) {
      var min = Number(gold[0]) || 0;
      var max = Number(gold[1]) || min;
      if (max < min) { var tmp = min; min = max; max = tmp; }
      rewards.coinsGained = Math.floor(Math.random() * (max - min + 1)) + min;
    } else if (gold) {
      rewards.coinsGained = gold;
    }
  }
  return { state: state, winNow: winNow, rewards: rewards, battleId: battleId };
}

function startCombat(beastKey, surrenderPercent, tacticOverride) {
  if (player.isHospitalized || player.isDead) return;
  if (player.energy < 5) { alert("Too tired!"); return; }
  var battle = serverResolveBattle(beastKey, surrenderPercent, tacticOverride);
  var state = battle.state;
  var winNow = battle.winNow;
  var battleId = battle.battleId;
  var characterId = getLocalCharacterId();
  if (isBattleProcessed(characterId, battleId)) {
    // Already processed: do not apply rewards / energy / condition again.
    // Refresh from cached state snapshot so HP/death flags match server.
    var snap = getPersistCharacterStateSnapshot(characterId);
    var rehydrated = snapshotRecordToPlayer(snap);
    if (rehydrated) player = rehydrated;
    playerCreated = true;
    refreshStatsUI();
    renderCombatResult(winNow, state, battle.rewards);
    return;
  }
  player.hp = state.playerHp;
  if (playerCreated) updateMaxHp();
  if (player.hp <= 0) resolveDeathOrInfirmary();
  // Clamp only for upper bound; allow negative HP so UI can show e.g. -4 / 37 while bar is empty.
  player.hp = Math.min(player.maxHp || 9999, player.hp);
  refreshStatsUI();
  player.energy -= 5;
  player.condition = Math.max(0, (player.condition != null ? player.condition : 100) - 1);
  // Apply server-provided rewards once (prototype: computed inside serverResolveBattle).
  if (winNow && battle.rewards) {
    if (battle.rewards.xpGained) addXp(battle.rewards.xpGained);
    if (battle.rewards.coinsGained) player.coins += battle.rewards.coinsGained;
  }
  // Treat surrender as a defeat even if playerHp > 0
  renderCombatResult(winNow, state, battle.rewards);
  refreshStatsUI();
  try {
    persistBattleResolvedEvent(beastKey, state, winNow, battleId);
  } catch (e) {}
  try {
    persistSnapshot();
  } catch (e) {}
  setTimeout(function() { refreshStatsUI(); }, 0);
}

function getDeathPoint(level) {
  if (level >= 26) return 0;
  return level - 26;
}

function getNoPenaltyMax(level) {
  if (level > 15) return null;
  return level - 15;
}

function getInfirmaryMinutes(level, hp) {
  if (level >= 1 && level <= 10) return 20;
  if (level >= 11 && level <= 15) return 40;
  if (level >= 16 && level <= 25) {
    var deathPoint = getDeathPoint(level);
    var t = 135 - (10 * (hp - deathPoint - 1));
    return Math.max(45, Math.min(135, Math.round(t)));
  }
  return 45;
}

function resolveDeathOrInfirmary() {
  var lvl = player.level;
  var hp = player.hp;
  var deathPoint = getDeathPoint(lvl);
  if (hp <= deathPoint) {
    player.isDead = true;
    try {
      appendCharacterEvents(getLocalCharacterId(), [{
        type: EVENT_TYPES.DEATH,
        payload: { hp: player.hp, isDead: true }
      }]);
    } catch (e) {}
    maybeShowDeathOverlay();
    return;
  }
  var noPenaltyMax = getNoPenaltyMax(lvl);
  if (noPenaltyMax != null && hp >= noPenaltyMax) return;
  var mins = getInfirmaryMinutes(lvl, hp);
  player.isHospitalized = true;
  player.hospitalEndsAt = Date.now() + mins * 60 * 1000;
  updateHospitalUI();
  try {
    appendCharacterEvents(getLocalCharacterId(), [{
      type: EVENT_TYPES.HOSPITALIZED,
      payload: { hp: player.hp, untilMs: player.hospitalEndsAt }
    }]);
  } catch (e) {}
}

// --- 8. EXPERIENCE / LEVEL-UP LOGIC ---
var MAX_LEVEL = 60;

function xpNeededForLevel(level) {
  if (level <= MAX_LEVEL) {
    return (level * level * 14) + 50;
  }
  // Prestige levels: flat 50,000 XP each
  return 50000;
}

function formatLevel(level) {
  if (level <= MAX_LEVEL) return "Level " + level;
  return "Level " + MAX_LEVEL + "+" + (level - MAX_LEVEL);
}

function addXp(amount) {
  if (!amount || amount <= 0) return;
  player.xp += amount;
  player.totalXpGained = (player.totalXpGained || 0) + amount;

  while (player.xp >= xpNeededForLevel(player.level)) {
    player.xp -= xpNeededForLevel(player.level);
    player.level += 1;
    if (player.level <= MAX_LEVEL) {
      player.unspentPoints += 10;
    } else {
      player.unspentPoints += 1;
    }
    updateMaxHp();
    player.hp = player.maxHp; // 100% HP when you level up (any source: NPC win, future Skirmish/Challenges, etc.)
  }

  updateMaxHp();
  refreshStatsUI();
  updateLevelupUI();
}

function hasPendingLevelupChanges() {
  for (var key in pendingLevelupStats) {
    if (pendingLevelupStats[key] !== 0) return true;
  }
  return false;
}

function getPendingLevelupTotal() {
  var sum = 0;
  for (var key in pendingLevelupStats) {
    sum += pendingLevelupStats[key] || 0;
  }
  return sum;
}

function updateLevelupUI() {
  var saveBtn = document.getElementById('save-abilities-btn');
  var levelIcon = document.getElementById('level-up-indicator');
  var banner = document.getElementById('new-levelup-banner');
  var pointsLine = document.getElementById('points-to-spend-line');
  var pointsText = document.getElementById('points-to-spend-text');

  var pending = hasPendingLevelupChanges();
  var totalPointsThisBatch = player.unspentPoints + getPendingLevelupTotal();
  var hasPointsToSpend = totalPointsThisBatch > 0;
  var allPointsSpent = player.unspentPoints === 0;
  var canSave = allPointsSpent && pending;

  if (banner) {
    banner.style.display = (player.unspentPoints > 0) ? 'block' : 'none';
  }

  if (pointsLine && pointsText) {
    if (hasPointsToSpend) {
      pointsLine.style.display = 'block';
      pointsText.innerText = player.unspentPoints + " / " + totalPointsThisBatch;
    } else {
      pointsLine.style.display = 'none';
    }
  }

  if (saveBtn) {
    saveBtn.style.display = (hasPointsToSpend || pending) ? 'block' : 'none';
    saveBtn.disabled = !canSave;
  }

  if (levelIcon) {
    levelIcon.style.display = (player.unspentPoints > 0) ? 'flex' : 'none';
  }
}

function saveAbilityPoints() {
  // Apply pending allocations into player.skills
  for (var stat in pendingLevelupStats) {
    var val = pendingLevelupStats[stat] || 0;
    if (val !== 0) {
      var mult = getRaceGenderMultiplier(stat, player.race, player.gender);
      var effDelta = val * mult;
      player.skills[stat] = (player.skills[stat] || 0) + effDelta;
      pendingLevelupStats[stat] = 0;
    }
  }

  updateMaxHp();
  generateAbilityList('main-ability-list', player.unspentPoints > 0, 'levelup');
  refreshStatsUI();
  updateLevelupUI();
}

window.onload = function() {
  loadPersistedStateIfAny();
  refreshStatsUI();
  startTickTimer();
  maybeShowDeathOverlay();
  applyInfoDevUnlockUI();
};
function manualStatEntry(stat, newValue, mode) {
  mode = mode || 'creation';
  newValue = parseInt(newValue) || 0;
  if (newValue < 0) newValue = 0;

  if (mode === 'creation') {
    var currentSpent = tempStats[stat] || 0;
    var diff = newValue - currentSpent;
    if (diff > creationPoints) {
      newValue = currentSpent + creationPoints;
      diff = newValue - currentSpent;
    }
    tempStats[stat] = newValue;
    creationPoints -= diff;
    updateCreationUI();
    generateAbilityList('creation-ability-list', true, 'creation');
  } else if (mode === 'levelup') {
    var current = pendingLevelupStats[stat] || 0;
    var diffLvl = newValue - current;
    if (diffLvl > player.unspentPoints) {
      newValue = current + player.unspentPoints;
      diffLvl = newValue - current;
    }
    pendingLevelupStats[stat] = newValue;
    player.unspentPoints -= diffLvl;
    generateAbilityList('main-ability-list', true, 'levelup');
    updateLevelupUI();
  }
}

var TACTIC_OPTIONS = ["Normal", "Normal - Light", "Normal - Heavy", "Offensive", "Offensive - Light", "Offensive - Heavy", "Defensive", "Defensive - Light", "Defensive - Heavy"];

function fillTacticSelect(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  for (var i = 0; i < TACTIC_OPTIONS.length; i++) {
    var opt = document.createElement("option");
    opt.value = TACTIC_OPTIONS[i];
    opt.textContent = TACTIC_OPTIONS[i];
    selectEl.appendChild(opt);
  }
}

function fillSurrenderSelect(selectEl, maxHp) {
  if (!selectEl || maxHp == null) return;
  var percents = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];
  selectEl.innerHTML = "";
  for (var i = 0; i < percents.length; i++) {
    var pct = percents[i];
    var hp = Math.round(maxHp * pct / 100);
    var opt = document.createElement("option");
    opt.value = pct;
    opt.textContent = pct + "% - " + hp + " HP";
    selectEl.appendChild(opt);
  }
}

function setPvpTactic(val) { player.pvpTactic = val || "Normal"; }
function setPvpSurrenderAt(val) { player.pvpSurrenderAt = val; }
function setPvpTeamClashAt(val) { player.pvpTeamClashAt = val; }
function setPveTactic(val) { player.pveTactic = val || "Normal"; }
function setPveSurrenderAt(val) { player.pveSurrenderAt = val; }

function updateInfoPage() {
    var infoImg = document.getElementById('info-portrait');
    if (infoImg && player.portrait) {
        infoImg.src = player.portrait;
    }

    var rEl = document.getElementById('select-race');
    var gEl = document.getElementById('select-gender');
    var rVal = rEl ? rEl.value : "";
    var gVal = gEl ? gEl.value : "";
    var raceText = rVal ? rVal.charAt(0).toUpperCase() + rVal.slice(1) : "";
    var genderText = gVal ? gVal.charAt(0).toUpperCase() + gVal.slice(1) : "";

    var infoName = document.getElementById('info-name');
    var infoRaceGender = document.getElementById('info-race-gender');
    var infoLevel = document.getElementById('info-level');
    if (infoName) infoName.innerText = player.name || "";
    if (infoRaceGender) infoRaceGender.innerText = (raceText || genderText) ? (raceText + " " + genderText) : "";
    if (infoLevel) infoLevel.innerText = formatLevel(player.level);

    var infoTotalXp = document.getElementById('info-total-xp');
    if (infoTotalXp) infoTotalXp.textContent = (player.totalXpGained || 0);

    var maxHp = player.maxHp || 100;
    var pvpTacticSel = document.getElementById('info-pvp-tactic');
    var pvpSurrenderSel = document.getElementById('info-pvp-surrender');
    var pvpTeamClashSel = document.getElementById('info-pvp-teamclash');
    var pveTacticSel = document.getElementById('info-pve-tactic');
    var pveSurrenderSel = document.getElementById('info-pve-surrender');

    if (pvpTacticSel) { fillTacticSelect(pvpTacticSel); pvpTacticSel.value = player.pvpTactic || "Normal"; }
    if (pvpSurrenderSel) { fillSurrenderSelect(pvpSurrenderSel, maxHp); pvpSurrenderSel.value = String(player.pvpSurrenderAt != null ? player.pvpSurrenderAt : 30); }
    if (pvpTeamClashSel) { fillSurrenderSelect(pvpTeamClashSel, maxHp); pvpTeamClashSel.value = String(player.pvpTeamClashAt != null ? player.pvpTeamClashAt : 30); }
    if (pveTacticSel) { fillTacticSelect(pveTacticSel); pveTacticSel.value = player.pveTactic || "Normal"; }
    if (pveSurrenderSel) { fillSurrenderSelect(pveSurrenderSel, maxHp); pveSurrenderSel.value = String(player.pveSurrenderAt != null ? player.pveSurrenderAt : 30); }
}

function openDeleteCombatantModal() {
  var overlay = document.getElementById('delete-combatant-overlay');
  var input = document.getElementById('delete-combatant-name-input');
  var btn = document.getElementById('delete-combatant-confirm-btn');
  if (overlay) overlay.style.display = 'flex';
  if (input) { input.value = ''; input.placeholder = 'Enter Combatant name to activate'; }
  if (btn) btn.disabled = true;
}

function closeDeleteCombatantModal() {
  var overlay = document.getElementById('delete-combatant-overlay');
  if (overlay) overlay.style.display = 'none';
}

function toggleDeleteConfirmButton() {
  var input = document.getElementById('delete-combatant-name-input');
  var btn = document.getElementById('delete-combatant-confirm-btn');
  if (!btn || !input) return;
  var match = (input.value.trim() === (player.name || '').trim());
  btn.disabled = !match;
}

function confirmDeleteCombatant() {
  var input = document.getElementById('delete-combatant-name-input');
  if (!input || input.value.trim() !== (player.name || '').trim()) return;
  closeDeleteCombatantModal();
  playerCreated = false;
  player = {
    name: "",
    hp: 100,
    maxHp: 100,
    coins: 0,
    xp: 0,
    level: 1,
    energy: 50,
    condition: 37,
    portrait: "",
    race: "",
    gender: "",
    skills: {},
    unspentPoints: 0,
    inventory: [],
    equipment: {
      mainHand: null,
      offHand: null,
      head: null,
      torso: null,
      shoulders: null,
      legs: null,
      hands: null,
      feet: null
    },
    accessories: {
      necklace: null,
      cloak: null,
      belt: null,
      ring1: null,
      ring2: null,
      armband: null,
      charm: null
    },
    dailyHuntCount: 0,
    dailyHuntDate: "",
    isHospitalized: false,
    hospitalEndsAt: 0,
    isDead: false,
    totalXpGained: 0,
    pvpTactic: "Normal",
    pvpSurrenderAt: 30,
    pvpTeamClashAt: 30,
    pveTactic: "Normal",
    pveSurrenderAt: 30
  };
  document.querySelector('.creation-box').style.display = 'block';
  document.getElementById('welcome-back').style.display = 'none';
  resetCreationDraftState();
  nextStep(1);
  showPage('start');
}

var infoDevSecretState = { leftAck: false, rightAck: false, unlocked: false };

function infoDevSecretLeftClick() {
  if (infoDevSecretState.leftAck) return;
  infoDevSecretState.leftAck = true;
  infoDevSecretTryToggle();
}

function infoDevSecretRightClick() {
  if (infoDevSecretState.rightAck) return;
  infoDevSecretState.rightAck = true;
  infoDevSecretTryToggle();
}

function infoDevSecretTryToggle() {
  if (!infoDevSecretState.leftAck || !infoDevSecretState.rightAck) return;
  infoDevSecretState.leftAck = false;
  infoDevSecretState.rightAck = false;
  infoDevSecretState.unlocked = !infoDevSecretState.unlocked;
  applyInfoDevUnlockUI();
}

function applyInfoDevUnlockUI() {
  var wrap = document.getElementById("info-test-buttons");
  if (!wrap) return;
  if (infoDevSecretState.unlocked) wrap.classList.remove("info-test-buttons-hidden");
  else wrap.classList.add("info-test-buttons-hidden");
}

function isInfoDevTestUnlocked() {
  return !!infoDevSecretState.unlocked;
}

function addTestXp() {
  if (!playerCreated || !isInfoDevTestUnlocked()) return;
  addXp(100);
}

function addTestXp1000() {
  if (!playerCreated || !isInfoDevTestUnlocked()) return;
  addXp(1000);
}

function addTestXp10000() {
  if (!playerCreated || !isInfoDevTestUnlocked()) return;
  addXp(10000);
}

function addTestXp100000() {
  if (!playerCreated || !isInfoDevTestUnlocked()) return;
  addXp(100000);
}

function addTestCoins() {
  if (!playerCreated || !isInfoDevTestUnlocked()) return;
  player.coins = (player.coins || 0) + 100;
  refreshStatsUI();
}

function maybeShowDeathOverlay() {
  var overlay = document.getElementById('death-overlay');
  if (!overlay) return;
  if (player && player.isDead) {
    overlay.style.display = 'flex';
  } else {
    overlay.style.display = 'none';
  }
}

function closeDeathOverlay() {
  var overlay = document.getElementById('death-overlay');
  if (overlay) overlay.style.display = 'none';
}

function createNewCombatantFromDeath() {
  // For now, simply reload the page to start fresh character creation.
  window.location.reload();
}