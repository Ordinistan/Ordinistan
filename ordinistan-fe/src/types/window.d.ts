interface XverseProvider {
  request: (args: {
    method: string;
    params?: any;
  }) => Promise<any>;
}

declare global {
  interface Window {
    bitcoin?: XverseProvider;
  }
}

export {}; 