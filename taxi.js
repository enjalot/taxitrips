d3.json("lib/busroutes.json", function(err, routes) {
d3.csv("data/taxidata2.csv", function(err, trips) {
d3.csv("data/zeros.csv", function(err, zeros) {
d3.csv("data/surveydata2.csv", function(err, surveys) {
  console.log("trips", trips[0])
  console.log("num trips", trips.length)
  console.log("surveys", surveys[0])
  console.log("num surveys", surveys.length)

  var width = 600;
  var height = 600;
  //var xf = crossfilter(trips);
  //var dayof = xf.dimension(function(d) { return d.dayof });
  //var time = xf.dimension(function(d) { return +d.time});
  /*
  var tcScale = d3.scale.linear()
  .domain([1, 48])
  .range([0, 300])
  var brush = d3.svg.brush()
  .x(tcScale)
  brush.extent([1, 3])
  var brushg = d3.select("#brush")
  brush(brushg)
  brushg.selectAll("rect").attr("height", 30)
  brush.on("brushend", filterTime);
  function filterTime() {
    var ext = brush.extent();
    //console.log("extent", ext)
    time.filter(ext)

    d3.select("#time").text(ext[0] + " - " + ext[1])
    var sub = time.top(Infinity);
    render(sub);
  }
  */

  var canvas = document.getElementById('map');
  var ctx = canvas.getContext('2d');

  var lonlat = [-122.4376, 37.76];
  var projection = d3.geo.mercator()
    .center(lonlat)
    .scale(270000)
    .translate([width/2, height/2])
  var path = d3.geo.path()
    .projection(projection)
    .context(ctx);


  function renderSurveys() {
    var svg = d3.select("#overlay");

    var circles = svg.selectAll("circle.survey")
      .data(surveys)
    circles.enter().append("circle").classed("survey", true)
    circles.attr({
      cx: function(d) { return projection([d.d_lng, d.d_lat])[0]},
      cy: function(d) { return projection([d.d_lng, d.d_lat])[1]},
      r: 10
    })
    .on("click", renderIncluded);

    circles2 = svg.selectAll("circle.zero")
      .data(zeros)
    circles2.enter().append("circle").classed("zero", true)
    circles2.attr({
      cx: function(d) { return projection([d.d_lng, d.d_lat])[0]},
      cy: function(d) { return projection([d.d_lng, d.d_lat])[1]},
      r: 12
    })
  }


  function renderIncluded(d) {
    console.log(d);
    var included = inBuffer(d, trips);
    render(included);
    histo(included, "day");
    histo(included, "time");
    renderInfo(d, included);
    //histoTime(included);
  }

  

  //filterTime();
  renderIncluded(surveys[0])
  renderSurveys();

  /*
  var survey, included, same;
  for(var i = 0; i < surveys.length; i++){
    survey = surveys[i];
    included = inBuffer(survey, trips);
    same = sameTime(survey, included)
    console.log(survey.response_ID, same.length)
  }
  */

  function render(sub) {
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, width, height);
    //draw routes
    routes.features.forEach(function(route) {
      ctx.strokeStyle = "#939393";
      ctx.beginPath(), path(route), ctx.stroke();
    })

    var trip;
    var point;
    for(var i = 0; i < sub.length; i++){ 
      trip = sub[i];

      point = projection([+trip.d_lng, +trip.d_lat]);
      ctx.beginPath()
      ctx.fillStyle = "rgba(255, 200, 200, 0.7)";
      ctx.arc(point[0], point[1], 1, 0, 2 * Math.PI, false);
      ctx.fillStyle = "rgba(255, 200, 200, 0.2)";
      ctx.arc(point[0], point[1], 3, 0, 2 * Math.PI, false);
      ctx.fill()
    } 
  }

  function renderInfo(d, included) {
    var html = d3.select("#survey")
    var survay = html.selectAll("p.survay")
    .data([d], function(d) { return d.response_ID })
    survay.exit().remove();
    survay.enter().append("p").classed("survay", true);
    survay.append("p").text(function(d) { return "ID: " + d.response_ID})
    survay.append("p").text(function(d) { return "Day: " + d.day})
    survay.append("p").text(function(d) { return "Time: " + d.time})

    var same = sameTime(d, included)

    survay.append("p").text("# in buffer: " + included.length);
    survay.append("p").text("# Same day + time: " + same.length);

    var random = Math.floor(Math.random() * same.length);
    console.log("randomly selected", same[random])
  }

  function sameTime(survey, sub) {
    var buffer = 2;
    var i, trip;
    var included = [];
    for(i = 0; i < sub.length; i++){
      trip = sub[i];
      if(trip.day == survey.day) {
        if(trip.time == survey.time) {
          included.push(trip);
        } else if(+trip.time <= +survey.time + buffer && +trip.time >= +survey.time - buffer) {
          included.push(trip);
        }
      }
    }
    return included;
  }

  function histo(sub, type) {
    var xfd = crossfilter(sub);
    var day = xfd.dimension(function(d) { return +d[type] })
    var groups = day.group().all();
    //console.log(groups)

    var rw = 10;
    var ht = 200;
    var scale = d3.scale.linear()
    .domain([0, d3.max(groups, function(d) { return d.value })])
    .range([0, ht])

    var svg = d3.select("#" + type + " svg");

    var rects = svg.selectAll("rect." + type)
      .data(groups);
    rects.exit().remove();
    rects.enter().append("rect").classed(type, true);
    rects
    .transition()
    .attr({
      x: function(d,i) { return 10 + i * (rw + 5) },
      y: function(d,i) { return 50 + ht - scale(d.value) },
      width: rw,
      height: function(d,i) { return scale(d.value)}
    })
    var txt = svg.selectAll("text.val")
      .data(groups);
    txt.exit().remove();
    txt.enter().append("text").classed("val", true);
    txt
    .text(function(d) { return d.value })
    .transition()
    .attr({
      x: function(d,i) { return 10 + i * (rw + 5) },
      y: function(d,i) { return 40 + ht - scale(d.value) },
      "font-size": 10
    })

    txt = svg.selectAll("text.key")
      .data(groups);
    txt.exit().remove();
    txt.enter().append("text").classed("key", true);
    txt
    .text(function(d) { return d.key })
    .transition()
    .attr({
      x: function(d,i) { return 12 + i * (rw + 5) },
      y: function(d,i) { return 70 + ht },
      "font-size": 10
    })
  }
});
});
});
});

function inBuffer(survey, trips) {
  var i, trip, distance;
  var included = [];
  for(i = 0; i < trips.length; i++){
    trip = trips[i];
    distance = dist(survey, trip)
    if(distance < 0.0000173611) {
      included.push(trip)
    }
  }
  return included;
}
function dist(a,b) {
  //return distance between a and b
  //cartesian distance isn't proper for lat/lon but at this scale it might be ok
  //this is without sqrt so its faster
  return (a.d_lng-b.d_lng)*(a.d_lng-b.d_lng) + (a.d_lat-b.d_lat)*(a.d_lat-b.d_lat);
}

function bbox(a,b) {
  //see if point a is within bbox of b
}

function timeCode(time) {

}
