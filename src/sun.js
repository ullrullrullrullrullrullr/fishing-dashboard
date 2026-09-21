const RAD = Math.PI / 180;
const pad = (n) => String(n).padStart(2, '0');

function jdToJst(jd) {
  const d = new Date((jd - 2440587.5) * 86400000 + 9 * 3600000);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function sunTimes(dateStr, lat, lon) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const jd0 = Date.UTC(y, m - 1, d) / 86400000 + 2440587.5;
  const n = Math.ceil(jd0 - 2451545.0 + 0.0008);
  const jStar = n - lon / 360;
  const M = (((357.5291 + 0.98560028 * jStar) % 360) + 360) % 360;
  const C =
    1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const jTransit =
    2451545.0 + jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD);
  const sinDec = Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH =
    (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * sinDec) / (Math.cos(lat * RAD) * cosDec);
  if (cosH > 1 || cosH < -1) return null;
  const hourAngle = Math.acos(cosH) / RAD;
  return {
    sunrise: jdToJst(jTransit - hourAngle / 360),
    sunset: jdToJst(jTransit + hourAngle / 360),
  };
}
