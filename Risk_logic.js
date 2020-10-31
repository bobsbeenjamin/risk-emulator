/*
The logic for my Risk emulator
Written by Ben Clifford for personal use only
See https://github.com/bobsbeenjamin/risk-emulator for license and disclaimers
*/

/// Globals ///
const ACTIVE_PLAYER_NUM = 1; // Indicates which player is the person playing the game
const NUMBER_OF_COUNTRIES = 42; // The total number of countries on the map
const PHASE_ORDER = ["placeArmies", "attack", "nonCombat", "end"]; // The phases of a turn

var armiesLeftToPlace = []; // Number of armies each player needs to place; used during reinforcment and initial placement
var boardDim = 100 + 10; // leave a padding of 5 on each side of the visible board
var currentPlayer = 0; // The player whose turn it is
var countryList = []; // Only used when in country location capture mode
var drawSpace = null; // Holds the HTML canvas context
var diceRoller = {}; // Object with data and UI elements for the dice roller modal
var htmlCanvasElement = null; // Holds the HTML canvas element (useful for sizing)
var someCountriesAreUnclaimed = true; // Are we still filling the board?
var isMuted = false; // Is the background music muted?
var mapImage = null; // The map image that we draw on
var gameState = "startup"; // Gamestate mode: "playing" means a game is in progress
var musicList = {}; // Holds Audio objects to load and play music
var numCountriesWithArmies = 0; // How many countries have armies on them; only used during startup
var numPlayers = 2; // The number of players in the game
var playerColors = []; // The colors for each player
var playerOrder = []; // Determined at game start; the order of play
var randomArmyPlacement = false; // Place armies randomly at game start?
var roundCounter = 0; // Which round we're on; a round is complete once each player takes a turn
var song = null; // Holds the current music track
var turnCounter = 0; // Which turn we're on; each player gets one turn per round
var turnPhase = ""; // The current phase for the current turn
var waitingForUserAction = false; // Used for async hack (change later dude)

/**
 * Initializes the global vars. Run this only once per game.
 */
function setUpGameBoard(onLoad=false) {
	if(onLoad) {
		// Read settings and set up settings responsiveness
		readSettings();
		$("#new-game-settings").change(function() {
			$("#settings-form").data("changed", true);
		});
		
		// Get audio ready
		try {
			let audio = new Audio("music/SecretofMana_IntoTheThickOfItAcapella_SmoothMcGroove.mp3");
			musicList.backgroundMusic1 = audio;
			audio = new Audio("music/AvengersSuite_Theme.mp3");
			musicList.battleMusic1 = audio;
			audio = new Audio("music/SuperSmashBrosBrawlOpeningTheme.mp3");
			musicList.mainMenu1 = audio;
		}
		catch (e) {
			// Do nothing
		}
		
		// Set up the dice roller
		diceRoller["parent"] = $("#diceRoller");
		diceRoller["title"] = document.getElementById("dice-roller-title");
		diceRoller["body"] = document.getElementById("dice-roller-body");
		diceRoller["results"] = document.getElementById("dice-roller-results");
		diceRoller["die-1"] = document.getElementById("dice-roller-die-1");
		diceRoller["die-2"] = document.getElementById("dice-roller-die-2");
		diceRoller["player-info"] = document.getElementById("dice-roller-player-info");
		diceRoller["roll-again"] = document.getElementById("dice-roller-roll-again");
		
		// Set up the canvas
		htmlCanvasElement = document.getElementById("board");
		drawSpace = htmlCanvasElement.getContext("2d");
		drawSpace.font = "14px Arial";
		htmlCanvasElement.addEventListener("click", handleScreenClick);
		
		// Parse URL params
		parseUrlParams();
		
		// Prep the map image
		mapImage = new Image();
		mapImage.onload = drawMap;
		mapImage.src = "images/map_small.png";
		
		// Draw the map
		drawMap();
	}
}

/**
 * Read user selections from the settings modal.
 */
function readSettings() {
	isMuted = ($("#settings-muted").is(":checked"));
	numPlayers = parseInt(document.getElementById("settings-num-players").value);
	randomArmyPlacement = ($("#settings-choose-countries-randomly").is(":checked"));
}

/**
 * If the hidden doCaptureCountryLocations param is passed in the URL, then enter country location
   capture mode.
 */
function parseUrlParams() {
	let url_string = window.location.href;
	let url = new URL(url_string);
	let doCaptureCountryLocations = url.searchParams.get("doCaptureCountryLocations") || null;
	if(doCaptureCountryLocations) {
		alert("Entering country location capture mode");
		gameState = "countryCapture";
	}
}

