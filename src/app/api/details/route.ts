import { NextResponse } from 'next/server';

// Google Places API 응답 타입을 명확하게 정의합니다.
interface GooglePhoto {
  photo_reference: string;
}

interface GoogleOpeningHours {
  open_now: boolean;
  weekday_text?: string[];
}

interface GooglePlace {
  url?: string;
  photos?: GooglePhoto[];
  rating?: number;
  opening_hours?: GoogleOpeningHours;
  formatted_phone_number?: string;
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
  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ error: 'Google API key is not configured' }, { status: 500 });
  }

  try {
    const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery&fields=place_id&locationbias=point:${lat},${lng}&key=${GOOGLE_API_KEY}`;
    
    const findPlaceRes = await fetch(findPlaceUrl);
    const findPlaceData: GoogleFindPlaceResponse = await findPlaceRes.json();

    if (findPlaceData.status !== 'OK' || !findPlaceData.candidates || findPlaceData.candidates.length === 0) {
      return NextResponse.json({ error: 'Place not found on Google' }, { status: 404 });
    }

    const placeId = findPlaceData.candidates[0].place_id;

    const fields = 'url,photos,rating,opening_hours,formatted_phone_number';
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}&language=ko`;
    
    const detailsRes = await fetch(detailsUrl);
    const detailsData: GooglePlaceDetailsResponse = await detailsRes.json();

    if (detailsData.status !== 'OK' || !detailsData.result) {
      return NextResponse.json({ error: 'No details found' }, { status: 404 });
    }

    const { result } = detailsData;

    // (수정!) .slice(0, 3)을 제거하여 모든 사진 URL을 가져옵니다.
    const photoUrls = result.photos ? result.photos.map(photo => 
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`
    ) : [];

    return NextResponse.json({
      url: result.url,
      photos: photoUrls,
      rating: result.rating,
      opening_hours: result.opening_hours,
      phone: result.formatted_phone_number,
    });

  } catch (error) {
    console.error('Google API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch details from Google API' }, { status: 500 });
  }
}

