/*
The logic for my Risk emulator
Written by Ben Clifford for personal use only
See https://github.com/bobsbeenjamin/risk-emulator for license and disclaimers
*/

/// Globals ///
// Global constants
const ACTIVE_PLAYER_NUM = 1; // Indicates which player is the person playing the game
const MIN_REINFORCEMENT_ARMIES = 3; // The minimum number of armies to reinforce with each turn
const NUMBER_OF_COUNTRIES = 42; // The total number of countries on the map
// The possible game states
const ENUM_STATE_SETUP = 1,
      ENUM_STATE_READY = 2,
      ENUM_STATE_INITIALPLACEMENT = 3,
      ENUM_STATE_PLAYING = 4;
const GAME_STATE_ORDER = [ENUM_STATE_SETUP, ENUM_STATE_READY, ENUM_STATE_INITIALPLACEMENT, ENUM_STATE_PLAYING];
// The phases of a turn
const ENUM_PHASE_REINFORCEMENT = 1,
	  ENUM_PHASE_ATTACK = 2,
	  ENUM_PHASE_NONCOMBAT = 3,
	  ENUM_PHASE_END = 4;
const PHASE_ORDER = [ENUM_PHASE_REINFORCEMENT, ENUM_PHASE_ATTACK, ENUM_PHASE_NONCOMBAT, ENUM_PHASE_END];
// Global variables
var armiesLeftToPlace = []; // Number of armies each player needs to place; used during reinforcement and initial placement
var attackingCountry = null; // The attacking country; only used during combat or the non-combat move
var boardDim = 100 + 10; // leave a padding of 5 on each side of the visible board
var button_EndTurn = null; // The pass-turn button
var button_NonCombat = null; // The non-combat button
var chosenCountry1 = null; // Holds the first chosen country for attack and non-combat moves
var currentPlayer = 0; // The player whose turn it is
var countryList = []; // Only used when in country location capture mode
var defendingCountry = null; // The defending country; only used during combat or the non-combat move
var drawSpace = null; // Holds the HTML canvas context
var diceRoller = {}; // Object with data and UI elements for the dice roller modal
var diceRollerCaller = null; // The function that called the dice roller, used by continueGame()
var diceRollerResult = null; // The results from the dice roll
var htmlCanvasElement = null; // Holds the HTML canvas element (useful for sizing)
var someCountriesAreUnclaimed = true; // Are we still filling the board?
var isMuted = false; // Is the background music muted?
var mapImage = null; // The map image that we draw on
var modal_DiceRoller = null; // Reference to the dice-roller popup modal
var modal_Settings = null; // Reference to the settings popup modal
var musicVolume = 0.5; // The volume modifier that should be applied to all songs
var gameState = ENUM_STATE_SETUP; // Gamestate mode: ENUM_STATE_PLAYING means a game is in progress
var musicList = {}; // Holds Audio objects to load and play music
var numCountriesWithArmies = 0; // How many countries have armies on them; only used during setup
var numPlayers = 2; // The number of players in the game
var playerColors = []; // The colors for each player
var playerOrder = []; // Determined at game start; the order of play
var randomArmyPlacement = false; // Place armies randomly at game start?
var roundCounter = 0; // Which round we're on; a round is complete once each player takes a turn
var skipDiceForAttacks = false; // When true, use use deterministic logic for each attack
var song = null; // Holds the current music track
var textDisplayArea = null; // Holds the text display area, used for showing stats and game state to the user
var turnCounter = 0; // Which turn we're on; each player gets one turn per round
var turnPhase = ""; // The current phase for the current turn
var waitingForDiceRoll = false; // Flag to see if we're waiting for the user to press the Roll! button

/**
 * Initializes the global vars. Does lots of other initial setup. Run this only once per game with
 * onLoad set to true.
 */
