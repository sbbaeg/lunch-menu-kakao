// 파일 경로: src/app/api/recommend/route.ts

import { NextResponse } from 'next/server';

interface KakaoPlace {
  id: string;
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
  // (수정!) 프론트에서 보낸 radius 파라미터를 받습니다. (기본값 800m)
  const radius = searchParams.get('radius') || '800';

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  try {
    const categories = query.split(',');
    let allResults: KakaoPlace[] = [];

    for (const category of categories) {
      // (수정!) 고정된 '800' 대신 받은 radius를 사용합니다.
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(category.trim())}&y=${lat}&x=${lng}&radius=${radius}`,
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