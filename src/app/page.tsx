// src/app/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
}

interface KakaoSearchResponse {
  documents: KakaoPlaceItem[];
}

export default function Home() {
  const [recommendation, setRecommendation] = useState<KakaoPlaceItem | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);
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

  const handleRecommendClick = () => {
    setLoading(true);
    setRecommendation(null);
    if (markerInstance.current) {
      markerInstance.current.setMap(null);
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const response = await fetch(`/api/recommend?lat=${latitude}&lng=${longitude}`);
        const data: KakaoSearchResponse = await response.json();

        if (!data.documents || data.documents.length === 0) {
          alert('주변에 추천할 맛집을 찾지 못했어요!');
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
    });
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <h1 className="text-3xl font-bold mb-4">오늘 뭐 먹지? (feat.kakao map)</h1>
      <div ref={mapContainer} style={{ width: '100%', maxWidth: '800px', height: '400px', marginBottom: '20px', border: '1px solid #ccc' }}></div>
      <Button onClick={handleRecommendClick} disabled={loading || !isMapReady} size="lg">
        {loading ? '주변 맛집 검색 중...' : (isMapReady ? '점심 메뉴 추천받기!' : '지도 로딩 중...')}
      </Button>
      {recommendation && (
        <Card className="mt-4 w-full max-w-md">
          <CardHeader>
            <CardTitle>{recommendation.place_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>카테고리:</strong> {recommendation.category_name}</p>
            <p><strong>주소:</strong> {recommendation.road_address_name}</p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}