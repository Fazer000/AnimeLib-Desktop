/** Подсвечивает закладку в пределах минуты от сохранённой позиции. */
export default function isNearBookmark(
  time: number,
  bookmarkTime: number | null,
): boolean {
  return (
    bookmarkTime !== null &&
    Number.isFinite(bookmarkTime) &&
    Math.abs(time - bookmarkTime) <= 60
  );
}
