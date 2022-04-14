const zoom = 12
const markers = []
const addresses = document.querySelectorAll('.address')
const firstAddress = document.querySelector('.address')
const firstLat = firstAddress.getAttribute('data-lat')
const firstLng = firstAddress.getAttribute('data-lng')

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://osm.udk-berlin.de/nice/styles/toner/style.json', // stylesheet location
  center: [firstLng, firstLat], // starting position [lng, lat]
  zoom: zoom,
  maxZoom: 20,
  minZoom: 11
})

function randomIntFromInterval (min, max) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function removeActiveClass () {
  if (document.querySelector('.address.active')) {
    document.querySelector('.address.active').classList.remove('active')
  }
}

addresses.forEach((el, index) => {
  const lat = el.getAttribute('data-lat')
  const lng = el.getAttribute('data-lng')

  const text = el.querySelector('.location-name').innerText
  const html = el.querySelector('.location-info').innerHTML

  // create a DOM element for the marker
  const randomMarkerNo = randomIntFromInterval(1, 10)
  const markerElement = document.createElement('div')
  markerElement.className = 'marker'
  markerElement.style.backgroundImage = 'url("/assets/img/marker/mushroom' + randomMarkerNo + '.svg")'
  markerElement.style.backgroundRepeat = 'no-repeat'
  markerElement.style.width = '45px'
  markerElement.style.height = '64px'

  const popup = new maplibregl.Popup({ offset: 35, maxWidth: '300px' }).setHTML(`<h3>${text}</h3> ${html}`)
  popup.on('close', removeActiveClass)
  popup.on('open', function () {
    setTimeout(function () {
      // Close all other popups
      markers.forEach(function (marker) {
        if (marker.getLngLat().lng == lng && marker.getLngLat().lat == lat) return
        if (marker.getPopup().isOpen()) marker.togglePopup()
      })
      el.classList.add('active')
    }, 0)
  })

  // add marker to map
  const marker = new maplibregl.Marker(markerElement)
    .setLngLat([lng, lat])
    .setPopup(popup)
    .addTo(map)
  markers.push(marker)

  el.addEventListener('click', function () {
    map.flyTo({ center: [lng, lat], speed: 1, zoom: 17 })
    if (!popup.isOpen()) {
      marker.togglePopup()
    }
  })
})

/** DRAGGABLE LIST VIEW **/
const slider = document.querySelector('.container')
let mouseDown = false
let startX, scrollLeft

const startDragging = function (e) {
  mouseDown = true
  startX = e.pageX - slider.offsetLeft
  scrollLeft = slider.scrollLeft
}
const stopDragging = function (event) {
  mouseDown = false
}

slider.addEventListener('mousemove', (e) => {
  e.preventDefault()
  if (!mouseDown) { return }
  const x = e.pageX - slider.offsetLeft
  const scroll = x - startX
  slider.scrollLeft = scrollLeft - scroll
})

// Add the event listeners
slider.addEventListener('mousedown', startDragging, false)
slider.addEventListener('mouseup', stopDragging, false)
slider.addEventListener('mouseleave', stopDragging, false)

/// /// adding zooming on location if get parameter exists
const urlParams = new URLSearchParams(window.location.search)
if (urlParams.get('coords')) {
  const urlCoords = urlParams.get('coords').split(',')
  map.flyTo({ center: [urlCoords[1].trim(), urlCoords[0].trim()], speed: 1, zoom: 17 })
}
