// src/app/api/recommend/route.ts

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=맛집&y=${lat}&x=${lng}&radius=2000`,
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
    return NextResponse.json({ error: 'Failed to fetch data from Kakao API' }, { status: 500 });
  }
}