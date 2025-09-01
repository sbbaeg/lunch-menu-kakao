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
import { Slider } from "@/components/ui/slider";
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

// 타입 정의
type KakaoMap = {
  setCenter: (latlng: KakaoLatLng) => void;
  relayout: () => void;
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
  id: string;
  place_name: string;
  category_name: string;
  road_address_name: string;
  x: string; // lng
  y: string; // lat
  place_url: string;
  distance: string;
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

interface GoogleOpeningHours {
  open_now: boolean;
  weekday_text?: string[];
}
interface GoogleDetails {
  url?: string;
  photos: string[];
  rating?: number;
  opening_hours?: GoogleOpeningHours;
  phone?: string;
}

// (추가!) 경로 좌표 타입을 프론트엔드에도 정의합니다.
interface DirectionPoint {
  lat: number;
  lng: number;
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
  const [restaurantList, setRestaurantList] = useState<KakaoPlaceItem[]>([]);
  const [googleDetails, setGoogleDetails] = useState<GoogleDetails | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [rouletteItems, setRouletteItems] = useState<KakaoPlaceItem[]>([]);
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [userLocation, setUserLocation] = useState<KakaoLatLng | null>(null);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDistance, setSelectedDistance] = useState<string>('800');
  const [sortOrder, setSortOrder] = useState<'accuracy' | 'distance'>('accuracy');
  const [resultCount, setResultCount] = useState<number>(5);

  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<KakaoMap | null>(null);
  const markers = useRef<KakaoMarker[]>([]);
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

  useEffect(() => {
    if (!isDetailsLoading && mapInstance.current) {
      setTimeout(() => {
        mapInstance.current?.relayout();
      }, 100);
    }
  }, [googleDetails, isDetailsLoading]);

  useEffect(() => {
    if (sortOrder === 'accuracy') {
      setResultCount(5);
    }
  }, [sortOrder]);

  const getNearbyRestaurants = async (latitude: number, longitude: number): Promise<KakaoPlaceItem[]> => {
    const query = selectedCategories.length > 0 ? selectedCategories.join(',') : '음식점';
    const radius = selectedDistance;
    const sort = sortOrder;
    const size = resultCount;
    
    const response = await fetch(`/api/recommend?lat=${latitude}&lng=${longitude}&query=${encodeURIComponent(query)}&radius=${radius}&sort=${sort}&size=${size}`);
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
    clearMapAndResults();

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const currentLocation = new window.kakao.maps.LatLng(latitude, longitude);
      setUserLocation(currentLocation);
      if (mapInstance.current) mapInstance.current.setCenter(currentLocation);

      try {
        const restaurants = await getNearbyRestaurants(latitude, longitude);
        if (restaurants.length === 0) {
            alert('주변에 조건에 맞는 음식점을 찾지 못했어요!');
            setLoading(false);
            return;
        }

        if (isRoulette) {
          const rouletteCandidates = restaurants.slice(0, resultCount);
          if (rouletteCandidates.length < 2) {
            alert(`주변에 추첨할 음식점이 ${resultCount}개 미만입니다.`);
            setLoading(false);
            return;
          }
          setRouletteItems(rouletteCandidates);
          setIsRouletteOpen(true);
          setMustSpin(false);
        } else {
          const finalRestaurants = sortOrder === 'distance' 
            ? restaurants 
            : [...restaurants].sort(() => 0.5 - Math.random()).slice(0, resultCount);

          setRestaurantList(finalRestaurants);
          displayMarkers(finalRestaurants, currentLocation);
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
  
  const clearMapAndResults = () => {
    setRecommendation(null);
    setGoogleDetails(null);
    setRestaurantList([]);
    markers.current.forEach(marker => marker.setMap(null));
    markers.current = [];
    if (polylineInstance.current) polylineInstance.current.setMap(null);
  };

  const updateMapAndCard = async (place: KakaoPlaceItem, currentLoc: KakaoLatLng) => {
    setRecommendation(place);

    if (mapInstance.current) {
      if (polylineInstance.current) polylineInstance.current.setMap(null);
      
      try {
        const response = await fetch(`/api/directions?origin=${currentLoc.getLng()},${currentLoc.getLat()}&destination=${place.x},${place.y}`);
        const data = await response.json();
        
        if (data.path && data.path.length > 0) {
          const linePath = data.path.map((point: DirectionPoint) => new window.kakao.maps.LatLng(point.lat, point.lng));
          polylineInstance.current = new window.kakao.maps.Polyline({
            path: linePath,
            strokeWeight: 6,
            strokeColor: '#007BFF',
            strokeOpacity: 0.8,
          });
          polylineInstance.current.setMap(mapInstance.current);
        }
      } catch (error) {
        console.error("Failed to fetch directions:", error);
      }
    }
  };
  
  const displayMarkers = (places: KakaoPlaceItem[], currentLoc: KakaoLatLng) => {
    if (!mapInstance.current) return;

    places.forEach(place => {
      const placePosition = new window.kakao.maps.LatLng(Number(place.y), Number(place.x));
      const marker = new window.kakao.maps.Marker({ position: placePosition });
      marker.setMap(mapInstance.current);
      markers.current.push(marker);
    });
    if (places.length > 0) {
      updateMapAndCard(places[0], currentLoc);
    }
  };

  const rouletteData: RouletteOption[] = rouletteItems.map((item, index) => {
    const colors = ['#FF6B6B', '#FFD966', '#96F291', '#66D9E8', '#63A4FF', '#f9a8d4', '#d9a8f9', '#f3a683', '#a29bfe', '#e17055', '#00b894', '#74b9ff', '#ff7675', '#fdcb6e', '#55efc4'];
    return { 
      option: item.place_name,
      style: {
        backgroundColor: colors[index % colors.length],
        textColor: '#333333'
      }
    };
  });
  
  const handleListItemClick = (place: KakaoPlaceItem) => {
    if (userLocation) {
        mapInstance.current?.setCenter(new window.kakao.maps.LatLng(Number(place.y), Number(place.x)));
        updateMapAndCard(place, userLocation);
    }
  };

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
                    <div className="border-t border-gray-200"></div>
                    <div>
                      <Label className="text-lg font-semibold">정렬 방식</Label>
                      <RadioGroup defaultValue="accuracy" value={sortOrder} onValueChange={(value) => setSortOrder(value as 'accuracy' | 'distance')} className="flex gap-4 pt-2">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="accuracy" id="sort-accuracy" /><Label htmlFor="sort-accuracy">랜덤 추천</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="distance" id="sort-distance" /><Label htmlFor="sort-distance">가까운 순</Label></div>
                      </RadioGroup>
                    </div>
                    <div className="border-t border-gray-200"></div>
                    <div>
                      <Label htmlFor="result-count" className="text-lg font-semibold">검색 개수: {resultCount}개</Label>
                      <Slider id="result-count" defaultValue={[5]} value={[resultCount]} onValueChange={(value) => setResultCount(value[0])} min={5} max={15} step={1} className="mt-2" />
                    </div>
                  </div>
                  <DialogFooter><DialogClose asChild><Button>완료</Button></DialogClose></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="w-full max-w-sm space-y-4">
              {restaurantList.length > 0 ? (
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-2">
                  <p className="text-sm font-semibold text-gray-600 pl-1">{sortOrder === 'distance' ? '가까운 순 결과' : '랜덤 추천 결과'}: {restaurantList.length}개</p>
                  {restaurantList.map(place => (
                    <Card 
                      key={place.id} 
                      className={`w-full border shadow-sm cursor-pointer hover:border-blue-500 transition-all ${recommendation?.id === place.id ? 'border-blue-500 border-2' : ''}`}
                      onClick={() => handleListItemClick(place)}
                    >
                      <CardHeader className="px-2 pt-px pb-1 flex flex-row items-center justify-between">
                        <CardTitle className="text-md">{place.place_name}</CardTitle>
                        <span className="text-xs text-gray-600 whitespace-nowrap">{place.distance}m</span>
                      </CardHeader>
                      <CardContent className="px-2 pb-px pt-0 text-xs text-gray-700">
                        <p>{place.category_name}</p>
                        <a href={place.place_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block w-full">
                          <Button size="sm" className="w-full bg-black text-white hover:bg-gray-800">
                            카카오맵 상세보기
                          </Button>
                        </a>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="w-full flex items-center justify-center h-40 text-gray-500 border shadow-sm">
                  <p>음식점을 추천받아보세요!</p>
                </Card>
              )}
              
              {recommendation && (
                <Card className="w-full border shadow-sm min-h-[200px]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{recommendation.place_name}</CardTitle>
                    <p className="text-xs text-gray-500">Google Maps 제공</p>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2 pt-2">
                    {googleDetails?.url && (
                      <a href={googleDetails.url} target="_blank" rel="noopener noreferrer" className="mb-2 inline-block">
                        <Button variant="link" size="sm" className="p-0 h-auto text-xs">
                          구글맵 상세보기
                        </Button>
                      </a>
                    )}
                    {isDetailsLoading && <p>상세 정보를 불러오는 중...</p>}
                    {!isDetailsLoading && !googleDetails && <p className="text-gray-500">Google에서 추가 정보를 찾지 못했습니다.</p>}
                    {googleDetails?.rating && (
                      <div className="flex items-center gap-1"><StarRating rating={googleDetails.rating} /></div>
                    )}
                    {googleDetails?.opening_hours && (
                      <div className="flex flex-col">
                        <p><strong>영업:</strong> <span className={googleDetails.opening_hours.open_now ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{googleDetails.opening_hours.open_now ? ' 영업 중' : ' 영업 종료'}</span></p>
                        <p className="text-xs text-gray-500 ml-1">(오늘: {getTodaysOpeningHours(googleDetails.opening_hours)})</p>
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
                                  <DialogTrigger asChild><button className="w-full focus:outline-none"><Image src={photoUrl} alt={`${recommendation.place_name} photo ${index + 1}`} width={400} height={225} className="object-cover aspect-video rounded-md" /></button></DialogTrigger>
                                  <DialogContent className="max-w-3xl h-[80vh] p-2">
                                    <Image src={photoUrl} alt={`${recommendation.place_name} photo ${index + 1}`} fill style={{ objectFit: 'contain' }} />
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
              )}
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
                    if (userLocation) {
                      const winner = rouletteItems[prizeNumber];
                      
                      // 룰렛 결과로 나온 음식점의 마커를 생성하고 지도에 표시합니다.
                      const placePosition = new window.kakao.maps.LatLng(Number(winner.y), Number(winner.x));
                      const marker = new window.kakao.maps.Marker({ position: placePosition });
                      marker.setMap(mapInstance.current);
                      markers.current.push(marker);

                      // 기존의 카드 업데이트 및 경로 표시 함수를 호출합니다.
                      updateMapAndCard(winner, userLocation);

                      // 룰렛 결과를 좌측 리스트에도 표시하여 일관성을 높입니다.
                      setRestaurantList([winner]);
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

