/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'ui-avatars.com',
            },
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
            {
                protocol: 'https',
                hostname: 'www.gstatic.com',
            },
            {
                protocol: 'https',
                hostname: 'www.google.com',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com', // For Google profile images
            },
            {
                protocol: 'https',
                hostname: 'avatars.githubusercontent.com', // For GitHub profile images
            }
        ],
    },
};

export default nextConfig;
