export const callProvider = async (provider: string, init: RequestInit, body: any): Promise<Response> => {
  let targetUrl = 'http://localhost:20128/v1/chat/completions';
  const modifiedInit = {
    ...init,
    body: JSON.stringify(body),
    headers: {
      ...init.headers,
      'Content-Type': 'application/json',
    }
  };
  return fetch(targetUrl, modifiedInit);
};