function setUpGameBoard(onLoad=false, redrawMap=false) {
	// Parse URL params and read settings
	parseUrlParams();
	readSettings();

	if(onLoad) {
		
		// Initialize audio, the dice roller modal, the elements (all UI), and the continents (data)
		initializeAudio();
		initializeDiceRoller();
		initializeUiElements();
		initializeContinents();
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
 * Load sound tracks into the global musicList object. Attach volume control handler.
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
	// Attach volume control
	document.getElementById("settings-volume-control").addEventListener("change", function(event) {
		let updatedVolumeVal = event.currentTarget.value / 100;
		song.volume = updatedVolumeVal;
		musicVolume = updatedVolumeVal;
	});
}

/**
 * Bind dice roller UI elements to the global diceRoller object.
 */
function initializeDiceRoller() {
	diceRoller["title"] = document.getElementById("dice-roller-title");
	diceRoller["body"] = document.getElementById("dice-roller-body");
	diceRoller["results"] = document.getElementById("dice-roller-results");
	diceRoller["table"] = document.getElementById("dice-roller-dice-table");
	for(let i=1; i<=6; i++) {
		diceRoller["die-" + i + "-column"] = document.getElementById("dice-roller-die-" + i + "-column");
		diceRoller["die-" + i + "-header"] = document.getElementById("dice-roller-die-" + i + "-header");
		diceRoller["die-" + i + "-image"] = document.getElementById("dice-roller-die-" + i + "-image");
		diceRoller["die-" + i + "-footer"] = document.getElementById("dice-roller-die-" + i + "-footer");
	}
	diceRoller["player-info"] = document.getElementById("dice-roller-player-info");
	diceRoller["roll-again"] = document.getElementById("dice-roller-roll-again");
}

/**
 * Bind some global vars to some UI elements.
 */
function initializeUiElements() {
	button_EndTurn = document.getElementById("end-turn");
	button_NonCombat = document.getElementById("start-non-combat");
	textDisplayArea = document.getElementById("text-display-area");
	modal_DiceRoller = document.getElementById("dice-roller");
	modal_Settings = document.getElementById("settings-menu");
	initializeCanvas();
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
 * Populate the countries of each continent. We do this here to be more dynamic (this will
 * eventually support non-standard world maps, when themes go live).
 */
function initializeContinents() {
	for(let country of countries) {
		let continent = getContinent(country.continent);
		if(!continent.hasOwnProperty("countries")) {
			continent.countries = [];
		}
		continent.countries.push(country);  // Now the continents have pointers to country objects
	}
}

/**
 * @param continent: Either a continent name (string) or a continent object.
 * @returns A continent object.
 */
function getContinent(continent) {
	if(typeof continent == "string") {
		continent = continents.filter(function(continent_) {
			return (continent_.name == continent);
		})[0];
	}
	return continent;
}

/**
 * Set appropriate global vars to their defaults.
 */
function resetGlobalsForNewGame() {
	armiesLeftToPlace = []; // Number of armies each player needs to place; used during reinforcement and initial placement
	currentPlayer = 0; // The player whose turn it is
	someCountriesAreUnclaimed = true; // Are we still filling the board?
	gameState = ENUM_STATE_SETUP; // Gamestate mode: ENUM_STATE_PLAYING means a game is in progress
	numCountriesWithArmies = 0; // How many countries have armies on them; only used during setup
	playerColors = []; // The colors for each player
	playerOrder = []; // Determined at game start; the order of play
	roundCounter = 1; // Which round we're on; a round is complete once each player takes a turn
	turnCounter = 1; // Which turn we're on; each player gets one turn per round
	turnPhase = ""; // The current phase for the current turn
}

/**
 * Start a new game. Decide who goes first, place armies, and prepare for the first turn. Give the
 * user an option to abort if a game is in progress.
 */
function startGame(confirmRestart=true) {
	// Give the player an option to abort while a game is going
	if([ENUM_STATE_INITIALPLACEMENT, ENUM_STATE_PLAYING].includes(gameState) &&  confirmRestart) {
		startNewGame = confirm("Do you want to abandon this game and start a new game?");
		if(!startNewGame)
			return;
	}
	console.log("Pregame actions...");
	// Read settings and redraw the map
	setUpGameBoard();
	showOrHideGameButtons(true);
	// Prepare for the first turn
	initializeCountries();
	initializePlayerColors();
	// Decide who goes first
	diceRollerCaller = "game-start";
	const firstPlayer = rollTheDice(false, 1, true, numPlayers);
	setPlayerOrder(firstPlayer);
	// Place armies
	console.log("::Starting a new game::");
	gameState = ENUM_STATE_READY;
}

/**
 * Show or hide the game buttons.
 * @param show: If true, then show them. If false, then hide them. Defaults true.
 */
function showOrHideGameButtons(show=true) {
	if(show) {
		button_NonCombat.style.display = "inline";
		button_EndTurn.style.display = "inline";
	}
	else {
		button_NonCombat.style.display = "none";
		button_EndTurn.style.display = "none";
	}
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
	gameState = ENUM_STATE_INITIALPLACEMENT;
	textDisplayArea.innerText = "Placing armies";
	const startingNumberOfArmies = 50 - (5 * numPlayers);
	armiesLeftToPlace = [];
	for(let player of playerOrder) {
		armiesLeftToPlace[player] = startingNumberOfArmies;
	}
	currentPlayer = playerOrder[0];
	// placeArmy will call placeAnotherArmy until all armies are placed
	placeArmy();
}

/**
 * Update the text display area based on game state.
 */
function updateStatusText() {
	let text = "";
	if(gameState == ENUM_STATE_PLAYING) {
		switch(turnPhase) {
			case ENUM_PHASE_REINFORCEMENT:
				text = "Player " + currentPlayer + " has " + armiesLeftToPlace + " armies left to place.";
				break;
			case ENUM_PHASE_ATTACK:
				if(attackingCountry && defendingCountry && isPlayerNPC()) {
					text = "Player " + currentPlayer + " attacked: " + attackingCountry.name + " -> "
						   + defendingCountry.name;
					break;
				}
				else {
					text = "Waiting for attack.";
				}
				break;
			case ENUM_PHASE_NONCOMBAT:
				if(attackingCountry && defendingCountry && isPlayerNPC()) {
					text = "Player " + currentPlayer + " made non-combat move: " + attackingCountry.name
						   +  "-> " + defendingCountry.name;
					break;
				}
				else {
					text = "Waiting for non-combat move.";
				}
				break;
			case ENUM_PHASE_END:
				break;
		}
	}
	else if(gameState == ENUM_STATE_INITIALPLACEMENT) {
		for(let player of playerOrder) {
			text += "Player " + player + " has " + armiesLeftToPlace[player] + " armies left to place. ";
		}
	}
	textDisplayArea.innerText = text;
}

/**
 * Keep playing the game until there is a winner. (this is recursive) (this is currently unused)
 */
function mainGameLoop(round=1) {
	roundCounter = round;
	for(let player of playerOrder) {
		currentPlayer = player;
		turnCounter ++;
		takeTurn(player);  // TODO: Implement
	}
	mainGameLoop(round + 1);
}

/**
 * Transition game state (turnPhase and gameState) based on current state.
 * @param actOnTransition: If true, then call the appropriate function based on game state.
 */
function transitionGameState(actOnTransition=false) {
	// When the state is ENUM_STATE_PLAYING, transition turn phase
	if(gameState == ENUM_STATE_PLAYING) {
		const currentPhaseIdx = PHASE_ORDER.indexOf(turnPhase);
		if(currentPhaseIdx < 0)
			turnPhase = ENUM_PHASE_REINFORCEMENT;
		else
			turnPhase = PHASE_ORDER[(currentPhaseIdx + 1) % PHASE_ORDER.length];
		if(actOnTransition) {
			switch(turnPhase) {
				case ENUM_PHASE_REINFORCEMENT:
					startReinforcementPhase();
					break;
				case ENUM_PHASE_ATTACK:
					startAttackOrNoncombatPhase(attacking=true);
					break;
				case ENUM_PHASE_NONCOMBAT:
					startAttackOrNoncombatPhase(attacking=false);
					break;
				case ENUM_PHASE_END:
					nextTurn();
					break;
			}
		}
	}
	// Before the state is ENUM_STATE_PLAYING, transition state
	else {
		const currentGameStateIdx = GAME_STATE_ORDER.indexOf(gameState);
		if(0 < currentGameStateIdx < 3) { // Only change the state when it is valid and is not ENUM_STATE_PLAYING
			gameState = GAME_STATE_ORDER[currentGameStateIdx + 1];
		}
		else {
			console.warn("transitionGameState was called, but the game state didn't change.");
		}
		if(actOnTransition) {
			switch(gameState) {
				case ENUM_STATE_INITIALPLACEMENT:
					firstPlacementOfArmies();
					break;
				case ENUM_STATE_PLAYING:
					beginFirstTurn();
					break;
			}
		}
	}
	updateStatusText();
}

/**
 * Begin the first turn, setting state and such.
 */
function beginFirstTurn() {
	gameState = ENUM_STATE_PLAYING;
	logNewTurn();
	transitionGameState(true);
}

/**
 * Set the turnPhase. If the player is an NPC, then place their armies.
 */
function startReinforcementPhase(player=currentPlayer) {
	turnPhase = ENUM_PHASE_REINFORCEMENT;
	armiesLeftToPlace = getNumReinforcementArmies(currentPlayer);
	alert("Player " + currentPlayer + " gets to place " + armiesLeftToPlace + " armies.");
	placeArmy();
}

/**
 * @returns The number of armies that player should reinforce with (not including trading in cards).
 */
function getNumReinforcementArmies(player=currentPlayer) {
	// Start with the number of contries controlled by player divided by 3, rounded up
	numArmies = Math.ceil(thePlayersCountries(player).length / 3);
	// Add on continent bonuses
	for(let continent of continents) {
		if(isContinentControlledBy(continent, player)) {
			numArmies += continent.bonus;
		}
	}
	return Math.max(numArmies, MIN_REINFORCEMENT_ARMIES);
}

/**
 * @param continent: The continent, as a string or object.
 * @param player: The player id.
 * @returns true if every country in the continent is controlled by the player, false otherwise.
 */
function isContinentControlledBy(continent, player) {
	continent = getContinent(continent);
	return thePlayersCountries(player, continent.name).length == continent.countries.length;
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
	
	// If no country is passed, then analyze whether we should pick the country ourselves
	if(!country) {
		// For an NPC, always place an army. For a human player, this function can be called with
		// placeArmyForHuman set to true. In all other cases, exit early.
		if(isPlayerNPC() || (gameState == ENUM_STATE_INITIALPLACEMENT && randomArmyPlacement)) {
			country = getRandomCountry(player);
		}
		else return; // Exit early
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
	console.log("Player " + player + " placed an army on " + country.name);
	drawArmiesForCountry(country);
	
	// Handle someCountriesAreUnclaimed logic. We count up numCountriesWithArmies until the world is full.
	if(gameState == ENUM_STATE_INITIALPLACEMENT && someCountriesAreUnclaimed) {
		numCountriesWithArmies += 1;
		if(numCountriesWithArmies >= NUMBER_OF_COUNTRIES)
			someCountriesAreUnclaimed = false;
	}
	
	// This will end up calling placeArmy if there are any armies left to place for the current player
	decrementArmiesToPlace(currentPlayer);
	updateStatusText();
	placeAnotherArmy();  // Recursive call
	if(turnPhase == ENUM_PHASE_REINFORCEMENT && !thereAreArmiesLeftToPlace(player)) { // FIXME: Delete this block?
		startAttackOrNoncombatPhase(attacking=true);
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
	if(gameState == ENUM_STATE_INITIALPLACEMENT) {
		armiesLeftToPlace[player] --;
		return true;
	}
	else if(turnPhase == ENUM_PHASE_REINFORCEMENT) {
		armiesLeftToPlace --;
		return true;
	}
	else return false;
}

/**
 * Set the turnPhase. If the player is an NPC, then make their moves.
 * @param attacking: If true, start the attack phase. If false, start the non-combat phase.
 */
function startAttackOrNoncombatPhase(attacking=true, player=currentPlayer) {
	turnPhase = attacking ? ENUM_PHASE_ATTACK : ENUM_PHASE_NONCOMBAT;
	console.info("::Starting the " + turnPhase + " phase::");
	
	if(isPlayerNPC()) {
		handleAiMoves(attacking, player);
	}
	else {
		checkForLegalMoves(attacking, player);
	}
}

/**
 * Attacks: For now, make a bunch of random attacks, and always attack when a country is controlled
 * that  borders enemy countries with less armies.
 * Non-combat moves: For now, make a random valid move about half the time. The other half do nothing.
 */
function handleAiMoves(attacking, player) {
	if(!isPlayerNPC()) {
		console.warn("handleAiMoves got called during a player's move. Ignoring.");
		return;
	}
	// Attack
	if(attacking) {
		let nextMove = getNextAiAttack(player);
		// Attack once and wait for user interaction in the dice roller
		if(!skipDiceForAttacks) {
			if(!nextMove)  // Need to move on when there are no attacks left for the AI player
				transitionGameState(actOnTransition=true);
			else
				makeMove(attacking, nextMove);
			return;
		}
		// Attack exhaustively
		while(nextMove) {
			makeMove(attacking, nextMove);
			nextMove = getNextAiAttack(player);
		}
	}
	// Only mak a non-combat move about half the time
	else if(getDieRoll() > 3) {
		let nextMove = getAiNonCombatMove(player);
		if(nextMove)
			makeMove(attacking, nextMove);
	}
	
	transitionGameState(actOnTransition=true);
}

/**
 * Gets the next good attack for the AI player. For now, find a country controlled by the player
 * that borders enemy countries with less armies.
 */
function getNextAiAttack(player) {
	if(!isPlayerNPC()) {
		console.warn("getNextAiAttack got called during a human player's move. Ignoring.");
		return null;
	}
	for(attackingCountry of thePlayersCountries(player)) {
		for(defendingCountry of attackingCountry.neighboringCountries) {
			defendingCountry = getCountry(defendingCountry);
			if(attackingCountry.numArmies > defendingCountry.numArmies
					&& isValidMove(attackingCountry, defendingCountry, true))
				return [attackingCountry, defendingCountry];
		}
	}
	return null;
}

/**
 * Gets the next non-combat move for the AI player. For now, find a country controlled by the player
 * that borders a friendly country.
 */
function getAiNonCombatMove(player) {
	if(!isPlayerNPC()) {
		console.warn("getNextAiNonCombatMove got called during a human player's move. Ignoring.");
		return null;
	}
	for(let sourceCountry of thePlayersCountries(player)) {
		for(let targetCountry of sourceCountry.neighboringCountries) {
			targetCountry = getCountry(targetCountry);
			if(isValidMove(sourceCountry, targetCountry, false))
				return [sourceCountry, targetCountry];
		}
	}
	return null;
}

/**
 * @param attackingCountry: The country that armies are trying to move from.
 * @param defendingCountry: The country that armies are trying to move to.
 * @param attacking: If true, then check for an attack. If false, then check for a non-combat move.
 * @returns true if the move is legal per the rules of Risk, false otherwise.
 */
function isValidMove(attackingCountry, defendingCountry, attacking) {
	if(attacking) {
		return (attackingCountry.numArmies >= 2  // Safety check, per the rules of Risk
				&& attackingCountry.controller != defendingCountry.controller
		);
	}
	else {
		return (attackingCountry.numArmies >= 2  // Safety check, per the rules of Risk
				&& attackingCountry.controller == defendingCountry.controller
		);
	}
}

/**
 * Return whether there are legal moves for player. If there are none left, alert the user and
 * advance the turn.
 * @param attacking: If true, then check for attacks. If false, then check for non-combat moves.
 * @param player: The player to check.
 * @returns true if there are legal attacks for player, false otherwise.
 */
function checkForLegalMoves(attacking, player) {
	if(thereAreMovesLeft(attacking, player)) {
		return true;
	}
	else {
		moveStr = attacking ? "attacks" : "non-combat moves";
		alert("There are no more legal " + moveStr + ". The turn is over.");
		nextTurn(); // We can skip the nonCombat phase, because there are no viable non-combat moves
		return false;
	}
}

/**
 * @param player: The player to filter on (defaults to currentPlayer).
 * @param continent: A string representing the continent to filter on. Ignored if not passed.
 * @returns An array of the countries controlled by the player, possibly in the continent.
 */
function thePlayersCountries(player=currentPlayer, continent=null) {
	let playerCountries = countries.filter( function(country) {
		return country.controller == player;
	});
	if(continent) {
		playerCountries = playerCountries.filter( function(country) {
			return country.continent == continent;
		});
	}
	return playerCountries;
}

/**
 * Make a single attack. If theMove is passed, use it. Otherwise do nothing. If skipDiceForAttacks
 * is true, then make a deterministic attack. Otherwise, use the dice roller.
 * @param attacking: If true, then make an attack. If false, then make a non-combat move.
 * @param theMove: An array representing the next move. Format: an array with 2 countries.
 */
function makeMove(attacking, theMove=null) {
	if(theMove) {
		[attackingCountry, defendingCountry] = theMove;
		if(attacking) {
			// Deterministic attack logic
			if(skipDiceForAttacks) {
				if(attackingCountry.numArmies > 2)
					attackingCountry.numArmies --;
				defendingCountry.numArmies --;
				
				if(defendingCountry.numArmies <= 0) {
					invadeCountry(attackingCountry, defendingCountry);
				}
			}
			// Dice rolling logic
			else {
				diceRollerCaller = "waiting-for-attack";
				waitingForDiceRoll = true;
				displayDiceRoller(null, true, null, null);
				return;
			}
		}
		else { // non-combat: just move over about half the armies
			invadeCountry(attackingCountry, defendingCountry);
		}
		// Update the UI here for non-combat moves and when the attack logic is deterministic.
		// For dice-rolling attacks, the UI will be updated after the roll.
		if(!attacking || skipDiceForAttacks) {
			updateUiAfterMove(attacking);
		}
		// Possibly remove players from the player order loop, and possibly declare a winner
		removeDeadPlayers();
	}
}

/**
 * Uses the rules of Risk to determine how many dice each country gets to use for this combat.
 * @returns A 2-element array, where the first element is the number of dice for the attacker, and
 * the second element is the number of dice for the defender.
 */
function getDicePerPlayer(attackingCountry, defendingCountry) {
	// Attack dice are one less than the number of armies on the attacking country, up to 3
	const numAttackDice = Math.min(3, attackingCountry.numArmies - 1);
	// Defense dice are the number of armies on the defending country, up to 2
	const numDefenseDice = Math.min(2, defendingCountry.numArmies);
	return [numAttackDice, numDefenseDice]
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
	defendingCountry.numArmies += numArmiesToTransfer; // Should be 0 before this when attacking
	defendingCountry.controller = attackingCountry.controller;
	drawArmiesForCountry(attackingCountry);
	drawArmiesForCountry(defendingCountry);
}

/**
 * Update the UI after an attack or non-combat move. This is called from makeMove() for non-combat
 * moves and when the attack logic is deterministic. Otherwise this is called by the dice-roller.
 */
function updateUiAfterMove(attacking) {
	checkWhetherToHideRollButton();
	const moveStr = "Player " + currentPlayer + (attacking ? " Attack: " : " Non-combat: ");
	console.log(moveStr + attackingCountry.name + " -> " + defendingCountry.name);
	drawArmiesForCountry(attackingCountry);
	drawArmiesForCountry(defendingCountry);
	updateStatusText(attackingCountry, defendingCountry);
}

/**
 * @param attacking: If true, then check for attacks. If false, then check for non-combat moves.
 * @param player: The player to check.
 * @returns Whether the player has any countries with more than one army.
 */
function thereAreMovesLeft(attacking, player) {
	for(let country of countries) {
		if(country.controller == player && country.numArmies > 0) {
			if(attacking && isPlayerNPC(player)) {
				for(let neighbor of country.neighboringCountries) {
					neighbor = getCountry(neighbor);
					if(neighbor.numArmies < country.numArmies)
						return true;
				}
			}
			else return true;
		}
	}
	return false;
}

/**
 * Advance the turn, and possibly the round.
 */
function nextTurn() {
	getNextPlayer();
	turnCounter ++;
	if(playerOrder.indexOf(currentPlayer) == 0) {
		roundCounter ++;
	}
	logNewTurn();
	startReinforcementPhase();
}

/**
 * Log new turn info to the console. Eventually, this will give turn info to the user.
 */
function logNewTurn() {
	console.log("====================================");
	console.info("Player " + currentPlayer + " is starting round " + roundCounter + ", turn " + turnCounter);
	console.log("====================================");
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
 * Place another army. If gameState is ENUM_STATE_INITIALPLACEMENT, then the next player places. Otherwise, the
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
	if(gameState == ENUM_STATE_INITIALPLACEMENT)
		getNextPlayer();
	if(thereAreArmiesLeftToPlace(currentPlayer) && (isPlayerNPC() || (randomArmyPlacement && someCountriesAreUnclaimed))) {
		placeArmy();
	}
}

/**
 * @returns true if the game is in an army placement state, false otherwise.
 */
function weArePlacingArmies() {
	return (gameState === ENUM_STATE_INITIALPLACEMENT || turnPhase === ENUM_PHASE_REINFORCEMENT);
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
 * Switch from background music to an appropriate song based whichModal. Open the modal.
 */
function openModal(whichModal=null) {
	song?.pause();
	if(whichModal == "settings") {
		loadSong("mainMenu1");
		modal_Settings.showModal();
	}
	else if(whichModal == "diceRoller") {
		loadSong("battleMusic1");
		modal_DiceRoller.showModal();
	}
}

/**
 * Load a song and play it if not muted.
 */
function loadSong(songStr="mainMenu1") {
	song = musicList[songStr];
	volumeHandler();
}

/**
 * Switch music. Possibly call other functions, depending on whichModal.
 * @param whichModal: If "settings", then save the settings. If "diceRoller", then continue the game.
 */
function closeModal(whichModal=null) {
	song.pause();
	loadSong("backgroundMusic1");
	if(whichModal == "settings") {
		saveSettings();
		modal_Settings.close();
	}
	else if(whichModal == "diceRoller") {
		modal_DiceRoller.close();
		continueGame();
	}
}

/**
 * Commit the settings. Possibly warn the user of a reload.
 */
function saveSettings() {
	if($("#settings-form").data("changed")) {
		if(confirm("You changed settings that only affect new games. Would you like to start a new game?")) {
			startGame(confirmRestart=false);
		}
		$("#settings-form").data("changed", false);
	}
	skipDiceForAttacks = ($("#settings-skip-dice-for-attacks").is(":checked"));
}

/**
 * Pick up the game where it left off, likely right before rolling the dice.
 */
function continueGame() {
	if(diceRollerCaller == "game-start") {
		transitionGameState(actOnTransition=true);
	}
	else if(diceRollerCaller == "handle-dice-roll") {
		let attacking = (turnPhase == ENUM_PHASE_ATTACK);
		startAttackOrNoncombatPhase(attacking);
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
 * Handle a click of the Roll button on the dice roller modal.
 */
function handleDiceRoll() {
	checkWhetherToHideRollButton();
	if(diceRollerCaller == "waiting-for-attack") {
		diceRollerCaller = "handle-dice-roll";
	}
	waitingForDiceRoll = false;
	let winner = rollTheDice(true);
	attackingCountry.numArmies -= winner.defender;
	defendingCountry.numArmies -= winner.attacker;
	if(defendingCountry.numArmies <= 0) {
		invadeCountry(attackingCountry, defendingCountry);
		diceRoller["roll-again"].hidden = true;
	}
	updateUiAfterMove(true);
	removeDeadPlayers();
	
	// Special handling for AI attacks
	if(isPlayerNPC()) {
		// TODO: When the AI keeps attacking the same human, keep the dice roller up.
		// Also, maybe special handling for when there are more attacks for the same countries?
		handleAiMoves(true, currentPlayer);
	}
}

/**
 * Check whether to hide the Roll button, and then hide the button if needed.
 */
function checkWhetherToHideRollButton() {
	if(!isValidMove(attackingCountry, defendingCountry, true)) {
		diceRoller["roll-again"].hidden = true;
	}
}

/**
 * Possibly remove players from the player order loop, and then possibly declare a winner.
 */
function removeDeadPlayers() {
	for(let i=0; i<playerOrder.length; i++) {
		let player = playerOrder[i];
		if(thePlayersCountries(player).length == 0) {
			alert("Player " + player + " has been eliminated.");
			playerOrder.splice(i, i+1); // Delete the player from the playerOrder array
			// No need to remove the player from playerColors, because it uses player number for indices
			removeDeadPlayers(); // Call again on the now shrunken playerOrder array
			// The playerOrder array was altered, so continuing the loop is dangerous
			return; // checkForGameWinner was already called at the bottom of the recursive call
		}
	}
	checkForGameWinner();
}

/**
 * If a human player has won or lost, then declare the winner, end the game, and prompt for a restart.
 */
function checkForGameWinner() {
	// check for human player loss
	if(playerOrder.indexOf(ACTIVE_PLAYER_NUM) < 0) {
		// TODO: Add lose music
		let playAgain = confirm("You have lost...\nWould you like to start a new game now?");
		if(playAgain) {
			startGame(false);
		}
	}
	// Check for human player win
	else if(playerOrder.length == 1) {
		// TODO: Add win music
		const player = playerOrder[0];
		// TODO: Make a modal or something prettier than this
		let playAgain = confirm("Player " + player + " wins!\nWould you like to start a new game now?");
		if(playAgain) {
			startGame(false);
		}
		else {
			currentPlayer = 0; // This effectively nueters all game actions, leaving the game dead
		}
	}
}

/**
 * Capture a screen click on the game board canvas, and handle it.
 */
function handleScreenClick(event) {
	// Register click location
	let pointerPos = getPointerPositionOnCanvas(htmlCanvasElement, event);
	// Special handling for countryCapture mode
	if(gameState == "countryCapture") {
		captureCountryLocations(pointerPos);
		return;
	}
	// We do anything else when it's not a human's turn
	else if(isPlayerNPC()) {
		return;
	}
	// Placing armies
	let country = countryClick(pointerPos);
	if(weArePlacingArmies()) {
		placeArmy(currentPlayer, country);
		return;
	}
	// chosenCountry1 and chosenCountry2 are used for both attack and non-combat moves
	if(!chosenCountry1) {
		chosenCountry1 = country;
		return; // return for now, because the next click will complete the move
	}
	const chosenCountry2 = country;
	if(turnPhase == ENUM_PHASE_ATTACK) {
		if(isValidMove(chosenCountry1, chosenCountry2, true)) {
			makeMove(true, [chosenCountry1, chosenCountry2]);
		}
		else {
			alert("That's not a valid attack.");
		}
	}
	else if(turnPhase == ENUM_PHASE_NONCOMBAT) {
		if(isValidMove(chosenCountry1, chosenCountry2, false)) {
			makeMove(false, [chosenCountry1, chosenCountry2]);
			nextTurn();
		}
		else {
			alert("That's not a valid move.");
		}
	}
	chosenCountry1 = null;  // Clear this out for the next attack or non-combat move
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
		gameState = ENUM_STATE_READY;
	}
	else {
		let countryItem = pointerPos;
		countryItem["name"] = country;
		countryList.push(countryItem);
	}
}

/**
 * Return the closest country to the pointer.
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
 * 
 * @param isAttackRoll: true if this is called while attacking
 * @param dicePerPlayer: An array with the number of dice per player, where each element is the 
 *                       number of dice to roll per player
 * @param breakTies: If true, then "ties" will not be allowed, meaning all players will get a
 *                   unique roll
 * @param numPlayers: The number of players to roll dice for
 */
function rollTheDice(isAttackRoll=false, dicePerPlayer=null, breakTies=false, numPlayers=2) {
	// Initial roll
	let diceArray = [];
	if(isAttackRoll && !dicePerPlayer) {
		dicePerPlayer = getDicePerPlayer(attackingCountry, defendingCountry);
	}
	for(let player=0; player < numPlayers; player++) {
		if(isAttackRoll && dicePerPlayer) {
			for(let die=0; die < dicePerPlayer[player]; die++) {
				diceArray.push(getDieRoll());
			}
		}
		else {
			diceArray.push(getDieRoll());
		}
	}
	// Break ties
	if(breakTies) {
		function hasDuplicates(array) {  // Credit: https://stackoverflow.com/a/7376645/2221645
			return (new Set(array)).size !== array.length;
		}
		while(hasDuplicates(diceArray)) {
			diceArray = [];
			for(let i=0; i < numPlayers; i++) {
				diceArray.push(getDieRoll());
			}
		}
	}
	// Determine winner(s)
	let winner = null; // Just setting this to the function scope
	if(isAttackRoll) {
		winner = getWinnersForAttackingDiceRoll(diceArray, dicePerPlayer);
	}
	else {
		winner = diceArray.indexOf(Math.max(...diceArray)) + 1; // Add 1 because players are 1-based
	}
	// All the UI stuff, and return the winner
	displayDiceRoller(diceArray, isAttackRoll, winner, dicePerPlayer)
	return winner;
}

/**
 * Roll a single die. Does not update the UI.
 * @returns An int between 1 and 6, inclusive.
 */
function getDieRoll() {
    let min = Math.ceil(1);
    let max = Math.floor(6);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * @param diceArray: An array holding the outcomes of all the dice rolled. The dice are ordered with
 *                   the defender's dice before the attacker's, for display reasons.
 * @returns The winner(s) for the dice rolls. Uses the highest and 2nd highest outcomes, per Risk rules.
 */
function getWinnersForAttackingDiceRoll(diceArray, dicePerPlayer) {
	let attackerHighest = attacker2ndHighest = defenderHighest = defender2ndHighest = 0;
	let defender = true;
	for(let i=0; i<diceArray.length; i++) {
		if(i >= dicePerPlayer[1])
			defender = false;
		let die = diceArray[i];
		if(defender) {
			if(die > defenderHighest) {
				defender2ndHighest = defenderHighest;
				defenderHighest = die;
			}
			else if(die > defender2ndHighest)
				defender2ndHighest = die;
		}
		else {
			if(die > attackerHighest) {
				attacker2ndHighest = attackerHighest;
				attackerHighest = die;
			}
			else if(die > attacker2ndHighest)
				attacker2ndHighest = die;
		}
	}
	let result = {
		attacker: 0,
		defender: 0
	};
	if(attackerHighest > defenderHighest)
		result.attacker ++
	else
		result.defender ++;
	if(attacker2ndHighest && defender2ndHighest) {
		if(attacker2ndHighest > defender2ndHighest)
			result.attacker ++
		else
			result.defender ++;
	}
	return result;
}

/**
 * Update the title, results, and possibly player info. Call paintDiceRolls, which does more dice UI.
 * If the global waitingForUserAction flag is true, don't display the results or dice yet.
 */
function displayDiceRoller(diceArray, isAttackRoll, winner, dicePerPlayer) {
	if(isAttackRoll) {
		diceRoller.title.innerText = "Attack roll";
		let resultText = "";
		if(waitingForDiceRoll) {
			if(isPlayerNPC()) {
				resultText = "Player " + currentPlayer
			                 + " is attacking you. Click Roll to show the result of this attack.";
			}
			else resultText = "Click Roll to roll the dice, or Close to abandon this attack.";
		}
		else {
			if(winner.attacker) {
				resultText += " The attacker won " + winner.attacker + " roll(s).";
			}
			if(winner.defender) {  // This will add onto the attack message if there was one
				resultText += " The defender won " + winner.defender + " roll(s)."; // hence the leading space
			}
		}
		diceRoller.results.innerText = resultText;
		diceRoller["player-info"].innerText = "";
		diceRoller["roll-again"].hidden = false;
	}
	else {
		diceRoller.title.innerText = "Roll to decide who goes first";
		diceRoller.results.innerText = "Player " + winner + " goes first";
		diceRoller["player-info"].innerText = getPlayerColorsString();
		diceRoller["roll-again"].hidden = true;
	}
	paintDiceRolls(diceArray, isAttackRoll, dicePerPlayer);
	openModal("diceRoller");
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
 * Display all the dice rolled. If the global waitingForUserAction flag is true, instead clear all
 * of the dice elements.
 */
function paintDiceRolls(diceArray, isAttackRoll, dicePerPlayer=null) {
	if(waitingForDiceRoll) {
		diceRoller.table.style.display = "none";
	}
	else {
		diceRoller.table.style.display = "block";
		for(let i=0; i<diceArray.length; i++) {
			if(isAttackRoll && i >= dicePerPlayer[1])
				paintDieRoll(i, diceArray[i], isAttackRoll, dicePerPlayer[1], "red");
			else
				paintDieRoll(i, diceArray[i], isAttackRoll);
		}
		for(let i=diceArray.length; i<6; i++) {
			paintDieRoll(i, 0, null);
		}
	}
}

/**
 * Display a singe die roll. If number == 0, clear out the UI for this die column instead.
 */
function paintDieRoll(index, number, isAttackRoll, numDefenseDice=0, color="white") {
	[column, header, image, footer] = getDieElements(index);
	if(!number) {
		diceRoller[column].hidden = true;
		return;
	}
	// Image
	dieImage = document.createElement("img");
	dieImage.src = "images/die-" + color + "-" + number + ".png";
	dieImage.width = dieImage.height = 70;
	dieImage.alt = number;
	diceRoller[column].replaceChild(dieImage, diceRoller[image]);
	diceRoller[image] = dieImage;
	// Text
	if(isAttackRoll) {
		const isAttacker = (color == "red");
		let headerText = isAttacker ? "Attack " : "Defense "; // Start of header for this die
		headerText += isAttacker ? index - numDefenseDice + 1 : index + 1; // Die number
		diceRoller[header].innerText = headerText;
	}
	else {
		diceRoller[header].innerText = "Player" + (index + 1);
	}
	diceRoller[column].hidden = false;
}

/**
 * @returns An array with strings for the 4 elements for a die: column, header, image, and footer.
 */
function getDieElements(index) {
	const column = "die-" + (index + 1) + "-column";
	const header = "die-" + (index + 1) + "-header";
	const image = "die-" + (index + 1) + "-image";
	const footer = "die-" + (index + 1) + "-footer";
	return [column, header, image, footer];
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
	if(gameState == ENUM_STATE_INITIALPLACEMENT) {
		if(player)
			return (armiesLeftToPlace[player] > 0);
		else
			return armiesLeftToPlace.some(item => item > 0);
	}
	else if(turnPhase == ENUM_PHASE_REINFORCEMENT) {
		return (armiesLeftToPlace > 0);
	}
	else {
		console.error("thereAreArmiesLeftToPlace was called during a bad game state.");
		return false;
	}
}

/**
 * Handle the Mute checkbox and the Volumen slider.
 */
function volumeHandler() {
	if(!song)
		return;
	song.volume = musicVolume;

	isMuted = ($("#settings-muted").is(":checked"));
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
