import React, { useState, useCallback } from 'react';
import { useBitcoinWallet } from '../utils/BitcoinWalletContext';

const InscribePage: React.FC = () => {
  const { isConnected, inscribe } = useBitcoinWallet();
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState('text/plain');
  const [isInscribing, setIsInscribing] = useState(false);
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setSelectedFile(file);
    setContentType(file.type);
    
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Content = base64String.split(',')[1];
      setContent(base64Content);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleInscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setIsInscribing(true);
      setError('');
      const inscriptionTxId = await inscribe(content, contentType, !!selectedFile);
      setTxId(inscriptionTxId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to inscribe');
    } finally {
      setIsInscribing(false);
    }
  };

  const handleReset = () => {
    setContent('');
    setContentType('text/plain');
    setSelectedFile(null);
    setPreviewUrl(null);
    setTxId('');
    setError('');
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-gray-600 mb-6">
            Please connect your Xverse wallet to create inscriptions
          </p>
          <div className="animate-pulse">
            <svg
              className="w-16 h-16 mx-auto text-gray-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-5xl font-bold mt-14 text-center mb-2 bg-gradient-to-r from-[#F4A460] via-[#E85D75] to-[#9370DB] text-transparent bg-clip-text">
        Create Inscription
      </h1>
      <p className="text-gray-400 text-center mb-12">
        Create your Bitcoin Ordinals inscription seamlessly
      </p>

      <div className="bg-[#1A1A1A] rounded-lg p-8">
        <form onSubmit={handleInscribe} className="space-y-6">
          <div className="space-y-6">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => {
                  setContentType(e.target.value);
                  if (selectedFile) {
                    handleReset();
                  }
                }}
                className="w-full p-3 rounded-md bg-[#2A2A2A] border border-gray-600 text-gray-200 focus:outline-none focus:border-blue-500"
              >
                <option value="text/plain">Plain Text</option>
                <option value="text/html">HTML</option>
                <option value="application/json">JSON</option>
                <option value="image/png">Image</option>
              </select>
            </div>

            {contentType.startsWith('image/') ? (
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Upload Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full p-3 rounded-md bg-[#2A2A2A] border border-gray-600 text-gray-200 focus:outline-none focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                />
                <p className="mt-2 text-sm text-gray-400">
                  Supported formats: PNG, JPEG, GIF, WEBP
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-3 rounded-md bg-[#2A2A2A] border border-gray-600 text-gray-200 focus:outline-none focus:border-blue-500 h-32 font-mono"
                  placeholder={isConnected ? `Enter your ${contentType.split('/')[1]} content here...` : "Connect wallet to create inscription"}
                  required
                  disabled={!isConnected}
                />
              </div>
            )}

            {error && (
              <div className="text-red-500 text-sm p-3 rounded-md bg-red-500/10 border border-red-500/20">
                {error}
              </div>
            )}

            {txId && (
              <div className="text-green-500 text-sm p-3 rounded-md bg-green-500/10 border border-green-500/20">
                <p className="font-medium">Inscription created!</p>
                <p className="break-all mt-1">Transaction ID: {txId}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!isConnected || isInscribing || (!content && !selectedFile)}
              className={`w-full p-3 rounded-md font-medium text-white ${
                (!isConnected || isInscribing || (!content && !selectedFile))
                  ? 'opacity-50 cursor-not-allowed bg-gray-600'
                  : 'bg-gradient-to-r from-[#F4A460] via-[#E85D75] to-[#9370DB] hover:opacity-90'
              }`}
            >
              {isInscribing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Inscription...
                </span>
              ) : (
                'Create Inscription'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InscribePage; 