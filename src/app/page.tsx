// 로드뷰 any type 수정 ver

'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import dynamic from 'next/dynamic';

const Wheel = dynamic(() => import('react-custom-roulette').then(mod => mod.Wheel), { ssr: false });

// (타입 정의는 이전과 동일)
type KakaoMap = any;
type KakaoMarker = any;
type KakaoPolyline = any;
type KakaoLatLng = any;

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

interface RouletteOption {
  option: string;
}

export default function Home() {
  const [recommendation, setRecommendation] = useState<KakaoPlaceItem | null>(null);
  const [rouletteItems, setRouletteItems] = useState<KakaoPlaceItem[]>([]);
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);
  
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [userLocation, setUserLocation] = useState<KakaoLatLng | null>(null);

  const mapContainer = useRef<HTMLDivElement | null>(null);
  const roadviewContainer = useRef<HTMLDivElement | null>(null); // 로드뷰를 위한 ref
  const mapInstance = useRef<KakaoMap | null>(null);
  const markerInstance = useRef<KakaoMarker | null>(null);
  const polylineInstance = useRef<KakaoPolyline | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    // (수정!) 로드뷰 라이브러리를 함께 불러옵니다.
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAOMAP_JS_KEY}&autoload=false&libraries=services,clusterer,drawing,roadview`;
    script.async = true;
    document.head.appendChild(script);
    script.onload = () => {
      window.kakao.maps.load(() => {
        if (mapContainer.current) {
          const mapOption = {
            center: new window.kakao.maps.LatLng(36.3504, 127.3845),
            level: 3,
          };
          mapInstance.current = new window.kakao.maps.Map(mapContainer.current, mapOption);
          setIsMapReady(true);
        }
      });
    };
  }, []);

  // (수정!) 추천 가게가 바뀔 때마다 로드뷰를 그리도록 수정
  useEffect(() => {
    if (recommendation && roadviewContainer.current) {
      const placePosition = new window.kakao.maps.LatLng(Number(recommendation.y), Number(recommendation.x));
      const roadviewClient = new window.kakao.maps.RoadviewClient();

      // 로드뷰 컨테이너를 먼저 비워줍니다.
      roadviewContainer.current.innerHTML = '';

      roadviewClient.getNearestPanoId(placePosition, 50, (panoId: number) => {
        if (panoId && roadviewContainer.current) {
          roadviewContainer.current.style.display = 'block';
          new window.kakao.maps.Roadview(roadviewContainer.current).setPanoId(panoId, placePosition);
        } else if (roadviewContainer.current) {
          // 로드뷰가 없는 경우 메시지 표시
          roadviewContainer.current.style.display = 'flex';
          roadviewContainer.current.style.alignItems = 'center';
          roadviewContainer.current.style.justifyContent = 'center';
          roadviewContainer.current.innerHTML = '<p class="text-gray-500">로드뷰 정보가 없습니다.</p>';
        }
      });
    }
  }, [recommendation]); // recommendation이 변경될 때마다 실행


  const getNearbyRestaurants = async (latitude: number, longitude: number): Promise<KakaoPlaceItem[]> => {
    setUserLocation(new window.kakao.maps.LatLng(latitude, longitude));
    const response = await fetch(`/api/recommend?lat=${latitude}&lng=${longitude}`);
    if (!response.ok) throw new Error('API call failed');
    const data: KakaoSearchResponse = await response.json();
    return data.documents || [];
  };

  const recommendProcess = async (isRoulette: boolean) => {
    setLoading(true);
    setRecommendation(null);
    if (markerInstance.current) markerInstance.current.setMap(null);
    if (polylineInstance.current) polylineInstance.current.setMap(null);

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const restaurants = await getNearbyRestaurants(position.coords.latitude, position.coords.longitude);
        if (isRoulette) {
          if (restaurants.length >= 5) {
            setRouletteItems(restaurants.slice(0, 5));
            setIsRouletteOpen(true);
            setMustSpin(false);
          } else {
            alert('주변에 추첨할 음식점이 5개 미만입니다.');
          }
        } else {
          if (restaurants.length > 0) {
            const randomIndex = Math.floor(Math.random() * restaurants.length);
            updateMapAndCard(restaurants[randomIndex]);
          } else {
            alert('주변에 추천할 음식점을 찾지 못했어요!');
          }
        }
      } catch (error) {
        console.error('Error:', error);
        alert('음식점을 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }, (error) => {
        console.error("Geolocation error:", error);
        alert("위치 정보를 가져오는 데 실패했습니다.");
        setLoading(false);
    });
  };

  const handleSpinClick = () => {
    if (mustSpin) return;
    const newPrizeNumber = Math.floor(Math.random() * rouletteItems.length);
    setPrizeNumber(newPrizeNumber);
    setMustSpin(true);
  };

  const updateMapAndCard = (place: KakaoPlaceItem) => {
    setRecommendation(place);
    if (mapInstance.current && userLocation) {
      const placePosition = new window.kakao.maps.LatLng(Number(place.y), Number(place.x));
      mapInstance.current.setCenter(placePosition);
      
      markerInstance.current = new window.kakao.maps.Marker({ position: placePosition });
      markerInstance.current.setMap(mapInstance.current);

      polylineInstance.current = new window.kakao.maps.Polyline({
        path: [userLocation, placePosition],
        strokeWeight: 5,
        strokeColor: '#007BFF',
        strokeOpacity: 0.8,
      });
      polylineInstance.current.setMap(mapInstance.current);
    }
  };

  const handleError = (error: GeolocationPositionError) => {
    console.error("Geolocation error:", error);
    alert("위치 정보를 가져오는 데 실패했습니다.");
    setLoading(false);
  };

  const rouletteData: RouletteOption[] = rouletteItems.map(item => ({ option: item.place_name }));

  return (
    <main className="flex flex-col items-center w-full min-h-screen p-4 md:p-8 bg-gray-50">
      <Card className="w-full max-w-6xl p-6 md:p-8 space-y-6">
        <h1 className="text-3xl font-bold text-center">오늘 뭐 먹지? (카카오 ver.)</h1>
        
        <div className="flex flex-col md:flex-row gap-6 md:h-[600px]">
          <div className="w-full h-80 md:h-full md:flex-grow rounded-lg overflow-hidden border shadow-sm">
            <div ref={mapContainer} className="w-full h-full"></div>
          </div>

          <div className="w-full md:w-1/3 flex flex-col items-center md:justify-start space-y-4">
            <div className="w-full max-w-sm flex gap-2">
              <Button onClick={() => recommendProcess(false)} disabled={loading || !isMapReady} size="lg" className="flex-1">
                음식점 추천
              </Button>
              <Button onClick={() => recommendProcess(true)} disabled={loading || !isMapReady} size="lg" className="flex-1">
                음식점 룰렛
              </Button>
            </div>
            
            {recommendation ? (
              <Card className="w-full max-w-sm border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">{recommendation.place_name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700 space-y-2">
                  {/* (수정!) 로드뷰를 표시할 div 추가 */}
                  <div ref={roadviewContainer} className="w-full h-40 border rounded-md bg-gray-100"></div>
                  <p><strong>카테고리:</strong> {recommendation.category_name}</p>
                  <p><strong>주소:</strong> {recommendation.road_address_name}</p>
                </CardContent>
                <CardFooter className="pt-3">
                  {/* (수정!) 버튼을 일반 링크로 변경 */}
                  <Button asChild className="w-full" variant="secondary">
                    <a href={recommendation.place_url} target="_blank" rel="noopener noreferrer">
                      카카오맵에서 상세보기
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ) : (
                <Card className="w-full max-w-sm flex items-center justify-center h-40 text-gray-500 border shadow-sm">
                    <p>음식점을 추천받아보세요!</p>
                </Card>
            )}
          </div>
        </div>
      </Card>
      
      <Dialog open={isRouletteOpen} onOpenChange={setIsRouletteOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl mb-4">룰렛을 돌려 오늘 점심을 선택하세요!</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col justify-center items-center space-y-6">
            {rouletteData.length > 0 && (
              <Wheel
                mustStartSpinning={mustSpin}
                prizeNumber={prizeNumber}
                data={rouletteData}
                onStopSpinning={() => {
                  setMustSpin(false);
                  setIsRouletteOpen(false);
                  updateMapAndCard(rouletteItems[prizeNumber]);
                }}
              />
            )}
            <Button onClick={handleSpinClick} disabled={mustSpin} className="w-full max-w-[150px]">
              돌리기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}