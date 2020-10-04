/*
The logic for my Risk emulator
*/

/// Globals ///
var boardDim = 100 + 10; // leave a padding of 5 on each side of the visible board
var countries = []; // During setup, we fill this array with Country objects
var countryMap = {}; // Only used when in country location capture mode
var drawSpace = null; // Holds the HTML canvas context
var htmlCanvasElement = null; // Holds the HTML canvas element (useful for sizing)
var isMuted = false; // Is the background music muted?
var mapImage = null; // The map image that we draw on
var mode = "play";
var musicList = {}; // Will hold Audio objects to load and play music
var song = null; // Holds the current music track
var pixelsPerSide = 5; // Number of pixels "tall" and "wide" each cell is

/**
 * Sets up some key variables that will be used later:
 *     drawSpace: DOM handle for the actual html drawing area
 *     mapImage:  
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
		captureCountryLocations(pointerPos)
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
 * country locations into a json file.
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
