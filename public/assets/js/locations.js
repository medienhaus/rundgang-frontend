const zoom = 18;
const markers = [];
const addresses = document.querySelectorAll('.address');
const firstAddress = document.querySelector('.address');
const firstLat = firstAddress.getAttribute('data-lat');
const firstLng = firstAddress.getAttribute('data-lng');

var map = L.map('map', {
    center: [firstLat, firstLng],
    zoom: zoom,
    attributionControl: false,
    popupPane: false,
});

var Stamen_TonerLite = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.{ext}', {
    minZoom: 0,
    maxZoom: 20,
    ext: 'png'
}).addTo(map);


function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function getIcon() {
    randomMarkerNo = randomIntFromInterval(1, 10);
    return L.icon({
        iconUrl: '../assets/img/marker/mushroom'+randomMarkerNo+'.svg',
        iconSize:     [45, 64], // size of the icon
        shadowSize:   [50, 64], // size of the shadow
        iconAnchor:   [22, 55], // point of the icon which will correspond to marker's location
        shadowAnchor: [4, 62],  // the same for the shadow
        popupAnchor:  [-5, -60] // point from which the popup should open relative to the iconAnchor
    });
}

function getMarker(latLon, icon = false) {
    if (icon) {
        return L.marker(latLon, {icon: icon}).addTo(map);
    }
    return L.marker(latLon).addTo(map);
}

function removeActiveClass() {
    if (document.querySelector('.address.active')) {
        document.querySelector('.address.active').classList.remove('active');
    }
}

function addressClickHandler(el, index) {
    const lat = el.getAttribute('data-lat');
    const lng = el.getAttribute('data-lng');

    const latLon = L.latLng(lat, lng);
    markers[index].openPopup(latLon);

    map.setView(latLon, zoom, {
        "animate": true,
        "pan": {
            "duration": 0.5
        }
    })
    
    removeActiveClass();
    el.classList.add('active');
}

function markerClickHandler(e) {
    const lat = e.latlng.lat;
    removeActiveClass();
    document.querySelector('.address[data-lat="'+lat+'"]').classList.add('active');
}

addresses.forEach((el, index) => {
    const lat = el.getAttribute('data-lat');
    const lng = el.getAttribute('data-lng');

    const text = el.querySelector('.location-name').innerText;
    const html = el.querySelector('.location-info').innerHTML;

    const icon = getIcon();
    const latLon = L.latLng(lat, lng);
    const marker = getMarker(latLon, icon);
    
    marker.on('click', markerClickHandler);

    markers.push(marker);
    const popup = L.popup()
        .setLatLng(latLon)
        .setContent(`
            <h3>${text}</h3>
            ${html}
        `)
    
    popup.on('remove', removeActiveClass);

    marker.bindPopup(popup)

    el.addEventListener('click', function() {
        addressClickHandler(this, index);
    })
});

if ( window.location.hash ) {
    const hash = document.querySelector(window.location.hash);
    if (hash && hash.classList.contains('address')) {
        hash.click();
    }
}
