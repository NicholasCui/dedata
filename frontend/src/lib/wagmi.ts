import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  polygon,
} from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'DeData Protocol',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '2c9f3b7e8a5d1f6e4c2a9b7d5e3f1a8c',
  chains: [polygon],
  ssr: true,
});

// Set Polygon as the initial chain
export const initialChain = polygon;