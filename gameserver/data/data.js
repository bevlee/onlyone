
// Players will be able to choose the difficulty of the word they need to guess
export const categories = ["easy", "medium", "hard"];


// Flattened word lists by difficulty
const easy = [
  "giraffe", "kangaroo", "fish", "cow",
  "trump", "michael jackson", "tiger woods", "britney spears", "lady gaga",
  "earth", "china", "australia", "north korea",
  "anu", "kingsleys", "radford", "fyshwick", "questacon",
  "nemo", "pasta", "rain", "steak"
];

const medium = [
  "wombat", "sloth", "peacock", "octopus", "phoenix",
  "elon musk", "oprah winfrey", "queen", "emma watson", "steve irwin",
  "antarctica", "egypt", "tokyo", "amazon", "rome", "south korea",
  "parliament house", "lake burley griffin", "manuka", "national gallery", "belconnen",
  "vegemite", "volcano", "robot", "circus"
];

const hard = [
  "eel", "mole", "wallaby", "tapir", "quokka",
  "greta thunberg", "tyler1", "satoshi nakamoto", "bob ross", "tim cook",
  "luxembourg", "siberia", "vatican", "tasmania", "uluru",
  "yarralumla", "mount ainslie", "telopea park", "duntroon",
  "origami", "quantum", "emoji", "zenith", "algorithm"
];

// Secret words structure for compatibility
export const secretWords = {
  easy,
  medium,
  hard
};
