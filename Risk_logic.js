/*
The logic for my Risk emulator
Written by Ben Clifford for personal use only
See https://github.com/bobsbeenjamin/risk-emulator for license and disclaimers
*/

/// Globals ///
const ACTIVE_PLAYER_NUM = 1; // Indicates which player is the person playing the game
var boardDim = 100 + 10; // leave a padding of 5 on each side of the visible board
var currentPlayer = 0; // The player whose turn it is
var countryMap = {}; // Only used when in country location capture mode
var drawSpace = null; // Holds the HTML canvas context
var diceRoller = {}; // Object with data and UI elements for the dice roller modal
var htmlCanvasElement = null; // Holds the HTML canvas element (useful for sizing)
var initialPlacement = true; // Are we still filling the board?
var isMuted = false; // Is the background music muted?
var mapImage = null; // The map image that we draw on
var mode = "startup"; // Gamestate mode: "playing" means a game is in progress
var musicList = {}; // Holds Audio objects to load and play music
var numCountriesWithArmies = 0; // How many countries have armies on them; only used during startup
var numPlayers = 2; // The number of players in the game
var players = []; // The list of players, represented as objects
var playerOrder = []; // Determined at game start; the order of play
var randomSetup = false; // Place armies randomly at game start?
var roundCounter = 0; // Which round we're on; a round is complete once each player takes a turn
var song = null; // Holds the current music track
var turnCounter = 0; // Which turn we're on; each player gets one turn per round
var waitingForUserAction = false; // Used for async hack (change later dude)

/**
 * Initializes the global vars. Run this only once per game.
 */
function setUpGameBoard(onLoad=false) {
	if(onLoad) {
		// Get audio ready
		try {
			audio = new Audio("music/SecretofMana_IntoTheThickOfItAcapella_SmoothMcGroove.mp3");
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
		
		// Prep the map image
		mapImage = new Image();
		mapImage.onload = drawMap;
		mapImage.src = "images/map_small.png";
		
		// Draw the map
		drawMap();
		
		// Parse URL params
		parseUrlParams();
	}
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
		mode = "countryCapture";
	}
}

/**
 * Start a new game. Decide who goes first, place armies, and prepare for the first turn. Give the
 * user an option to abort if a game is in progress.
 */
function startGame() {
	// Give the player an option to abort while a game is going
	if(mode == "playing" || mode == "placingArmies") {
		startNewGame = confirm("Do you want to abandon this game and start a new game?");
		if(!startNewGame)
			return;
	}
	// Read settings
	numPlayers = parseInt(document.getElementById("settings-num-players").value);
	randomSetup = Boolean(document.getElementById("settings-choose-countries-randomly").value);
	// Prepare for the first turn
	initializeCountries();
	initializePlayers();
	// Decide who goes first
	firstPlayer = rollDice("Decide who goes first", "goes first");
	if(firstPlayer == 1)  // TODO: Make this more dynamic for more than 2 players
		playerOrder = [1, 2];
	else
		playerOrder = [2, 1];
	// Place armies
	firstPlacementOfArmies();
	// Launch first turn
	mode = "playing";
	mainGameLoop();
}

/**
 * Set all countries to 0 armies and no controller.
 */
function initializeCountries() {
	for(country in countries) {
		countries[country].numArmies = 0;
		countries[country].controller = 0;
	}
}

/**
 * Give each player a color. // TODO: Let the player choose colors
 */
function initializePlayers() {
	players = [];
	let colorPalette = ["blue", "red", "yellow", "brown", "pink", "orange"];
	for(let i = 0; i < numPlayers; i++) {
		players[i] = {"number": i + 1, "color": colorPalette[i]};
	}
}

/**
 * Place armies at the beginning of the game.
 */
function firstPlacementOfArmies() {
	mode = "placingArmies";
	initialPlacement = true;
	let startingNumberOfArmies = 50 - (5 * numPlayers);
	startingNumberOfArmies = 21;
	for(let i = 0; i < startingNumberOfArmies; i++) {
		for(player of playerOrder) {
			currentPlayer = player;
			// NPCs always choose randomly (for now); also possibly choose randomly for the player,
			// depending on the randomSetup setting
			if(isPlayerNPC(player) || (randomSetup && initialPlacement)) {
				placeArmy(player);
			}
			else {
				waitingForUserAction = true;
				waitForUserAction();
			}
		}
	}
}

/**
 * HACK
 */
