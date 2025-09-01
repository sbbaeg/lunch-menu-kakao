// src/types/kakao-maps.d.ts

declare namespace kakao.maps {
    class LatLng {
        constructor(lat: number, lng: number);
        getLat(): number;
        getLng(): number;
    }

    class Map {
        constructor(container: HTMLElement, options: object);
        setCenter(latlng: LatLng): void;
    }

    class Marker {
        constructor(options: object);
        setMap(map: Map | null): void;
    }
}

interface Window {
    kakao: any; // 타입 에러를 피하기 위해 임시로 any를 사용합니다.
}
