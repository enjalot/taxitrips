fs = require 'fs'
d3 = require 'd3'
crossfilter = require 'crossfilter'
csv = require 'csv'

tripsData = fs.readFileSync '../data/taxidata2.csv'
#surveysData = fs.readFileSync '../data/surveydata2.csv'
surveysData = fs.readFileSync '../data/ridesourcing-sample1.csv'

trips = d3.csv.parse(tripsData.toString())
surveys = d3.csv.parse(surveysData.toString())

sameTime = (survey, sub) ->
  buffer = 2;
  included = []
  for trip in sub
    if trip.day == survey.day
      if trip.time == survey.time
        included.push(trip);
      else if +trip.time <= +survey.time + buffer && +trip.time >= +survey.time - buffer
        included.push(trip);
  return included;

dist = (a,b) ->
  #return distance between a and b
  #cartesian distance isn't proper for lat/lon but at this scale it might be ok
  #this is without sqrt so its faster
  return (a.d_lng-b.d_lng)*(a.d_lng-b.d_lng) + (a.d_lat-b.d_lat)*(a.d_lat-b.d_lat);

inBuffer = (survey, sub) ->
  included = []
  for trip in sub
    distance = dist(survey, trip)
    # check to see if its in about a quarter mile
    if distance < 0.0000173611
      included.push(trip)
  return included


sampled = []
zeros = []
for survey in surveys
  #included = inBuffer(survey, trips);
  #same = sameTime(survey, included)
  same = sameTime(survey, trips)
  console.log(survey.response_ID, same.length)
  if not same.length
    zeros.push(survey);
  else
    random = Math.floor(Math.random() * same.length);
    sample = same[random]
    sample.response_ID = survey.response_ID
    sampled.push(sample)

console.log "samples created:", sampled.length
columns = Object.keys(sampled[0])
csv.stringify sampled, (err, data) ->
  return console.log(err) if err
  fs.writeFileSync("samples.csv", columns.toString() + "\n" + data)
  console.log("samples done")

  console.log "surveys with zero samples:", zeros.length
  zcolumns = Object.keys(surveys[0])
  csv.stringify zeros, (err, data) ->
    return console.log(err) if err
    fs.writeFileSync("zeros.csv", zcolumns.toString() + "\n" + data)
    console.log("zeros done")
