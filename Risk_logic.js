/*
The logic for my Risk emulator
Written by Ben Clifford for personal use only
See https://github.com/bobsbeenjamin/risk-emulator for license and disclaimers
*/

/// Globals ///
const ACTIVE_PLAYER_NUM = 1; // Indicates which player is the person playing the game
const NUMBER_OF_COUNTRIES = 42; // The total number of countries on the map
const PHASE_ORDER = ["reinforcement", "attack", "nonCombat", "end"]; // The phases of a turn
const delay = ms => new Promise(res => setTimeout(res, ms)); // A handy delay function

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
var gameState = "setup"; // Gamestate mode: "playing" means a game is in progress
var musicList = {}; // Holds Audio objects to load and play music
var numCountriesWithArmies = 0; // How many countries have armies on them; only used during setup
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
 * Initializes the global vars. Does lots of other initial setup. Run this only once per game with
 * onLoad set to true.
 */
function setUpGameBoard(onLoad=false, redrawMap=false) {
	// Parse URL params and read settings
	parseUrlParams();
	readSettings();

	if(onLoad) {
		// Set up settings responsiveness FIXME
		$("#new-game-settings").change(function() {
			$("#settings-form").data("changed", true);
		});

		// Set up modal close functions
		$("#settingsMenu").on("hidden.bs.modal", function () {
			closeModal("settings");
		});
		$("#diceRoller").on("hidden.bs.modal", function () {
			closeModal("diceRoller");
		});
		
		// Get audio ready
		initializeAudio();
		
		// Set up the dice roller
		initializeDiceRoller();
		
		// Set up the canvas
		initializeCanvas();
	}

	// Prep the map image
	if(onLoad || redrawMap) {
		mapImage = new Image();
		mapImage.onload = drawMap;
		mapImage.src = "images/map_small.png";
	}

	resetGlobalsForNewGame();
	drawMap(true);
}

/**
 * If the hidden doCaptureCountryLocations param is passed in the URL, then enter country location
 * capture mode. If the the hidden t-rex-runner param is passed in the URL, then load the t-rex-
 * runner mini game.
 */
