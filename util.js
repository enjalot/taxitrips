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

function inBuffer(survey, sub) {
  var i, trip, distance;
  var included = [];
  for(i = 0; i < sub.length; i++){
    trip = sub[i];
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