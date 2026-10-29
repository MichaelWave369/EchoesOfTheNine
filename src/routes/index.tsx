import { createFileRoute } from "@tanstack/react-router";
import { GameApp } from "../game/ui/GameApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <GameApp />;
}