/**
 * Start a new game. Decide who goes first, place armies, and prepare for the first turn. Give the
 * user an option to abort if a game is in progress.
 */
function startGame() {
	// Give the player an option to abort while a game is going
	if(["initialPlacement", "placingArmies", "playing"].includes(gameState)) {
		startNewGame = confirm("Do you want to abandon this game and start a new game?");
		if(!startNewGame)
			return;
	}
	// Read settings
	readSettings();
	// Prepare for the first turn
	initializeCountries();
	initializePlayerColors();
	// Decide who goes first
	firstPlayer = rollDice("Decide who goes first", "goes first", true);
	if(firstPlayer == 1)  // TODO: Make this more dynamic for more than 2 players
		playerOrder = [1, 2];
	else
		playerOrder = [2, 1];
	// Place armies
	firstPlacementOfArmies();
	// Launch first turn
	// gameState = "playing";
	// mainGameLoop();
}

/**
 * Set all countries to 0 armies and no controller.
 */
function initializeCountries() {
	for(let country of countries) {
		country.numArmies = 0;
		country.controller = 0;
	}
	someCountriesAreUnclaimed = true;
	numCountriesWithArmies = 0;
}

/**
 * Give each player a color. // TODO: Let the player choose colors
 */
function initializePlayerColors() {
	// The player ids are 1-based, not 0-based, so start with a bad value for the 0 index of player
	let colorPalette = ["BADVAL", "blue", "red", "yellow", "brown", "pink", "orange"];
	playerColors = [];
	for(let i = 0; i <= numPlayers; i++) {
		playerColors[i] = colorPalette[i];
	}
}

/**
 * Place armies at the beginning of the game.
 */
function firstPlacementOfArmies() {
	gameState = "initialPlacement";
	const startingNumberOfArmies = 50 - (5 * numPlayers);
	armiesLeftToPlace = [];
	for(player of playerOrder) {
		armiesLeftToPlace[player] = startingNumberOfArmies;
	}
	currentPlayer = playerOrder[0];
	// placeArmy will call placeAnotherArmy until all armies are placed
	placeArmy();
}

/**
 * Keep playing the game until there is a winner. (this is recursive)
 */
function mainGameLoop(round=1) {
	roundCounter = round;
	for(player of playerOrder) {
		currentPlayer = player;
		turnCounter += 1;
		takeTurn(player);  // TODO: Implement
	}
	mainGameLoop(round + 1);
}

/**
 * Transition game state (turnPhase and gameState) based on current state.
 */
function transitionGameState() {
	// When state is "playing", transition turn phase
	if(gameState == "playing") {
		const currentPhaseIdx = PHASE_ORDER.findIndex(turnPhase);
		if(currentPhaseIdx < 0)
			turnPhase = "placeArmies";
		else
			turnPhase = PHASE_ORDER[(currentPhaseIdx + 1) % PHASE_ORDER.length];
		return;
	}
	// Before state is "playing", transition state
	const gameStateOrder = ["startup", "ready", "initialPlacement", "playing"];
	const currentGameStateIdx = gameStateOrder.findIndex(gameState);
	if(0 < currentGameStateIdx < 3) { // Only change the state when it is valid and is not "playing"
		gameState = gameStateOrder[currentGameStateIdx + 1];
	}
	else {
		console.warn("transitionGameState was called, but the game state didn't change.");
	}
}

/**
 * Place an army on the game board. If the player is an NPC, then choose a country at random.
 * If someCountriesAreUnclaimed is true, then force placement on a country with no armies.
 */
function placeArmy(player=currentPlayer, country=null) {
	if(armiesLeftToPlace[currentPlayer] == 0) {
		console.warn("Someone tried to place an army when they have no armies left to place. Ignoring.");
		return;
	}
	
	// For NPC, place an army. For the active player, this function is called from handleScreenClick.
	if(isPlayerNPC() || !country) {
		country = getRandomCountry(player);
	}
	else if(someCountriesAreUnclaimed && country.numArmies > 0) {
		alert("Choose a country with no armies until the world is full.");
		return;
	}
	else if(country.controller && country.controller != player) {
		alert("That's not your country!");
		return;
	}
	
	// Place the army
	country = getCountry(country);
	country.controller = player;
	country.numArmies += 1;
	drawArmiesForCountry(country);
	
	// Handle someCountriesAreUnclaimed logic. We count up numCountriesWithArmies until the world is full.
	if(someCountriesAreUnclaimed) {
		numCountriesWithArmies += 1;
		if(numCountriesWithArmies >= NUMBER_OF_COUNTRIES)
			someCountriesAreUnclaimed = false;
	}
	
	// This will end up calling placeArmy if there are any armies left to place for the current player
	armiesLeftToPlace[currentPlayer] -= 1;
	placeAnotherArmy();
	if(!thereAreArmiesLeftToPlace) {
		gameState = "playing";
		mainGameLoop();
	}
}