function parseUrlParams() {
	const url_string = window.location.href;
	const url = new URL(url_string);
	// Capture country locations mode
	let hiddenParam = url.searchParams.get("doCaptureCountryLocations") || null;
	if(hiddenParam) {
		alert("Entering country location capture mode");
		gameState = "countryCapture";
		return;
	}
	// t-rex-runner mini-game
	hiddenParam = url.searchParams.get("t-rex-runner") || null;
	if(hiddenParam) {
		loadTrexRunner();
		return;
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
 * Load sound tracks into the global musicList object.
 */
function initializeAudio() {
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
}

/**
 * Bind dice roller UI elements to the global diceRoller object.
 */
function initializeDiceRoller() {
	diceRoller["parent"] = $("#diceRoller");
	diceRoller["title"] = document.getElementById("dice-roller-title");
	diceRoller["body"] = document.getElementById("dice-roller-body");
	diceRoller["results"] = document.getElementById("dice-roller-results");
	diceRoller["die-1"] = document.getElementById("dice-roller-die-1");
	diceRoller["die-2"] = document.getElementById("dice-roller-die-2");
	diceRoller["die-3"] = document.getElementById("dice-roller-die-3");
	diceRoller["die-4"] = document.getElementById("dice-roller-die-4");
	diceRoller["die-5"] = document.getElementById("dice-roller-die-5");
	diceRoller["die-6"] = document.getElementById("dice-roller-die-6");
	diceRoller["player-info"] = document.getElementById("dice-roller-player-info");
	diceRoller["roll-again"] = document.getElementById("dice-roller-roll-again");
}

/**
 * Bind some global vars to the canvase element and context. Add onclick and default font.
 */
function initializeCanvas() {
	htmlCanvasElement = document.getElementById("board");
	drawSpace = htmlCanvasElement.getContext("2d");
	drawSpace.font = "14px Arial";
	htmlCanvasElement.addEventListener("click", handleScreenClick);
}

/**
 * Set appropriate global vars to their defaults.
 */
function resetGlobalsForNewGame() {
	armiesLeftToPlace = []; // Number of armies each player needs to place; used during reinforcment and initial placement
	currentPlayer = 0; // The player whose turn it is
	someCountriesAreUnclaimed = true; // Are we still filling the board?
	gameState = "setup"; // Gamestate mode: "playing" means a game is in progress
	numCountriesWithArmies = 0; // How many countries have armies on them; only used during setup
	playerColors = []; // The colors for each player
	playerOrder = []; // Determined at game start; the order of play
	roundCounter = 0; // Which round we're on; a round is complete once each player takes a turn
	turnCounter = 0; // Which turn we're on; each player gets one turn per round
	turnPhase = ""; // The current phase for the current turn
}

/**
 * Start a new game. Decide who goes first, place armies, and prepare for the first turn. Give the
 * user an option to abort if a game is in progress.
 */
function startGame() {
	// Give the player an option to abort while a game is going
	if(["initialPlacement", "playing"].includes(gameState)) {
		startNewGame = confirm("Do you want to abandon this game and start a new game?");
		if(!startNewGame)
			return;
	}
	// Read settings and redraw the map
	setUpGameBoard();
	// Prepare for the first turn
	initializeCountries();
	initializePlayerColors();
	// Decide who goes first
	const firstPlayer = rollDice("Roll to decide who goes first", "goes first", true, numPlayers);
	setPlayerOrder(firstPlayer);
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
 * Determine and store player order. Play goes "to the left," meaning from the smalles to biggest
 * player number.
 */
function setPlayerOrder(firstPlayer) {
	playerOrder = [];
	for(let i=0; i<numPlayers; i++) {
		// The player ids are 1-based, not 0-based, hence the funny-looking mod logic
		// Credit: https://stackoverflow.com/a/3803420/2221645
		playerOrder.push((firstPlayer + i - 1) % numPlayers + 1); 
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
 * Keep playing the game until there is a winner. (this is recursive) (this is currently unused)
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
 * @param actOnTransition: If true, then call the appropriate function based on game state.
 */
function transitionGameState(actOnTransition=false) {
	// When the state is "playing", transition turn phase
	if(gameState == "playing") {
		const currentPhaseIdx = PHASE_ORDER.indexOf(turnPhase);
		if(currentPhaseIdx < 0)
			turnPhase = "reinforcement";
		else
			turnPhase = PHASE_ORDER[(currentPhaseIdx + 1) % PHASE_ORDER.length];
		if(actOnTransition) {
			switch(turnPhase) {
				case "reinforcement":
					armiesLeftToPlace = 3;  // FIXME: Calculate this based on Risk rules
					placeArmy();
					break;
				case "attack":
					startAttackPhase();
					break;
				case "nonCombat":
					startNonCombatPhase();
					break;
				case "end":
					nextTurn();
					break;
			}
		}
	}
	// Before the state is "playing", transition state
	else {
		const gameStateOrder = ["setup", "ready", "initialPlacement", "playing"];
		const currentGameStateIdx = gameStateOrder.indexOf(gameState);
		if(0 < currentGameStateIdx < 3) { // Only change the state when it is valid and is not "playing"
			gameState = gameStateOrder[currentGameStateIdx + 1];
		}
		else {
			console.warn("transitionGameState was called, but the game state didn't change.");
		}
		if(actOnTransition) {
			switch(gameState) {
				case "initialPlacement":
					placeArmy();
					break;
				case "playing":
					beginFirstTurn();
					break;
			}
		}
	}
}

/**
 * Begin the first turn, setting state and such.
 */
function beginFirstTurn() {
	gameState = "playing";
	transitionGameState(true);
}

/**
 * Place an army on the game board. If the player is an NPC, then choose a country at random.
 * If someCountriesAreUnclaimed is true, then force placement on a country with no armies.
 */
function placeArmy(player=currentPlayer, country=null) {
	if(!thereAreArmiesLeftToPlace(player)) {
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
	country.controller = player;  // Because of the check above, this shouldn't hand control to another player
	country.numArmies += 1;
	drawArmiesForCountry(country);
	
	// Handle someCountriesAreUnclaimed logic. We count up numCountriesWithArmies until the world is full.
	if(someCountriesAreUnclaimed) {
		numCountriesWithArmies += 1;
		if(numCountriesWithArmies >= NUMBER_OF_COUNTRIES)
			someCountriesAreUnclaimed = false;
	}
	
	// This will end up calling placeArmy if there are any armies left to place for the current player
	decrementArmiesToPlace(currentPlayer);
	placeAnotherArmy();  // Recursive call
	if(turnPhase == "reinforcment" && !thereAreArmiesLeftToPlace(player)) {
		startAttackPhase();
	}
}

/**
 * Reduce the armies left to place counter by 1. (armiesLeftToPlace is an array during
 * initialPlacement and an int during reinforcement)
 * @returns true if the armies counter was decremented, false otherwise.
 */
function decrementArmiesToPlace(player=currentPlayer) {
	if(!player || !thereAreArmiesLeftToPlace(player)) {
		return false;
	}
	if(gameState == "initialPlacement") {
		armiesLeftToPlace[player] --;
		return true;
	}
	else if(turnPhase == "reinforcement") {
		armiesLeftToPlace --;
		return true;
	}
	else return false;
}

/**
 * Set the turnPhase. If the player is an NPC, then make their attacks.
 */
function startAttackPhase(player=currentPlayer) {
	turnPhase = "attack";
	
	if(isPlayerNPC()) {
		handleAiAttacks(player);
	}
	else {
		checkForLegalAttacks(player);
	}
}

/**
 * For now, make a bunch of random attacks, and always attack when a country is controlled that 
 * borders enemy countries with less armies.
 */
function handleAiAttacks(player) {
	if(!isPlayerNPC()) {
		console.warn("handleAiAttacks got called during a player's move. Ignoring.");
		return;
	}

	let nextAttack = getNextAiAttack(player);
	while(nextAttack) {
		makeAttack(nextAttack);
		nextAttack = getNextAiAttack(player);
	}
	transitionGameState();
}

/**
 * Gets the next good attack for the AI player. For now, find a country controlled by the player
 * that borders enemy countries with less armies.
 */
function getNextAiAttack(player) {
	if(!isPlayerNPC()) {
		console.warn("handleAiAttacks got called during a human player's move. Ignoring.");
		return null;
	}
	for(let attackingCountry of thePlayersCountries(player)) {
		for(let defendingCountry of attackingCountry.neighboringCountries) {
			defendingCountry = getCountry(defendingCountry);
			if(attackingCountry.numArmies > defendingCountry.numArmies
					&& isValidAttack(attackingCountry, defendingCountry))
				return [attackingCountry, defendingCountry];
		}
	}
	return null;
}

/**
 * @returns True if the attack is legal per the rules of Risk, False otherwise.
 */
function isValidAttack(attackingCountry, defendingCountry) {
	return (attackingCountry.numArmies >= 2  // Safety check, per the rules of Risk
			&& attackingCountry.controller != defendingCountry.controller
	);
}

/**
 * Return whether there are legal attacks for player. If there are none left, alert the user and
 * advance the turn.
 * @param player: The player to check.
 * @returns true if there are legal attacks for player, false otherwise.
 */
function checkForLegalAttacks(player) {
	if(thereAreMovesLeft(player)) {
		return true;
	}
	else {
		alert("There are no more legal attacks. The turn is over.");
		nextTurn(); // We can skip the nonCombat phase, because there are no viable non-combat moves
		return false;
	}
}

/**
 * @param player: The player to filter on (defaults to currentPlayer).
 * @returns An array of the countries controlled by the player.
 */
function thePlayersCountries(player=currentPlayer) {
	return countries.filter( function(country) {
		return country.controller == player;
	});
}

/**
 * Make a single attack. If nextAttack is passed, use it. Then roll the dice to attack.
 * @param nextAttack: An array representing the next AI attack. Format: an array with 2 countries.
 */
async function makeAttack(nextAttack=null, player=currentPlayer) {
	if(nextAttack) {
		[attackingCountry, defendingCountry] = nextAttack;
		// TODO: Replace the following logic with dice rolls
		attackingCountry.numArmies --;
		defendingCountry.numArmies --;
		console.log(attackingCountry.name + " -> " + defendingCountry.name);
		drawArmiesForCountry(attackingCountry);
		drawArmiesForCountry(defendingCountry);
		
		if(defendingCountry.numArmies <= 0) {
			invadeCountry(attackingCountry, defendingCountry);
		}
	}
	await delay(750); // Credit: https://stackoverflow.com/a/47480429/2221645
}

/**
 * @param attackingCountry: The country that just won.
 * @param defendingCountry: The country that just lost, and is about to be invaded.
 * Transfer some armies from the attacking country to the defending country. If the attackingCountry
 * was controlled by a human, then ask them how many armies to move.  TODO: Ask the human for number
 */
function invadeCountry(attackingCountry, defendingCountry) {
	// Calculate the transfer
	// TODO: Adapt this logic when AI gets smarter
	let numArmiesToTransfer = Math.round(attackingCountry.numArmies / 2);
	if(numArmiesToTransfer > attackingCountry.numArmies)
		numArmiesToTransfer = attackingCountry.numArmies - 1;
	// Make the transfer
	attackingCountry.numArmies -= numArmiesToTransfer;
	defendingCountry.numArmies = numArmiesToTransfer;
	defendingCountry.controller = attackingCountry.controller;
	drawArmiesForCountry(attackingCountry);
	drawArmiesForCountry(defendingCountry);
}

/**
 * @param player: The player to check.
 * @returns Whether the player has any countries with more than one army.
 */
function thereAreMovesLeft(player) {  // TODO: Adapt this for non-combat vs attack checks
	for(let country of countries) {
		if(country.controller == player && country.numArmies > 0) {
			return true;
		}
	}
	return false;
}

/**
 * Advance the turn, and possibly the round.
 */
function nextTurn() {
	getNextPlayer();
	turnPhase = "reinforcement";
	if(playerOrder.indexOf(currentPlayer) == 0) {
		roundCounter ++;
	}
}

/**
 * @param country: Either a country name (string) or a country object.
 * @returns A country object.
 */
function getCountry(country) {
	if(typeof country == "string") {
		country = countries.filter(function(country_) {
			return (country_.name == country);
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
	if(!weArePlacingArmies()) {
		console.error("placeAnotherArmy() was called outside of an army placement state");
		return;
	}
	if(!thereAreArmiesLeftToPlace(currentPlayer)) {
		transitionGameState(true);
		return;
	}
	if(gameState == "initialPlacement")
		getNextPlayer();
	if(thereAreArmiesLeftToPlace(currentPlayer) && (isPlayerNPC() || (randomArmyPlacement && someCountriesAreUnclaimed))) {
		placeArmy();
	}
}

/**
 * @returns true if the game is in an army placement state, false otherwise.
 */
function weArePlacingArmies() {
	return (gameState === "initialPlacement" || turnPhase === "reinforcement");
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
			setUpGameBoard();
		}
		$("#settings-form").data("changed", false);
	}
}

/**
 * Switch from background music to an appropriate song based on the modal opened.
 */
function openModal(whichModal=null, modalElement=null) {
	song?.pause();
	if(whichModal == "settings") {
		loadSong("mainMenu1");
	}
	else if(whichModal == "diceRoller") {
		loadSong("battleMusic1");
	}
	if(modalElement) {
		modalElement.modal("show");
	}
}

/**
 * Switch to background music. Possibly call other functions, depending on whichModal.
 */
function closeModal(whichModal=null) {
	song.pause();
	loadSong("backgroundMusic1");
	if(whichModal == "settings") {
		saveSettings();
	}
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
function drawMap(clearMapFirst=false) {
	if(clearMapFirst) {
		drawSpace.fillStyle = "white";
		drawSpace.fillRect(0, 0, htmlCanvasElement.width, htmlCanvasElement.height);
	}
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
	else if(weArePlacingArmies()) {
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
function rollDice(modalTitle, resultsSuffix, breakTies=false, numPlayers=2) {
	// Some UI stuff
	diceRoller.title.innerText = modalTitle;
	diceRoller.results.innerText = "";
	// Initial roll
	let diceArray = [];
	for(let i=0; i< numPlayers; i++) {
		diceArray.push(getDieRoll());
	}
	// Break ties
	if(breakTies) {
		function hasDuplicates(array) {  // Credit: https://stackoverflow.com/a/7376645/2221645
			return (new Set(array)).size !== array.length;
		}
		while(hasDuplicates(diceArray)) {
			diceArray = [];
			for(let i=0; i< numPlayers; i++) {
				diceArray.push(getDieRoll());
			}
		}
	}
	// Determine winner
	let winner = diceArray.indexOf(Math.max(...diceArray)) + 1; // Add 1 because players are 1-based
	// More UI stuff, and return winner
	paintDiceRolls(diceArray);
	openModal("diceRoller", diceRoller["parent"]);
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
 * Display all the dice rolled.
 */
function paintDiceRolls(diceArray) {
	for(let i=0; i<diceArray.length; i++) {
		let dieElementName = "die-" + (i + 1);
		paintDieRoll(dieElementName, diceArray[i]);
	}
}

/**
 * Display a singe die roll.
 */
function paintDieRoll(dieElement, number) {
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
 * @returns true if there are armies left to place, false otherwise. This is determined by whether
 * any element in armiesLeftToPlace is greater than 0 during initialPlacement, and whether 
 * armiesLeftToPlace is greater than 0 during reinforcement.
 */
function thereAreArmiesLeftToPlace(player=null) {
	if(gameState == "initialPlacement") {
		if(player)
			return (armiesLeftToPlace[player] > 0);
		else
			return armiesLeftToPlace.some(item => item > 0);
	}
	else if(turnPhase == "reinforcement") {
		return (armiesLeftToPlace > 0);
	}
	else {
		console.error("thereAreArmiesLeftToPlace was called during a bad game state.");
		return false;
	}
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

/**
 * Load the t-rex-runner mini-game.
 */
function loadTrexRunner() {  // FIXME: This works, but it has an annoying scroll bar that refuses to go away
	let iframe = document.createElement("iframe");
	iframe.src = "t-rex-runner/index.html";
	iframe.height = "400px";
	iframe.width = "1000px";
	document.body.appendChild(document.createElement("br"));
	document.body.appendChild(iframe);
	iframe.scrollIntoView(false);
}
