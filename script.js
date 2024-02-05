const store = {};
var spaceType = "All";
var neighborhoods = {};
var streets = {};
var spaces = {};
var projection;
var pathGenerator;
var neighborhoodMap;
var miniProjection;
var miniPathGenerator;
var miniMap;
var clicked = [];
var neighborhoodInData;
var isMiniMapOpen = false;
var streetsInNeighborhood = [];
function loadData() {
  return Promise.all([
    d3.json(
      "Boston_Neighborhood_Boundaries_Approximated_by_2020_Census_Tracts.geojson"
    ),
    d3.json("Open_Space.geojson"),
    d3.json("Boston_Street_Segments.geojson"),
  ]).then((datasets) => {
    store.neighborhoods = datasets[0];
    store.spaces = datasets[1];
    store.streets = datasets[2];
    return store;
  });
}

const MAP_WIDTH = parseFloat(d3.select("#map").style("width"));
const MAP_HEIGHT = parseFloat(d3.select("#map").style("height"));

const MINIMAP_WIDTH = parseFloat(d3.select("#minimap").style("width")) - 4;
const MINIMAP_HEIGHT = parseFloat(d3.select("#minimap").style("height")) - 4;

const colorScale = d3
  .scaleOrdinal()
  .domain([
    "Malls, Squares & Plazas",
    "Parks, Playgrounds & Athletic Fields",
    "Cemeteries & Burying Grounds",
    "Community Gardens",
    "Urban Wilds",
    "Open Land",
  ])
  .range(["#440154", "#46327e", "#365c8d", "#277f8e", "#1fa187", "#4ac16d"]);

function loadSpaces() {
  if (spaceType != "All") {
    spaces = store.spaces.features.filter(
      (d) =>
        d.properties.TypeLong === spaceType &&
        d.properties.DISTRICT != "Harbor Islands"
    );
  } else {
    spaces = store.spaces.features.filter(
      (d) => d.properties.DISTRICT != "Harbor Islands"
    );
  }
  spaces = spaces.map((d) => {
    return turf.rewind(d, { reverse: true });
  });
}

function createMap() {
  const filteredNeighborhoods = store.neighborhoods.features.filter(
    (d) => d.properties.neighborhood != "Harbor Islands"
  );
  neighborhoods = filteredNeighborhoods.map((d) => {
    return turf.rewind(d, { reverse: true });
  });

  const filteredStreets = store.streets.features.filter(
    (d) =>
      d.properties.NBHD_L != "Harbor Islands" && d.properties.ST_NAME != "Tafts"
  );
  streets = filteredStreets.map((d) => {
    return turf.rewind(d, { reverse: true });
  });

  projection = d3
    .geoMercator()
    .center(turf.center(store.neighborhoods).geometry.coordinates)
    .scale(160000)
    .translate([MAP_WIDTH / 1.53, MAP_HEIGHT / 2]);

  pathGenerator = d3.geoPath().projection(projection);

  neighborhoodMap = d3
    .select("#map")
    .append("svg")
    .attr("width", MAP_WIDTH)
    .attr("height", MAP_HEIGHT);
}

function showStreets() {
  neighborhoodMap
    .selectAll("path.streets")
    .data(streets)
    .enter()
    .append("path")
    .attr("class", "streets")
    .attr("d", pathGenerator)
    .style("fill", "transparent")
    .style("stroke", "lightgrey");
}

function showNeighborhoods() {
  neighborhoodMap
    .selectAll("path.neighborhoods")
    .data(neighborhoods)
    .enter()
    .append("path")
    .attr("class", "neighborhoods")
    .attr("id", (d) => d.properties.neighborhood)
    .attr("d", pathGenerator)
    .style("fill", "transparent")
    .style("stroke", "black")
    .on("click", function () {
      var initialMiniMapStatus = isMiniMapOpen;
      if (initialMiniMapStatus) {
        d3.selectAll("#neighborhoodname h2").remove();
        d3.selectAll("#minimap svg").remove();
        d3.selectAll("#spaces tr").remove();
        d3.selectAll("#instruct .caption").remove();
        isMiniMapOpen = false;
        d3.select(clicked)
          .transition()
          .style("fill", "transparent")
          .duration(250);
      }
      if (clicked != this || !initialMiniMapStatus) {
        d3.select(this)
          .attr("class", "highlight")
          .transition()
          .style("fill", "#fde725")
          .duration(250);
        d3.select("#instruct")
          .append()
          .attr("class", "caption")
          .text(
            "Hover over an item in the table to see its location on the map."
          );
        createMiniMap(this);
        clicked = this;
      }
    })
    .append("title")
    .text(function (d) {
      return d.properties.neighborhood;
    });
}