function waitForUserAction() {
	if(waitingForUserAction) {
		setTimeout(waitForUserAction, 100); // wait 100 milliseconds then recheck
	}
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
 * Place an army on the game board. If the player is an NPC, then choose a country at random.
 * If initialPlacement is true, then force placement on a country with no armies.
 */
function placeArmy(player, country=null) {
	// For NPC, place an army. For the active player, this function is called from handleScreenClick.
	if(isPlayerNPC() || !country) {
		country = getRandomCountry();
		while(initialPlacement && country.numArmies > 0) {
			country = getRandomCountry();
		}
	}
	else if(initialPlacement && country.numArmies > 0) {
		alert("Choose a country with no armies until the world is full.");
		return;
	}
	
	// Place the army
	country.controller = player;
	country.numArmies += 1;
	drawArmiesForCountry(country);
	
	// Handle initialPlacement logic. We count up numCountriesWithArmies until the world is full.
	if(initialPlacement) {
		numCountriesWithArmies += 1;
		if(numCountriesWithArmies >= 50)
			initialPlacement = false;
	}
	waitingForUserAction = false;
}

/**
 * @returns A random country.
 * Credit: https://stackoverflow.com/a/15106541/2221645
 */
function getRandomCountry() {
	let countryIdx = getRandomInt(0, 41); // Get a random country index
	let keys = Object.keys(countries); // Get the country names
	let country = countries[keys[countryIdx]]; // Get a random country
	//let country = countries[keys[ keys.length * Math.random() << 0 ]]; // Get a random country
	if(!country.hasOwnProperty("numArmies"))
		country.numArmies = 0;
	return country;
}

/**
 * Draw an overlay on the country with the number of armies, colored with the controller's color.
 */
function drawArmiesForCountry(country) {
	// Accept either a country key or object
	if(typeof country == "string") {
		country = countries[country];
	}
	let x = country.x - 15; // Make the country's x the center of the rectangle
	let y = country.y + 5; // Draw the armies a little below the country name
	let color = players[country.controller];
	// Draw a rectangle the color of the player, with the number of armies in white
	drawSpace.fillStyle = color;  // FIXME: First country is always black, and blue doesn't work
	drawSpace.fillRect(x, y, 30, 20);
	drawSpace.fillStyle = "white";
	drawSpace.fillText(country.numArmies.toString(), x + 10, y + 13);
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
 * Load a song.
 */
function loadSong(songStr="mainMenu1") {
	song = musicList[songStr];
	song.play();
}

/**
 * Commit the settings. Warn user of a reload.
 */
function saveSettings() {
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
	if(mode == "countryCapture") {
		captureCountryLocations(pointerPos);
	}
	else if(mode == "placingArmies" && !isPlayerNPC()) {
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
		let jsonData = JSON.stringify(countryMap, null, 2);
		// Save the file locally
		let downloadElement = document.createElement("a");
		let file = new Blob([jsonData], {type: 'text/plain'});
		downloadElement.href = URL.createObjectURL(file);
		downloadElement.download = "country_locations.json";
		downloadElement.click();
		// Stop capture mode
		mode = "ready";
	}
	else {
		//countryData = pointerPos;
		//countryData["index"] = 
		countryMap[country] = pointerPos;
	}
}

/**
 * Adapt functionality based on game state (we mostly care about the mode).
 */
function countryClick(pointerPos) {
	let closestCountry = null;
	let closestDistance = 999999;
	// countries is loaded in country_locations.js
	for(let country in countries) {
		// Simple distance formula; it's not too expensive, because there are less than 50 countries
		let howClose = Math.sqrt(
			Math.abs(countries[country].x - pointerPos.x)
			+ Math.abs(countries[country].y - pointerPos.y)
		);
		if(howClose < closestDistance) {
			closestDistance = howClose;
			closestCountry = country;
		}
	}
	alert(closestCountry);  // For now, just show the country; we'll do more later of course
	return closestCountry;
}

/**
 * Roll the dice. This updates the UI.
 */
function rollDice(modalTitle, resultsSuffix) {
	loadSong("battleMusic1");
	diceRoller.title.innerText = modalTitle;
	diceRoller.results.innerText = "";
	diceRoller["parent"].modal("show");
	let die1 = die2 = 0;
	// Break ties
	while(die1 == die2) {
		die1 = getDieRoll();
		die2 = getDieRoll();
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
	for(let i = 0; i < numPlayers; i++) {
		returnValue += "Player " + (i+1) + " is " + playerColors[i];
		if(i < numPlayers - 1)
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
 * Handle the "Mute/Unmute" button.
 */
function muteButton() {
	if(isMuted) {
		song.muted = false; 
		isMuted = false;
	}
	else {
		song.muted = true; 
		isMuted = true;
	}
}
