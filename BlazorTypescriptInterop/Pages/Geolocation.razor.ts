export async function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
    let position = await new Promise((resolve: PositionCallback, reject: PositionErrorCallback) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
    console.log(position);
    console.log(JSON.stringify(position));
    let mappedPosition: GeolocationPosition = {
        coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed
        },
        timestamp: position.timestamp
    };
    console.log(JSON.stringify(mappedPosition));
    return mappedPosition;
}