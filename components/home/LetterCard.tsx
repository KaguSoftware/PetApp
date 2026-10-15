import { Card, Text } from "@/ui";

/** Gentle "letter from the pet" shown after a quiet day or more. Never an alarm. */
export function LetterCard({ line }: { line: string }) {
  return (
    <Card tone="peach" accessibilityLabel={line}>
      <Text variant="bodyStrong">{line}</Text>
    </Card>
  );
}
