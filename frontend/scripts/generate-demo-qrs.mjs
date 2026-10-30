import { mkdir, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';

const baseUrl = process.env.DEMO_PUBLIC_URL;
const viewerCode = process.env.DEMO_VIEWER_CODE;
const managerCode = process.env.DEMO_MANAGER_CODE;

if (!baseUrl || !viewerCode || !managerCode) {
  throw new Error('Set DEMO_PUBLIC_URL, DEMO_VIEWER_CODE, and DEMO_MANAGER_CODE.');
}

await mkdir('demo-qrs', { recursive: true });

for (const [role, code] of [['viewer', viewerCode], ['manager', managerCode]]) {
  const url = `${baseUrl.replace(/\/$/, '')}/demo/${role}?code=${encodeURIComponent(code)}`;
  await writeFile(`demo-qrs/demo-${role}.svg`, await QRCode.toString(url, { type: 'svg', margin: 2 }));
  console.log(`${role}: ${url}`);
}
