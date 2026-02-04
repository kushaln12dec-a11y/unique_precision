/**
 * Get current date and time in IST (Indian Standard Time) format
 * Returns: DD/MM/YYYY HH:MM
 */
export const getCurrentISTDateTime = (): string => {
  const now = new Date();
  
  // IST is UTC+5:30
  // Get UTC time in milliseconds
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  
  // Add IST offset (5 hours 30 minutes = 5.5 * 60 * 60 * 1000 milliseconds)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(utcTime + istOffset);
  
  const pad = (n: number) => n.toString().padStart(2, "0");
  
  const day = pad(istTime.getUTCDate());
  const month = pad(istTime.getUTCMonth() + 1);
  const year = istTime.getUTCFullYear();
  const hours = pad(istTime.getUTCHours());
  const minutes = pad(istTime.getUTCMinutes());
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};
  