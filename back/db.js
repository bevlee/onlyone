import Database from "better-sqlite3";
const dbPath = "onlyone.db";
export const DatabaseController = {
  db: null,

  init: function () {
    if (!this.db) {
      this.db = new Database(dbPath);
    }
    this.db = new Database(dbPath);
    // setup tables if they dont exist
    for (let initTable of initTables) {
      let preparedStatement = this.db.prepare(initTable);
      const res = preparedStatement.run();
      console.log(`running ${initTable} with results`, res);
    }
  },
  query: function (sql, params = []) {
    if (!this.db) {
      reject(new Error("Database connection not established"));
      return;
    }
    let prepareStatement = this.db.prepare(sql);
    return prepareStatement.run(params);
  },

  addAction: function () {},
};

const createPlayersTable = `
    CREATE TABLE IF NOT EXISTS player ( 
        player_id INTEGER AUTO_INCREMENT PRIMARY KEY, 
        player_name VARCHAR(255),
        creation_date INTEGER
    );
`;

const createRoomTable = `
    CREATE TABLE IF NOT EXISTS room ( 
        room_id INTEGER AUTO_INCREMENT PRIMARY KEY, 
        room_name VARCHAR(255),
        creation_date INTEGER
    );
`;
const createGamesTable = `
    CREATE TABLE IF NOT EXISTS game ( 
        game_id INTEGER AUTO_INCREMENT PRIMARY KEY, 
        room_id INTEGER,
        creation_date INTEGER,
        FOREIGN KEY (room_id) REFERENCES room(room_id)
    );
`;
const createGamePlayersTable = `CREATE TABLE IF NOT EXISTS game_player (
        game_id INTEGER, 
        player_id INTEGER, 
        PRIMARY KEY (game_id, player_id), 
        FOREIGN KEY (game_id) REFERENCES game(game_id), 
        FOREIGN KEY (player_id) REFERENCES players(player_id));
    `;

const createActionsTable = `
    CREATE TABLE IF NOT EXISTS game_action ( 
        action_id INTEGER AUTO_INCREMENT PRIMARY KEY,
        game_id INTEGER,
        room_id INTEGER, 
        player_id INTEGER,
        stage VARCHAR(25),
        input VARCHAR(25),
        timestamp INTEGER, 
        FOREIGN KEY (game_id) REFERENCES game(game_id), 
        FOREIGN KEY (player_id) REFERENCES players(player_id),
        FOREIGN KEY (room_id) REFERENCES room(room_id)
    );
`;

const initTables = [
  createPlayersTable,
  createRoomTable,
  createGamesTable,
  createGamePlayersTable,
  createActionsTable,
];
