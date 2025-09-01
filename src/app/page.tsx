'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import dynamic from 'next/dynamic';
import Image from 'next/image';

const Wheel = dynamic(() => import('react-custom-roulette').then(mod => mod.Wheel), { ssr: false });

// 카카오맵 관련 타입을 명확하게 정의합니다.
type KakaoMap = {
  setCenter: (latlng: KakaoLatLng) => void;
};
type KakaoMarker = {
  setMap: (map: KakaoMap | null) => void;
};
type KakaoPolyline = {
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
        Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number; }) => KakaoMap;
        LatLng: new (lat: number, lng: number) => KakaoLatLng;
        Marker: new (options: { position: KakaoLatLng; }) => KakaoMarker;
        Polyline: new (options: { path: KakaoLatLng[]; strokeColor: string; strokeWeight: number; strokeOpacity: number; }) => KakaoPolyline;
      };
    };
  }
}

interface KakaoPlaceItem {
  place_name: string;
  category_name: string;
  road_address_name: string;
  x: string; // lng
  y: string; // lat
  place_url: string;
}

interface KakaoSearchResponse {
  documents: KakaoPlaceItem[];
}

interface RouletteOption {
  option: string;
  style?: {
    backgroundColor?: string;
    textColor?: string;
  };
}

// Google API 응답 타입을 정의합니다.
interface GoogleOpeningHours {
  open_now: boolean;
  weekday_text?: string[];
}
interface GoogleDetails {
  photos: string[];
  rating?: number;
  opening_hours?: GoogleOpeningHours;
  phone?: string;
}

const CATEGORIES = [
  "한식", "중식", "일식", "양식", "아시아음식", "분식",
  "패스트푸드", "치킨", "피자", "뷔페", "카페", "술집"
];

const DISTANCES = [
  { value: '500', label: '가까워요', walkTime: '약 5분' },
  { value: '800', label: '적당해요', walkTime: '약 10분' },
  { value: '2000', label: '조금 멀어요', walkTime: '약 25분' },
];

const StarRating = ({ rating }: { rating: number }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  return (
    <div className="flex items-center">
      {[...Array(fullStars)].map((_, i) => (
        <span key={`full-${i}`} className="text-yellow-400 text-lg">★</span>
      ))}
      {halfStar && <span className="text-yellow-400 text-lg">☆</span>}
      {[...Array(emptyStars)].map((_, i) => (
        <span key={`empty-${i}`} className="text-gray-300 text-lg">☆</span>
      ))}
      <span className="ml-2 text-sm font-bold">{rating.toFixed(1)}</span>
    </div>
  );
};

const getTodaysOpeningHours = (openingHours?: GoogleOpeningHours): string | null => {
  if (!openingHours?.weekday_text) return null;
  const today = new Date().getDay();
  const googleApiIndex = (today + 6) % 7;
  const todaysHours = openingHours.weekday_text[googleApiIndex];
  return todaysHours ? todaysHours.substring(todaysHours.indexOf(':') + 2) : "정보 없음";
};

