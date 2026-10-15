import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { LogSheet } from "@/components/log/LogSheet";
import { SheetPanel } from "@/ui";

/**
 * The log sheet, hosted as a transparent-modal route so the tab bar's Log button
 * and Home's big button are both just `router.push("/log")`.
 */
export default function LogScreen() {
  const { petId, step } = useLocalSearchParams<{ petId?: string; step?: string }>();
  const [open, setOpen] = useState(true);
  const close = () => setOpen(false);

  return (
    <SheetPanel open={open} onClose={close} onClosed={() => (router.canGoBack() ? router.back() : router.replace("/home"))}>
      <LogSheet petId={petId} initialStep={step === "weight" || step === "health" || step === "note" ? step : undefined} close={close} />
    </SheetPanel>
  );
}
