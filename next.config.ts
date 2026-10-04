import type { NextConfig } from 'next';
const config: NextConfig = {
    allowedDevOrigins: ['192.168.1.82'],
    images: {
        remotePatterns: [{ protocol: 'https', hostname: 'avatars.githubusercontent.com' }],
    },
};
export default config;