export default function Home() {
  const [recommendation, setRecommendation] = useState<KakaoPlaceItem | null>(null);
  const [googleDetails, setGoogleDetails] = useState<GoogleDetails | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [rouletteItems, setRouletteItems] = useState<KakaoPlaceItem[]>([]);
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [userLocation, setUserLocation] = useState<KakaoLatLng | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDistance, setSelectedDistance] = useState<string>('800');
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<KakaoMap | null>(null);
  const markerInstance = useRef<KakaoMarker | null>(null);
  const polylineInstance = useRef<KakaoPolyline | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAOMAP_JS_KEY;
    if (!KAKAO_JS_KEY) return;
    const scriptId = 'kakao-maps-script';
    if (document.getElementById(scriptId)) {
      if (window.kakao && window.kakao.maps) setIsMapReady(true);
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`;
    script.async = true;
    document.head.appendChild(script);
    script.onload = () => {
      window.kakao.maps.load(() => setIsMapReady(true));
    };
  }, []);

  useEffect(() => {
    if (isMapReady && mapContainer.current && !mapInstance.current) {
      const mapOption = {
        center: new window.kakao.maps.LatLng(36.3504, 127.3845),
        level: 3,
      };
      mapInstance.current = new window.kakao.maps.Map(mapContainer.current, mapOption);
    }
  }, [isMapReady]);

  useEffect(() => {
    if (!recommendation) return;
    const fetchGoogleDetails = async () => {
      setIsDetailsLoading(true);
      setGoogleDetails(null);
      try {
        const response = await fetch(`/api/details?name=${encodeURIComponent(recommendation.place_name)}&lat=${recommendation.y}&lng=${recommendation.x}`);
        if (response.ok) setGoogleDetails(await response.json());
      } catch (error) {
        console.error("Failed to fetch Google details:", error);
      } finally {
        setIsDetailsLoading(false);
      }
    };
    fetchGoogleDetails();
  }, [recommendation]);

  const getNearbyRestaurants = async (latitude: number, longitude: number): Promise<KakaoPlaceItem[]> => {
    const query = selectedCategories.length > 0 ? selectedCategories.join(',') : '음식점';
    const radius = selectedDistance;
    const response = await fetch(`/api/recommend?lat=${latitude}&lng=${longitude}&query=${encodeURIComponent(query)}&radius=${radius}`);
    if (!response.ok) throw new Error('API call failed');
    const data: KakaoSearchResponse = await response.json();
    return data.documents || [];
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    setSelectedCategories(checked === true ? CATEGORIES : []);
  };

  const recommendProcess = (isRoulette: boolean) => {
    setLoading(true);
    setRecommendation(null);
    if (markerInstance.current) markerInstance.current.setMap(null);
    if (polylineInstance.current) polylineInstance.current.setMap(null);

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const currentLocation = new window.kakao.maps.LatLng(latitude, longitude);
      setUserLocation(currentLocation);
      if (mapInstance.current) mapInstance.current.setCenter(currentLocation);

      try {
        const restaurants = await getNearbyRestaurants(latitude, longitude);
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
            updateMapAndCard(restaurants[randomIndex], currentLocation);
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

  const updateMapAndCard = (place: KakaoPlaceItem, currentLoc: KakaoLatLng) => {
    setRecommendation(place);
    if (mapInstance.current) {
      const placePosition = new window.kakao.maps.LatLng(Number(place.y), Number(place.x));
      markerInstance.current = new window.kakao.maps.Marker({ position: placePosition });
      markerInstance.current.setMap(mapInstance.current);
      polylineInstance.current = new window.kakao.maps.Polyline({
        path: [currentLoc, placePosition],
        strokeWeight: 5,
        strokeColor: '#007BFF',
        strokeOpacity: 0.8,
      });
      polylineInstance.current.setMap(mapInstance.current);
    }
  };
  
  const rouletteData: RouletteOption[] = rouletteItems.map((item, index) => {
    const colors = ['#FF6B6B', '#FFD966', '#96F291', '#66D9E8', '#63A4FF'];
    return { 
      option: item.place_name,
      style: {
        backgroundColor: colors[index % colors.length],
        textColor: '#333333'
      }
    };
  });

  return (
    <main className="flex flex-col items-center w-full min-h-screen p-4 md:p-8 bg-gray-50">
      <Card className="w-full max-w-6xl p-6 md:p-8 space-y-6">
        <h1 className="text-3xl font-bold text-center">오늘 뭐 먹지? (카카오 ver.)</h1>
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full h-80 md:h-auto md:min-h-[600px] md:flex-grow rounded-lg overflow-hidden border shadow-sm">
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
              <Dialog>
                <DialogTrigger asChild><Button variant="outline" size="lg">필터</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>검색 필터 설정</DialogTitle></DialogHeader>
                  <div className="py-4 space-y-4">
                    <div>
                      <Label className="text-lg font-semibold">음식 종류</Label>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        {CATEGORIES.map(category => (
                          <div key={category} className="flex items-center space-x-2">
                            <Checkbox id={category} checked={selectedCategories.includes(category)} onCheckedChange={() => handleCategoryChange(category)} />
                            <Label htmlFor={category}>{category}</Label>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
                        <Checkbox id="select-all" checked={selectedCategories.length === CATEGORIES.length} onCheckedChange={(checked) => handleSelectAll(checked)} />
                        <Label htmlFor="select-all" className="font-semibold">모두 선택</Label>
                      </div>
                    </div>
                    <div className="border-t border-gray-200"></div>
                    <div>
                      <Label className="text-lg font-semibold">검색 반경</Label>
                      <p className="text-sm text-gray-500">(기본값: 800m)</p>
                      <RadioGroup defaultValue="800" value={selectedDistance} onValueChange={setSelectedDistance} className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                        {DISTANCES.map(dist => (
                          <div key={dist.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={dist.value} id={dist.value} />
                            <Label htmlFor={dist.value} className="cursor-pointer">
                              <div className="flex flex-col"><span className="font-semibold">{dist.label}</span><span className="text-xs text-gray-500">{`(${dist.value}m ${dist.walkTime})`}</span></div>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                  <DialogFooter><DialogClose asChild><Button>완료</Button></DialogClose></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="w-full max-w-sm space-y-4">
              <Card className="w-full border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl h-8">{recommendation ? recommendation.place_name : "추천 음식점"}</CardTitle>
                </CardHeader>
                <CardContent className="pt-2 text-sm text-gray-700 space-y-0.5 min-h-[56px]">
                  {recommendation ? (
                    <>
                      <p><strong>카테고리:</strong> {recommendation.category_name}</p>
                      <p><strong>주소:</strong> {recommendation.road_address_name}</p>
                    </>
                  ) : <p>음식점을 추천받아보세요!</p>}
                </CardContent>
                <CardFooter className="pt-2 grid grid-cols-2 gap-2">
                  <Button asChild className="w-full" variant="secondary" disabled={!recommendation}>
                    <a href={recommendation?.place_url} target="_blank" rel="noopener noreferrer">
                      카카오맵
                    </a>
                  </Button>
                  {/* (수정!) 가게 이름과 주소를 함께 검색하여 정확도를 높입니다. */}
                  <Button asChild className="w-full" variant="secondary" disabled={!recommendation}>
                    <a 
                      href={`https://search.naver.com/search.naver?query=${encodeURIComponent(`${recommendation?.place_name} ${recommendation?.road_address_name}`)}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      네이버 검색
                    </a>
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="w-full border shadow-sm min-h-[200px]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {recommendation ? `${recommendation.place_name} (Google)` : "상세 정보 (Google)"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {isDetailsLoading && <p>상세 정보를 불러오는 중...</p>}
                  {!isDetailsLoading && !googleDetails && recommendation && <p className="text-gray-500">Google에서 추가 정보를 찾지 못했습니다.</p>}
                  
                  {googleDetails?.rating && (
                    <div className="flex items-center gap-1">
                      <StarRating rating={googleDetails.rating} />
                    </div>
                  )}

                  {googleDetails?.opening_hours && (
                    <div className="flex flex-col">
                      <p><strong>영업:</strong> 
                        <span className={googleDetails.opening_hours.open_now ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                          {googleDetails.opening_hours.open_now ? ' 영업 중' : ' 영업 종료'}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 ml-1">
                        (오늘: {getTodaysOpeningHours(googleDetails.opening_hours)})
                      </p>
                    </div>
                  )}

                  {googleDetails?.phone && (
                    <p><strong>전화:</strong> <a href={`tel:${googleDetails.phone}`} className="text-blue-600 hover:underline">{googleDetails.phone}</a></p>
                  )}

                  {googleDetails?.photos && googleDetails.photos.length > 0 && (
                    <div>
                      <strong>사진:</strong>
                      <Carousel className="w-full max-w-xs mx-auto mt-2">
                        <CarouselContent>
                          {googleDetails.photos.map((photoUrl, index) => (
                            <CarouselItem key={index}>
                              <Dialog>
                                <DialogTrigger asChild><button className="w-full focus:outline-none"><Image src={photoUrl} alt={`${recommendation?.place_name} photo ${index + 1}`} width={400} height={225} className="object-cover aspect-video rounded-md" /></button></DialogTrigger>
                                <DialogContent className="max-w-3xl h-[80vh] p-2">
                                  <Image src={photoUrl} alt={`${recommendation?.place_name} photo ${index + 1}`} fill style={{ objectFit: 'contain' }} />
                                </DialogContent>
                              </Dialog>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious className="left-2" />
                        <CarouselNext className="right-2" />
                      </Carousel>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Card>
      
      <Dialog open={isRouletteOpen} onOpenChange={setIsRouletteOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader><DialogTitle className="text-center text-2xl mb-4">룰렛을 돌려 오늘 점심을 선택하세요!</DialogTitle></DialogHeader>
          <div className="flex flex-col justify-center items-center space-y-6">
            {rouletteData.length > 0 && (
              <Wheel
                mustStartSpinning={mustSpin}
                prizeNumber={prizeNumber}
                data={rouletteData}
                onStopSpinning={() => {
                  setMustSpin(false);
                  setTimeout(() => {
                    setIsRouletteOpen(false);
                    if(userLocation) {
                      updateMapAndCard(rouletteItems[prizeNumber], userLocation);
                    }
                  }, 2000);
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

