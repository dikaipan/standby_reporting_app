// services/speedtest.ts
export interface SpeedTestResult {
  ping: number;        // ms
  download: number;    // Mbps
  upload: number;      // Mbps
  timestamp: string;
}

export const measurePing = async (): Promise<number> => {
  const pingUrls = [
    'https://1.1.1.1/cdn-cgi/trace',
    'https://www.google.com/generate_204',
  ];

  for (const url of pingUrls) {
    try {
      const start = Date.now();
      await fetch(`${url}?t=${start}`, { method: 'HEAD', cache: 'no-store' });
      const elapsed = Date.now() - start;
      if (elapsed > 0 && elapsed < 5000) {
        return elapsed;
      }
    } catch {
      continue;
    }
  }

  try {
    const start = Date.now();
    await fetch(`https://www.google.com/generate_204?t=${start}`, { cache: 'no-store' });
    return Math.max(1, Date.now() - start);
  } catch {
    return 999;
  }
};

/**
 * Multi-stream parallel download test (3 simultaneous connections)
 * Saturates connection bandwidth matching native speedtest engines.
 */
export const measureDownload = async (
  onProgress?: (mbps: number) => void,
): Promise<number> => {
  const numStreams = 3;
  const chunkSize = 5_000_000; // 5MB per stream = 15MB total capacity
  const startTime = Date.now();
  const loadedPerStream = new Array(numStreams).fill(0);

  const downloadStream = (index: number): Promise<number> => {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const url = `https://speed.cloudflare.com/__down?bytes=${chunkSize}&t=${Date.now()}_${index}`;

      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';

      xhr.onprogress = (e) => {
        if (e.loaded > 0) {
          loadedPerStream[index] = e.loaded;
          const totalLoaded = loadedPerStream.reduce((a, b) => a + b, 0);
          const elapsed = (Date.now() - startTime) / 1000;
          if (elapsed > 0) {
            const currentMbps = (totalLoaded * 8) / (elapsed * 1_000_000);
            onProgress?.(Math.round(currentMbps * 10) / 10);
          }
        }
      };

      xhr.onload = () => {
        const bytes = xhr.response ? (xhr.response as ArrayBuffer).byteLength : (loadedPerStream[index] || chunkSize);
        loadedPerStream[index] = bytes;
        resolve(bytes);
      };

      xhr.onerror = () => resolve(loadedPerStream[index]);
      xhr.timeout = 12000;
      xhr.ontimeout = () => resolve(loadedPerStream[index]);

      xhr.send();
    });
  };

  const results = await Promise.all([
    downloadStream(0),
    downloadStream(1),
    downloadStream(2),
  ]);

  const totalBytes = results.reduce((a, b) => a + b, 0);
  const totalElapsed = (Date.now() - startTime) / 1000;
  const finalMbps = totalElapsed > 0 ? (totalBytes * 8) / (totalElapsed * 1_000_000) : 0;
  return Math.max(0.1, Math.round(finalMbps * 10) / 10);
};

/**
 * Multi-stream parallel upload test (2 simultaneous connections)
 */
export const measureUpload = async (
  onProgress?: (mbps: number) => void,
): Promise<number> => {
  const numStreams = 2;
  const payloadSize = 300_000; // 300KB per stream
  const startTime = Date.now();
  const loadedPerStream = new Array(numStreams).fill(0);

  const uploadStream = (index: number): Promise<number> => {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const url = `https://speed.cloudflare.com/__up?t=${Date.now()}_${index}`;
      const payload = new Uint8Array(payloadSize).fill(65);

      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');

      if (xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.loaded > 0) {
            loadedPerStream[index] = e.loaded;
            const totalLoaded = loadedPerStream.reduce((a, b) => a + b, 0);
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed > 0) {
              const currentMbps = (totalLoaded * 8) / (elapsed * 1_000_000);
              onProgress?.(Math.round(currentMbps * 10) / 10);
            }
          }
        };
      }

      xhr.onload = () => {
        loadedPerStream[index] = payloadSize;
        resolve(payloadSize);
      };

      xhr.onerror = () => resolve(loadedPerStream[index]);
      xhr.timeout = 10000;
      xhr.ontimeout = () => resolve(loadedPerStream[index]);

      xhr.send(payload);
    });
  };

  const results = await Promise.all([
    uploadStream(0),
    uploadStream(1),
  ]);

  const totalBytes = results.reduce((a, b) => a + b, 0);
  const totalElapsed = (Date.now() - startTime) / 1000;
  const finalMbps = totalElapsed > 0 ? (totalBytes * 8) / (totalElapsed * 1_000_000) : 0;
  return Math.max(0.1, Math.round(finalMbps * 10) / 10);
};

export const runFullSpeedTest = async (
  onPingDone?: (ping: number) => void,
  onDownloadProgress?: (mbps: number) => void,
  onDownloadDone?: (mbps: number) => void,
  onUploadProgress?: (mbps: number) => void,
  onUploadDone?: (mbps: number) => void,
): Promise<SpeedTestResult> => {
  const ping = await measurePing();
  onPingDone?.(ping);

  const download = await measureDownload(onDownloadProgress);
  onDownloadDone?.(download);

  const upload = await measureUpload(onUploadProgress);
  onUploadDone?.(upload);

  return {
    ping,
    download,
    upload,
    timestamp: new Date().toISOString(),
  };
};

export const getNetworkStatus = (ping: number, download: number): 'good' | 'bad' => {
  if (ping > 200 || download < 5) return 'bad';
  return 'good';
};

export const getCurrentTimeFormatted = (): string => {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}.${m}`;
};
