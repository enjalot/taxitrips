var app = derby.createApp();
app.registerViews();

//stub out app function which ill define based on data later
app.proto.progress = function(i) {};

//app.component("frame", Frame);
//app.component("definition", Definition);
// create the page and expose the model for use in the console
var page = app.createPage();
var model = window.MODEL = page.model;
// render the main template
document.body.appendChild(page.getFragment('body'));


///////////////////// CONTROLLER CODE ////////////////////////////////
model.set("_page.loading", true); 

 

d3.json("lib/busroutes.json", function(err, routes) {
d3.csv("data/taxidata2.csv", function(err, trips) {
d3.csv("data/ridesourcing-sample1.csv", function(err, surveys) {
  model.set("_page.loading", false)
  console.log("trips", trips[0])
  console.log("num trips", trips.length)
  console.log("surveys", surveys[0])
  console.log("num surveys", surveys.length)

  var width = 600;
  var height = 600;

  var i = 0;
  var sampled = [];
  var zeros = [];
  //start();
  function start() {
    i = 0;
    sampled = [];
    zeros = [];
    sample(surveys[0], i);
  }
  function done() {
    console.log("done", sampled.length)
    model.set("_page.sampled", sampled)
  }

  var canvas = document.getElementById('map');
  var ctx = canvas.getContext('2d');

  var lonlat = [-122.4376, 37.76];
  var projection = d3.geo.mercator()
    .center(lonlat)
    .scale(250000)
    .translate([width/2, height/2])
  var path = d3.geo.path()
    .projection(projection)
    .context(ctx);

  model.set("_page.destination", true)
  app.proto.destination = function(type) {
    model.set("_page.destination", type == "destination");
  };

  app.proto.sample = function() {
    console.log("start")
    start();
  };
  var scale = d3.scale.linear()
  .domain([0, surveys.length])
  .range([0, 250])

  app.proto.progress = function(i) {
    return scale(i);
  }

  model.on("change", "_page.destination", function(){
    renderSurveys()
    renderSampled()
    renderLines();
  })

  model.on("change", "_page.sampled", function(){
    console.log("changed")
    renderSampled()
    renderLines();
  })


  function proj(d) {
    return proje(d, model.get("_page.destination"))
  }
  function proje(d, destination) {
    if(destination) {
      return projection([d.d_lng, d.d_lat])
    }
    return projection([d.o_lng, d.o_lat])
  }

  var svg = d3.select("#overlay");
  function renderSurveys() {
    console.log("od", model.get("_page.destination"))

    var circles = svg.selectAll("circle.survey")
      .data(surveys, function(d) { return d.response_ID })

    circles.exit().remove();
    circles.enter().append("circle").classed("survey", true)
    .on("click", renderIncluded);

    circles
    .transition()
      .duration(2000)
      .ease("linear")
      .attr({
        cx: function(d) { var x = proj(d)[0]; return x;},
        cy: function(d) { var y = proj(d)[1]; return y;},
        r: 3
      })

  }

  function renderSampled() {
    var circles = svg.selectAll("circle.samples")
      .data(sampled, function(d) { return d.response_ID })

    circles.exit().remove();
    circles.enter().append("circle").classed("samples", true)

    circles
    .transition()
      .duration(2000)
      .ease("linear")
      .attr({
        cx: function(d) { var x = proj(d)[0]; return x;},
        cy: function(d) { var y = proj(d)[1]; return y;},
        r: 3
      })
  }


  function renderLines() {
    if(!sampled) return;
    //n^2 baby
    var lineData = [];
    surveys.forEach(function(survey) {
      sampled.forEach(function (smpl){
        if(survey.response_ID === smpl.response_ID) {
          lineData.push([survey, smpl])
        }
      })
    })

    var lines = svg.selectAll("line.connector")
      .data(lineData)

    lines.enter().append("line").classed("connector", true)

   lines
    .transition()
      .duration(2000)
      .ease("linear")
      .attr({
        x1: function(d) { return proj(d[0])[0]},
        y1: function(d) { return proj(d[0])[1]},
        x2: function(d) { return proj(d[1])[0]},
        y2: function(d) { return proj(d[1])[1]}
      })
  }

  function sample(survey, i){
    var same, included;
    if(model.get("_page.useInBuffer")) {
      included = inBuffer(survey, trips);
      same = sameTime(survey, included)
    } else {
      same = sameTime(survey, trips)
    }
    console.log(survey.response_ID, same.length)
    if(!same.length) {
      zeros.push(survey);
    } else {
      var random = Math.floor(Math.random() * same.length);
      var smpl = same[random]
      smpl.response_ID = survey.response_ID
      sampled.push(smpl)
      model.set("_page.sampleProgress", i)
    }
    i++;
    if(i < surveys.length) {
      setTimeout(function() { 
        sample(surveys[i], i)
      })
    } else {
      done();
    }
  }


  function renderIncluded(d) {
    console.log(d);
    //var included = inBuffer(d, trips);
    var included = trips;
    render(included);
    //histo(included, "day");
    ////histo(included, "time");
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
    /*
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
    */
  }

  function renderInfo(d, included) {
    var html = d3.select("#survey")
    model.set("_page.survey", d)
    var same = sameTime(d, included)
    model.set("_page.included", included)
    model.set("_page.same", same)
    //var random = Math.floor(Math.random() * same.length);
    //var smpl = same[random];
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
