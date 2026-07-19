import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import EmptyState from "@/components/EmptyState";
import HeaderActions from "@/components/HeaderActions";
import PageLoading from "@/components/PageLoading";
import { TabScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import VoteControl from "@/components/VoteControl";
import { Icon } from "@/components/Icons";
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
import { createPost, fetchPosts, familyLabel, relativeTime, speciesEmoji, type ForumPost } from "@/lib/forum";
import { useStore } from "@/lib/store";
import { cardShadow, colors, font, radius } from "@/lib/theme";

type SortKey = "top" | "new";

/** One question card in the feed. */
function PostCard({ post, onPress }: { post: ForumPost; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button">
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Chip>
            <Text style={styles.breedChip}>
              {speciesEmoji(post.species)} {post.breed}
            </Text>
          </Chip>
          <Text style={styles.family}>{familyLabel(post.authorHouseholdId)}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {post.title}
        </Text>
        {post.body ? (
          <Text style={styles.cardBody} numberOfLines={2}>
            {post.body}
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          <VoteControl target={{ postId: post.id }} score={post.score} voted={post.votedByMe} size="sm" />
          <View style={styles.metaItem}>
            <Icon name="people" size={14} color={colors.label3} />
            <Text style={styles.meta}>
              {post.answerCount} {post.answerCount === 1 ? "answer" : "answers"}
            </Text>
          </View>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.meta}>{relativeTime(post.createdAt)}</Text>
        </View>
      </View>
    </PressableScale>
  );
}

export default function Community() {
  const { state, hydrated, toast } = useStore();
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>("top");
  const [posts, setPosts] = useState<ForumPost[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Compose sheet state.
  const [composeOpen, setComposeOpen] = useState(false);
  const [petId, setPetId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(
    async (nextSort: SortKey) => {
      try {
        const rows = await fetchPosts(nextSort);
        setPosts(rows);
      } catch (e) {
        console.error("[petpal] forum feed load failed:", e);
        setPosts([]);
        toast("alert", "Couldn't load the forum", "Pull to refresh to try again");
      }
    },
    [toast]
  );

  // Refetch every time the tab regains focus (no realtime in the app).
  useFocusEffect(
    useCallback(() => {
      load(sort);
    }, [load, sort])
  );

  const changeSort = (s: SortKey) => {
    setSort(s);
    setPosts(null);
    load(s);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load(sort);
    setRefreshing(false);
  };

  const openCompose = () => {
    setPetId(state.pets[0]?.id ?? null);
    setTitle("");
    setBody("");
    setComposeOpen(true);
  };

  const selectedPet = state.pets.find((p) => p.id === petId) ?? null;
  const canSubmit = selectedPet != null && title.trim().length > 0 && !submitting;

  const submit = async () => {
    if (!selectedPet || !state.familyId) return;
    setSubmitting(true);
    try {
      await createPost({
        householdId: state.familyId,
        petId: selectedPet.id,
        species: selectedPet.species,
        breed: selectedPet.breed,
        title: title.trim(),
        body: body.trim(),
      });
      setComposeOpen(false);
      toast("check", "Question posted", "Other families can answer it now");
      await load(sort);
    } catch (e) {
      console.error("[petpal] forum post failed:", e);
      toast("alert", "Couldn't post", "That didn't send — try again");
    } finally {
      setSubmitting(false);
    }
  };

  const composeSheet = (
    <Sheet open={composeOpen} onClose={() => setComposeOpen(false)}>
      <SheetTitle>Ask the community</SheetTitle>
      <SheetSubtitle>Your family ID and pet breed are shown — no personal info.</SheetSubtitle>

      {state.pets.length > 0 ? (
        <>
          <FieldLabel>About which pet?</FieldLabel>
          <View style={styles.petChips}>
            {state.pets.map((p) => (
              <SelectableChip key={p.id} label={`${speciesEmoji(p.species)} ${p.name}`} selected={p.id === petId} onPress={() => setPetId(p.id)} />
            ))}
          </View>
          {selectedPet ? <Text style={styles.breedHint}>Posting as a {selectedPet.breed} owner.</Text> : null}

          <FieldLabel>Question</FieldLabel>
          <TextField value={title} onChangeText={setTitle} placeholder="e.g. How much should I feed a 6-month-old?" returnKeyType="next" maxLength={200} />

          <FieldLabel>Details (optional)</FieldLabel>
          <TextField
            value={body}
            onChangeText={setBody}
            placeholder="Add any context that helps others answer…"
            multiline
            style={styles.multiline}
            maxLength={5000}
          />

          <SheetFooter>
            <AccentButton disabled={!canSubmit} loading={submitting} onPress={submit}>
              Post question
            </AccentButton>
          </SheetFooter>
        </>
      ) : (
        <View style={{ marginTop: 16 }}>
          <EmptyState
            icon="paw"
            title="Add a pet first"
            body="Questions are posted about one of your pets, so the community sees the breed. Add a pet on the Pets tab to get started."
          />
        </View>
      )}
    </Sheet>
  );

  return (
    <TabScreen
      title="Community"
      subtitle="Ask other pet families for advice"
      trailing={<HeaderActions />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.label3} />}
    >
      <View style={styles.controls}>
        <View style={styles.sortRow}>
          <SortTab label="Top" active={sort === "top"} onPress={() => changeSort("top")} />
          <SortTab label="New" active={sort === "new"} onPress={() => changeSort("new")} />
        </View>
        <PressableScale onPress={openCompose} accessibilityRole="button" accessibilityLabel="Ask a question">
          <View style={styles.askButton}>
            <Icon name="plus" size={16} color={colors.white} />
            <Text style={styles.askLabel}>Ask</Text>
          </View>
        </PressableScale>
      </View>

      {!hydrated || posts === null ? (
        <PageLoading />
      ) : posts.length === 0 ? (
        <View style={{ marginTop: 8 }}>
          <EmptyState
            icon="people"
            title="No questions yet"
            body="Be the first to ask the community about your pet."
            cta="Ask a question"
            onCta={openCompose}
          />
        </View>
      ) : (
        <View style={styles.feed}>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onPress={() => router.push(`/(tabs)/community/${p.id}`)} />
          ))}
        </View>
      )}

      {composeSheet}
    </TabScreen>
  );
}

function SortTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <View style={[styles.sortTab, active && styles.sortTabActive]}>
        <Text style={[styles.sortTabLabel, active && styles.sortTabLabelActive]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  controls: { marginTop: 12, marginBottom: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sortRow: { flexDirection: "row", gap: 8 },
  sortTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.fill },
  sortTabActive: { backgroundColor: colors.accentSoft },
  sortTabLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.label2 },
  sortTabLabelActive: { color: colors.accent },
  askButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.accent },
  askLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.white },
  feed: { marginTop: 8, gap: 10 },
  card: { borderRadius: radius.lg, backgroundColor: colors.card, padding: 14, ...cardShadow },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  breedChip: { fontSize: 12, fontFamily: font.medium, color: colors.label2 },
  family: { fontSize: 12, fontFamily: font.medium, color: colors.label3 },
  cardTitle: { fontSize: 16, fontFamily: font.semibold, color: colors.label, lineHeight: 21 },
  cardBody: { marginTop: 4, fontSize: 14, fontFamily: font.regular, color: colors.label2, lineHeight: 19 },
  cardFooter: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { fontSize: 13, fontFamily: font.medium, color: colors.label3 },
  dot: { fontSize: 13, color: colors.label3 },
  petChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  breedHint: { marginTop: 8, fontSize: 12, fontFamily: font.medium, color: colors.label3 },
  multiline: { minHeight: 90, paddingTop: 12, textAlignVertical: "top" },
});
