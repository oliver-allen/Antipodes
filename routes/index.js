const express = require('express');
const router = express.Router();
const rp = require('request-promise');

//Info from geocoder.api.here.com
const app_id = "<app_id>";
const app_code = "<app_code>";
const locationCoordsCache = {};
const coordsLocationCache = {};

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Antipodes Finder' });
});

/* POST location to get the antipodes of. */
router.post('/antipodes', function(req, res, next) {
    const source = req.body.location;
    let sourceLocation;

    //Given a source location string, query the geocoder to retrieve the coordinates.
    const getCoordsOfSource = source => {
        //Get cached value of source
        const cachedValue = locationCoordsCache[source];
        if(cachedValue){
            sourceLocation = cachedValue;
            findAntipodesCoords(cachedValue);
        } else {

            //Get coords from source through API
            rp(`https://geocoder.api.here.com/6.2/geocode.json?searchtext=${source}&app_id=${app_id}&app_code=${app_code}`)
                .then(function (result) {
                    result = JSON.parse(result);
                    const response = result.Response.View;
                    if(response.length > 0){
                        //Use the first location result
                        const firstResponseLocation = response[0].Result[0].Location;
                        //get source info
                        const coords = firstResponseLocation.DisplayPosition;
                        sourceLocation = firstResponseLocation.Address.Label;

                        //Cache location and coords
                        locationCoordsCache[source] = coords;
                        locationCoordsCache[sourceLocation] = coords;

                        findAntipodesCoords(coords);

                    } else {
                        res.status(500).send("No location found for: " + source);
                    }
                })
                .catch(function (err) {
                    res.status(500).send("Error getting location from Geocoding API");
                });
        }
    };

    const findAntipodesCoords = coords => {
        //Find the lat and lng of the antipodes
        const antipodesCoords = {
            lat: coords.Latitude * -1,
            lng: (coords.Longitude < 0) ? (Math.abs(coords.Longitude) - 180) * -1 : (Math.abs(coords.Longitude) - 180)
        };
        //Use the anitpodes coordinates to get the antipodes location
        getLocationFromCoords(antipodesCoords);
    };

    //Given the anitpodes coordinates, query the geocoder to retrieve the antipodes location
    const getLocationFromCoords = coords => {
        //Check cache
        //TODO retrieve cached locations within an area. Currently, only exact matches with be takes from the cache
        if(coordsLocationCache[JSON.stringify(coords)]){
            const formattedResult = coordsLocationCache[JSON.stringify(coords)];
            res.render('result', {title: 'Antipodes Finder', source: sourceLocation, result: formattedResult});
            return;
        }
        let formattedResult;

        //Get location from coords through API
        rp(`https://reverse.geocoder.api.here.com/6.2/reversegeocode.json?&mode=retrieveAddresses&prox=${coords.lat},${coords.lng},0&app_id=${app_id}&app_code=${app_code}`)
            .then(function (result) {
                result = JSON.parse(result);
                const response = result.Response.View;
                if(response.length > 0){
                    const firstResponseLocation = response[0].Result[0].Location;
                    //Get antipodes info
                    formattedResult = firstResponseLocation.Address.Label;
                } else {
                    formattedResult = "A body of water";
                }

                //Cache coords and location
                coordsLocationCache[JSON.stringify(coords)] = formattedResult;
                res.render('result', {title: 'Antipodes Finder', source: sourceLocation, result: formattedResult});
            })
            .catch(function (err) {
                res.status(500).send("Error getting location from Geocoding API");
            });
    };

    //Get the coordinates of the location, find the antipodes coordinates and translate to an address
    getCoordsOfSource(source);

});

module.exports = router;
