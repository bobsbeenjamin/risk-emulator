/*
The logic for my Risk emulator
*/

/// Globals ///
var boardDim = 100 + 10; // leave a padding of 5 on each side of the visible board
var countryMap = {}; // Only used when in country location capture mode
var drawSpace = null; // Holds the HTML canvas context
var diceRoller = {}; // Object with data and UI elements for the dice roller modal
var htmlCanvasElement = null; // Holds the HTML canvas element (useful for sizing)
var isMuted = false; // Is the background music muted?
var mapImage = null; // The map image that we draw on
var mode = "startup"; // Gamestate mode: play means let's play the game
var musicList = {}; // Holds Audio objects to load and play music
var numPlayers = 2; // The number of players in the game
var song = null; // Holds the current music track

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
 * Decide who goes first, place armies, and prepare for the first turn.
 */
function startGame() {
	// Decide who goes first
	rollDice("Decide who goes first", "goes first");
	// Place armies
	// Prepare for the first turn
	// Launch first turn
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
		ctx.fillText(country.numArmies, country.col, country.row);
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
	else if(mode == "play") {
		countryClick(pointerPos);
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
	country = prompt("Enter country to assign this click location: ");
	if(country == "done") {
		// Make a "pretty" json string
		let jsonData = JSON.stringify(countryMap, null, 2);
		// Save the file locally
		let a = document.createElement("a");
		let file = new Blob([jsonData], {type: 'text/plain'});
		a.href = URL.createObjectURL(file);
		a.download = "country_locations.json";
		a.click();
		// Stop capture mode
		mode = "play";
	}
	else {
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
	//diceRoller["die-1"].innerText = die1;
	//diceRoller["die-2"].innerText = die2;
	paintDieRoll("die-1", die1);
	paintDieRoll("die-2", die2);
	
	if(die1 > die2)
		winner = "Player 1";
	else winner = "Player 2";
	diceRoller.results.innerText = winner + " " + resultsSuffix;
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
