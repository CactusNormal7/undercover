/** Les `.csv` sont embarqués comme modules texte (cf. `rules` dans wrangler.jsonc). */
declare module '*.csv' {
  const content: string;
  export default content;
}
