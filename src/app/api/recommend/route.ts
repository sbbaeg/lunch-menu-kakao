import { NextResponse } from 'next/server';

interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url: string;
  distance: string;
}

interface KakaoSearchResponse {
  documents: KakaoPlace[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const query = searchParams.get('query') || '음식점';
  const radius = searchParams.get('radius') || '800';
  const sort = searchParams.get('sort') || 'accuracy';
  const size = searchParams.get('size') || '5'; // 요청할 개수

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  try {
    const categories = query.split(',');
    let allResults: KakaoPlace[] = [];

    // 카카오는 한 번에 최대 15개까지만 검색 가능하므로, 요청 개수를 15개로 제한합니다.
    const searchSize = Math.min(Number(size), 15);

    for (const category of categories) {
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(category.trim())}&y=${lat}&x=${lng}&radius=${radius}&sort=${sort}&size=${searchSize}`,
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

    // 중복된 결과를 제거합니다.
    const uniqueResults = allResults.filter(
      (place, index, self) => index === self.findIndex((p) => p.id === place.id)
    );
    
    // (수정!) 거리순으로 다시 정렬한 뒤, 사용자가 요청한 개수(size)만큼 정확히 잘라서 반환합니다.
    const sortedResults = uniqueResults.sort((a, b) => Number(a.distance) - Number(b.distance));

    return NextResponse.json({ documents: sortedResults.slice(0, Number(size)) });

  } catch (error) {
    console.error('Kakao API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data from Kakao API' }, { status: 500 });
  }
}

