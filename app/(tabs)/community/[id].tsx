import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import EmptyState from "@/components/EmptyState";
import PageLoading from "@/components/PageLoading";
import { PushedScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import VoteControl from "@/components/VoteControl";
import {
  AccentButton,
  Chip,
  FieldLabel,
  PressableScale,
  SelectableChip,
  SheetFooter,
  SheetSubtitle,
  SheetTitle,
  TextField,
} from "@/components/ui";
import { createAnswer, deleteAnswer, deletePost, fetchPost, familyLabel, relativeTime, speciesEmoji, type ForumAnswer, type ForumPost } from "@/lib/forum";
import { useStore } from "@/lib/store";
import { cardShadow, colors, font, radius } from "@/lib/theme";

/** One answer card. `onDelete` is provided only when the viewer is the author. */
function AnswerCard({ answer, onDelete }: { answer: ForumAnswer; onDelete?: () => void }) {
  return (
    <View style={styles.answerCard}>
      <View style={styles.answerHeader}>
        <Text style={styles.family}>{familyLabel(answer.authorHouseholdId)}</Text>
        {answer.breed && answer.species ? (
          <Chip>
            <Text style={styles.breedChip}>
              {speciesEmoji(answer.species)} {answer.breed}
            </Text>
          </Chip>
        ) : null}
        <View style={{ flex: 1 }} />
        <Text style={styles.meta}>{relativeTime(answer.createdAt)}</Text>
      </View>
      <Text style={styles.answerBody}>{answer.body}</Text>
      <View style={styles.answerFooter}>
        <VoteControl target={{ answerId: answer.id }} score={answer.score} voted={answer.votedByMe} size="sm" />
        {onDelete ? (
          <>
            <View style={{ flex: 1 }} />
            <DeleteButton onPress={onDelete} accessibilityLabel="Delete answer" />
          </>
        ) : null}
      </View>
    </View>
  );
}

/** Small tappable trash affordance shown only to the author of a post/answer. */
function DeleteButton({ onPress, accessibilityLabel }: { onPress: () => void; accessibilityLabel: string }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} hitSlop={8}>
      <View style={styles.deleteButton}>
        <Icon name="trash" size={16} color={colors.red} />
      </View>
    </PressableScale>
  );
}

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, userId, toast } = useStore();
  const [data, setData] = useState<{ post: ForumPost; answers: ForumAnswer[] } | null | undefined>(undefined);

  // Answer composer.
  const [answerOpen, setAnswerOpen] = useState(false);
  const [petId, setPetId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetchPost(id);
      setData(res);
    } catch (e) {
      console.error("[petpal] forum post load failed:", e);
      setData(null);
      toast("alert", "Couldn't load this question", "Try again in a moment");
    }
  }, [id, toast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openAnswer = () => {
    // Default to "no pet" — answering is optional-pet, unlike posting.
    setPetId(null);
    setBody("");
    setAnswerOpen(true);
  };

  const selectedPet = state.pets.find((p) => p.id === petId) ?? null;
  const canSubmit = body.trim().length > 0 && !submitting;

  const submit = async () => {
    if (!id || !state.familyId || body.trim().length === 0) return;
    setSubmitting(true);
    try {
      await createAnswer({
        postId: id,
        householdId: state.familyId,
        petId: selectedPet?.id ?? null,
        species: selectedPet?.species ?? null,
        breed: selectedPet?.breed ?? null,
        body: body.trim(),
      });
      setAnswerOpen(false);
      toast("check", "Answer posted", "Thanks for helping out");
      await load();
    } catch (e) {
      console.error("[petpal] forum answer failed:", e);
      toast("alert", "Couldn't post", "That didn't send — try again");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeletePost = () => {
    if (!id) return;
    Alert.alert("Delete question", "This removes your question and all its answers. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(id);
            toast("check", "Question deleted");
            router.replace("/(tabs)/community");
          } catch (e) {
            console.error("[petpal] forum delete post failed:", e);
            toast("alert", "Couldn't delete", "Try again in a moment");
          }
        },
      },
    ]);
  };

  const confirmDeleteAnswer = (answerId: string) => {
    Alert.alert("Delete answer", "This removes your answer. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAnswer(answerId);
            toast("check", "Answer deleted");
            await load();
          } catch (e) {
            console.error("[petpal] forum delete answer failed:", e);
            toast("alert", "Couldn't delete", "Try again in a moment");
          }
        },
      },
    ]);
  };

  if (data === undefined) {
    return (
      <PushedScreen title="Question">
        <PageLoading />
      </PushedScreen>
    );
  }

  if (data === null) {
    return (
      <PushedScreen title="Question">
        <View style={{ marginTop: 24 }}>
          <EmptyState icon="alert" title="Question not found" body="It may have been removed." />
          <View style={{ marginTop: 16 }}>
            <AccentButton size="sm" variant="tinted" onPress={() => router.replace("/(tabs)/community")}>
              Back to community
            </AccentButton>
          </View>
        </View>
      </PushedScreen>
    );
  }

  const { post, answers } = data;

  const answerSheet = (
    <Sheet open={answerOpen} onClose={() => setAnswerOpen(false)}>
      <SheetTitle>Write an answer</SheetTitle>
      <SheetSubtitle>Shown with your family ID{state.pets.length > 0 ? " (and pet breed, if you pick one)" : ""}.</SheetSubtitle>

      {state.pets.length > 0 ? (
        <>
          <FieldLabel>Answering about a pet? (optional)</FieldLabel>
          <View style={styles.petChips}>
            <SelectableChip label="No pet" selected={petId === null} onPress={() => setPetId(null)} />
            {state.pets.map((p) => (
              <SelectableChip key={p.id} label={`${speciesEmoji(p.species)} ${p.name}`} selected={p.id === petId} onPress={() => setPetId(p.id)} />
            ))}
          </View>
        </>
      ) : null}

      <FieldLabel>Your answer</FieldLabel>
      <TextField value={body} onChangeText={setBody} placeholder="Share what worked for you…" multiline style={styles.multiline} maxLength={5000} />

      <SheetFooter>
        <AccentButton disabled={!canSubmit} loading={submitting} onPress={submit}>
          Post answer
        </AccentButton>
      </SheetFooter>
    </Sheet>
  );

  return (
    <PushedScreen title="Question">
      {/* Question header */}
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Chip>
            <Text style={styles.breedChip}>
              {speciesEmoji(post.species)} {post.breed}
            </Text>
          </Chip>
          <Text style={styles.family}>{familyLabel(post.authorHouseholdId)}</Text>
        </View>
        <Text style={styles.postTitle}>{post.title}</Text>
        {post.body ? <Text style={styles.postBody}>{post.body}</Text> : null}
        <View style={styles.postFooter}>
          <VoteControl target={{ postId: post.id }} score={post.score} voted={post.votedByMe} />
          <Text style={styles.meta}>{relativeTime(post.createdAt)}</Text>
          {userId && post.authorUserId === userId ? (
            <>
              <View style={{ flex: 1 }} />
              <DeleteButton onPress={confirmDeletePost} accessibilityLabel="Delete question" />
            </>
          ) : null}
        </View>
      </View>

      {/* Answers */}
      <View style={styles.answersHeaderRow}>
        <Text style={styles.answersHeader}>
          {answers.length} {answers.length === 1 ? "answer" : "answers"}
        </Text>
        <PressableScale onPress={openAnswer} accessibilityRole="button">
          <Text style={styles.answerCta}>Answer</Text>
        </PressableScale>
      </View>

      {answers.length === 0 ? (
        <EmptyState icon="people" title="No answers yet" body="Be the first to help this family out." cta="Write an answer" onCta={openAnswer} />
      ) : (
        <View style={styles.answerList}>
          {answers.map((a) => (
            <AnswerCard key={a.id} answer={a} onDelete={userId && a.authorUserId === userId ? () => confirmDeleteAnswer(a.id) : undefined} />
          ))}
        </View>
      )}

      {answerSheet}
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  postCard: { borderRadius: radius.lg, backgroundColor: colors.card, padding: 16, ...cardShadow },
  postHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 },
  breedChip: { fontSize: 12, fontFamily: font.medium, color: colors.label2 },
  family: { fontSize: 12, fontFamily: font.medium, color: colors.label3 },
  postTitle: { fontSize: 19, fontFamily: font.bold, letterSpacing: -0.2, color: colors.label, lineHeight: 25 },
  postBody: { marginTop: 8, fontSize: 15, fontFamily: font.regular, color: colors.label, lineHeight: 21 },
  postFooter: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  meta: { fontSize: 13, fontFamily: font.medium, color: colors.label3 },
  answersHeaderRow: { marginTop: 24, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  answersHeader: { fontSize: 15, fontFamily: font.semibold, color: colors.label },
  answerCta: { fontSize: 15, fontFamily: font.semibold, color: colors.accent },
  answerList: { gap: 10 },
  answerCard: { borderRadius: radius.lg, backgroundColor: colors.card, padding: 14, ...cardShadow },
  answerHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  answerBody: { fontSize: 15, fontFamily: font.regular, color: colors.label, lineHeight: 21 },
  answerFooter: { marginTop: 12, flexDirection: "row", alignItems: "center" },
  petChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  multiline: { minHeight: 100, paddingTop: 12, textAlignVertical: "top" },
  deleteButton: { width: 34, height: 34, borderRadius: radius.full, backgroundColor: colors.redSoft, alignItems: "center", justifyContent: "center" },
});
