import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "urms.io.vn",
    "*.urms.io.vn",
  ],
};
export default withSentryConfig(nextConfig, {
    silent: !process.env.CI,
    disableLogger: true,
});
