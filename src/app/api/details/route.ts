import { NextResponse } from 'next/server';

// Google Places API 응답 타입을 명확하게 정의합니다.
interface GooglePhoto {
  photo_reference: string;
}

interface GooglePlace {
  photos?: GooglePhoto[];
}

interface GoogleFindPlaceResponse {
  candidates: { place_id: string }[];
  status: string;
}

interface GooglePlaceDetailsResponse {
  result: GooglePlace;
  status: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!name || !lat || !lng) {
    return NextResponse.json({ error: 'Name and location are required' }, { status: 400 });
  }

  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

  try {
    // 1단계: 가게 이름과 좌표로 Google Place ID 찾기
    const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery&fields=place_id&locationbias=point:${lat},${lng}&key=${GOOGLE_API_KEY}`;
    
    const findPlaceRes = await fetch(findPlaceUrl);
    const findPlaceData: GoogleFindPlaceResponse = await findPlaceRes.json();

    if (findPlaceData.status !== 'OK' || !findPlaceData.candidates || findPlaceData.candidates.length === 0) {
      return NextResponse.json({ error: 'Place not found on Google' }, { status: 404 });
    }

    const placeId = findPlaceData.candidates[0].place_id;

    // 2단계: Place ID로 장소 상세 정보(사진) 요청
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${GOOGLE_API_KEY}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData: GooglePlaceDetailsResponse = await detailsRes.json();

    if (detailsData.status !== 'OK' || !detailsData.result.photos) {
      return NextResponse.json({ error: 'No photos found' }, { status: 404 });
    }

    // 3단계: 사진 참조(photo_reference)를 실제 이미지 URL로 변환하여 반환
    const photoUrls = detailsData.result.photos.slice(0, 3).map(photo => 
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`
    );

    return NextResponse.json({ photos: photoUrls });

  } catch (error) {
    console.error('Google API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch details from Google API' }, { status: 500 });
  }
}
