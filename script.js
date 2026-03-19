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
    xpReward: 20, goldReward: [5, 12],
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
    xpReward: 25, goldReward: [3, 8],
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
    xpReward: 10, goldReward: [2, 5],
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
    xpReward: 30, goldReward: [4, 10],
    description: "Be wary of its silk; this arachnid relies on slowing its prey before delivering a numbing bite.",
    challengeMin: 7, challengeMax: 10,
    loot: [{ name: "Spider silk", chance: "high" }, { name: "Venom sac", chance: "medium" }]
  },
  "goblin-scavenger": {
    name: "Goblin Scavenger", level: 11,
    stats: { health: 50, strength: 30, endurance: 15, initiative: 20, avoidance: 10, stabbingWeapons: 35 },
    equipment: { mainHand: { name: "Rusted Shiv", type: "stabbingWeapons", damage: 10, weight: 1, durability: 80, reqSkill: 25 }, offHand: null },
    xpReward: 30, goldReward: [5, 14],
    description: "Armed with nothing but a rusted shiv and malice, this small foe is surprisingly cunning in close quarters.",
    challengeMin: 8, challengeMax: 12,
    loot: [{ name: "Rusty blade", chance: "high" }, { name: "Goblin ear", chance: "low" }]
  },
  "venomous-viper": {
    name: "Venomous Viper", level: 13,
    stats: { health: 30, strength: 20, endurance: 10, initiative: 35, avoidance: 35, stabbingWeapons: 30 },
    equipment: { mainHand: { name: "Venom fang", type: "stabbingWeapons", damage: 8, weight: 0.5, durability: 100, reqSkill: 25 }, offHand: null },
    xpReward: 35, goldReward: [6, 16],
    description: "It may be small, but one successful strike can leave a gladiator fighting the clock against spreading poison.",
    challengeMin: 10, challengeMax: 14,
    loot: [{ name: "Venom gland", chance: "medium" }, { name: "Snakeskin", chance: "high" }]
  },
  "silver-gazelle": {
    name: "Silver-Horned Gazelle (passive)", level: 15,
    stats: { health: 55, strength: 20, endurance: 45, initiative: 15, avoidance: 45, stabbingWeapons: 20 },
    equipment: { mainHand: { name: "Silver horn", type: "sword", damage: 6, weight: 2, durability: 200, reqSkill: 15 }, offHand: null },
    xpReward: 15, goldReward: [3, 8],
    description: "It glides across the arena like a ghost; striking it is nearly impossible, and it will surely outlast a weary fighter.",
    challengeMin: 10, challengeMax: 18,
    loot: [{ name: "Silver horn fragment", chance: "low" }, { name: "Gazelle hide", chance: "medium" }]
  },
  "crazed-brigand": {
    name: "Crazed Brigand", level: 17,
    stats: { health: 65, strength: 55, endurance: 15, initiative: 25, avoidance: 20, stabbingWeapons: 40 },
    equipment: { mainHand: { name: "Crude blade", type: "sword", damage: 18, weight: 3, durability: 150, reqSkill: 35 }, offHand: null },
    xpReward: 40, goldReward: [8, 22],
    description: "A low-life criminal forced into the arena; he fights dirty and cares little for the rules of engagement.",
    challengeMin: 14, challengeMax: 18,
    loot: [{ name: "Stolen coin purse", chance: "high" }, { name: "Dented blade", chance: "medium" }]
  },
  "feral-bobcat": {
    name: "Feral Bobcat", level: 19,
    stats: { health: 55, strength: 40, endurance: 25, initiative: 45, avoidance: 40, stabbingWeapons: 55 },
    equipment: { mainHand: { name: "Claws", type: "stabbingWeapons", damage: 14, weight: 0.5, durability: 120, reqSkill: 45 }, offHand: null },
    xpReward: 40, goldReward: [8, 20],
    description: "Faster and more aggressive than a house cat, its razor-sharp claws can shred leather armor in seconds.",
    challengeMin: 15, challengeMax: 19,
    loot: [{ name: "Bobcat pelt", chance: "medium" }, { name: "Sharp claw", chance: "high" }]
  },
  "skeletal-sentry": {
    name: "Skeletal Sentry", level: 21,
    stats: { health: 60, strength: 70, endurance: 35, initiative: 10, avoidance: 5, stabbingWeapons: 80 },
    equipment: { mainHand: { name: "Rusty sword", type: "sword", damage: 22, weight: 3, durability: 200, reqSkill: 70 }, offHand: null },
    xpReward: 45, goldReward: [10, 25],
    description: "A mindless pile of bones held together by weak magic, it feels no pain and never tires.",
    challengeMin: 17, challengeMax: 21,
    loot: [{ name: "Bone fragment", chance: "high" }, { name: "Ancient blade", chance: "low" }]
  },
  "orc-brawler": {
    name: "Orc Brawler", level: 23,
    stats: { health: 80, strength: 90, endurance: 30, initiative: 15, avoidance: 10, stabbingWeapons: 55 },
    equipment: { mainHand: { name: "Spiked club", type: "blunt", damage: 28, weight: 6, durability: 300, reqSkill: 50 }, offHand: null },
    xpReward: 45, goldReward: [12, 28],
    description: "He doesn't use a shield because he enjoys the feeling of steel hitting his skin; a brute who fights with pure rage.",
    challengeMin: 19, challengeMax: 23,
    loot: [{ name: "Orc tusk", chance: "medium" }, { name: "Heavy club", chance: "low" }]
  },
  "aurelian-sun-stag": {
    name: "Aurelian Sun-Stag (passive)", level: 25,
    stats: { health: 70, strength: 35, endurance: 50, initiative: 35, avoidance: 70, stabbingWeapons: 40 },
    equipment: { mainHand: { name: "Golden antler", type: "sword", damage: 12, weight: 2, durability: 250, reqSkill: 35 }, offHand: null },
    xpReward: 20, goldReward: [5, 15],
    description: "A creature of myth with a coat that shimmers like a summer noon; its radiance makes it a nightmare to corner.",
    challengeMin: 18, challengeMax: 28,
    loot: [{ name: "Golden antler shard", chance: "low" }, { name: "Sun-stag hide", chance: "medium" }]
  },
  "mountain-lion": {
    name: "Mountain Lion", level: 27,
    stats: { health: 65, strength: 50, endurance: 30, initiative: 55, avoidance: 50, stabbingWeapons: 50 },
    equipment: { mainHand: { name: "Razor claws", type: "stabbingWeapons", damage: 18, weight: 1, durability: 150, reqSkill: 45 }, offHand: null },
    xpReward: 50, goldReward: [12, 30],
    description: "It stalks the high ledges of the arena, waiting for the perfect moment to deliver a pounce that can snap a neck.",
    challengeMin: 22, challengeMax: 27,
    loot: [{ name: "Lion pelt", chance: "medium" }, { name: "Predator fang", chance: "high" }]
  },
  "iron-mercenary": {
    name: "Iron-Clad Mercenary", level: 29,
    stats: { health: 90, strength: 80, endurance: 35, initiative: 25, avoidance: 30, stabbingWeapons: 80 },
    equipment: { mainHand: { name: "Steel longsword", type: "sword", damage: 26, weight: 4, durability: 400, reqSkill: 75 }, offHand: null },
    xpReward: 55, goldReward: [15, 38],
    description: "A professional who views the arena as a job; he waits for you to make a mistake, hidden behind reinforced steel.",
    challengeMin: 24, challengeMax: 29,
    loot: [{ name: "Reinforced plate", chance: "medium" }, { name: "Mercenary contract", chance: "low" }]
  },
  "harpy-screecher": {
    name: "Harpy Screecher", level: 31,
    stats: { health: 60, strength: 40, endurance: 25, initiative: 65, avoidance: 70, stabbingWeapons: 80 },
    equipment: { mainHand: { name: "Talons", type: "stabbingWeapons", damage: 16, weight: 0.5, durability: 100, reqSkill: 70 }, offHand: null },
    xpReward: 55, goldReward: [14, 35],
    description: "Its cries pierce the soul and scramble the mind; fighting a Harpy is a test of focus as much as it is of steel.",
    challengeMin: 26, challengeMax: 31,
    loot: [{ name: "Harpy feather", chance: "high" }, { name: "Curved talon", chance: "medium" }]
  },
  "crystalback-tortoise": {
    name: "Crystalback Tortoise (passive)", level: 33,
    stats: { health: 120, strength: 100, endurance: 40, initiative: 5, avoidance: 5, stabbingWeapons: 70 },
    equipment: { mainHand: { name: "Crystal shell", type: "blunt", damage: 20, weight: 10, durability: 500, reqSkill: 65 }, offHand: null },
    xpReward: 25, goldReward: [8, 20],
    description: "A slow-moving mountain of jagged gems; attacking its shell is more likely to break your sword than harm the beast.",
    challengeMin: 28, challengeMax: 45,
    loot: [{ name: "Crystal shard", chance: "medium" }, { name: "Gem scale", chance: "low" }]
  },
  "young-manticore": {
    name: "Young Manticore", level: 35,
    stats: { health: 85, strength: 80, endurance: 40, initiative: 45, avoidance: 45, stabbingWeapons: 85 },
    equipment: { mainHand: { name: "Venom tail", type: "stabbingWeapons", damage: 22, weight: 2, durability: 200, reqSkill: 80 }, offHand: null },
    xpReward: 60, goldReward: [16, 42],
    description: "Though it hasn't reached full size, its hunger is endless and its scorpion-like tail is already dripping with venom.",
    challengeMin: 29, challengeMax: 35,
    loot: [{ name: "Manticore spine", chance: "high" }, { name: "Venom sac", chance: "medium" }]
  },
  "gnoll-pack-leader": {
    name: "Gnoll Pack-Leader", level: 37,
    stats: { health: 95, strength: 90, endurance: 35, initiative: 50, avoidance: 30, stabbingWeapons: 100 },
    equipment: { mainHand: { name: "Chieftain axe", type: "axe", damage: 30, weight: 5, durability: 350, reqSkill: 95 }, offHand: null },
    xpReward: 65, goldReward: [18, 45],
    description: "He leads with a cackle that echoes through the stands; his movements are frantic, but every swing is calculated.",
    challengeMin: 31, challengeMax: 37,
    loot: [{ name: "Gnoll insignia", chance: "medium" }, { name: "Chieftain headdress", chance: "low" }]
  },
  "stone-golem": {
    name: "Stone Golem Prototype", level: 39,
    stats: { health: 120, strength: 130, endurance: 50, initiative: 10, avoidance: 10, stabbingWeapons: 80 },
    equipment: { mainHand: { name: "Stone fist", type: "blunt", damage: 38, weight: 12, durability: 600, reqSkill: 75 }, offHand: null },
    xpReward: 65, goldReward: [18, 48],
    description: "A lumbering experiment of clay and magic; it lacks a soul, but its fists carry the weight of a falling castle.",
    challengeMin: 33, challengeMax: 39,
    loot: [{ name: "Rune stone", chance: "medium" }, { name: "Golem core", chance: "low" }]
  },
  "feral-lion": {
    name: "Feral Lion", level: 41,
    stats: { health: 100, strength: 110, endurance: 45, initiative: 50, avoidance: 50, stabbingWeapons: 105 },
    equipment: { mainHand: { name: "Savage fangs", type: "stabbingWeapons", damage: 28, weight: 1, durability: 180, reqSkill: 100 }, offHand: null },
    xpReward: 70, goldReward: [20, 52],
    description: "The true king of the arena sands; its roar alone is enough to make a novice drop their sword and pray.",
    challengeMin: 35, challengeMax: 41,
    loot: [{ name: "Lion heart", chance: "low" }, { name: "Royal mane", chance: "medium" }]
  },
  "cloud-mane-bison": {
    name: "Cloud-Mane Bison (passive)", level: 43,
    stats: { health: 150, strength: 140, endurance: 55, initiative: 15, avoidance: 10, stabbingWeapons: 110 },
    equipment: { mainHand: { name: "Thunder hooves", type: "blunt", damage: 32, weight: 8, durability: 450, reqSkill: 105 }, offHand: null },
    xpReward: 30, goldReward: [10, 28],
    description: "A majestic wanderer with fur like storm clouds; it moves with the weight of a landslide.",
    challengeMin: 38, challengeMax: 51,
    loot: [{ name: "Storm wool", chance: "medium" }, { name: "Cloud mane", chance: "low" }]
  },
  "centaur-skirmisher": {
    name: "Centaur Skirmisher", level: 45,
    stats: { health: 110, strength: 90, endurance: 50, initiative: 60, avoidance: 60, stabbingWeapons: 130 },
    equipment: { mainHand: { name: "War spear", type: "stabbingWeapons", damage: 26, weight: 4, durability: 300, reqSkill: 120 }, offHand: null },
    xpReward: 75, goldReward: [22, 58],
    description: "Master of the hit-and-run; he keeps you at the end of his spear while he gallops circles around you.",
    challengeMin: 39, challengeMax: 45,
    loot: [{ name: "Centaur hoof", chance: "medium" }, { name: "Spear tip", chance: "high" }]
  },
  "corrupted-paladin": {
    name: "Corrupted Paladin", level: 47,
    stats: { health: 140, strength: 150, endurance: 45, initiative: 30, avoidance: 25, stabbingWeapons: 150 },
    equipment: { mainHand: { name: "Dark blade", type: "sword", damage: 40, weight: 5, durability: 500, reqSkill: 145 }, offHand: null },
    xpReward: 80, goldReward: [25, 65],
    description: "A fallen warrior in tattered holy robes; his heavy plate armor is as formidable as his dark resolve.",
    challengeMin: 41, challengeMax: 47,
    loot: [{ name: "Darkened sigil", chance: "medium" }, { name: "Broken oath", chance: "low" }]
  },
  "elder-grove-hydra": {
    name: "Elder Grove Hydra (passive)", level: 49,
    stats: { health: 220, strength: 160, endurance: 60, initiative: 5, avoidance: 5, stabbingWeapons: 90 },
    equipment: { mainHand: { name: "Vine strike", type: "blunt", damage: 28, weight: 6, durability: 400, reqSkill: 85 }, offHand: null },
    xpReward: 40, goldReward: [12, 35],
    description: "A sluggish plant-beast; it is peaceful until you step within reach of its many snapping vine-heads.",
    challengeMin: 43, challengeMax: 59,
    loot: [{ name: "Ancient seed", chance: "low" }, { name: "Hydra vine", chance: "high" }]
  },
  "cyclops-runt": {
    name: "Cyclops Runt", level: 51,
    stats: { health: 170, strength: 200, endurance: 50, initiative: 15, avoidance: 10, stabbingWeapons: 115 },
    equipment: { mainHand: { name: "Tree trunk", type: "blunt", damage: 48, weight: 15, durability: 700, reqSkill: 110 }, offHand: null },
    xpReward: 90, goldReward: [28, 72],
    description: "Even a 'runt' among giants can swing a tree trunk with the force of a battering ram; don't be fooled.",
    challengeMin: 45, challengeMax: 51,
    loot: [{ name: "Cyclops eye", chance: "low" }, { name: "Giant finger", chance: "medium" }]
  },
  "minotaur-berserker": {
    name: "Minotaur Berserker", level: 53,
    stats: { health: 160, strength: 220, endurance: 55, initiative: 40, avoidance: 25, stabbingWeapons: 120 },
    equipment: { mainHand: { name: "War axe", type: "axe", damage: 46, weight: 8, durability: 450, reqSkill: 115 }, offHand: null },
    xpReward: 95, goldReward: [30, 78],
    description: "Locked in a permanent state of rage, this beast will charge through stone walls just to gore its target.",
    challengeMin: 47, challengeMax: 53,
    loot: [{ name: "Minotaur horn", chance: "medium" }, { name: "Berserker totem", chance: "low" }]
  },
  "shadow-assassin": {
    name: "Shadow Assassin", level: 55,
    stats: { health: 110, strength: 90, endurance: 40, initiative: 85, avoidance: 80, stabbingWeapons: 175 },
    equipment: { mainHand: { name: "Shadow blade", type: "stabbingWeapons", damage: 32, weight: 2, durability: 250, reqSkill: 170 }, offHand: null },
    xpReward: 100, goldReward: [32, 85],
    description: "You cannot hit what you cannot see; this foe strikes with surgical precision from the cold darkness.",
    challengeMin: 49, challengeMax: 55,
    loot: [{ name: "Shadow silk", chance: "medium" }, { name: "Assassin contract", chance: "low" }]
  },
  "twin-headed-ettin": {
    name: "Twin-Headed Ettin", level: 57,
    stats: { health: 190, strength: 230, endurance: 50, initiative: 30, avoidance: 20, stabbingWeapons: 120 },
    equipment: { mainHand: { name: "Dual club", type: "blunt", damage: 50, weight: 10, durability: 500, reqSkill: 115 }, offHand: null },
    xpReward: 105, goldReward: [35, 90],
    description: "With two heads watching every angle, it is nearly impossible to flank this massive, club-wielding giant.",
    challengeMin: 51, challengeMax: 57,
    loot: [{ name: "Ettin skull", chance: "low" }, { name: "Double club", chance: "medium" }]
  },
  "ancient-wyvern": {
    name: "Ancient Wyvern", level: 59,
    stats: { health: 180, strength: 180, endurance: 60, initiative: 60, avoidance: 50, stabbingWeapons: 110 },
    equipment: { mainHand: { name: "Toxic bite", type: "stabbingWeapons", damage: 38, weight: 3, durability: 350, reqSkill: 105 }, offHand: null },
    xpReward: 110, goldReward: [38, 95],
    description: "A cousin to dragons, this winged nightmare fills the arena with toxic fumes and bone-crushing dives.",
    challengeMin: 53, challengeMax: 59,
    loot: [{ name: "Wyvern scale", chance: "medium" }, { name: "Toxic gland", chance: "high" }]
  },
  "astral-whale": {
    name: "Astral Whale (passive)", level: 61,
    stats: { health: 350, strength: 150, endurance: 65, initiative: 5, avoidance: 5, stabbingWeapons: 85 },
    equipment: { mainHand: { name: "Tail slam", type: "blunt", damage: 35, weight: 20, durability: 1000, reqSkill: 80 }, offHand: null },
    xpReward: 50, goldReward: [15, 45],
    description: "It drifts like a dream made of starlight; it is indifferent to you, but its hide is harder than mortal steel.",
    challengeMin: 55, challengeMax: 60, challengeMaxPrestige: 100,
    loot: [{ name: "Starlight fragment", chance: "low" }, { name: "Astral hide", chance: "medium" }]
  },
  "undead-gladiator-king": {
    name: "Undead Gladiator King", level: 63,
    stats: { health: 180, strength: 190, endurance: 55, initiative: 60, avoidance: 45, stabbingWeapons: 150 },
    equipment: { mainHand: { name: "Ghostly blade", type: "sword", damage: 42, weight: 4, durability: 999, reqSkill: 145 }, offHand: null },
    xpReward: 120, goldReward: [40, 100],
    description: "A champion from a forgotten era, fighting with a ghostly blade that ignores the physical laws of armor.",
    challengeMin: 57, challengeMax: 60, challengeMaxPrestige: 100,
    loot: [{ name: "Crown fragment", chance: "low" }, { name: "Phantom steel", chance: "medium" }]
  },
  "frost-giant": {
    name: "Frost Giant Exile", level: 65,
    stats: { health: 240, strength: 280, endurance: 55, initiative: 20, avoidance: 15, stabbingWeapons: 110 },
    equipment: { mainHand: { name: "Ice maul", type: "blunt", damage: 55, weight: 18, durability: 800, reqSkill: 105 }, offHand: null },
    xpReward: 135, goldReward: [45, 115],
    description: "Standing three men tall, he brings the freezing chill of the north into the heat of the arena sands.",
    challengeMin: 59, challengeMax: 60, challengeMaxPrestige: 100,
    loot: [{ name: "Frost heart", chance: "low" }, { name: "Ice shard", chance: "high" }]
  },
  "nine-headed-hydra": {
    name: "Nine-Headed Hydra", level: 67,
    stats: { health: 280, strength: 250, endurance: 65, initiative: 35, avoidance: 20, stabbingWeapons: 110 },
    equipment: { mainHand: { name: "Multi bite", type: "stabbingWeapons", damage: 40, weight: 5, durability: 600, reqSkill: 105 }, offHand: null },
    xpReward: 150, goldReward: [50, 125],
    description: "Every time you think you've gained the upper hand, another snapping jaw appears from the scales.",
    challengeMin: 60, challengeMax: 60, challengeMaxPrestige: 100,
    loot: [{ name: "Hydra head", chance: "medium" }, { name: "Regeneration gland", chance: "low" }]
  },
  "chimera-alpha": {
    name: "Chimera Alpha", level: 69,
    stats: { health: 200, strength: 210, endurance: 50, initiative: 80, avoidance: 70, stabbingWeapons: 130 },
    equipment: { mainHand: { name: "Lion bite", type: "stabbingWeapons", damage: 36, weight: 4, durability: 350, reqSkill: 125 }, offHand: null },
    xpReward: 175, goldReward: [58, 145],
    description: "A terrifying fusion of lion, goat, and serpent; it attacks with fire and venom with deadly agility.",
    challengeMin: 60, challengeMax: 60, challengeMaxPrestige: 100,
    loot: [{ name: "Chimera mane", chance: "medium" }, { name: "Triple essence", chance: "low" }]
  },
  "behemoth-juggernaut": {
    name: "Behemoth Juggernaut", level: 71,
    stats: { health: 320, strength: 330, endurance: 65, initiative: 10, avoidance: 5, stabbingWeapons: 110 },
    equipment: { mainHand: { name: "Crushing fist", type: "blunt", damage: 62, weight: 25, durability: 1200, reqSkill: 105 }, offHand: null },
    xpReward: 185, goldReward: [62, 155],
    description: "A creature of such scale that the ground trembles; regular armor is useless against its crushing weight.",
    challengeMin: 60, challengeMax: 60, challengeMaxPrestige: 100,
    loot: [{ name: "Behemoth bone", chance: "medium" }, { name: "Titan heart", chance: "low" }]
  },
  "arch-demon-overlord": {
    name: "Arch-Demon Overlord", level: 73,
    stats: { health: 250, strength: 280, endurance: 70, initiative: 65, avoidance: 55, stabbingWeapons: 140 },
    equipment: { mainHand: { name: "Soul reaper", type: "sword", damage: 52, weight: 6, durability: 999, reqSkill: 135 }, offHand: null },
    xpReward: 200, goldReward: [68, 170],
    description: "Bound by ancient chains, he seeks to trade his freedom for your soul; the ultimate test of a gladiator.",
    challengeMin: 60, challengeMax: 60, challengeMaxPrestige: 100,
    loot: [{ name: "Demon horn", chance: "low" }, { name: "Soul shard", chance: "medium" }]
  },
  "void-eater-colossus": {
    name: "Void-Eater Colossus", level: 75,
    stats: { health: 300, strength: 320, endurance: 70, initiative: 30, avoidance: 0, stabbingWeapons: 100 },
    equipment: { mainHand: { name: "Abyss crush", type: "blunt", damage: 58, weight: 30, durability: 999, reqSkill: 95 }, offHand: null },
    xpReward: 225, goldReward: [75, 190],
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
    "{D_NAME} skillfully blocks with {SHIELD_NAME}, which takes {DAMAGE_TO_ITEM} damage ({ABSORBED} absorbed).",
    "{D_NAME} raises {SHIELD_NAME} in time; the shield takes {DAMAGE_TO_ITEM} damage ({ABSORBED} absorbed)."
  ],
  parry: [
    "{D_NAME} skillfully parries with {W_NAME}, which takes {DAMAGE_TO_ITEM} damage.",
    "{D_NAME} parries the blow with {W_NAME}; the weapon takes {DAMAGE_TO_ITEM} damage."
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
  "sword", "blunt", "axe", "ranged", "flail", "stabbingWeapons", "shield"];

