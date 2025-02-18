interface RawRequest {
    path: string;
    method: string;
    query: string | null;
    body: any | null;
  }