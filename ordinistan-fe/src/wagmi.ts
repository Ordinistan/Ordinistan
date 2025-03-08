import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  coreDao,
} from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'RainbowKit App',
  projectId: 'YOUR_PROJECT_ID',
  chains: [
    coreDao,
  ],
  ssr: true,
});
