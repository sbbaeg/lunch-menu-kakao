/** @type {import('next').NextConfig} */
const nextConfig = {
  // (추가!) 외부 이미지 URL을 사용하기 위한 설정
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
        port: '',
        pathname: '/maps/api/place/photo/**',
      },
    ],
  },
};

export default nextConfig;
