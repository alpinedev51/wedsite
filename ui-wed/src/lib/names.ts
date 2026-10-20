/** Builds the monogram pair from the couple's first names, in the same order
 * the site renders `coupleNames` (groom & bride). Returns empty strings for
 * missing names so a blank slot renders rather than the text "undefined".
 *
 * Lives here rather than beside the Monogram component so that file stays a
 * components-only module (react-refresh/only-export-components). */
export function initialsFrom(
  groomFirstName: string,
  brideFirstName: string,
): [string, string] {
  return [
    groomFirstName.trim().charAt(0).toUpperCase(),
    brideFirstName.trim().charAt(0).toUpperCase(),
  ];
}
