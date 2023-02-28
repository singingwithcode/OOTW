let data;
let DEFAULTBINS = 20;
let MAINFILTER = [["pl_name", []], ["disc_year", []]];
let ALLVISUALIZATIONS = [];
let DEFAULTBRUSH = false;


// Decides if a star is habitable or inhabitable
function habitable(plOrbsMax, specType){
	if (specType == 'A') {
		if (plOrbsMax >= 8.5 && plOrbsMax <= 12.5) {
			return true;
		} else {
			return false;
		}
	}
	else if (specType == 'B') {
		if (plOrbsMax >= 1.5 && plOrbsMax <= 2.2) {
			return true;
		} else {
			return false;
		}
	}
	else if (specType == 'G') {
		if (plOrbsMax >= 0.95 && plOrbsMax <= 1.4) {
			return true;
		} else {
			return false;
		}
	}
	else if (specType == 'K') {
		if (plOrbsMax >= 0.38 && plOrbsMax <= 0.56) {
			return true;
		} else {
			return false;
		}
	}
	else if (specType == 'M') {
		if (plOrbsMax >= 0.08 && plOrbsMax <= 0.12) {
			return true;
		} else {
			return false;
		}
	}
	return false;
}


// Load Data
d3.csv('data/exoplanets.csv')
  .then(_data => {
	data = _data;
    data.forEach(d => {

		// Convert to numrical. Some NaN
      	d.sy_snum = +d.sy_snum;
		d.sy_pnum = +d.sy_pnum;
		d.disc_year = +d.disc_year;
		d.pl_orbsmax = +d.pl_orbsmax;
		d.pl_rade = +d.pl_rade;
		d.pl_bmasse = +d.pl_bmasse;
		d.pl_orbeccen = +d.pl_orbeccen;
		d.st_rad = +d.st_rad;
		d.st_mass = +d.st_mass;
		d.sy_dist = +d.sy_dist;

		// BLANK record handling. 
		if(d.st_spectype !== "BLANK") {
			d.st_spectype = d.st_spectype.charAt(0).toUpperCase()
		} else {
			d.st_spectype = "Unknown"
		}

		// See if habitable
		d.isHabitable = habitable(d.pl_orbsmax, d.st_spectype);
      	
		d.filtered = false;
  	});

	let colTitles = [["pl_name", "Planet Name"], ["hostname", "Host Name"], ["st_spectype", "Star Type"], ["disc_facility", "Discovery Facility"], 
	  ["discoverymethod", "Discovery Method"], ["disc_year", "Discovery Year"], ["sy_dist", "Distance [pc]"], ["sy_snum", "# of Stars"],
	  ["sy_pnum", "# of Planets"], ["st_rad", "Stellar Radius"], ["st_mass", "Stellar Mass"], ["pl_rade", "Radius"], ["pl_bmasse", "Mass"]
  	]

	// Quantity of Planets
	quantPlanets = new Barchart({
		parentElement: '#quantPlanets',
	}, data, "sy_pnum", "Planet Quantity", "# of Planets", "# of Exoplanets", 20);
	quantPlanets.updateVis();

	// Quantity of Stars
	quantStars = new Barchart({
		parentElement: '#quantStars',
	}, data, "sy_snum", "Star Quantity", "# of Stars", "# of Exoplanets", 20);
	quantStars.updateVis();

	// Quantity of Star Type
	quantStartType = new Barchart({
		parentElement: '#quantStartType',
	}, data, "st_spectype", "Star Type Quantity", "Star Type", "# of Exoplanets", 40);
	quantStartType.updateVis();

	// Quantity of Discovery Method
	quantDiscMeth = new Barchart({
		parentElement: '#quantDiscMeth',
	}, data, "discoverymethod", "Discovery Method Quantity", "Discovery Method", "# of Exoplanets", 110);
	quantDiscMeth.updateVis();

	// Livability 
	livability = new DualBarchart({
		parentElement: '#livability',
	}, data, "st_spectype", "isHabitable", "Livability", "Star Type", "# of Exoplanets");
	livability.updateVis(onit=true);

	// Distance From Earth
	earthDistance = new Histogram({
		parentElement: '#earthDistance',
	}, data, "sy_dist", "Earth's Distance", "Distance [pc]", "# of Exoplanets");
	earthDistance.updateVis(20);

	// Discovery Years
	discYears = new LineChart({ 
		parentElement: '#discYears'
	}, data, "disc_year", "Discovery Years", "Year", "# of Exoplanets Discovered");
    discYears.updateVis();
	
	// Size Of Planet [Earth]
	planetSize = new Scatterplot({ 
		parentElement: '#planetSize'
	}, data, "pl_rade", "pl_bmasse","Planet Size", "Planet Radius [Earth Radius]", "Planet Mass [Earth Mass]");
	planetSize.updateVis();

	// Table Of All Records
	planetTable = new PlanetTable('#planetTable', data, colTitles);
	
	ALLVISUALIZATIONS = [quantStars, quantPlanets, quantStartType, quantDiscMeth, livability, earthDistance, discYears, planetSize, planetTable]

})
.catch(error => {
    console.error('Data load error: ' + error);
});


