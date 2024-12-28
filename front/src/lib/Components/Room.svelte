<script lang="ts">
    import { io } from "socket.io-client"
    import {SvelteSet} from "svelte/reactivity"
    import _ from "lodash"
    import ChooseCategory from "./ChooseCategory.svelte";
    import GuessWord from "./GuessWord.svelte";
  import WriteClues from "./WriteClues.svelte";
  import EndGame from "./EndGame.svelte";

    let {roomName, leaveRoom} = $props();
    console.log("Room name in child:", roomName); 
        let gameStarted = $state<boolean>(false)
        let username = $state<string>(localStorage.getItem('username'))

        let categories: Array<string> = ["a","b","c"]
        let category: string = ""
        let clues: Array<string> = ["a","b","a"]
        let dedupedClues: Array<string> = []
        let timer: Number = 20;
        let secretWord: string = "hehexd";
        let guess: string = "";
        let wordGuessed: boolean = false;
        let gamesWon: number = 0;
        let gamesPlayed: number = 0;
        let role: string = $state("");
        let totalRounds: number = 0;




        if (!username) {
            username = "user" + Math.floor(Math.random() * 10000)
            setUsername(username)
        }
        let currentScene = $state<string>("main")
        let players = $state(new SvelteSet([username]));

        function setUsername(newUsername:string) {
            localStorage.setItem('username', newUsername);
            username = newUsername;
        }   


        // init socket
        const socket = io("localhost:3000", {
                auth: {
                    serverOffset: 0,
                    username: username,
                    room: roomName
                }
            });
    
        socket.on("disconnect", () => {
            //send the username to the server
            console.log(`user ${socket.id} disconnected`);
        });
        socket.on("connect", () => {
            console.log(socket.auth);
        });

        socket.on("joinRoom", (roomDetails:Object) => {
            console.log("joined room which consists of: ", roomDetails)
            for (let player of Object.keys(roomDetails)) {
                players.add(player)
            }
        })

        socket.on("playerJoined", (player: string) => {
            console.log(`user ${player} joined`);
            players.add(player)
            console.log($state.snapshot(players))
        })
        socket.on("playerLeft", (player: string) => {
            console.log(`user ${player} left`);
            players.delete(player)
            console.log($state.snapshot(players))
        })

        socket.on("changeScene", (scene, gameRole:string) => {
            console.log(`changing scene to ${scene} with role ${gameRole}`)
            role = gameRole
            currentScene = scene
            if (currentScene === "main") {
                gameStarted = false
            }
        })

        socket.on("chooseCategory", (gameRole:string, wordCategories = []) => {
            console.log(`changing scene to chooseCategory with role ${gameRole}`)
            role = gameRole
            categories= wordCategories
            currentScene = "chooseCategory"
        })
        socket.on("writeClues", (gameRole:string, word: string = "") => {
            console.log(`changing scene to writeClues with role ${gameRole}`, word)
            role = gameRole
            secretWord = word
            currentScene = "writeClues"
        })
        socket.on("guessWord", (gameRole:string, guesserClues:Array<string>, writerClues: Array<string> = []) => {
            console.log(`changing scene to guessWord with role ${gameRole}`)
            role = gameRole
            clues= writerClues
            dedupedClues = guesserClues
            currentScene = "guessWord"
        })

        socket.on("endGame", ( gameState: object) => {
            try { 
            console.log(`ending game`, gameState)
                clues= gameState.clues
                dedupedClues = gameState.dedupedClues
                guess = gameState.guess
                secretWord = gameState.secretWord
                category=gameState.category
                currentScene = "endGame"
                wordGuessed = gameState.success
                gamesWon = gameState.gamesWon
                gamesPlayed = gameState.gamesPlayed
                totalRounds = gameState.playerCount
            } catch (error) {
                console.log("errored on end game", error)
            }
        })

        //////// FUNCTIONS
        const changeName = async (newName: string) => {
            const success = true
            // const success = await socket.timeout(5000).emitWithAck("changeName", username, newName, roomName, (response) => {
            //     if (response) {
            //         return response.status === 'ok'
            //     }
            //     return false;
            // })
            if (success) {
                setUsername(newName)
                return true;
            } 
            return false
        }

        console.log("roomname is", roomName)
        const changeNamePrompt = async () => {
            console.log("changing name")
            let newName: string = prompt("Please enter your username", username)
            if (newName.length > 0 && newName.length < 30 && newName != username) {

                const nameChangeSuccess = await changeName(newName);
                if (!nameChangeSuccess) {
                    alert("Error: There is already a player in the room with the name: ");
                    await changeNamePrompt()
                } 
            } else {
                alert("Name must be between 1 and 30 chars and unique. Try again!")
            }
        }
        // submit event to server and proceed to next scene
        const submitAnswer = (input: string) => {
            if (currentScene === "chooseCategory") {
                socket.emit("chooseCategory", input)
                // currentScene = "writePrompt"
                console.log(`submitted ${input} for` ,currentScene)
            }
            else if (currentScene === "writeClues") {
                socket.emit("submitClue", input)
                // currentScene = "guessWord"
                console.log(`submitted ${input} for` ,currentScene)
            }
            else if (currentScene === "guessWord") {
                socket.emit("guessWord", input)
                // currentScene = "main"
                console.log(`submitted ${input} for` ,currentScene)
            }
            timer = 20
            categories = []
        }

        const leave = () => {
            socket.disconnect()
            leaveRoom()
        }

        const startGame = async () => {
            console.log("starting the game!@!!!!!!!!!!!!!")
            console.log("players are", players)
            if (players.size < 1) {
                alert("must have at least 3 players to play!")
            } else {
                console.log("we got enough players nice")
                socket.emit("startGame", (response) => {
                    console.log("callback was", response)
                })
                gameStarted = true
            }
        }
        const leaveGame = async () => {
            console.log("stopping game")
            socket.emit("stopGame", roomName)
            currentScene = "main"
        }
    </script>
    
    <button onclick={()=>leave()}>Leave room</button>
    <h3>Room: 
        <strong>{roomName}</strong>
    </h3>

    <h4>Username: 
        <strong>{username}</strong>
    </h4>
    <!-- <button onclick={changeNamePrompt}>Change Name</button> -->

    <h4>Players in Lobby: 
        <ul>
        {#each players.keys() as player}
            <li>{player}</li>
        {/each}</ul>
    </h4>

{#if currentScene == "main"}
    
    <button  onclick={startGame}>Start</button>
    <!-- <GuessWord {clues} {role} {submitAnswer}/>  -->

{:else if currentScene == "chooseCategory"}

    <p>My role is {role}</p>
    <ChooseCategory {categories} {role} {submitAnswer} {leaveGame}/>

{:else if currentScene == "writeClues"}

    <WriteClues word={secretWord} {role} {submitAnswer} {leaveGame}/>

{:else if currentScene == "guessWord"}

    <GuessWord {dedupedClues} {clues} {role} {submitAnswer} {leaveGame}/>
{:else if currentScene == "endGame"}
    <EndGame  {category} {dedupedClues} {clues}  {guess} {secretWord} {wordGuessed} {gamesPlayed} {gamesWon} {totalRounds} playAgain={startGame}/>

{/if}


