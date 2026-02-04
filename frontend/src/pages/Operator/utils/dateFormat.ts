/**
 * Format date string to readable format
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return "—";
  const parsed = new Date(dateString);
  if (isNaN(parsed.getTime())) return dateString || "—";
  const day = parsed.getDate().toString().padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[parsed.getMonth()];
  const year = parsed.getFullYear();
  const hours = parsed.getHours().toString().padStart(2, "0");
  const minutes = parsed.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes}`;
};