// INPUT: Bin
d3.select("#numBin").on("input", function() {
	DEFAULTBINS = +this.value;
	earthDistance.updateVis(+this.value)
});


// Filter funtion for MAINFILTER over data
function dataFilter(DEFAULTBRUSH) {
	let tempData = data;

	ALLVISUALIZATIONS.forEach(v => {
		tempData = data.map(d => {
			for (filter in MAINFILTER) { 
				let feature = MAINFILTER[filter] 
				if (feature[0] === "disc_year") {
					if ( (d[feature[0]] > feature[1][1] || d[feature[0]] < feature[1][0]) 
						&& feature[1][1] !== feature[1][0]) {
						return {...d, filtered: true} // '...' is spread operator
					}
				} else {
					if (!feature[1].includes(d[feature[0]]) && feature[1].length > 0){
						return {...d, filtered: true} 
					}
				}
			}
			return {...d, filtered: false} 
		})
		v.data = tempData;
	})
	
	// Update the # of Exoplanets 
	d3.select(".countSelected")
		.text(tempData.filter(d => !d.filtered).length + " out of " + data.length)

	// Update all ALLVISUALIZATIONS
	ALLVISUALIZATIONS.forEach(v => {
		v.updateVis(DEFAULTBRUSH);
	})
}


// INPUT: Filter Clear
function clearFilters(){
	MAINFILTER = [["pl_name", []], ["disc_year", []]];
	dataFilter(true);
}


// Get sys for Bubble Chart
function openSys(exoplanet) {

	let types = ["A","F","G","K","M","Unknown"];
	let selectedColor = types.find(t => (t === exoplanet.st_spectype));
	let starColor;
	let colorToType = [
		"purple", 
		"black", 
		"orange", 
		"blue", 
		"green", 
		"red"
	];

	if(selectedColor === undefined){
		starColor = 'brown';
	} else {
		starColor = colorToType[types.indexOf(selectedColor)];
	}

	let ss = [];
	let ssName = exoplanet.sys_name;
	data.map(d => {
		if(d.sys_name === ssName){
			ss.push({...d, isStar: false, planetType: getPlT(d)});
		}
	})

	let pl = {
	  hostname: ss[0].hostname,
	  pl_name: ss[0].hostname,
	  st_rad: ss[0].st_rad,
	  pl_rade: ss[0].st_rad * 109.076,
	  st_mass: ss[0].st_mass,
	  pl_bmasse: ss[0].st_mass,
	  pl_orbsmax: 0,
	  st_spectype: ss[0].st_spectype,
	  color: starColor,
	  isStar: true
	}

	ss.push(pl);

	d3.select('#systemBrowser')
	.style('display', 'block')
	.html(`
		<div class="selectedPlanet">Planet: ${exoplanet.pl_name}</div>
		<div class="systemName">System: ${exoplanet.sys_name}</div>
		<div class="discoveryFacility">Discovery Facility: ${exoplanet.disc_facility} via ${exoplanet.discoverymethod} in ${exoplanet.disc_year}</div>
	`);

	bubbleplot = new BubblePlot({parentElement:'#systemG'}, ss, "pl_orbsmax", "pl_bmasse", "pl_rade", "", "Orbit", "", "Planet Radius");
	
	bubbleplot.updateVis();
	  
}

// From project def
function getPlT(exoplanet){
	let plMass = exoplanet.pl_bmasse;
	if( plMass === undefined ) {
	  return 'Unknown'
	} else {
	  if(plMass < 0.00001) {
		return 'Asteroidian';
	  }
	  if(plMass >= 0.00001 && plMass < 0.1) {
		return 'Mercurian';
	  }
	  if(plMass >= 0.1 && plMass <0.5) {
		return 'Subterran';
	  }
	  if(plMass >= 0.5 && plMass < 2) {
		return 'Terran';
	  }
	  if(plMass >= 2 && plMass < 10) {
		return 'Superterran';
	  }
	  if(plMass >= 10 && plMass < 50 ){
		return 'Neptunian';
	  }
	  if(plMass >= 50) {
		return 'Jovian';
	  }
	}
  }
  
