'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import {
  KakaoMap,
  KakaoMapsLatLng,
  KakaoMapsMarker,
} from '@/types/kakao-maps';

interface KakaoPlaceItem {
  id: string; // Add ID field
  place_name: string;
  category_name: string;
  road_address_name: string;
  x: string;
  y: string;
}

interface KakaoSearchResponse {
  documents: KakaoPlaceItem[];
}

interface GooglePlaceDetail {
  name: string;
  rating: number;
  formatted_address: string;
  formatted_phone_number?: string;
  opening_hours?: {
    weekday_text: string[];
  };
}

export default function Home() {
  const [recommendation, setRecommendation] = useState<KakaoPlaceItem | null>(null);
  const [googlePlaceDetail, setGooglePlaceDetail] = useState<GooglePlaceDetail | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<KakaoMap | null>(null);
  const markerInstance = useRef<KakaoMapsMarker | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    // Moved API key to API file
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_KAKAO_API_KEY&autoload=false`; // Replace with a valid key for local development
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
    setGooglePlaceDetail(null);
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
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("위치 정보를 가져오는 데 실패했습니다. 위치 권한을 허용했는지 확인해주세요.");
        setLoading(false);
      },
      options
    );
  };

  const fetchGooglePlaceDetail = async (placeName: string, addressName: string) => {
    setIsDetailLoading(true);
    try {
      const response = await fetch(`/api/google-place-detail?place_name=${encodeURIComponent(placeName)}&address_name=${encodeURIComponent(addressName)}`);
      if (response.status === 404) {
        setGooglePlaceDetail(null);
        alert('구글 플레이스 정보를 찾을 수 없습니다.');
        return;
      }
      const data: GooglePlaceDetail = await response.json();
      setGooglePlaceDetail(data);
    } catch (error) {
      console.error('Error fetching Google Place detail:', error);
      setGooglePlaceDetail(null);
      alert('구글 플레이스 정보를 가져오는 데 실패했습니다.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <h1 className="text-3xl font-bold mb-4">오늘 뭐 먹지? 🤔</h1>
      <div ref={mapContainer} style={{ width: '100%', maxWidth: '800px', height: '400px', marginBottom: '20px', border: '1px solid #ccc' }}></div>
      <Button onClick={handleRecommendClick} disabled={loading || !isMapReady} size="lg">
        {loading ? (
          <span className="flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 주변 맛집 검색 중...
          </span>
        ) : (
          isMapReady ? '점심 메뉴 추천받기!' : '지도 로딩 중...'
        )}
      </Button>
      {recommendation && (
        <Card className="mt-4 w-full max-w-md">
          <CardHeader>
            <CardTitle>{recommendation.place_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>카테고리:</strong> {recommendation.category_name}</p>
            <p><strong>주소:</strong> {recommendation.road_address_name}</p>
            <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => fetchGooglePlaceDetail(recommendation.place_name, recommendation.road_address_name)} 
                  disabled={isDetailLoading} 
                  className="mt-4"
                >
                  {isDetailLoading ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 상세정보 불러오는 중...
                    </span>
                  ) : '상세정보 보기 (Google)'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{googlePlaceDetail?.name || '상세 정보'}</DialogTitle>
                </DialogHeader>
                {googlePlaceDetail ? (
                  <div className="space-y-4 p-4">
                    <p><strong>별점:</strong> {googlePlaceDetail.rating || '정보 없음'}</p>
                    <p><strong>주소:</strong> {googlePlaceDetail.formatted_address || '정보 없음'}</p>
                    <p><strong>전화번호:</strong> {googlePlaceDetail.formatted_phone_number || '정보 없음'}</p>
                    {googlePlaceDetail.opening_hours && googlePlaceDetail.opening_hours.weekday_text ? (
                      <div>
                        <p><strong>영업 시간:</strong></p>
                        <ul className="list-disc list-inside">
                          {googlePlaceDetail.opening_hours.weekday_text.map((hour, index) => (
                            <li key={index}>{hour}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p><strong>영업 시간:</strong> 정보 없음</p>
                    )}
                  </div>
                ) : (
                  <p>상세 정보를 찾을 수 없습니다.</p>
                )}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