/**
 * @param country: Either a country name (string) or a country object.
 * @returns A country object.
 */
function getCountry(country) {
	if(typeof country == "string") {
		country = countries.filter(function(country_) {
			return country_.name = country;
		})[0];
	}
	return country;
}

/**
 * @returns A random country. If someCountriesAreUnclaimed, make sure to select an unclaimed country.
 * Otherwise if player is passed, filter on that player.
 * Credit: https://stackoverflow.com/a/15106541/2221645
 */
function getRandomCountry(player=0) {
	validCountries = countries;
	if(someCountriesAreUnclaimed) {
		validCountries = validCountries.filter(function(country) {
			return !country.controller;
		});
	}
	else if(player) {
		validCountries = validCountries.filter(function(country) {
			return country.controller == player;
		});
	}
	// let keys = Object.keys(validCountries); // Get the country names
	let countryIdx = getRandomInt(0, validCountries.length - 1); // Get a random country index
	let country = validCountries[countryIdx]; // Get a random country
	//let country = validCountries[keys[ keys.length * Math.random() << 0 ]]; // Get a random country
	if(!country.hasOwnProperty("numArmies"))
		country.numArmies = 0;
	return country;
}

/**
 * Draw an overlay on the country with the number of armies, colored with the controller's color.
 */
function drawArmiesForCountry(country) {
	// Accept either a country key or object
	country = getCountry(country);
	let x = country.x - 15; // Make the country's x the center of the rectangle
	let y = country.y + 5; // Draw the armies a little below the country name
	let color = playerColors[country.controller];
	// Draw a rectangle the color of the player, with the number of armies in white
	drawSpace.fillStyle = color;
	drawSpace.fillRect(x, y, 30, 20);
	drawSpace.fillStyle = "white";
	drawSpace.fillText(country.numArmies.toString(), x + 10, y + 13);
}

/**
 * Place another army. If gameState is "initialPlacement", then the next player places. Otherwise, the
 * current player places.
 */
function placeAnotherArmy() {
	if(!["placingArmies", "initialPlacement"].includes(gameState)) {
		console.error("placeAnotherArmy() was called outside of an army placement state");
		return;
	}
	if(!thereAreArmiesLeftToPlace()) {
		gameState = "playing";
		return;
	}
	if(gameState == "initialPlacement")
		getNextPlayer();
	if(armiesLeftToPlace[currentPlayer] && (isPlayerNPC() || (randomArmyPlacement && someCountriesAreUnclaimed))) {
		placeArmy();
	}
}

/**
 * Find out whose turn it is, then set the turn to the next player in playerOrder.
 */
function getNextPlayer() {
	currentPlayerIdx = playerOrder.indexOf(currentPlayer);
	currentPlayer = playerOrder[(currentPlayerIdx + 1) % playerOrder.length];
}

/**
 * @returns a random integer between min (inclusive) and max (inclusive).
 * Using Math.round() will give you a non-uniform distribution.
 * Credit: https://stackoverflow.com/a/1527820/2221645
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Load a song and play it if not muted.
 */
function loadSong(songStr="mainMenu1") {
	song = musicList[songStr];
	muteHandler();
}

/**
 * Commit the settings. Warn user of a reload.
 */
function saveSettings() {
	if($("#settings-form").data("changed")) {
		if(confirm("Would you like to start a new game?")) {
			setUpGameBoard(true);
		}
		$("#settings-form").data("changed", false);
	}
	closeModal();
}

/**
 * Pause the music.
 */
function closeModal() {
	song.pause();
}

/**
 * Call this anytime the game state changes in a way that affects the board.
 */
function updateBoard() {
	// Draw the map
	drawMap();
	// Update the armies on each country
	for(let country in countries) {
		drawArmiesForCountry(country);
	}
	// popups?
}

/**
 * Draw the map image in the game board canvas.
 */
function drawMap() {
	drawSpace.drawImage(mapImage, 0, 0, htmlCanvasElement.width, htmlCanvasElement.height);
}

/**
 * Capture a screen click on the game board canvas, and handle it.
 */
function handleScreenClick(event) {
	// Register click location
	let pointerPos = getPointerPositionOnCanvas(htmlCanvasElement, event);
	// Call a function based on game state, and pass the click location
	if(gameState == "countryCapture") {
		captureCountryLocations(pointerPos);
	}
	else if(isPlayerNPC()) { // We don't usually do anyting when it's not a human's turn
		return;
	}
	else if(["placingArmies", "initialPlacement"].includes(gameState)) {
		let country = countryClick(pointerPos);
		placeArmy(currentPlayer, country);
	}
	// TODO: Add more states and function calls to handle those states
}

