const allNFTs: NFT[] = Array(12).fill(null).map((_, index) => ({
  id: index + 1,
  tokenId: (index + 1234).toString(),
  name: `Ordinal #${(index + 1234).toString()}`,
  image: 'https://i0.wp.com/techtunestales.com/wp-content/uploads/2023/08/gojo-six-eyes.png?fit=1730%2C966&ssl=1',
  price: `${(0.5 + index * 0.1).toFixed(1)} CORE`,
  creator: `0x${(index + 1234).toString(16)}...${(index + 5678).toString(16)}`,
  isListed: Math.random() > 0.5,
  metadata: {
    inscriptionId: `${(index + 9999).toString(16)}i0`,
    inscriptionNumber: index + 1000,
    contentType: 'image/png',
    contentLength: 10000,
    satOrdinal: '12345',
    satRarity: 'common',
    genesisTimestamp: Date.now() - 1000000,
    bridgeTimestamp: Date.now() - 500000
  }
})); 