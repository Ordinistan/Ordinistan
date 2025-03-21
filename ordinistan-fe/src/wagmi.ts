import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  coreDao,
  sepolia,
} from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'RainbowKit App',
  projectId: 'YOUR_PROJECT_ID',
  chains: [
    coreDao,
    sepolia,
  ],
  ssr: true,
});
