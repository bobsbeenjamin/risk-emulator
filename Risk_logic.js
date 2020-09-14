/*
The logic for my Risk emulator
*/

/// Globals ///
var boardDim = 100 + 10; // leave a padding of 5 on each side of the visible board
var countries = []; // During setup, we fill this array with Country objects
var drawSpace = null; // Holds the HTML canvas context
var htmlCanvasElement = null; // Holds the HTML canvas element (useful for sizing)
var isMuted = false; // Is the background music muted?
var mapImage = null; // The map image that we draw on
var musicList = {}; // Will hold Audio objects to load and play music
var song = null; // Holds the current music track
var pixelsPerSide = 5; // Number of pixels "tall" and "wide" each cell is

/**
 * Sets up some key variables that will be used later:
 *     drawSpace: DOM handle for the actual html drawing area
 */
function setUpGameBoard(onLoad=false) {
	if(onLoad) {
		// Get audio ready
		try {
			audio = new Audio("SecretofMana_IntoTheThickOfItAcapella_SmoothMcGroove.mp3");
			musicList.backgroundMusic1 = audio;
			audio = new Audio("AvengersSuite_Theme.mp3");
			musicList.battleMusic1 = audio;
			audio = new Audio("SuperSmashBrosBrawlOpeningTheme.mp3");
			musicList.mainMenu1 = audio;
		}
		catch (e) {
			// Do nothing
		}
		// Set up the canvas
		htmlCanvasElement = document.getElementById("board");
		drawSpace = htmlCanvasElement.getContext("2d");
		drawSpace.font = "14px Arial";
		htmlCanvasElement.addEventListener("click", handleScreenClick);
		// Prep the map image
		mapImage = new Image();
		mapImage.onload = drawMap;
		mapImage.src = "map_small.png";
		// Draw the image
		updateBoard();
	}
}

/**
 * Decide who goes first, place armies, and prepare for the first turn.
 */
function startGame() {
	changeSettings();
	// Decide who goes first
	// Place armies
	// Prepare for the first turn
}

/**
 * Decide who goes first, place armies, and prepare for the first turn.
 */
function changeSettings() {
	song = musicList.mainMenu1;
	song.play();
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
 * Call this anytime the game state changes in a way that affects the board.
 */
function drawMap() {
	drawSpace.drawImage(mapImage, 0, 0, htmlCanvasElement.width, htmlCanvasElement.height);
}

/**
 * Call this anytime the game state changes in a way that affects the board.
 */
function handleScreenClick() {
	// Register click location
	// Call a function based on game state, and pass the click location
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