/**
 * Returns an object with the x and y coordinates, as related to canvas.
 * @param canvas The canvas that detected the click
 * @param event The onclick event
 */
function getPointerPositionOnCanvas(canvas, event) {
    let boundingRect = canvas.getBoundingClientRect();
    let xPos = event.clientX - boundingRect.left;
    let yPos = event.clientY - boundingRect.top;
    return {x:xPos, y:yPos};
}

/**
 * A prompt asks for country name. When the name is given, enter that name, with the captured
 * location on the canvas into a object. When the special value "done" is entered, dump the
 * country locations into a json file, then stop capture mode.
 */
function captureCountryLocations(pointerPos) {
	let country = prompt("Enter country to assign this click location: ");
	if(country == "done") {
		// Make a "pretty" json string
		let jsonData = JSON.stringify(countryList, null, 2);
		// Save the file locally
		let downloadElement = document.createElement("a");
		let file = new Blob([jsonData], {type: 'text/plain'});
		downloadElement.href = URL.createObjectURL(file);
		downloadElement.download = "country_locations.json";
		downloadElement.click();
		// Stop capture mode
		gameState = "ready";
	}
	else {
		let countryItem = pointerPos;
		countryItem["name"] = country;
		countryList.push(countryItem);
	}
}

/**
 * Adapt functionality based on game state.
 */
function countryClick(pointerPos) {
	let closestCountry = null;
	let closestDistance = 999999;
	// countries is loaded in country_locations.js
	for(let country of countries) {
		// Simple distance formula; it's not too expensive, because there are less than 50 countries
		let howClose = Math.sqrt(
			Math.abs(country.x - pointerPos.x)
			+ Math.abs(country.y - pointerPos.y)
		);
		if(howClose < closestDistance) {
			closestDistance = howClose;
			closestCountry = country;
		}
	}
	//alert(closestCountry.name);  // Uncomment to debug
	return closestCountry;
}

/**
 * Roll the dice. This updates the UI.
 */
function rollDice(modalTitle, resultsSuffix, breakTies=false) {
	loadSong("battleMusic1");
	diceRoller.title.innerText = modalTitle;
	diceRoller.results.innerText = "";
	diceRoller["parent"].modal("show");
	let die1 = die2 = 0;
	// Break ties
	if(breakTies) {
		while(die1 == die2) {
			die1 = getDieRoll();
			die2 = getDieRoll();
		}
	}
	paintDieRoll("die-1", die1);
	paintDieRoll("die-2", die2);
	
	if(die1 > die2)
		winner = 1;
	else winner = 2;
	diceRoller.results.innerText = "Player " + winner + " " + resultsSuffix;
	diceRoller["player-info"].innerText = getPlayerColorsString();
	return winner;
}

/**
 * @returns A nice string with who is what color.
 */
function getPlayerColorsString() {
	let returnValue = "";
	for(let i = 1; i <= numPlayers; i++) {
		returnValue += "Player " + i + " is " + playerColors[i];
		if(i < numPlayers)
			returnValue += " | ";
	}
	return returnValue;
}

/**
 * Roll a single die. This just returns a number.
 */
function getDieRoll() {
    let min = Math.ceil(1);
    let max = Math.floor(6);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Display a singe die roll.
 */
function paintDieRoll(dieElement, number) {
	//dieImage = new Image();
	dieImage = document.createElement("img");
	dieImage.src = "images/die-white-" + number + ".png";
	dieImage.width = dieImage.height = 50;
	dieImage.alt = number;
	diceRoller["body"].replaceChild(dieImage, diceRoller[dieElement]);
	diceRoller[dieElement] = dieImage;
}

/**
 * @returns true if the player is an AI/NPC player, false if it's the player playing this game.
 */
function isPlayerNPC(player=null) {
	if(!player) {
		player = currentPlayer;
	}
	return player != ACTIVE_PLAYER_NUM;
}

/**
 * @returns true if any element in armiesLeftToPlace is greater than 0, false otherwise.
 */
function thereAreArmiesLeftToPlace() {
	return armiesLeftToPlace.some(item => item > 0);
}

/**
 * Handle the "Mute" checkbox.
 */
function muteHandler() {
	isMuted = ($("#settings-muted").is(":checked"));
	if(!song)
		return;
	if(isMuted) {
		song.muted = true;
	}
	else {
		song.muted = false;
		song.play();
	}
}
