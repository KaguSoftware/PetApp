import type { IllustrationId } from "@/content/guide";
import { Body } from "./Body";
import { Brush } from "./Brush";
import { Coat } from "./Coat";
import { Nail } from "./Nail";
import { Portion } from "./Portion";
import { Vet } from "./Vet";

/** Explicit dispatch: an id without a branch renders nothing, never someone else's picture. */
export function GuideIllustration({ id }: { id: IllustrationId }) {
  switch (id) {
    case "body":
      return <Body />;
    case "brush":
      return <Brush />;
    case "nail":
      return <Nail />;
    case "coat":
      return <Coat />;
    case "portion":
      return <Portion />;
    case "vet":
      return <Vet />;
  }
}
