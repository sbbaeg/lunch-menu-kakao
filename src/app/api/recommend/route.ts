// 파일 경로: src/app/api/recommend/route.ts

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  // (수정!) 프론트에서 보낸 query 파라미터를 받습니다.
  const query = searchParams.get('query') || '음식점'; // 기본값은 '음식점'

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  try {
    // (수정!) 고정된 '음식점' 대신 받은 query를 사용합니다.
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&y=${lat}&x=${lng}&radius=800`,
      {
        headers: {
          Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!data.documents || data.documents.length === 0) {
      return NextResponse.json({ documents: [] });
    }
    return NextResponse.json(data);

  } catch (error) {
    console.error('Kakao API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data from Kakao API' }, { status: 500 });
  }
}