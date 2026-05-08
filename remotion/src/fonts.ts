import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

export const anton = loadAnton("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const inter = loadInter("normal", { weights: ["400", "700", "900"], subsets: ["latin"] }).fontFamily;