function showSpaces() {
  neighborhoodMap
    .selectAll("path.spaces")
    .data(spaces)
    .enter()
    .append("path")
    .attr("class", "spaces")
    .attr("d", pathGenerator)
    .style("fill", function (d) {
      return colorScale(d.properties.TypeLong);
    })
    .style("stroke", function (d) {
      return colorScale(d.properties.TypeLong);
    });
}

function createMiniMap(neighborhood) {
  isMiniMapOpen = true;

  neighborhoodInData = neighborhoods.find(
    (d) => d.properties.neighborhood == neighborhood.id
  );

  streetsInNeighborhood = [];
  for (let i = 0; i < streets.length; i++) {
    if (turf.booleanIntersects(streets[i], neighborhoodInData)) {
      streetsInNeighborhood.push(streets[i]);
    }
  }

  d3.select("#neighborhoodname").append("h2").html(neighborhood.id);

  var head = d3.select("#spaces tbody").append("tr");
  head.append("th").html("Space");
  head.append("th").html("Address");

  miniProjection = d3
    .geoMercator()
    .center(turf.center(neighborhoodInData).geometry.coordinates)
    .fitSize([MINIMAP_WIDTH, MINIMAP_HEIGHT], neighborhoodInData);

  miniPathGenerator = d3.geoPath().projection(miniProjection);

  miniMap = d3
    .select("#minimap")
    .append("svg")
    .attr("width", MINIMAP_WIDTH)
    .attr("height", MINIMAP_HEIGHT);

  if (document.getElementById("streetscheckbox").checked) {
    showMiniStreets();
  }
  showMiniNeighborhood();
  showMiniSpaces();
}

function showMiniStreets() {
  miniMap
    .selectAll("path.ministreets")
    .data(streetsInNeighborhood)
    .enter()
    .append("path")
    .attr("class", "ministreets")
    .attr("d", miniPathGenerator)
    .style("fill", "transparent")
    .style("stroke", "lightgrey");
}

function showMiniNeighborhood() {
  miniMap
    .selectAll("path.minineighborhood")
    .data([neighborhoodInData])
    .enter()
    .append("path")
    .attr("class", "minineighborhood")
    .attr("d", miniPathGenerator)
    .style("fill", "transparent")
    .style("stroke", "black");
}

function showMiniSpaces() {
  var spacesInNeighborhood = [];
  for (let i = 0; i < spaces.length; i++) {
    if (turf.booleanIntersects(spaces[i], neighborhoodInData)) {
      spacesInNeighborhood.push(spaces[i]);
    }
  }

  miniMap
    .selectAll("path.minispaces")
    .data(spacesInNeighborhood)
    .enter()
    .append("path")
    .attr("class", "minispaces")
    .attr("d", miniPathGenerator)
    .style("fill", function (d) {
      return colorScale(d.properties.TypeLong);
    })
    .style("stroke", function (d) {
      return colorScale(d.properties.TypeLong);
    });

  addRowsToTable(spacesInNeighborhood);
}

function addRowsToTable(spaces) {
  for (let i = 0; i < spaces.length; i++) {
    var row = d3.select("#spaces tbody").append("tr");
    row.append("td").html(spaces[i].properties.SITE_NAME);
    row.append("td").html(spaces[i].properties.ADDRESS);
    row.on("mouseover", function () {
      d3.select(this).style("background", "#fde725");
      miniMap
        .selectAll("path.highlight")
        .data([spaces[i]])
        .enter()
        .append("path")
        .attr("class", "highlight")
        .attr("d", miniPathGenerator)
        .style("fill", "#fde725")
        .style("stroke", "#fde725");
    });
    row.on("mouseout", function () {
      d3.select(this).style("background", "transparent");
      d3.selectAll("path.highlight").remove();
    });
  }
}

document.getElementById("spacetypes").addEventListener("change", () => {
  d3.selectAll("path.spaces").remove();
  d3.selectAll("path.minispaces").remove();
  d3.selectAll("#spaces td").remove();
  var spaceTypes = document.getElementById("spacetypes");
  spaceType = spaceTypes.options[spaceTypes.selectedIndex].value;
  loadSpaces();
  showSpaces();
  showMiniSpaces();
});
document.getElementById("streetscheckbox").addEventListener("click", () => {
  if (document.getElementById("streetscheckbox").checked) {
    d3.selectAll("path.streets").remove();
    d3.selectAll("path.neighborhoods").remove();
    d3.selectAll("path.spaces").remove();
    showStreets();
    showNeighborhoods();
    showSpaces();
    if (isMiniMapOpen) {
      d3.selectAll("path.ministreets").remove();
      d3.selectAll("path.minineighborhood").remove();
      d3.selectAll("path.minispaces").remove();
      showMiniStreets();
      showMiniNeighborhood();
      showMiniSpaces();
    }
  } else {
    d3.selectAll("path.streets").remove();
    d3.selectAll("path.ministreets").remove();
  }
});
loadData()
  .then(loadSpaces)
  .then(createMap)
  .then(showNeighborhoods)
  .then(showSpaces);
