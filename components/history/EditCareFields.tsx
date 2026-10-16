import { StyleSheet, View } from "react-native";
import { DateTimeField, layout, TextField } from "@/ui";

export interface EditCareFieldsValue {
  ts: number;
  note: string;
  grams: string;
  duration: string;
}

export interface EditCareFieldsProps {
  value: EditCareFieldsValue;
  onChange: (v: EditCareFieldsValue) => void;
  showGrams: boolean;
  showDuration: boolean;
  now: number;
}

/** Native date + time pickers (never in the future) plus note / grams / duration inputs for a care log. */
export function EditCareFields({ value, onChange, showGrams, showDuration, now }: EditCareFieldsProps) {
  return (
    <View style={styles.wrap}>
      <DateTimeField value={value.ts} maximumDate={new Date(now)} onChange={(ts) => onChange({ ...value, ts })} />
      {showGrams ? (
        <TextField label="Amount (grams)" keyboardType="number-pad" value={value.grams} onChangeText={(grams) => onChange({ ...value, grams })} />
      ) : null}
      {showDuration ? (
        <TextField
          label="Duration (minutes)"
          keyboardType="number-pad"
          value={value.duration}
          onChangeText={(duration) => onChange({ ...value, duration })}
        />
      ) : null}
      <TextField label="Note" multiline value={value.note} onChangeText={(note) => onChange({ ...value, note })} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: layout.item },
});
