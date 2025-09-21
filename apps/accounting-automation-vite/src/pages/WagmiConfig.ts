import { createConfig, http } from "wagmi";
import { mainnet, polygon, optimism, arbitrum } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

// 👇 apna projectId WalletConnect ke liye (get from https://cloud.walletconnect.com)
const projectId = "2136f5f8d1d986ba874727234220f330";

export const config = createConfig({
  chains: [mainnet, polygon, optimism, arbitrum],
  connectors: [
    injected({ shimDisconnect: true }),
    walletConnect({ projectId }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
  },
});
