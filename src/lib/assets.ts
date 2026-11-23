/** Chemin d'un fichier de public/ qui reste correct quel que soit le chemin de base du déploiement. */
export const asset = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