function getPlayerCombatStats() {
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
    sword: 1.15, blunt: 1.05, axe: 1.10, ranged: 1.15, flail: 1.05, stabbingWeapons: 1.15, shield: 1.05
  },
  human: {
    health: 1.10, strength: 1.10, endurance: 1.10, initiative: 1.10, avoidance: 1.15,
    luck: 1.10, learning: 1.15, discipline: 1.10, leadership: 1.15, provocation: 1.10,
    sword: 1.10, blunt: 1.10, axe: 1.10, ranged: 1.10, flail: 1.10, stabbingWeapons: 1.10, shield: 1.15
  },
  orc: {
    health: 1.20, strength: 1.25, endurance: 1.00, initiative: 1.00, avoidance: 0.80,
    luck: 1.05, learning: 0.80, discipline: 1.10, leadership: 1.15, provocation: 1.25,
    sword: 1.10, blunt: 1.15, axe: 1.15, ranged: 1.00, flail: 1.15, stabbingWeapons: 1.00, shield: 1.05
  },
  troll: {
    health: 1.50, strength: 1.50, endurance: 0.75, initiative: 0.60, avoidance: 0.50,
    luck: 1.10, learning: 0.70, discipline: 1.00, leadership: 0.80, provocation: 1.20,
    sword: 0.75, blunt: 0.80, axe: 0.80, ranged: 0.60, flail: 0.80, stabbingWeapons: 0.70, shield: 0.70
  },
  undead: {
    health: 1.15, strength: 1.10, endurance: 1.70, initiative: 0.85, avoidance: 1.10,
    luck: 0.90, learning: 0.80, discipline: 1.15, leadership: 1.10, provocation: 1.10,
    sword: 1.05, blunt: 1.05, axe: 1.05, ranged: 1.05, flail: 1.05, stabbingWeapons: 1.05, shield: 1.10
  },
  dwarf: {
    health: 1.35, strength: 1.20, endurance: 0.80, initiative: 0.85, avoidance: 0.70,
    luck: 1.15, learning: 1.10, discipline: 1.15, leadership: 1.15, provocation: 1.15,
    sword: 1.05, blunt: 1.15, axe: 1.15, ranged: 1.00, flail: 1.10, stabbingWeapons: 1.05, shield: 1.15
  },
  kyshari: {
    health: 0.75, strength: 0.85, endurance: 1.40, initiative: 1.40, avoidance: 1.60,
    luck: 1.10, learning: 1.00, discipline: 0.90, leadership: 0.80, provocation: 1.00,
    sword: 1.10, blunt: 0.90, axe: 0.90, ranged: 1.00, flail: 1.00, stabbingWeapons: 1.15, shield: 1.05
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
      generateAbilityList('creation-ability-list', true);
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
        base = (category === "Physique") ? 1 : 0;
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

var WEAPON_SKILL_KEYS = ["sword", "blunt", "axe", "ranged", "flail", "stabbingWeapons", "shield"];

function finalizeCharacter() {
  var race = document.getElementById('select-race').value;
  var gender = document.getElementById('select-gender').value;
  player.race = race;
  player.gender = gender;

  for (var stat in tempStats) {
    var isPhysique = (stat === "health" || stat === "strength" || stat === "endurance");
    var base = isPhysique ? 1 : 0;
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
  startCombat(currentNpcDetailKey, surrenderPct);
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
    parryValue: 12,
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
  testSword: {
    name: "(test) Iron Sword",
    description: "A basic training sword with a balanced grip and reliable edge.",
    category: "weapons",
    subcategory: "Swords",
    typeLabel: "Sword - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 6,
    weight: 2,
    parryValue: 12,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "sword",
    costByVendor: { grizlow: 40 },
    criteria: { requiredStrength: 10, offhandStrengthRequired: 20, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Sword" }]
  },
  testBlunt: {
    name: "(test) Oak Club",
    description: "Simple, heavy, and ideal for cracking cheap shields.",
    category: "weapons",
    subcategory: "Blunt",
    typeLabel: "Blunt Weapon - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 7,
    weight: 3,
    parryValue: 12,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "blunt",
    costByVendor: { grizlow: 38 },
    criteria: { requiredStrength: 12, offhandStrengthRequired: 20, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Blunt" }]
  },
  testAxe: {
    name: "(test) Hatchet",
    description: "A rough-forged hatchet that bites deep into armor seams.",
    category: "weapons",
    subcategory: "Axes",
    typeLabel: "Axe - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 3,
    damageMax: 7,
    weight: 3,
    parryValue: 12,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "axe",
    costByVendor: { grizlow: 45 },
    criteria: { requiredStrength: 12, offhandStrengthRequired: 20, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Axe" }]
  },
  testRanged: {
    name: "(test) Hunting Bow (2h)",
    description: "A light bow for skirmishes and quick hunting contracts.",
    category: "weapons",
    subcategory: "Ranged",
    typeLabel: "Ranged Weapon - 2-handed",
    handedness: "2h",
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 6,
    weight: 2,
    parryValue: 12,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "ranged",
    costByVendor: { grizlow: 48 },
    criteria: { requiredStrength: 10, offhandStrengthRequired: 20, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Ranged" }]
  },
  testFlail: {
    name: "(test) Chain Flail",
    description: "Its chained head slips around careless guards and helmets.",
    category: "weapons",
    subcategory: "Flail",
    typeLabel: "Flail - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 3,
    damageMax: 8,
    weight: 3,
    parryValue: 12,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "flail",
    costByVendor: { grizlow: 50 },
    criteria: { requiredStrength: 12, offhandStrengthRequired: 20, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Flail" }]
  },
  testStabbing: {
    name: "(test) Bone Dagger",
    description: "A narrow dagger made for quick thrusts and dirty work.",
    category: "weapons",
    subcategory: "Stabbing",
    typeLabel: "Stabbing Weapon - 1-handed",
    handedness: "1h",
    requiredLevel: 1,
    damageMin: 2,
    damageMax: 5,
    weight: 1,
    parryValue: 12,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "mainHand",
    weaponType: "stabbingWeapons",
    costByVendor: { grizlow: 32 },
    criteria: { requiredStrength: 8, offhandStrengthRequired: 16, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Stabbing Weapons" }]
  },
  testShield: {
    name: "(test) Wooden Buckler",
    description: "A small shield that catches glancing blows and arrows.",
    category: "weapons",
    subcategory: "Shields",
    typeLabel: "Shield - Off-hand",
    handedness: "Off-hand",
    requiredLevel: 1,
    damageMin: 0,
    damageMax: 0,
    weight: 2,
    parryValue: 12,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "offHand",
    weaponType: "shield",
    block: 1,
    costByVendor: { grizlow: 35 },
    criteria: { requiredStrength: 10, offhandStrengthRequired: 10, recommendedStabbingSkill: 10, blood: "Both", race: "All" },
    buffs: [{ label: "+1 Shield" }]
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
    parryValue: 12,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "head",
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
    parryValue: 12,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "shoulders",
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
    parryValue: 12,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "torso",
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
    parryValue: 12,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "legs",
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
    parryValue: 12,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "feet",
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
    parryValue: 12,
    durabilityMax: 100,
    durabilityCurrent: 100,
    soulbound: "No",
    unique: "No",
    equipGroup: "equipment",
    equipSlot: "hands",
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
    parryValue: 12,
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
    parryValue: 12,
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
    parryValue: 12,
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
    parryValue: 12,
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
    parryValue: 12,
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
    parryValue: 12,
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
    Swords: ["testSword"],
    Blunt: ["testBlunt"],
    Axes: ["testAxe"],
    Ranged: ["testRanged"],
    Flail: ["testFlail"],
    Stabbing: ["rustyShank", "testStabbing"]
  },
  Shields: ["testShield"],
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

function ensureTwoHandedNames() {
  var keys = Object.keys(ITEM_DATABASE);
  for (var i = 0; i < keys.length; i++) {
    var item = ITEM_DATABASE[keys[i]];
    if (!item) continue;
    if (item.handedness === "2h" && item.name && item.name.indexOf("(2h)") === -1) {
      item.name += " (2h)";
    }
  }
}
ensureTwoHandedNames();

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

  document.getElementById("weapon-detail-name").textContent = item.name || "";
  document.getElementById("weapon-detail-description").textContent = item.description || "";
  document.getElementById("weapon-detail-type").textContent = item.typeLabel || "";
  document.getElementById("weapon-detail-level").textContent = item.requiredLevel != null ? String(item.requiredLevel) : "";
  document.getElementById("weapon-detail-damage").textContent = item.damageMin + "-" + item.damageMax;
  document.getElementById("weapon-detail-weight").textContent = item.weight + " WP";
  document.getElementById("weapon-detail-parry").textContent = item.parryValue;
  document.getElementById("weapon-detail-durability").textContent = item.durabilityCurrent + "/" + item.durabilityMax;
  document.getElementById("weapon-detail-soulbound").textContent = item.soulbound || "No";

  document.getElementById("weapon-detail-unique").textContent = item.unique || "No";

  document.getElementById("weapon-detail-req-str").textContent = item.criteria.requiredStrength;
  document.getElementById("weapon-detail-offhand-req").textContent = "To wield this weapon in your Off-hand you need " + item.criteria.offhandStrengthRequired + " Strenght";
  var recSkillSpan = document.getElementById("weapon-detail-rec-skill");
  var recSkillLabel = document.getElementById("weapon-detail-rec-skill-label");
  var recSkillRow = recSkillSpan ? recSkillSpan.parentElement : null;
  var recommendedSkill = item.criteria && item.criteria.recommendedStabbingSkill != null
    ? item.criteria.recommendedStabbingSkill
    : "";
  var recLabelByType = {
    stabbingWeapons: "Recommended Stabbing weapons skill:",
    sword: "Recommended Sword weapon skill:",
    blunt: "Recommended Blunt weapon skill:",
    axe: "Recommended Axe weapon skill:",
    ranged: "Recommended Ranged weapon skill:",
    flail: "Recommended Flail weapon skill:",
    shield: "Recommended Shield skill:"
  };
  if (item.category === "weapons" && recSkillRow) {
    recSkillRow.style.display = "";
    if (recSkillLabel) recSkillLabel.textContent = recLabelByType[item.weaponType] || "Recommended weapon skill:";
    recSkillSpan.textContent = recommendedSkill;
  } else if (recSkillRow) {
    recSkillRow.style.display = "none";
    if (recSkillSpan) recSkillSpan.textContent = "";
  }
  document.getElementById("weapon-detail-blood").textContent = item.criteria.blood;
  document.getElementById("weapon-detail-race").textContent = item.criteria.race;

  var buffsEl = document.getElementById("weapon-detail-buffs");
  if (buffsEl) {
    buffsEl.innerHTML = "";
    for (var i = 0; i < item.buffs.length; i++) {
      var line = document.createElement("div");
      line.className = "weapon-detail-buff-line";
      line.textContent = item.buffs[i].label;
      buffsEl.appendChild(line);
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
  return {
    itemKey: itemKey,
    name: item.name,
    type: item.weaponType || item.category || "item",
    damageMin: item.damageMin,
    damageMax: item.damageMax,
    weight: item.weight,
    durability: item.durabilityMax,
    reqSkill: 0
  };
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
  row.className = "inventory-row";
  var item = player[sourceKey] && player[sourceKey][slotKey] ? player[sourceKey][slotKey] : null;
  var itemKey = getItemKeyFromSlot(item);

  var left = document.createElement("div");
  left.className = "inventory-row-left";
  var nameText = item ? (item.name || "Unknown item") : "Not equipped";
  left.textContent = label + ": ";

  if (item && itemKey) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "inventory-item-link";
    btn.textContent = nameText;
    btn.onclick = function(k) {
      return function() { openWeaponDetailModal(k, false); };
    }(itemKey);
    left.appendChild(btn);
  } else {
    var span = document.createElement("span");
    span.className = "inventory-empty";
    span.textContent = nameText;
    left.appendChild(span);
  }
  row.appendChild(left);

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

function renderGrizlowItemTable(targetEl, itemKeys) {
  targetEl.innerHTML = "";
  var table = document.createElement("div");
  table.className = "grizlow-weapon-table";
  var isSellMode = window.grizlowMode === "inventory";

  var headerRow = document.createElement("div");
  headerRow.className = "grizlow-weapon-grid-record grizlow-weapon-table-header grizlow-weapon-grid-header";
  var h1 = document.createElement("div"); h1.textContent = "Name";
  var h2 = document.createElement("div"); h2.textContent = "Required level";
  var h3 = document.createElement("div"); h3.textContent = "Damage";
  var h4 = document.createElement("div"); h4.textContent = "Weight";
  var h5 = document.createElement("div"); h5.textContent = isSellMode ? "Sell value" : "Cost";
  headerRow.appendChild(h1); headerRow.appendChild(h2); headerRow.appendChild(h3); headerRow.appendChild(h4); headerRow.appendChild(h5);
  table.appendChild(headerRow);

  for (var i = 0; i < itemKeys.length; i++) {
    var key = itemKeys[i];
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
    if (item.handedness && item.handedness !== "-") {
      var handed = document.createElement("span");
      handed.className = "grizlow-weapon-hands";
      handed.textContent = item.handedness;
      col1.appendChild(handed);
    }

    var col2 = document.createElement("div"); col2.textContent = item.requiredLevel != null ? String(item.requiredLevel) : "?";
    var col3 = document.createElement("div"); col3.textContent = dmgText;
    var col4 = document.createElement("div"); col4.textContent = (item.weight != null ? item.weight + " WP" : "-");
    var col5 = document.createElement("div");
    if (isSellMode) {
      var sellBtn = document.createElement("button");
      sellBtn.type = "button";
      sellBtn.className = "grizlow-weapon-name-btn";
      sellBtn.textContent = "Sell (" + sellValue + ")";
      sellBtn.onclick = function(k) {
        return function() {
          sellInventoryItem(k);
          showGrizlowCategory(currentGrizlowCategory);
        };
      }(key);
      col5.appendChild(sellBtn);
    } else {
      col5.textContent = cost;
    }

    rowEl.appendChild(col1); rowEl.appendChild(col2); rowEl.appendChild(col3); rowEl.appendChild(col4); rowEl.appendChild(col5);
    table.appendChild(rowEl);
  }

  targetEl.appendChild(table);
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
    return;
  }
  currentGrizlowCategory = category;
  currentGrizlowSubcategory = "";

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

var COMBAT_ENDURANCE_PER_ACTION = 5;

function getWeaponBaseDamage(weapon) {
  if (weapon.damageMin != null && weapon.damageMax != null) {
    var range = weapon.damageMax - weapon.damageMin + 1;
    return weapon.damageMin + Math.floor(Math.random() * range);
  }
  return weapon.damage || 0;
}

function cloneEquip(eq) {
  if (!eq) return { mainHand: null, offHand: null };
  var o = { mainHand: null, offHand: null };
  if (eq.mainHand) {
    o.mainHand = {};
    for (var m in eq.mainHand) o.mainHand[m] = eq.mainHand[m];
    if (o.mainHand.durability == null) o.mainHand.durability = 100;
  }
  if (eq.offHand) {
    o.offHand = {};
    for (var n in eq.offHand) o.offHand[n] = eq.offHand[n];
    if (o.offHand.durability == null) o.offHand.durability = 100;
  }
  return o;
}

function getAttackerSlots(equip) {
  var slots = [];
  if (!equip) return slots;
  var dMain = equip.mainHand && (equip.mainHand.durability == null || equip.mainHand.durability > 0);
  if (equip.mainHand && dMain) slots.push("main");
  var dOff = equip.offHand && (equip.offHand.durability == null || equip.offHand.durability > 0);
  if (equip.offHand && dOff && equip.offHand.type !== "shield") slots.push("off");
  return slots;
}

function getDefenderSlots(equip, slotsUsed) {
  var out = [];
  if (!equip || !slotsUsed) return out;
  var ok = function(item) { return item && (item.durability == null || item.durability > 0); };
  if (equip.offHand && ok(equip.offHand) && equip.offHand.type === "shield" && !slotsUsed.off)
    out.push({ slot: "off", type: "shield", item: equip.offHand });
  // Parry is only allowed with an off-hand weapon (no main-hand parry for now).
  if (equip.offHand && ok(equip.offHand) && equip.offHand.type !== "shield" && !slotsUsed.off)
    out.push({ slot: "off", type: "weapon", item: equip.offHand });
  return out;
}

function getWeaponFromSlot(equip, slot) {
  if (!equip) return null;
  if (slot === "off") return equip.offHand;
  return equip.mainHand;
}

var NPC_TEMP_WEAPON = { name: "Crooked Teeth", type: "stabbingWeapons", damageMin: 1, damageMax: 5, weight: 0.5, durability: 100, reqSkill: 0 };

function buildCombatState(beastKey, surrenderPercent) {
  var opp = JSON.parse(JSON.stringify(BEAST_DATABASE[beastKey]));
  if (opp.equipment) opp.equipment.mainHand = JSON.parse(JSON.stringify(NPC_TEMP_WEAPON));
  var pStats = getPlayerCombatStats();
  var pEnd = Math.max(10, Math.max(0, (pStats.endurance || 0) * 2));
  var oEnd = Math.max(10, Math.max(0, (opp.stats.endurance || 0) * 2));
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
    npcStats: opp.stats,
    playerEndurance: pEnd,
    npcEndurance: oEnd,
    playerSlotsUsed: { main: false, off: false },
    npcSlotsUsed: { main: false, off: false },
    playerName: player.name,
    playerGender: player.gender || "",
    npcName: opp.name,
    playerSummary: { damageDealt: 0, damageDealtTotal: 0, highestHit: 0, successfulAttacks: 0, parries: 0, blocks: 0, attacksReceived: 0, misses: 0, dodges: 0 },
    npcSummary: { damageDealt: 0, damageDealtTotal: 0, highestHit: 0, successfulAttacks: 0, parries: 0, blocks: 0, attacksReceived: 0, misses: 0, dodges: 0 },
    log: [],
    opp: opp,
    round: 0,
    surrenderHp: surrenderHp,
    surrenderPercent: surrenderPct,
    surrendered: false,
    combatType: "Hunt and Scavenge",
    tactic: player.pveTactic || "Normal"
  };
}

function resolveOneAttack(state, atkKey, defKey, slot, actionIndex, firstStrikerThisRound) {
  var atkName = atkKey === "player" ? state.playerName : state.npcName;
  var defName = defKey === "player" ? state.playerName : state.npcName;
  var atkEquip = atkKey === "player" ? state.playerEquip : state.npcEquip;
  var defEquip = defKey === "player" ? state.playerEquip : state.npcEquip;
  var atkStats = atkKey === "player" ? state.playerStats : state.npcStats;
  var defStats = defKey === "player" ? state.playerStats : state.npcStats;
  var atkEnd = atkKey === "player" ? state.playerEndurance : state.npcEndurance;
  var defEnd = defKey === "player" ? state.playerEndurance : state.npcEndurance;
  var atkUsed = atkKey === "player" ? state.playerSlotsUsed : state.npcSlotsUsed;
  var defUsed = defKey === "player" ? state.playerSlotsUsed : state.npcSlotsUsed;
  var atkSum = atkKey === "player" ? state.playerSummary : state.npcSummary;
  var defSum = defKey === "player" ? state.playerSummary : state.npcSummary;
  var weapon = getWeaponFromSlot(atkEquip, slot);
  if (!weapon || (weapon.durability != null && weapon.durability <= 0)) {
    if (atkName) state.log.push(atkName + " has no weapon ready and cannot attack.");
    return;
  }
  if (atkEnd < COMBAT_ENDURANCE_PER_ACTION) {
    state.log.push(atkName + " is too exhausted to make an attack.");
    atkUsed[slot] = true;
    return;
  }
  if (atkKey === "player") state.playerEndurance -= COMBAT_ENDURANCE_PER_ACTION; else state.npcEndurance -= COMBAT_ENDURANCE_PER_ACTION;
  atkUsed[slot] = true;

  // Base chance to hit is driven by the attacker's weapon skill vs the weapon's requirement.
  // Defender avoidance is handled separately as a dodge roll, not as a direct hit penalty.
  var hitChance = 75 + ((atkStats[weapon.type] || 0) - (weapon.reqSkill || 0)) * 0.5;
  hitChance = Math.max(5, Math.min(95, hitChance));
  if (Math.random() * 100 >= hitChance) {
    state.log.push(subst(pick(COMBAT_FLAVOR.misses), { A_NAME: atkName, D_NAME: defName }));
    atkSum.misses++;
    return;
  }
  defSum.attacksReceived++;
  var dodgeChance = Math.min(95, Math.max(5, (defStats.avoidance || 0)));
  if (Math.random() * 100 < dodgeChance) {
    state.log.push(subst(pick(COMBAT_FLAVOR.dodgeSuccess), { D_NAME: defName }));
    defSum.dodges++;
    return;
  }
  state.log.push(subst(pick(COMBAT_FLAVOR.dodgeFail), { D_NAME: defName }));

  var defSlots = getDefenderSlots(defEquip, defUsed);
  var useBlockParry = defSlots.length > 0 && defEnd >= COMBAT_ENDURANCE_PER_ACTION;
  if (!useBlockParry) {
    if (defSlots.length > 0 && defEnd < COMBAT_ENDURANCE_PER_ACTION)
      state.log.push(subst(pick(COMBAT_FLAVOR.exhausted), { D_NAME: defName, SHIELD_OR_WEAPON_NAME: (defSlots[0].item && defSlots[0].item.name) || "their guard" }));
    var baseDmg = getWeaponBaseDamage(weapon);
    var dmg = Math.round(baseDmg + (atkStats.strength || 0) * 0.1);
    dmg = Math.max(1, dmg);

    var defenderMaxHp = defKey === "player"
      ? (player.maxHp || 1)
      : (((state.opp && state.opp.stats && state.opp.stats.health) || 1));

    if (defKey === "player") state.playerHp -= dmg; else state.npcHp -= dmg;
    state.log.push(subst(pick(COMBAT_FLAVOR.hitBody), { A_NAME: atkName, D_NAME: defName, BODY_PART: pickBodyPart(), SEVERITY: getSeverity(dmg, defenderMaxHp), AMOUNT: dmg }));
    atkSum.damageDealt += dmg;
    atkSum.damageDealtTotal += dmg;
    atkSum.successfulAttacks++;
    if (dmg > atkSum.highestHit) atkSum.highestHit = dmg;
    return;
  }
  var choice = defSlots[0];
  defUsed[choice.slot] = true;
  if (defKey === "player") state.playerEndurance -= COMBAT_ENDURANCE_PER_ACTION; else state.npcEndurance -= COMBAT_ENDURANCE_PER_ACTION;
  var baseDmg = getWeaponBaseDamage(weapon);
  var dmg = Math.round(baseDmg + (atkStats.strength || 0) * 0.1);
  dmg = Math.max(1, dmg);
  var absorbed = choice.type === "shield" ? Math.min(dmg, (choice.item.block || 0) * 10) : 0;
  var toItem = dmg;
  choice.item.durability = (choice.item.durability || 100) - toItem;
  atkSum.damageDealtTotal += dmg;
  if (choice.type === "shield") {
    state.log.push(subst(pick(COMBAT_FLAVOR.block), { D_NAME: defName, SHIELD_NAME: choice.item.name, DAMAGE_TO_ITEM: toItem, ABSORBED: absorbed }));
    defSum.blocks++;
  } else {
    state.log.push(subst(pick(COMBAT_FLAVOR.parry), { D_NAME: defName, W_NAME: choice.item.name, DAMAGE_TO_ITEM: toItem, ABSORBED: absorbed }));
    defSum.parries++;
  }
  if (choice.item.durability <= 0) {
    state.log.push(subst(pick(COMBAT_FLAVOR.equipmentBroken), { D_NAME: defName, ITEM_NAME: choice.item.name }));
    if (choice.slot === "main") defEquip.mainHand = null; else defEquip.offHand = null;
  }
}

function runCombat(state) {
  var maxRounds = 80;
  while (!state.surrendered && state.playerHp > 0 && state.npcHp > 0 && state.round < maxRounds) {
    state.round++;
    state.playerSlotsUsed = { main: false, off: false };
    state.npcSlotsUsed = { main: false, off: false };
    state.log.push("<strong>Round " + state.round + "</strong>");

    var pInit = state.playerStats.initiative || 0;
    var nInit = state.npcStats.initiative || 0;
    var firstStriker = (Math.random() * (pInit + nInit + 1)) < (pInit + 0.5) ? "player" : "npc";

    var pSlots = getAttackerSlots(state.playerEquip);
    var nSlots = getAttackerSlots(state.npcEquip);
    if (pSlots.length === 0 && nSlots.length === 0) break;
    var pActionIndex = 0;
    var nActionIndex = 0;
    var isFirst;

    if (firstStriker === "player") {
      for (var i = 0; i < pSlots.length; i++) {
        isFirst = pActionIndex === 0;
        if (isFirst && firstStriker === "player")
          state.log.push(subst(pick(COMBAT_FLAVOR.roundOpeners), { A_NAME: state.playerName, D_NAME: state.npcName }));
        var pw = getWeaponFromSlot(state.playerEquip, pSlots[i]);
        if (pActionIndex > 0)
          state.log.push(subst(pick(COMBAT_FLAVOR.offHandAttack), { A_NAME: state.playerName, D_NAME: state.npcName }));
        else
          state.log.push(subst(pick(COMBAT_FLAVOR.universalAttack), { A_NAME: state.playerName, D_NAME: state.npcName, W_NAME: (pw && pw.name) || "weapon" }));
        resolveOneAttack(state, "player", "npc", pSlots[i], pActionIndex, firstStriker);
        pActionIndex++;
        if (state.npcHp <= 0) break;
      }
      if (state.npcHp <= 0) break;
      for (var j = 0; j < nSlots.length; j++) {
        isFirst = nActionIndex === 0;
        if (isFirst && firstStriker === "npc")
          state.log.push(subst(pick(COMBAT_FLAVOR.roundOpeners), { A_NAME: state.npcName, D_NAME: state.playerName }));
        var nw = getWeaponFromSlot(state.npcEquip, nSlots[j]);
        if (nActionIndex > 0)
          state.log.push(subst(pick(COMBAT_FLAVOR.offHandAttack), { A_NAME: state.npcName, D_NAME: state.playerName }));
        else
          state.log.push(subst(pick(COMBAT_FLAVOR.universalAttack), { A_NAME: state.npcName, D_NAME: state.playerName, W_NAME: (nw && nw.name) || "weapon" }));
        resolveOneAttack(state, "npc", "player", nSlots[j], nActionIndex, firstStriker);
        nActionIndex++;
        if (state.playerHp <= 0) break;
      }
    } else {
      for (var k = 0; k < nSlots.length; k++) {
        isFirst = nActionIndex === 0;
        if (isFirst && firstStriker === "npc")
          state.log.push(subst(pick(COMBAT_FLAVOR.roundOpeners), { A_NAME: state.npcName, D_NAME: state.playerName }));
        var nw2 = getWeaponFromSlot(state.npcEquip, nSlots[k]);
        if (nActionIndex > 0)
          state.log.push(subst(pick(COMBAT_FLAVOR.offHandAttack), { A_NAME: state.npcName, D_NAME: state.playerName }));
        else
          state.log.push(subst(pick(COMBAT_FLAVOR.universalAttack), { A_NAME: state.npcName, D_NAME: state.playerName, W_NAME: (nw2 && nw2.name) || "weapon" }));
        resolveOneAttack(state, "npc", "player", nSlots[k], nActionIndex, firstStriker);
        nActionIndex++;
        if (state.surrenderHp && state.playerHp <= state.surrenderHp && !state.surrendered) {
          state.surrendered = true;
          var pronoun = (state.playerGender === "female") ? "her" : "his";
          state.log.push(state.playerName + " falls to " + pronoun + " knees, signaling to the crowd to show mercy and spare " + pronoun + " life.");
          break;
        }
        if (state.playerHp <= 0) break;
      }
      if (state.surrendered || state.playerHp <= 0) break;
      for (var q = 0; q < pSlots.length; q++) {
        isFirst = pActionIndex === 0;
        if (isFirst && firstStriker === "player")
          state.log.push(subst(pick(COMBAT_FLAVOR.roundOpeners), { A_NAME: state.playerName, D_NAME: state.npcName }));
        var pw2 = getWeaponFromSlot(state.playerEquip, pSlots[q]);
        if (pActionIndex > 0)
          state.log.push(subst(pick(COMBAT_FLAVOR.offHandAttack), { A_NAME: state.playerName, D_NAME: state.npcName }));
        else
          state.log.push(subst(pick(COMBAT_FLAVOR.universalAttack), { A_NAME: state.playerName, D_NAME: state.npcName, W_NAME: (pw2 && pw2.name) || "weapon" }));
        resolveOneAttack(state, "player", "npc", pSlots[q], pActionIndex, firstStriker);
        pActionIndex++;
        if (state.npcHp <= 0) break;
      }
    }
  }
}

// Used by Hunt NPC combat and any future combat (Skirmish, Challenges, etc.).
// HP is already set from combat in startCombat; addXp only full-heals on level-up, not on every win.
function renderCombatResult(win, state) {
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
    var xpGained = opp.xpReward || 0;
    addXp(xpGained);
    var gold = opp.goldReward;
    var coinsGained = 0;
    if (Array.isArray(gold)) {
      var min = Number(gold[0]) || 0;
      var max = Number(gold[1]) || min;
      if (max < min) { var tmp = min; min = max; max = tmp; }
      coinsGained = Math.floor(Math.random() * (max - min + 1)) + min;
    } else if (gold) {
      coinsGained = gold;
    }
    player.coins += coinsGained;
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

function startCombat(beastKey, surrenderPercent) {
  if (player.isHospitalized || player.isDead) return;
  if (player.energy < 5) { alert("Too tired!"); return; }
  var state = buildCombatState(beastKey, surrenderPercent);
  runCombat(state);
  player.hp = state.playerHp;
  if (playerCreated) updateMaxHp();
  if (player.hp <= 0) resolveDeathOrInfirmary();
  // Clamp only for upper bound; allow negative HP so UI can show e.g. -4 / 37 while bar is empty.
  player.hp = Math.min(player.maxHp || 9999, player.hp);
  refreshStatsUI();
  player.energy -= 5;
  player.condition = Math.max(0, (player.condition != null ? player.condition : 100) - 1);
  // Treat surrender as a defeat even if playerHp > 0
  renderCombatResult(!state.surrendered && state.playerHp > 0, state);
  refreshStatsUI();
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
    maybeShowDeathOverlay();
    return;
  }
  var noPenaltyMax = getNoPenaltyMax(lvl);
  if (noPenaltyMax != null && hp >= noPenaltyMax) return;
  var mins = getInfirmaryMinutes(lvl, hp);
  player.isHospitalized = true;
  player.hospitalEndsAt = Date.now() + mins * 60 * 1000;
  updateHospitalUI();
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

window.onload = function() { refreshStatsUI(); startTickTimer(); maybeShowDeathOverlay(); };
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
  nextStep(1);
  showPage('start');
}

function addTestXp() {
  if (!playerCreated) return;
  addXp(100);
}

function addTestXp1000() {
  if (!playerCreated) return;
  addXp(1000);
}

function addTestXp10000() {
  if (!playerCreated) return;
  addXp(10000);
}

function addTestXp100000() {
  if (!playerCreated) return;
  addXp(100000);
}

function addTestCoins() {
  if (!playerCreated) return;
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