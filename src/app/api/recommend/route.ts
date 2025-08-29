// 파일 경로: src/app/api/recommend/route.ts

import { NextResponse } from 'next/server';

// (추가!) 카카오 API 응답 타입을 명확하게 정의합니다.
interface KakaoPlace {
  // 필요한 모든 필드를 여기에 정의할 수 있습니다.
  [key: string]: any; 
}

interface KakaoSearchResponse {
  documents: KakaoPlace[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const query = searchParams.get('query') || '음식점';

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  try {
    // (수정!) 쉼표로 구분된 쿼리를 배열로 분리
    const categories = query.split(',');
    let allResults: KakaoPlace[] = [];

    // (수정!) 각 카테고리별로 API를 호출
    for (const category of categories) {
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(category.trim())}&y=${lat}&x=${lng}&radius=800`,
        {
          headers: {
            Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
          },
        }
      );
      const data: KakaoSearchResponse = await response.json();
      if (data.documents) {
        allResults = [...allResults, ...data.documents];
      }
    }

    // (수정!) 중복된 결과를 제거 (같은 가게가 여러 카테고리에 나올 수 있음)
    const uniqueResults = allResults.filter(
      (place, index, self) => index === self.findIndex((p) => p.id === place.id)
    );

    if (uniqueResults.length === 0) {
      return NextResponse.json({ documents: [] });
    }

    return NextResponse.json({ documents: uniqueResults });

  } catch (error) {
    console.error('Kakao API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data from Kakao API' }, { status: 500 });
  }
}