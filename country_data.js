var countries = [
  {
    "name": "Alaska",
    "x": 60,
    "y": 109.7249984741211,
    "continent": "North America",
    "neighboringCountries": ["Alberta", "Northwest Territory", "Kamchatka"]
  },
  {
    "name": "Northwest Territory",
    "x": 128,
    "y": 110.7249984741211,
    "continent": "North America",
    "neighboringCountries": ["Alaska", "Alberta", "Ontario", "Greenland"]
  },
  {
    "name": "Greenland",
    "x": 269,
    "y": 80.7249984741211,
    "continent": "North America",
    "neighboringCountries": ["Northwest Territory", "Ontario", "Eastern Canada", "Iceland"]
  },
  {
    "name": "Alberta",
    "x": 120,
    "y": 152.7249984741211,
    "continent": "North America",
    "neighboringCountries": ["Alaska", "Northwest Territory", "Ontario", "Western United States"]
  },
  {
    "name": "Ontario",
    "x": 172,
    "y": 165.7249984741211,
    "continent": "North America",
    "neighboringCountries": ["Alberta", "Northwest Territory", "Greenland", "Eastern Canada", "Eastern United States", "Western United States"]
  },
  {
    "name": "Eastern Canada",
    "x": 228,
    "y": 164.7249984741211,
    "continent": "North America",
    "neighboringCountries": ["Ontario", "Greenland", "Eastern United States"]
  },
  {
    "name": "Western United States",
    "x": 127,
    "y": 208.7249984741211,
    "continent": "North America",
    "neighboringCountries": ["Alberta", "Ontario", "Eastern United States", "Central America"]
  },
  {
    "name": "Eastern United States",
    "x": 185,
    "y": 223.7249984741211,
    "continent": "North America",
    "neighboringCountries": ["Central America", "Western United States", "Ontario", "Eastern Canada"]
  },
  {
    "name": "Central America",
    "x": 132,
    "y": 268.7249984741211,
    "continent": "North America",
    "neighboringCountries": ["Western United States", "Eastern United States", "Venezuela"]
  },
  {
    "name": "Venezuela",
    "x": 189,
    "y": 320.7249984741211,
    "continent": "South America",
    "neighboringCountries": ["Brazil", "Peru", "Central America"]
  },
  {
    "name": "Peru",
    "x": 203,
    "y": 380.7249984741211,
    "continent": "South America",
    "neighboringCountries": ["Venezuela", "Brazil", "Argentina"]
  },
  {
    "name": "Brazil",
    "x": 244,
    "y": 357.7249984741211,
    "continent": "South America",
    "neighboringCountries": ["Argentina", "Peru", "Venezuela", "North Africa"]
  },
  {
    "name": "Argentina",
    "x": 212,
    "y": 431.7249984741211,
    "continent": "South America",
    "neighboringCountries": ["Peru", "Brazil"]
  },
  {
    "name": "Iceland",
    "x": 336,
    "y": 137.7249984741211,
    "continent": "Europe",
    "neighboringCountries": ["Scandinavia", "Great Brittain", "Greenland"]
  },
  {
    "name": "Scandinavia",
    "x": 403,
    "y": 120.7249984741211,
    "continent": "Europe",
    "neighboringCountries": ["Iceland", "Great Brittain", "Northern Europe", "Russia/Ukraine"]
  },
  {
    "name": "Russia/Ukraine",
    "x": 459,
    "y": 166.7249984741211,
    "continent": "Europe",
    "neighboringCountries": ["Scandinavia", "Northern Europe", "Southern Europe", "Middle East", "Afghanistan", "Ural"]
  },
  {
    "name": "Great Brittain",
    "x": 321,
    "y": 193.7249984741211,
    "continent": "Europe",
    "neighboringCountries": ["Western Europe", "Northern Europe", "Scandinavia", "Iceland"]
  },
  {
    "name": "Northern Europe",
    "x": 391,
    "y": 206.7249984741211,
    "continent": "Europe",
    "neighboringCountries": ["Great Brittain", "Scandinavia", "Russia/Ukraine", "Southern Europe", "Western Europe"]
  },
  {
    "name": "Western Europe",
    "x": 332,
    "y": 268.7249984741211,
    "continent": "Europe",
    "neighboringCountries": ["Great Brittain", "Northern Europe", "Southern Europe", "North Africa"]
  },
  {
    "name": "Southern Europe",
    "x": 394,
    "y": 240.7249984741211,
    "continent": "Europe",
    "neighboringCountries": ["Western Europe", "Northern Europe", "Russia/Ukraine", "Middle East", "Egypt", "North Africa"]
  },
  {
    "name": "North Africa",
    "x": 367,
    "y": 344.7249984741211,
    "continent": "Africa",
    "neighboringCountries": ["Central Africa", "East Africa", "Egypt", "Southern Europe", "Western Europe", "Brazil"]
  },
  {
    "name": "Egypt",
    "x": 418,
    "y": 324.7249984741211,
    "continent": "Africa",
    "neighboringCountries": ["East Africa", "North Africa", "Southern Europe", "Middle East"]
  },
  {
    "name": "Central Africa",
    "x": 416,
    "y": 408.7249984741211,
    "continent": "Africa",
    "neighboringCountries": ["South Africa", "East Africa", "North Africa"]
  },
  {
    "name": "East Africa",
    "x": 450,
    "y": 374.7249984741211,
    "continent": "Africa",
    "neighboringCountries": ["Madagascar", "South Africa", "Central Africa", "North Africa", "Egypt", "Middle East"]
  },
  {
    "name": "South Africa",
    "x": 424,
    "y": 465.7249984741211,
    "continent": "Africa",
    "neighboringCountries": ["Madagascar", "East Africa", "Central Africa"]
  },
  {
    "name": "Madagascar",
    "x": 487,
    "y": 471.7249984741211,
    "continent": "Africa",
    "neighboringCountries": ["South Africa", "East Africa"]
  },
  {
    "name": "Ural",
    "x": 536,
    "y": 156.7249984741211,
    "continent": "Asia",
    "neighboringCountries": ["Siberia", "China", "Afghanistan", "Russia/Ukraine"]
  },
  {
    "name": "Siberia",
    "x": 572,
    "y": 121.7249984741211,
    "continent": "Asia",
    "neighboringCountries": ["Yakutsk", "Irkutsk", "Mongolia", "China", "Ural"]
  },
  {
    "name": "Yakutsk",
    "x": 634,
    "y": 92.7249984741211,
    "continent": "Asia",
    "neighboringCountries": ["Siberia", "Irkutsk", "Kamchatka"]
  },
  {
    "name": "Kamchatka",
    "x": 685,
    "y": 97.7249984741211,
    "continent": "Asia",
    "neighboringCountries": ["Yakutsk", "Irkutsk", "Mongolia", "Japan", "Alaska"]
  },
  {
    "name": "Irkutsk",
    "x": 623,
    "y": 162.7249984741211,
    "continent": "Asia",
    "neighboringCountries": ["Siberia", "Mongolia", "Kamchatka", "Yakutsk"]
  },
  {
    "name": "Mongolia",
    "x": 624,
    "y": 211.7249984741211,
    "continent": "Asia",
    "neighboringCountries": ["China", "Siberia", "Irkutsk", "Kamchatka"]
  },
  {
    "name": "Japan",
    "x": 702,
    "y": 212.7249984741211,
    "continent": "Asia",
    "neighboringCountries": ["Mongolia", "Kamchatka"]
  },
  {
    "name": "Afghanistan",
    "x": 519,
    "y": 226.7249984741211,
    "continent": "Asia",
    "neighboringCountries": ["Ural", "China", "India", "Middle East", "Russia/Ukraine"]
  },
  {
    "name": "China",
    "x": 608,
    "y": 259.7249984741211,
    "continent": "Asia",
    "neighboringCountries": ["Mongolia", "Siberia", "Ural", "Afghanistan", "India", "Southeast Asia"]
  },
  {
    "name": "Middle East",
    "x": 480,
    "y": 285.7249984741211,
    "continent": "Asia",
    "neighboringCountries": ["India", "Afghanistan", "Russia/Ukraine", "Southern Europe", "Egypt", "East Africa"]
  },
  {
    "name": "India",
    "x": 557,
    "y": 293.7249984741211,
    "continent": "Asia",
    "neighboringCountries": ["Middle East", "Afghanistan", "China", "Southeast Asia"]
  },
  {
    "name": "Southeast Asia",
    "x": 615,
    "y": 315.7249984741211,
    "continent": "Asia",
    "neighboringCountries": ["India", "China", "Indonesia"]
  },
  {
    "name": "Indonesia",
    "x": 625,
    "y": 399.7249984741211,
    "continent": "Australia",
    "neighboringCountries": ["Western Australia", "New Guinea", "Southeast Asia"]
  },
  {
    "name": "New Guinea",
    "x": 694,
    "y": 378.7249984741211,
    "continent": "Australia",
    "neighboringCountries": ["Eastern Australia", "Western Australia", "Indonesia"]
  },
  {
    "name": "Western Australia",
    "x": 655,
    "y": 470.7249984741211,
    "continent": "Australia",
    "neighboringCountries": ["Eastern Australia", "New Guinea", "Indonesia"]
  },
  {
    "name": "Eastern Australia",
    "x": 708,
    "y": 451.7249984741211,
    "continent": "Australia",
    "neighboringCountries": ["Western Australia", "New Guinea"]
  }
]