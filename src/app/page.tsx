import { RoundView } from "@/components/round-view";
import type { RoundReport } from "@/lib/types";
import demo from "../../data/demo/report.json";

// The demo replays a saved analysis of the fictional round in data/demo, so visitors spend no credits.
export default function DemoRound() {
  return <RoundView report={demo as RoundReport} />;
}
