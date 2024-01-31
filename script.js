const store = {};
var spaceType = "All";
var neighborhoods = {};
var spaces = {};
var projection;
var pathGenerator;
var neighborhoodMap;
var miniProjection;
var miniPathGenerator;
var miniMap;
var clicked = [];
var neighborhoodInData;
var isMinimapOpen = false;
function loadData() {
  return Promise.all([
    d3.json(
      "Boston_Neighborhood_Boundaries_Approximated_by_2020_Census_Tracts.geojson"
    ),
    d3.json("Open_Space.geojson"),
  ]).then((datasets) => {
    store.neighborhoods = datasets[0];
    if (spaceType != "All") {
      store.spaces = datasets[1].features.filter(
        (d) =>
          d.properties.TypeLong === spaceType &&
          d.properties.DISTRICT != "Harbor Islands"
      );
    } else {
      store.spaces = datasets[1].features.filter(
        (d) => d.properties.DISTRICT != "Harbor Islands"
      );
    }
    return store;
  });
}

const MAP_WIDTH = parseFloat(d3.select("#map").style("width"));
const MAP_HEIGHT = parseFloat(d3.select("#map").style("height"));

const MINIMAP_WIDTH = parseFloat(d3.select("#minimap").style("width")) - 4;
const MINIMAP_HEIGHT = parseFloat(d3.select("#minimap").style("height")) - 4;

function showNeighborhoods() {
  const filteredNeighborhoods = store.neighborhoods.features.filter(
    (d) => d.properties.neighborhood != "Harbor Islands"
  );
  neighborhoods = filteredNeighborhoods.map((d) => {
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

  neighborhoodMap
    .selectAll("path")
    .data(neighborhoods)
    .enter()
    .append("path")
    .attr("id", (d) => d.properties.neighborhood)
    .attr("d", pathGenerator)
    .style("fill", "transparent")
    .style("stroke", "black")
    .on("click", function () {
      isMinimapOpen = false;
      d3.selectAll("#neighborhoodname h2").remove();
      d3.selectAll("#minimap svg").remove();
      d3.selectAll("#spaces tr").remove();
      d3.selectAll("#instruct .caption").remove();
      d3.select(clicked)
        .transition()
        .style("fill", "transparent")
        .duration(250);
      if (clicked != this) {
        d3.select(this).transition().style("fill", "lightgrey").duration(250);
        d3.select("#instruct").append().attr("class", "caption").text("Hover over an item in the table to see its location on the map.")
        neighborhoodClicked(this);
        clicked = this;
      }
    });
}

function getSpacesInNeighborhood() {
  var result = [];
  for (let i = 0; i < spaces.length; i++) {
    if (turf.booleanIntersects(spaces[i], neighborhoodInData)) {
      result.push(spaces[i]);
    }
  }
  if (result.length < 2) {
    result = [result];
  }
  console.log(result);
  return result;
}

function addRowsToTable(spaces) {
  for (let i = 0; i < spaces.length; i++) {
    var row = d3.select("#spaces tbody").append("tr");
    row.append("td").html(spaces[i].properties.SITE_NAME);
    row.append("td").html(spaces[i].properties.ADDRESS);
    row.on("mouseover", function () {
      d3.select(this).style("background", "orange");
      miniMap
        .selectAll("path.highlight")
        .data([spaces[i]])
        .enter()
        .append("path")
        .attr("class", "highlight")
        .attr("d", miniPathGenerator)
        .style("fill", "orange")
        .style("stroke", "orange");
    });
    row.on("mouseout", function () {
      d3.select(this).style("background", "transparent");
      d3.selectAll("path.highlight").remove();
    });
  }
}

function showSpaces() {
  spaces = store.spaces.map((d) => {
    return turf.rewind(d, { reverse: true });
  });

  neighborhoodMap
    .selectAll("path.spaces")
    .data(spaces)
    .enter()
    .append("path")
    .attr("class", "spaces")
    .attr("d", pathGenerator)
    .style("fill", "forestgreen")
    .style("stroke", "lightgrey");
}

function neighborhoodClicked(neighborhood) {
  isMinimapOpen = true;

  neighborhoodInData = neighborhoods.find(
    (d) => d.properties.neighborhood == neighborhood.id
  );
  var spacesInNeighborhood = getSpacesInNeighborhood();

  d3.select("#neighborhoodname").append("h2").html(neighborhood.id);

  var head = d3.select("#spaces tbody").append("tr");
  head.append("th").html("Space");
  head.append("th").html("Address");
  addRowsToTable(spacesInNeighborhood);

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
  miniMap
    .selectAll("path")
    .data([neighborhoodInData])
    .enter()
    .append("path")
    .attr("d", miniPathGenerator)
    .style("fill", "transparent")
    .style("stroke", "black");
  miniMap
    .selectAll("path.neighborhoodspaces")
    .data(spacesInNeighborhood)
    .enter()
    .append("path")
    .attr("class", "neighborhoodspaces")
    .attr("d", miniPathGenerator)
    .style("fill", "forestgreen")
    .style("stroke", "lightgrey");
}

function neighborhoodData() {
  var spacesInNeighborhood = getSpacesInNeighborhood();

  miniMap
    .selectAll("path.neighborhoodspaces")
    .data(spacesInNeighborhood)
    .enter()
    .append("path")
    .attr("class", "neighborhoodspaces")
    .attr("d", miniPathGenerator)
    .style("fill", "forestgreen")
    .style("stroke", "lightgrey");

  if (isMinimapOpen) {
    addRowsToTable(spacesInNeighborhood);
  }
}

document.getElementById("spacetypes").addEventListener("change", () => {
  d3.selectAll("path.spaces").remove();
  d3.selectAll("path.neighborhoodspaces").remove();
  d3.selectAll("#spaces td").remove();
  var spaceTypes = document.getElementById("spacetypes");
  spaceType = spaceTypes.options[spaceTypes.selectedIndex].value;
  loadData().then(showSpaces).then(neighborhoodData);
});
loadData().then(showNeighborhoods).then(showSpaces);
