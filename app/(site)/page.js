import PpcPageClient from "./PpcPageClient";
import { getPpcPageData } from "../lib/ppc-functions";

export default async function Home() {
  const { lib, lotm, courses } = await getPpcPageData();
  return <PpcPageClient lib={lib} lotm={lotm} courses={courses} />;
}
