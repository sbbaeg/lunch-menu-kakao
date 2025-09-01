import { NextResponse } from 'next/server';

// 카카오내비 API 응답 타입 정의
interface Road {
  vertexes: number[];
}

interface Section {
  roads: Road[];
}

interface Route {
  sections: Section[];
}

interface KakaoNaviResponse {
  routes: Route[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = searchParams.get('origin'); // "lng,lat"
  const destination = searchParams.get('destination'); // "lng,lat"

  if (!origin || !destination) {
    return NextResponse.json({ error: 'Origin and destination are required' }, { status: 400 });
  }

  const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

  try {
    const response = await fetch(
      `https://apis-navi.kakaomobility.com/v1/directions?origin=${origin}&destination=${destination}&waypoints=&priority=RECOMMEND&car_type=1&car_fuel=GASOLINE&alternatives=false&road_details=false`,
      {
        headers: {
          Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data: KakaoNaviResponse = await response.json();

    if (data.routes && data.routes.length > 0) {
      // 경로를 구성하는 모든 좌표를 하나의 배열로 합칩니다.
      const linePath = data.routes[0].sections
        .flatMap(section => section.roads)
        .flatMap(road => {
          const path = [];
          for (let i = 0; i < road.vertexes.length; i += 2) {
            path.push({ lng: road.vertexes[i], lat: road.vertexes[i + 1] });
          }
          return path;
        });
      
      return NextResponse.json({ path: linePath });
    } else {
      return NextResponse.json({ path: [] });
    }

  } catch (error) {
    console.error('Kakao Navi API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch directions' }, { status: 500 });
  }
}

