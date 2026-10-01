export function getTimeAgo(date: Date | string): string {
  const now = new Date();
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return "fecha desconocida";
  }

  const seconds = Math.floor(
    (now.getTime() - dateObj.getTime()) / 1000
  );

  if (seconds < 60) {
    return "hace unos segundos";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  }

  const days = Math.floor(hours / 24);

  if (days < 30) {
    return `hace ${days} ${days === 1 ? "día" : "días"}`;
  }

  const months = Math.floor(days / 30);

  if (months < 12) {
    return `hace ${months} ${months === 1 ? "mes" : "meses"}`;
  }

  const years = Math.floor(days / 365);

  return `hace ${years} ${years === 1 ? "año" : "años"}`;
}