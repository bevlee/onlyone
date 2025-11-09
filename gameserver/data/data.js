
// Players will be able to choose the difficulty of the word they need to guess
export const difficulties = ["easy", "medium", "hard"];


// Flattened word lists by difficulty
const easy = [
  "giraffe", "kangaroo", "fish", "cow", "spiderman", "mario",
  "trump", "michael jackson", "tiger woods", "britney spears", "lady gaga",
  "earth", "china", "australia", "north korea", "japan", "france",
  "nemo", "pasta", "rain", "steak", "firefox", "penguin", "pizza", "apple", "soccer", "banana"

];

const medium = [
  "wombat", "sloth", "peacock", "octopus", "phoenix",
  "elon musk", "oprah winfrey", "queen", "emma watson", "steve irwin",
  "antarctica", "egypt", "tokyo", "amazon", "rome", "south korea",
  "parliament", "lake", "honey", "italy", "venice",
  "vegemite", "volcano", "robot", "circus", "elephant", "dubai", "chocolate", "magic"
];

const hard = [
  "eel", "mole", "wallaby", "tapir", "quokka",
  "greta thunberg", "tyler1", "satoshi nakamoto", "bob ross", "tim cook",
  "luxembourg", "siberia", "vatican", "tasmania", "uluru",
  "tashkent", "birmingham", "ohio", "military",
  "origami", "quantum", "emoji", "zenith", "algorithm",
  "axolotl", "nairobi", "obsidian", "archipelago"
];

// Secret words structure for compatibility
export const secretWords = {
  easy,
  medium,
  hard
};
