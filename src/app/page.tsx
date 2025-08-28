'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

// (수정!) any 대신 카카오맵 API의 실제 객체 타입을 구체적으로 정의
type KakaoMap = {
  setCenter: (latlng: KakaoLatLng) => void;
};
type KakaoMarker = {
  setMap: (map: KakaoMap | null) => void;
};
type KakaoLatLng = {
  getLat: () => number;
  getLng: () => number;
};

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number; draggable?: boolean; zoomable?: boolean; }) => KakaoMap;
        LatLng: new (lat: number, lng: number) => KakaoLatLng;
        Marker: new (options: { position: KakaoLatLng; }) => KakaoMarker;
      };
    };
  }
}

interface KakaoPlaceItem {
  place_name: string;
  category_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url: string;
}

interface KakaoSearchResponse {
  documents: KakaoPlaceItem[];
}

export default function Home() {
  const [recommendation, setRecommendation] = useState<KakaoPlaceItem | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  // 미니맵은 이제 사용하지 않으므로 제거
  // const miniMapContainer = useRef<HTMLDivElement | null>(null); 
  const mapInstance = useRef<KakaoMap | null>(null);
  const markerInstance = useRef<KakaoMarker | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAOMAP_JS_KEY}&autoload=false`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.kakao.maps.load(() => {
        if (mapContainer.current) {
          const mapOption = {
            center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 초기 중심 좌표 (서울 시청)
            level: 3,
          };
          mapInstance.current = new window.kakao.maps.Map(mapContainer.current, mapOption);
          setIsMapReady(true);
        }
      });
    };
  }, []);

  const handleRecommendClick = () => {
    setLoading(true);
    setRecommendation(null);
    if (markerInstance.current) {
      markerInstance.current.setMap(null);
    }
    
    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`/api/recommend?lat=${latitude}&lng=${longitude}`);
          const data: KakaoSearchResponse = await response.json();

          if (!data.documents || data.documents.length === 0) {
            alert('주변에 추천할 음식점을 찾지 못했어요!');
            return;
          }

          const randomIndex = Math.floor(Math.random() * data.documents.length);
          const randomPlace = data.documents[randomIndex];
          setRecommendation(randomPlace);

          if (mapInstance.current) {
            const placePosition = new window.kakao.maps.LatLng(Number(randomPlace.y), Number(randomPlace.x));
            mapInstance.current.setCenter(placePosition);
            markerInstance.current = new window.kakao.maps.Marker({
              position: placePosition,
            });
            markerInstance.current.setMap(mapInstance.current);
          }
        } catch (error) {
          console.error('Error:', error);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("위치 정보를 가져오는 데 실패했습니다. 위치 권한을 허용했는지 확인해주세요.");
        setLoading(false);
      },
      options
    );
  };

  return (
    <main className="flex flex-col items-center w-full min-h-screen p-4 md:p-8 bg-gray-50">
      <h1 className="text-3xl font-bold mb-4">오늘 뭐 먹지? (카카오 ver.)</h1>
      
      {/* PC에서는 가로(flex-row), 모바일에서는 세로(flex-col)로 배치되는 컨테이너 */}
      {/* md:h-[600px] 추가하여 PC에서 전체 컨테이너 높이 지정 */}
      <div className="w-full max-w-6xl flex flex-col md:flex-row gap-8 md:h-[600px]">
        
        {/* 지도 영역 - 모바일에서는 고정 높이, PC에서는 남은 공간을 모두 차지 (h-full과 flex-grow) */}
        <div className="w-full h-80 md:h-full md:flex-grow rounded-lg overflow-hidden border">
          <div ref={mapContainer} className="w-full h-full"></div>
        </div>

        {/* 추천 버튼 및 결과 카드 영역 - PC에서는 고정 너비 (md:w-1/3) */}
        <div className="w-full md:w-1/3 flex flex-col items-center md:justify-start">
          <Button onClick={handleRecommendClick} disabled={loading || !isMapReady} size="lg" className="w-full max-w-sm mb-4">
            {loading ? '주변 음식점 검색 중...' : (isMapReady ? '점심 메뉴 추천받기!' : '지도 로딩 중...')}
          </Button>
          
          {recommendation && (
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>{recommendation.place_name}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* 미니맵이 없으므로 해당 div 제거 */}
                <p><strong>카테고리:</strong> {recommendation.category_name}</p>
                <p><strong>주소:</strong> {recommendation.road_address_name}</p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <a href={recommendation.place_url} target="_blank" rel="noopener noreferrer">
                    카카오맵에서 상세보기
                  </a>
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}