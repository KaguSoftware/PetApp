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
import { createPost, fetchPosts, familyLabel, relativeTime, speciesEmoji, type ForumCategory, type ForumPost } from "@/lib/forum";
import { isCaregiverRole } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cardShadow, colors, font, radius } from "@/lib/theme";

type SortKey = "top" | "new";

/**
 * One question card in the feed. Only the header/title/body region opens the
 * post — the footer stays outside the Pressable because it holds VoteControl,
 * and nesting that inside the card's press region meant an upvote navigated to
 * the post instead of voting (and discarded the optimistic score on the way).
 */
function PostCard({ post, onPress }: { post: ForumPost; onPress: () => void }) {
  return (
    <View style={styles.card}>
      <PressableScale onPress={onPress} accessibilityRole="button">
        <View style={styles.cardHeader}>
          {post.isCaregiverAd ? (
            <Chip style={[styles.breedChipWrap, styles.adChip]}>
              <Text style={[styles.breedChip, styles.adChipLabel]} numberOfLines={1}>
                🤝 Caregiving service
              </Text>
            </Chip>
          ) : post.species && post.breed ? (
            <Chip style={styles.breedChipWrap}>
              <Text style={styles.breedChip} numberOfLines={1}>
                {speciesEmoji(post.species)} {post.breed}
              </Text>
            </Chip>
          ) : (
            <View />
          )}
          <Text style={styles.family} numberOfLines={1}>
            {familyLabel(post.authorHouseholdId)}
            {post.authorMemberName ? ` · ${post.authorMemberName}` : ""}
          </Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {post.title}
        </Text>
        {post.body ? (
          <Text style={styles.cardBody} numberOfLines={2}>
            {post.body}
          </Text>
        ) : null}
      </PressableScale>
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
  );
}

