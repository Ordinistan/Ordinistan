import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-core-primary to-core-secondary 
                        bg-clip-text text-transparent mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-core-muted mb-8">Please connect your wallet to view your portfolio</p>
          <div className="inline-block">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute; 