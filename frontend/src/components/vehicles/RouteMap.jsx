import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import PropTypes from 'prop-types'

import { 
    Play,
    Pause,
    Rewind,
    FastForward,
    Maximize2
} from 'lucide-react'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const SECONDS_PER_POINT = 1.5 //this is just for the current mocked trip
const STEP_SIZE = 2 //jumps this many

function formatElapsed(totalSeconds){
    const mins = Math.floor(totalSeconds/60)
    const secs = Math.floor(totalSeconds%60)

    return `${String(mins).padStart(2,'0')}:${String(secs).padStart(2, '0')}`
}

export default function RouteMap({ routePoints, routeLabel}) {
    const wrapperRef = useRef(null)
    const mapContainer = useRef(null)
    const map = useRef(null)
    const playbackMarker = useRef(null)
    const currentIndexRef = useRef(0)

    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [playbackSpeed, setPlaybackSpeed] = useState(1)

    const lastIndex = Math.max(routePoints.length -1,0)
    const progressPercent = lastIndex === 0 ? 0 : (currentIndex / lastIndex) * 100
    const elapsedSeconds = currentIndex * SECONDS_PER_POINT
    const totalSeconds = lastIndex * SECONDS_PER_POINT

    useEffect(() => {
        if (!mapContainer.current || routePoints.length === 0){
            return
        }
        if (!mapboxgl.accessToken) return

        const coordinates = routePoints.map((point) => [point.lng, point.lat])

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: coordinates[Math.floor(coordinates.length / 2)],
            zoom: 12,
        })

        map.current.on('load', () => {
            map.current.addSource('route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates,
                    },
                },
            })

            map.current.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round'},
                paint: { 'line-color': '#14304F', 'line-width': 4},
            })


            new mapboxgl.Marker({ color: '#4D7C5F'}).setLngLat(coordinates[0]).addTo(map.current)
            new mapboxgl.Marker({ color: '#C0392B'}).setLngLat(coordinates[coordinates.length-1]).addTo(map.current)

            playbackMarker.current = new mapboxgl.Marker({ color: '#14304F' })
            .setLngLat(coordinates[0])
            .addTo(map.current)
        })

        setCurrentIndex(0)
        setIsPlaying(false)

        return () => {
            map.current?.remove()
            map.current = null
            playbackMarker.current = null
        }
    }, [routePoints])

        useEffect(() => {
            if (!playbackMarker.current || routePoints.length === 0){
                return
            }

            if (!isPlaying){
                const point = routePoints[currentIndex]
                if(point) playbackMarker.current.setLngLat([point.lng, point.lat])
            }
        }, [currentIndex, isPlaying, routePoints])

        useEffect(() => {
            currentIndexRef.current = currentIndex
        }, [currentIndex])

        useEffect(() => {
            if (!isPlaying || !playbackMarker.current){
                return
            }

            let animationId = null
            let segmentStartTime = null
            let segmentIndex = currentIndexRef.current


            function animateSegment(timestamp) {
                if (segmentIndex >= lastIndex) {
                    setIsPlaying(false)
                    setCurrentIndex(lastIndex)
                    return
                }

                if (!segmentStartTime){
                    segmentStartTime = timestamp
                }

                const from = routePoints[segmentIndex]
                const to = routePoints[segmentIndex+1]
                const segmentDurationMs = SECONDS_PER_POINT * 1000 / playbackSpeed
                const progress = Math.min((timestamp - segmentStartTime) / segmentDurationMs,1)

                const lng = from.lng + (to.lng - from.lng) * progress
                const lat = from.lat + (to.lat - from.lat) * progress
                playbackMarker.current.setLngLat([lng, lat])

                if (progress < 1){
                    animationId = requestAnimationFrame(animateSegment)
                }else {
                    segmentIndex += 1
                    setCurrentIndex(segmentIndex)
                    segmentStartTime = null
                    animationId = requestAnimationFrame(animateSegment)
                }
            }

            animationId = requestAnimationFrame(animateSegment)

            return () => {
                if (animationId){
                    cancelAnimationFrame(animationId)
                }
            } 
        }, [isPlaying, lastIndex, routePoints, playbackSpeed])

            useEffect(() => {
            function onFsChange() {
                requestAnimationFrame(() => map.current?.resize())
            }
            document.addEventListener('fullscreenchange', onFsChange)
            return () => document.removeEventListener('fullscreenchange', onFsChange)
        }, [])


        function handlePlayPause(){
            if(currentIndex >= lastIndex){
                setCurrentIndex(0)
            }
            setIsPlaying((prev) => !prev)
        }

        function handleRewind(){
            setIsPlaying(false)
            setCurrentIndex((indx) => Math.max(0,indx - STEP_SIZE))
        }

        function handleFastForward(){
            setIsPlaying(false)
            setCurrentIndex((indx) => Math.min(lastIndex ,indx + STEP_SIZE))
        }

        function handleFullscreen(){
            if(!wrapperRef.current) return
            if (document.fullscreenElement) {
                document.exitFullscreen()
            }else {
                wrapperRef.current.requestFullscreen()
            }
        }

        function handleScrub(event) {
            const bar = event.currentTarget
            const rect = bar.getBoundingClientRect()
            const clickFraction = (event.clientX - rect.left) / rect.width
            const targetIndex = Math.round(clickFraction * lastIndex)
            setIsPlaying(false)
            setCurrentIndex(Math.min(Math.max(targetIndex, 0), lastIndex))
        }

        function handleScrubKeyDown(event) {
            if(event.key === 'ArrowRight') {
                setIsPlaying(false)
                setCurrentIndex((indx) => Math.min(lastIndex, indx + 1))
            } else if(event.key === 'ArrowLeft') {
                setIsPlaying(false)
                setCurrentIndex((indx) => Math.max(0, indx - 1))
            }else if(event.key === 'Home') {
                setIsPlaying(false)
                setCurrentIndex(0)
            }else if(event.key === 'End') {
                setIsPlaying(false)
                setCurrentIndex(lastIndex)
            }

        }

    return (
    <div ref={wrapperRef} className="route-map-wrapper bg-white">
        <div className="route-map-box relative h-64 rounded-lg overflow-hidden">
            <div ref={mapContainer} style={{width: '100%', height: '100%'}}/>
            <div className="absolute top-3 left-3 bg-white rounded-md px-3 py-1.5 text-xs font-medium text-fleet-text shadow-sm">
                {routeLabel}
            </div>
            </div>
            <div className="mt-2 bg-fleet-panel rounded-lg px-3 py-2 flex items-center gap-3">
                {/*REWIND*/}
                <button 
                    type="button" 
                    data-testid="rewind-button"
                    onClick={handleRewind}
                    className="w-7 h-7 flex items-center justify-center text-fleet-text hover:text-fleet-blue">
                    <Rewind className="w-4 h-4"/>
                </button>
                {/*PLAY*/}
                <button 
                    type="button" 
                    data-testid="play-pause-button"
                    onClick={handlePlayPause}
                    className="w-8 h-8 rounded-full bg-fleet-blue flex items-center justify-center shrink-0">
                        {isPlaying ? (
                            <Pause className="w-3.5 h-3.5 text-white fill-white" data-testid="pause-icon"></Pause>
                        ) : (
                            <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" data-testid="play-icon"/>
                        )}
                </button>
                {/*FAST FORWARD*/}
                <button 
                    type="button" 
                    data-testid="fast-forward-button"
                    onClick={handleFastForward}
                    className="w-7 h-7 flex items-center justify-center text-fleet-text hover:text-fleet-blue">
                    <FastForward className="w-4 h-4"/>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                    {[1,2,4].map((speed) => (
                        <button
                            key={speed}
                            type="button"
                            onClick={() => setPlaybackSpeed(speed)}
                            className={`text-xs font-medium px-2 py-1 rounded-md ${
                                playbackSpeed === speed
                                ? 'bg-fleet-blue text-white'
                                : 'text-fleet-secondary hover:text-fleet-text'
                            }`}>
                            {speed}x
                        </button>
                    ))}
                </div>
                <div
                    role="slider"
                    aria-label="Trip playback position"
                    aria-valuenow={Math.round(progressPercent)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    data-testid="scrub-bar"
                    tabIndex={0}
                    onClick={handleScrub}
                    onKeyDown={handleScrubKeyDown}
                    className="flex-1 h-1 bg-fleet-border rounded-full overflow-hidden cursor-pointer">
                    <div className="h-full bg-fleet-blue rounded-full" style={{ width: `${progressPercent}%` }}/>
                    </div>
                <span className="text-xs text-fleet-secondary shrink-0">
                    {formatElapsed(elapsedSeconds)}/{formatElapsed(totalSeconds)}
                </span>
                <button 
                    type="button" 
                    data-testid="fullscreen-button"
                    onClick={handleFullscreen}
                    className="w-7 h-7 flex items-center justify-center text-fleet-text hover:text-fleet-blue">
                    <Maximize2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

RouteMap.propTypes = {
    routePoints: PropTypes.arrayOf(
        PropTypes.shape({
            lat: PropTypes.number.isRequired,
            lng: PropTypes.number.isRequired,
        })
    ).isRequired,
    routeLabel: PropTypes.string.isRequired,
}