export default function Community() {
  const { state, hydrated, toast } = useStore();
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>("top");
  const [category, setCategory] = useState<ForumCategory>("question");
  const [posts, setPosts] = useState<ForumPost[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Compose sheet state (Ask).
  const [composeOpen, setComposeOpen] = useState(false);
  const [petId, setPetId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Compose sheet state (Caregive — pet caregivers advertising their service).
  const currentMember = state.members.find((m) => m.id === state.currentMemberId);
  const canAdvertiseCaregiving = !!currentMember && isCaregiverRole(currentMember.role);
  const [caregiveOpen, setCaregiveOpen] = useState(false);
  const [caregiveTitle, setCaregiveTitle] = useState("");
  const [caregiveBody, setCaregiveBody] = useState("");
  const [caregiveSubmitting, setCaregiveSubmitting] = useState(false);

  const load = useCallback(
    async (nextSort: SortKey, nextCategory: ForumCategory) => {
      try {
        const rows = await fetchPosts(nextSort, nextCategory);
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
      load(sort, category);
    }, [load, sort, category])
  );

  const changeCategory = (c: ForumCategory) => {
    setCategory(c);
    setPosts(null);
    load(sort, c);
  };

  const changeSort = (s: SortKey) => {
    setSort(s);
    setPosts(null);
    load(s, category);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load(sort, category);
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
    // TEMP DEBUG — remove once we've root-caused the null author_member_id issue.
    console.log("[petpal][debug] ask submit — currentMemberId:", state.currentMemberId, "currentMember:", currentMember);
    try {
      await createPost({
        householdId: state.familyId,
        memberId: currentMember?.id ?? null,
        memberName: currentMember?.name ?? null,
        petId: selectedPet.id,
        species: selectedPet.species,
        breed: selectedPet.breed,
        title: title.trim(),
        body: body.trim(),
        category: "question",
      });
      setComposeOpen(false);
      toast("check", "Question posted", "Other families can answer it now");
      await load(sort, category);
    } catch (e) {
      console.error("[petpal] forum post failed:", e);
      toast("alert", "Couldn't post", "That didn't send — try again");
    } finally {
      setSubmitting(false);
    }
  };

  const openCaregive = () => {
    setCaregiveTitle("");
    setCaregiveBody("");
    setCaregiveOpen(true);
  };

  const canSubmitCaregive = caregiveTitle.trim().length > 0 && !caregiveSubmitting;

  const submitCaregive = async () => {
    if (!state.familyId) return;
    setCaregiveSubmitting(true);
    // TEMP DEBUG — remove once we've root-caused the null author_member_id issue.
    console.log("[petpal][debug] caregive submit — currentMemberId:", state.currentMemberId, "currentMember:", currentMember);
    try {
      await createPost({
        householdId: state.familyId,
        memberId: currentMember?.id ?? null,
        memberName: currentMember?.name ?? null,
        petId: null,
        species: null,
        breed: null,
        title: caregiveTitle.trim(),
        body: caregiveBody.trim(),
        category: "pet_care",
        isCaregiverAd: true,
      });
      setCaregiveOpen(false);
      toast("check", "Service posted", "Families looking for care can see it now");
      await load(sort, category);
    } catch (e) {
      console.error("[petpal] forum caregiver post failed:", e);
      toast("alert", "Couldn't post", "That didn't send — try again");
    } finally {
      setCaregiveSubmitting(false);
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

  const caregiveSheet = (
    <Sheet open={caregiveOpen} onClose={() => setCaregiveOpen(false)}>
      <SheetTitle>Advertise your caregiving service</SheetTitle>
      <SheetSubtitle>Shown under Pet care, tagged so families know it&apos;s a service offer.</SheetSubtitle>

      <FieldLabel>Title</FieldLabel>
      <TextField
        value={caregiveTitle}
        onChangeText={setCaregiveTitle}
        placeholder="e.g. Weekday dog walks in the downtown area"
        returnKeyType="next"
        maxLength={200}
      />

      <FieldLabel>Description</FieldLabel>
      <TextField
        value={caregiveBody}
        onChangeText={setCaregiveBody}
        placeholder="Tell families what you offer, your availability, and rates…"
        multiline
        style={styles.multiline}
        maxLength={5000}
      />

      <SheetFooter>
        <AccentButton disabled={!canSubmitCaregive} loading={caregiveSubmitting} onPress={submitCaregive}>
          Post service
        </AccentButton>
      </SheetFooter>
    </Sheet>
  );

  const emptyCopy =
    category === "question"
      ? { title: "No questions yet", body: "Be the first to ask the community about your pet.", cta: "Ask a question" }
      : { title: "No pet care posts yet", body: "Share pet-care advice, or advertise your caregiving service.", cta: "Ask a question" };

  return (
    <TabScreen
      title="Community"
      subtitle="Ask other pet families for advice"
      trailing={<HeaderActions />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.label3} />}
    >
      <View style={styles.categoryRow}>
        <CategoryTab label="Questions" active={category === "question"} onPress={() => changeCategory("question")} />
        <CategoryTab label="Pet care" active={category === "pet_care"} onPress={() => changeCategory("pet_care")} />
      </View>

      <View style={styles.controls}>
        <View style={styles.sortRow}>
          <SortTab label="Top" active={sort === "top"} onPress={() => changeSort("top")} />
          <SortTab label="New" active={sort === "new"} onPress={() => changeSort("new")} />
        </View>
        <View style={styles.actionRow}>
          {canAdvertiseCaregiving ? (
            <PressableScale onPress={openCaregive} accessibilityRole="button" accessibilityLabel="Advertise your caregiving service">
              <View style={styles.caregiveButton}>
                <Icon name="plus" size={16} color={colors.accent} />
                <Text style={styles.caregiveLabel}>Caregive</Text>
              </View>
            </PressableScale>
          ) : null}
          <PressableScale onPress={openCompose} accessibilityRole="button" accessibilityLabel="Ask a question">
            <View style={styles.askButton}>
              <Icon name="plus" size={16} color={colors.white} />
              <Text style={styles.askLabel}>Ask</Text>
            </View>
          </PressableScale>
        </View>
      </View>

      {!hydrated || posts === null ? (
        <PageLoading />
      ) : posts.length === 0 ? (
        <View style={{ marginTop: 8 }}>
          <EmptyState icon="people" title={emptyCopy.title} body={emptyCopy.body} cta={emptyCopy.cta} onCta={openCompose} />
        </View>
      ) : (
        <View style={styles.feed}>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onPress={() => router.push(`/(tabs)/community/${p.id}`)} />
          ))}
        </View>
      )}

      {composeSheet}
      {caregiveSheet}
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

function CategoryTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <View style={[styles.categoryTab, active && styles.categoryTabActive]}>
        <Text style={[styles.categoryTabLabel, active && styles.categoryTabLabelActive]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  categoryRow: { marginTop: 12, flexDirection: "row", gap: 8 },
  categoryTab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.full, backgroundColor: colors.fill },
  categoryTabActive: { backgroundColor: colors.accent },
  categoryTabLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.label2 },
  categoryTabLabelActive: { color: colors.white },
  controls: { marginTop: 10, marginBottom: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sortRow: { flexDirection: "row", gap: 8 },
  sortTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.fill },
  sortTabActive: { backgroundColor: colors.accentSoft },
  sortTabLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.label2 },
  sortTabLabelActive: { color: colors.accent },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  askButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.accent },
  askLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.white },
  caregiveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
  },
  caregiveLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.accent },
  feed: { marginTop: 8, gap: 10 },
  card: { borderRadius: radius.lg, backgroundColor: colors.card, padding: 14, overflow: "hidden", ...cardShadow },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  // The chip yields first and the family label holds its width where there's
  // room — but the family label can also shrink (with ellipsis) as a last
  // resort so a long household name truncates inside the card instead of
  // spilling past its edge, where a rounded-corner screen clips it.
  breedChipWrap: { flexShrink: 1, minWidth: 0 },
  breedChip: { fontSize: 12, fontFamily: font.medium, color: colors.label2, flexShrink: 1 },
  adChip: { backgroundColor: colors.accentSoft },
  adChipLabel: { color: colors.accent, fontFamily: font.semibold },
  family: { fontSize: 12, fontFamily: font.medium, color: colors.label3, flexShrink: 1, minWidth: 0 },
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
