import { useLocalSearchParams } from "expo-router";
import { AddRecordForm, isAddKind } from "@/components/pet/AddForms";
import { SheetScreen } from "@/ui";

export default function AddRecordSheet() {
  const params = useLocalSearchParams<{ id: string | string[]; record: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const record = Array.isArray(params.record) ? params.record[0] : params.record;
  if (!id || !isAddKind(record)) return <SheetScreen title="Add record">{null}</SheetScreen>;
  return <AddRecordForm petId={id} kind={record} />;
}
