import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { place_name, address_name } = req.query;

  if (!place_name || !address_name) {
    return res.status(400).json({ error: '장소 이름과 주소가 필요합니다.' });
  }

  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

  if (!GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'Google API 키가 설정되지 않았습니다.' });
  }

  try {
    // 1. Google Places API로 장소 검색 (Find Place)
    // 카카오에서 받은 장소 이름과 주소를 이용해 Google Place ID를 찾습니다.
    const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(place_name)}&inputtype=textquery&fields=place_id&language=ko&key=${GOOGLE_API_KEY}`;
    const findPlaceResponse = await fetch(findPlaceUrl);
    const findPlaceData = await findPlaceResponse.json();
    
    if (!findPlaceData.candidates || findPlaceData.candidates.length === 0) {
      return res.status(404).json({ error: '구글에서 해당 장소를 찾을 수 없습니다.' });
    }
    
    const placeId = findPlaceData.candidates[0].place_id;

    // 2. Google Places API로 상세정보 요청 (Place Details)
    // 찾은 place_id를 이용해 상세정보를 가져옵니다.
    const placeDetailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,formatted_address,formatted_phone_number,opening_hours/weekday_text&language=ko&key=${GOOGLE_API_KEY}`;
    const placeDetailResponse = await fetch(placeDetailUrl);
    const placeDetailData = await placeDetailResponse.json();

    if (placeDetailData.status !== 'OK') {
      return res.status(404).json({ error: '상세 정보를 가져오는 데 실패했습니다.' });
    }

    // 3. 필요한 정보만 정리하여 응답
    const result = {
      name: placeDetailData.result.name,
      rating: placeDetailData.result.rating || '정보 없음',
      formatted_address: placeDetailData.result.formatted_address,
      formatted_phone_number: placeDetailData.result.formatted_phone_number,
      opening_hours: placeDetailData.result.opening_hours,
    };
    
    res.status(200).json(result);

  } catch (error) {
    console.error('API 호출 중 오류 발생:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
