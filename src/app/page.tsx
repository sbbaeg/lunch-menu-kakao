'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
// Dialog 컴포넌트들을 import 합니다.
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

declare global {
  interface Window {
    kakao: any;
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
  const miniMapContainer = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
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
            center: new window.kakao.maps.LatLng(37.5665, 126.9780),
            level: 3,
          };
          mapInstance.current = new window.kakao.maps.Map(mapContainer.current, mapOption);
          setIsMapReady(true);
        }
      });
    };
  }, []);
  
  useEffect(() => {
    if (recommendation && miniMapContainer.current) {
      const placePosition = new window.kakao.maps.LatLng(Number(recommendation.y), Number(recommendation.x));
      const miniMapOption = {
        center: placePosition,
        level: 3,
        draggable: false,
        zoomable: false,
      };
      const miniMap = new window.kakao.maps.Map(miniMapContainer.current, miniMapOption);
      const miniMarker = new window.kakao.maps.Marker({
        position: placePosition,
      });
      miniMarker.setMap(miniMap);
    }
  }, [recommendation]);


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
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <h1 className="text-3xl font-bold mb-4">오늘 뭐 먹지? (카카오 ver.) 🤔</h1>
      <div ref={mapContainer} style={{ width: '100%', maxWidth: '800px', height: '400px', marginBottom: '20px', border: '1px solid #ccc' }}></div>
      <Button onClick={handleRecommendClick} disabled={loading || !isMapReady} size="lg">
        {loading ? '주변 음식점 검색 중...' : (isMapReady ? '점심 메뉴 추천받기!' : '지도 로딩 중...')}
      </Button>
      
      {/* Dialog 컴포넌트로 추천 카드 전체를 감싸줍니다. */}
      <Dialog>
        {recommendation && (
          <Card className="mt-4 w-full max-w-md">
            <CardHeader>
              <CardTitle>{recommendation.place_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={miniMapContainer} style={{ width: '100%', height: '150px', marginBottom: '1rem' }}></div>
              <p><strong>카테고리:</strong> {recommendation.category_name}</p>
              <p><strong>주소:</strong> {recommendation.road_address_name}</p>
            </CardContent>
            <CardFooter>
              {/* Button을 DialogTrigger로 감싸 팝업을 열게 합니다. */}
              <DialogTrigger asChild>
                <Button className="w-full">
                  상세 정보 팝업으로 보기
                </Button>
              </DialogTrigger>
            </CardFooter>
          </Card>
        )}
        
        {/* 팝업이 열렸을 때 보여줄 내용을 정의합니다. */}
        <DialogContent className="w-[90vw] h-[80vh] max-w-4xl flex flex-col">
          <DialogHeader>
            <DialogTitle>{recommendation?.place_name}</DialogTitle>
          </DialogHeader>
          {/* iframe을 사용해 카카오맵 페이지를 팝업 안에 보여줍니다. */}
          <div className="flex-1">
            <iframe
              src={recommendation?.place_url}
              title={recommendation?.place_name}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}