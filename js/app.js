//Function for Google Map error
function googleError(){
    alert("Failed to load Google Maps data. Please check your connection.");
};

// Function to format date for Foursquare API.
function yyyymmdd() {
    function twoDigit(n) { return (n < 10 ? '0' : '') + n; }

    let now = new Date();
    return '' + now.getFullYear() + twoDigit(now.getMonth() + 1) + twoDigit(now.getDate());
}
// variable for Google map
let map;
//variable for map info window 
let largeInfowindow;
// variable for default map marker color
let defaultIcon;
// variable for highlighted map marker color 
let highlightedIcon;

// varaiable for complete Foursquare API URL
let fourSquareURL;
//variable for begining part of Foursquare API URL
const foursquareAPIURL = 'https://api.foursquare.com/v2/venues/search?ll=';
//variable for Foursquare Client ID
const clientID = 'SRPK15RMAW1ZXD1UIJA3VIYP42PN42URC4BD1ZRJHT5KMGE3';
//variable for Foursquare Client Secret
const clientSecret = 'DJI4T2KCVRRUAAO5C5C2KUE1NFHWV4UHRZ1OPCRTGXXVW1VH';

// variable for the places on the map
let initalPlaces = [
        {title: 'Park Ave Penthouse', lat: 40.7713024, lng: -73.9632393},
        {title: 'Chelsea Loft', lat: 40.7444883, lng: -73.9949465},
        {title: 'Union Square Open Floor Plan', lat: 40.7347062, lng: -73.9895759},
        {title: 'East Village Hip Studio', lat: 40.7281777, lng: -73.984377},
        {title: 'TriBeCa Artsy Bachelor Pad', lat: 40.7195264, lng: -74.0089934},
        {title: 'Chinatown Homey Space', lat: 40.7180628, lng: -73.9961237}
    ];
// This function takes in a COLOR, and then creates a new marker
// icon of that color. The icon will be 21 px wide by 34 high, have an origin
// of 0, 0 and be anchored at 10, 34).
  function makeMarkerIcon(markerColor) {
    let markerImage = new google.maps.MarkerImage(
      'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
      '|40|_|%E2%80%A2',
      new google.maps.Size(21, 34),
      new google.maps.Point(0, 0),
      new google.maps.Point(10, 34),
      new google.maps.Size(21,34));
    return markerImage;
  }
// The initial jascript function called once Google Maps API is loaded.
function initApp() {
    // Constructor creates a new map - only center and zoom are required.
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 40.7413549, lng: -73.9980244},
        zoom: 13,
        mapTypeControl: false
    });
    largeInfowindow = new google.maps.InfoWindow();
    // Style the markers a bit. This will be our listing marker icon.
    defaultIcon = makeMarkerIcon('0091ff');

// Create a "highlighted location" marker color for when the user
// mouses over the marker.
    highlightedIcon = makeMarkerIcon('FFFF24');
    ko.applyBindings(new ViewModel());
    return true;
}

// The KnockOut js view model
let ViewModel = function () {
    
    let self = this;
    
    this.Place = function(title, lat, lng) {
        // Store information about the place
        this.title = ko.observable(title);
        this.lat = ko.observable(lat);
        this.lng = ko.observable(lng);
        // Create map marker
        this.marker = new google.maps.Marker({
            position: new google.maps.LatLng(lat, lng),
            animation: google.maps.Animation.DROP,
            icon: defaultIcon,
            title: title,
        });
        // Reference to current place for use in event handlers
        let currentPlace = this;
        // Infowindow information
        //FourSquare Venue API call
        this.fourSquareVenueInfo = ko.observable('');
        this.info = ko.computed(function () {
            return '<div>' + '<h3>' + currentPlace.title() + '</h3>'  + 
                '</div><div><p><strong>Foursquare Venue locations nearby:</strong></br>' + currentPlace.fourSquareVenueInfo() + '</p></div';
        });
        // Add click event to show info window
        google.maps.event.addListener(this.marker, 'click', function () {
            currentPlace.showPlace();
        });
        // Two event listeners - one for mouseover, one for mouseout,
        // to change the colors back and forth.
      google.maps.event.addListener(this.marker, 'mouseover', function() {
        this.setIcon(highlightedIcon);
      });
      google.maps.event.addListener(this.marker, 'mouseout', function() {
        this.setIcon(defaultIcon);
      });
        // creates a place on the map with marker
        this.showPlace = function () {
            map.setCenter(currentPlace.marker.getPosition());
            largeInfowindow.setContent(currentPlace.info());
            largeInfowindow.open(map, currentPlace.marker);
            currentPlace.marker.setAnimation(google.maps.Animation.BOUNCE);
            currentPlace.marker.setIcon(highlightedIcon);
            window.setTimeout(function () {
                currentPlace.marker.setAnimation(null);
                currentPlace.marker.setIcon(defaultIcon);
            }, 1000);
        };
        // Set marker map
        this.marker.setMap(map);
    };
    // generate list of places
    this.generatePlaceList = function() {
        let placeList = [];
        initalPlaces.forEach(function(placeItem){
            placeList.push(ko.observable( new self.Place(placeItem.title, placeItem.lat, placeItem.lng) ));
        });
        return placeList;
    }
    
    // all Places on the map
    this.allPlaces = ko.observable(this.generatePlaceList());
    
    // filter functionality
    this.currentFilter = ko.observable('');
    this.places = ko.computed(function () {
        let filteredPlaces = ko.observableArray();
        let filter = self.currentFilter().toLowerCase();
        self.allPlaces().forEach(function (place) {
            place().marker.setVisible(false);
            if (place().title().toLowerCase().indexOf(filter) != -1) {
                filteredPlaces.push(place());
                place().marker.setVisible(true);
            }
        });
       return filteredPlaces();
    });
    
    //Foursquare function to populate map with Foursquare venues API data.
    function fourSquare()
    {
        function APIRequest(i) {
            let fourSquareRequestTimeout = setTimeout(function(){
               self.places()[i].fourSquareVenueInfo(
               'Cannot connect to Foursquare.');
            }, 12000);  // wait 3 seconds
            
            $.ajax({
                url: fourSquareURL,
                dataType: 'jsonp',
                success: function(data){
                    let newfourSquareVenueInfo = self.places()[
                        i].fourSquareVenueInfo();
                    let venues = data.response.venues;
                    $.each(venues, function(i,venue){
                        newfourSquareVenueInfo = newfourSquareVenueInfo.concat(venue.name + '<br/>');
                    clearTimeout(fourSquareRequestTimeout);
                    });
                    self.places()[i].fourSquareVenueInfo(newfourSquareVenueInfo);
                }
                
            });
        }
        // Iterate through all places
        for (let i = 0; i < self.places().length; i++) {
            //format date for Foursquare
            let versionDate = yyyymmdd();
            // FourSquare AJAX Request
            fourSquareURL =
                foursquareAPIURL +
                self.places()[i].lat() + ',' + self.places()[i].lng() +
                '&client_id=' + clientID + '&client_secret=' + clientSecret + '&v=' + versionDate + '&limit=3';
            APIRequest(i);
        }
    }
    fourSquare();
};