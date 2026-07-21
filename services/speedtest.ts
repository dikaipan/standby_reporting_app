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

  // Fallback GET measurement
  try {
    const start = Date.now();
    await fetch(`https://www.google.com/generate_204?t=${start}`, { cache: 'no-store' });
    return Math.max(1, Date.now() - start);
  } catch {
    return 999;
  }
};

export const measureDownload = async (
  onProgress?: (mbps: number) => void,
): Promise<number> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // 5MB Cloudflare test payload
    const testUrl = `https://speed.cloudflare.com/__down?bytes=5000000&t=${Date.now()}`;
    const startTime = Date.now();
    let loadedBytes = 0;

    xhr.open('GET', testUrl, true);
    xhr.responseType = 'arraybuffer';

    xhr.onprogress = (event) => {
      loadedBytes = event.loaded;
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed > 0 && event.loaded > 0) {
        const currentMbps = (event.loaded * 8) / (elapsed * 1_000_000);
        onProgress?.(Math.round(currentMbps * 10) / 10);
      }
    };

    xhr.onload = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const bytes = xhr.response ? (xhr.response as ArrayBuffer).byteLength : (loadedBytes || 5_000_000);
      const finalMbps = elapsed > 0 ? (bytes * 8) / (elapsed * 1_000_000) : 0;
      resolve(Math.max(0.1, Math.round(finalMbps * 10) / 10));
    };

    xhr.onerror = async () => {
      // Real measurement fallback using fetch blob
      try {
        const start = Date.now();
        const res = await fetch(`https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png?t=${start}`);
        const blob = await res.blob();
        const elapsed = (Date.now() - start) / 1000;
        if (elapsed > 0 && blob.size > 0) {
          const mbps = (blob.size * 8) / (elapsed * 1_000_000);
          resolve(Math.max(0.1, Math.round(mbps * 10) / 10));
        } else {
          reject(new Error('Gagal mengukur download'));
        }
      } catch (err) {
        reject(err);
      }
    };

    xhr.timeout = 15000;
    xhr.ontimeout = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (loadedBytes > 0 && elapsed > 0) {
        const mbps = (loadedBytes * 8) / (elapsed * 1_000_000);
        resolve(Math.max(0.1, Math.round(mbps * 10) / 10));
      } else {
        reject(new Error('Timeout mengukur download'));
      }
    };

    xhr.send();
  });
};

export const measureUpload = async (
  onProgress?: (mbps: number) => void,
): Promise<number> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const testUrl = 'https://speed.cloudflare.com/__up';
    const startTime = Date.now();

    // 500KB real payload
    const payloadSize = 500_000;
    const payload = new Uint8Array(payloadSize).fill(65);

    xhr.open('POST', testUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');

    let lastLoaded = 0;
    if (xhr.upload) {
      xhr.upload.onprogress = (event) => {
        lastLoaded = event.loaded;
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed > 0 && event.loaded > 0) {
          const mbps = (event.loaded * 8) / (elapsed * 1_000_000);
          onProgress?.(Math.round(mbps * 10) / 10);
        }
      };
    }

    xhr.onload = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const mbps = elapsed > 0 ? (payloadSize * 8) / (elapsed * 1_000_000) : 0;
      resolve(Math.max(0.1, Math.round(mbps * 10) / 10));
    };

    xhr.onerror = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (lastLoaded > 0 && elapsed > 0) {
        const mbps = (lastLoaded * 8) / (elapsed * 1_000_000);
        resolve(Math.max(0.1, Math.round(mbps * 10) / 10));
      } else {
        // Real upload to httpbin as fallback
        const start = Date.now();
        fetch('https://httpbin.org/post', {
          method: 'POST',
          body: new Uint8Array(200_000).fill(65),
        })
          .then(() => {
            const el = (Date.now() - start) / 1000;
            const mb = el > 0 ? (200_000 * 8) / (el * 1_000_000) : 0;
            resolve(Math.max(0.1, Math.round(mb * 10) / 10));
          })
          .catch(() => reject(new Error('Gagal mengukur upload')));
      }
    };

    xhr.timeout = 15000;
    xhr.ontimeout = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (lastLoaded > 0 && elapsed > 0) {
        const mbps = (lastLoaded * 8) / (elapsed * 1_000_000);
        resolve(Math.max(0.1, Math.round(mbps * 10) / 10));
      } else {
        reject(new Error('Timeout mengukur upload'));
      }
    };

    xhr.send(payload);
  });
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
