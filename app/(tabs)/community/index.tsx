import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EmptyState from "@/components/EmptyState";
import HeaderActions from "@/components/HeaderActions";
import { TabScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import VoteControl from "@/components/VoteControl";
import { Icon } from "@/components/Icons";
import {
  AccentButton,
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
import { usePullToRefresh } from "@/lib/useRefresh";
import { cardShadow, font, radius, useColors, type Colors } from "@/lib/theme";

type SortKey = "top" | "new";
type ComposeKind = "question" | "service";

/**
 * One post in the feed.
 *
 * Attribution sits on a single meta line above the title (breed · family ·
 * time) rather than split across the card's top corners and its footer — one
 * line of quiet 12pt reads as context, two competing corners read as chrome and
 * left the title fighting for the top of the card.
 *
 * The footer stays OUTSIDE the Pressable on purpose: it holds VoteControl, and
 * nesting that inside the card's press region meant an upvote navigated to the
 * post instead of voting (and threw away the optimistic score on the way).
 */
function PostCard({ post, onPress }: { post: ForumPost; onPress: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const meta = [post.authorMemberName, familyLabel(post.authorHouseholdId), relativeTime(post.createdAt)]
    .filter(Boolean)
    .join(" · ");
  return (
    <View style={styles.card}>
      <PressableScale onPress={onPress} accessibilityRole="button">
        <View style={styles.metaRow}>
          {post.isCaregiverAd ? (
            <View style={styles.adTag}>
              <Text style={styles.adTagLabel}>Offering care</Text>
            </View>
          ) : post.species && post.breed ? (
            <Text style={styles.breed} numberOfLines={1}>
              {speciesEmoji(post.species)} {post.breed}
            </Text>
          ) : null}
          <Text style={styles.metaText} numberOfLines={1}>
            {meta}
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
          <Text style={styles.answers}>
            {post.answerCount} {post.answerCount === 1 ? "answer" : "answers"}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Placeholder cards while a category or sort switch is in flight. The old
 * behaviour blanked the whole feed to a centered spinner, so every filter tap
 * collapsed the page and bounced it back — the skeleton holds the layout still.
 */
function FeedSkeleton() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const pulse = useSharedValue(0.55);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse]);
  // Opacity only — no color interpolation in the worklet.
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <View style={styles.feed} accessibilityLabel="Loading posts">
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.card}>
          <Animated.View style={[styles.skelLine, { width: "45%", height: 11 }, style]} />
          <Animated.View style={[styles.skelLine, { width: "88%", height: 15, marginTop: 12 }, style]} />
          <Animated.View style={[styles.skelLine, { width: "62%", height: 15, marginTop: 7 }, style]} />
          <Animated.View style={[styles.skelLine, { width: "34%", height: 11, marginTop: 16 }, style]} />
        </View>
      ))}
    </View>
  );
}

export default function Community() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { state, hydrated, toast } = useStore();
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>("top");
  const [category, setCategory] = useState<ForumCategory>("question");
  const [posts, setPosts] = useState<ForumPost[] | null>(null);

  // One compose sheet for both post kinds. Caregivers get a type switch at the
  // top; everyone else only ever sees the question form.
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeKind, setComposeKind] = useState<ComposeKind>("question");
  const [petId, setPetId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentMember = state.members.find((m) => m.id === state.currentMemberId);
  const canAdvertiseCaregiving = !!currentMember && isCaregiverRole(currentMember.role);

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

  // Refetch on focus. Forum posts span all households, so they're outside the
  // store's realtime subscriptions (which are household-scoped).
  useFocusEffect(
    useCallback(() => {
      load(sort, category);
    }, [load, sort, category])
  );

  // One gesture refreshes both the forum feed AND the household data behind the
  // header (coins, alerts) — pulling down on any tab should mean the same thing.
  const refreshForum = useCallback(() => load(sort, category), [load, sort, category]);
  const refreshControl = usePullToRefresh(refreshForum);

  const changeCategory = (c: ForumCategory) => {
    setCategory(c);
    setPosts(null);
    load(sort, c);
  };

  const toggleSort = () => {
    const next: SortKey = sort === "top" ? "new" : "top";
    setSort(next);
    setPosts(null);
    load(next, category);
  };

  const openCompose = (kind: ComposeKind = "question") => {
    setComposeKind(canAdvertiseCaregiving ? kind : "question");
    setPetId(state.pets[0]?.id ?? null);
    setTitle("");
    setBody("");
    setComposeOpen(true);
  };

  const selectedPet = state.pets.find((p) => p.id === petId) ?? null;
  const isService = composeKind === "service";
  const canSubmit = title.trim().length > 0 && !submitting && (isService || selectedPet != null);

  const submit = async () => {
    if (!state.familyId || (!isService && !selectedPet)) return;
    setSubmitting(true);
    try {
      await createPost({
        householdId: state.familyId,
        memberId: currentMember?.id ?? null,
        memberName: currentMember?.name ?? null,
        petId: isService ? null : selectedPet!.id,
        species: isService ? null : selectedPet!.species,
        breed: isService ? null : selectedPet!.breed,
        title: title.trim(),
        body: body.trim(),
        category: isService ? "pet_care" : "question",
        ...(isService ? { isCaregiverAd: true } : {}),
      });
      setComposeOpen(false);
      if (isService) toast("check", "Service posted", "Families looking for care can see it now");
      else toast("check", "Question posted", "Other families can answer it now");
      await load(sort, category);
    } catch (e) {
      console.error("[petpal] forum post failed:", e);
      toast("alert", "Couldn't post", "That didn't send — try again");
    } finally {
      setSubmitting(false);
    }
  };

  const emptyCopy =
    category === "question"
      ? { title: "No questions yet", body: "Be the first to ask the community about your pet." }
      : { title: "No pet care posts yet", body: "Share pet-care advice, or offer your caregiving service." };

  return (
    <TabScreen
      title="Community"
      subtitle="Ask other pet families for advice"
      trailing={<HeaderActions />}
      refreshControl={refreshControl}
      // Room for the floating compose button so the last card can always clear it.
      contentBottomPad={72}
      overlay={
        <View style={[styles.fabWrap, { bottom: insets.bottom + FAB_BOTTOM }]} pointerEvents="box-none">
          <PressableScale
            haptic
            onPress={() => openCompose(category === "pet_care" && canAdvertiseCaregiving ? "service" : "question")}
            accessibilityRole="button"
            accessibilityLabel={category === "pet_care" && canAdvertiseCaregiving ? "Offer your caregiving service" : "Ask a question"}
          >
            <View style={styles.fab}>
              <Icon name="plus" size={18} color={colors.white} />
              <Text style={styles.fabLabel}>
                {category === "pet_care" && canAdvertiseCaregiving ? "Offer care" : "Ask"}
              </Text>
            </View>
          </PressableScale>
        </View>
      }
    >
      {/* One control row: what you're reading on the left, how it's ordered on
          the right. Two stacked pill rows made the filters read as the page. */}
      <View style={styles.controls}>
        <View style={styles.segment}>
          <SegmentTab label="Questions" active={category === "question"} onPress={() => changeCategory("question")} />
          <SegmentTab label="Pet care" active={category === "pet_care"} onPress={() => changeCategory("pet_care")} />
        </View>
        <PressableScale
          onPress={toggleSort}
          accessibilityRole="button"
          accessibilityLabel={`Sorted by ${sort === "top" ? "top" : "newest"}. Tap to change.`}
        >
          <View style={styles.sortButton}>
            <Icon name={sort === "top" ? "arrow-up" : "clock"} size={14} color={colors.label2} />
            <Text style={styles.sortLabel}>{sort === "top" ? "Top" : "New"}</Text>
          </View>
        </PressableScale>
      </View>

      {!hydrated || posts === null ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <View style={{ marginTop: 8 }}>
          <EmptyState
            icon="people"
            title={emptyCopy.title}
            body={emptyCopy.body}
            cta={category === "pet_care" && canAdvertiseCaregiving ? "Offer care" : "Ask a question"}
            onCta={() => openCompose(category === "pet_care" && canAdvertiseCaregiving ? "service" : "question")}
          />
        </View>
      ) : (
        <View style={styles.feed}>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onPress={() => router.push(`/(tabs)/community/${p.id}`)} />
          ))}
        </View>
      )}

      <Sheet open={composeOpen} onClose={() => setComposeOpen(false)}>
        <SheetTitle>{isService ? "Offer your caregiving service" : "Ask the community"}</SheetTitle>
        <SheetSubtitle>
          {isService
            ? "Shown under Pet care, tagged so families know it's a service offer."
            : "Your family ID and pet breed are shown — no personal info."}
        </SheetSubtitle>

        {canAdvertiseCaregiving ? (
          <>
            <FieldLabel>Post type</FieldLabel>
            <View style={styles.petChips}>
              <SelectableChip label="Question" selected={!isService} onPress={() => setComposeKind("question")} />
              <SelectableChip label="Offering care" selected={isService} onPress={() => setComposeKind("service")} />
            </View>
          </>
        ) : null}

        {!isService && state.pets.length === 0 ? (
          <View style={{ marginTop: 16 }}>
            <EmptyState
              icon="paw"
              title="Add a pet first"
              body="Questions are posted about one of your pets, so the community sees the breed. Add a pet on the Pets tab to get started."
            />
          </View>
        ) : (
          <>
            {!isService ? (
              <>
                <FieldLabel>About which pet?</FieldLabel>
                <View style={styles.petChips}>
                  {state.pets.map((p) => (
                    <SelectableChip
                      key={p.id}
                      label={`${speciesEmoji(p.species)} ${p.name}`}
                      selected={p.id === petId}
                      onPress={() => setPetId(p.id)}
                    />
                  ))}
                </View>
                {selectedPet ? <Text style={styles.breedHint}>Posting as a {selectedPet.breed} owner.</Text> : null}
              </>
            ) : null}

            <FieldLabel>{isService ? "Title" : "Question"}</FieldLabel>
            <TextField
              value={title}
              onChangeText={setTitle}
              placeholder={
                isService ? "e.g. Weekday dog walks in the downtown area" : "e.g. How much should I feed a 6-month-old?"
              }
              returnKeyType="next"
              maxLength={200}
            />

            <FieldLabel>{isService ? "Description" : "Details (optional)"}</FieldLabel>
            <TextField
              value={body}
              onChangeText={setBody}
              placeholder={
                isService
                  ? "Tell families what you offer, your availability, and rates…"
                  : "Add any context that helps others answer…"
              }
              multiline
              style={styles.multiline}
              maxLength={5000}
            />

            <SheetFooter>
              <AccentButton disabled={!canSubmit} loading={submitting} onPress={submit}>
                {isService ? "Post service" : "Post question"}
              </AccentButton>
            </SheetFooter>
          </>
        )}
      </Sheet>
    </TabScreen>
  );
}

function SegmentTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <View style={[styles.segmentTab, active && styles.segmentTabActive]}>
        <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

/** Clears the tab bar (Screen.tsx's IOS_TAB_BAR_HEIGHT / ANDROID_TAB_BAR_HEIGHT). */
const FAB_BOTTOM = Platform.OS === "android" ? 68 : 61;

const makeStyles = (colors: Colors) => StyleSheet.create({
  controls: { marginTop: 12, marginBottom: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  // A real segmented track: the selected pill sits INSIDE a recessed group, so
  // the pair reads as one choice rather than two independent buttons.
  segment: { flexDirection: "row", backgroundColor: colors.fill, borderRadius: radius.full, padding: 3, gap: 2 },
  segmentTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full },
  segmentTabActive: { backgroundColor: colors.accent },
  segmentLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.label2 },
  segmentLabelActive: { color: colors.white },
  // Sort is a different KIND of control from category — a quiet text button, not
  // a third pill competing with the segment beside it.
  sortButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 8 },
  sortLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.label2 },

  feed: { marginTop: 10, gap: 10 },
  card: { borderRadius: radius.lg, backgroundColor: colors.card, padding: 14, overflow: "hidden", ...cardShadow },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 },
  breed: { fontSize: 12, fontFamily: font.semibold, color: colors.label2, flexShrink: 0, maxWidth: "50%" },
  // The meta tail yields first so a long breed or household name truncates
  // inside the card instead of spilling past its rounded edge.
  metaText: { flex: 1, minWidth: 0, fontSize: 12, fontFamily: font.regular, color: colors.label3 },
  adTag: { borderRadius: radius.sm, backgroundColor: colors.accentSoft, paddingHorizontal: 7, paddingVertical: 3 },
  adTagLabel: { fontSize: 11, fontFamily: font.semibold, color: colors.accentDeep, letterSpacing: 0.2 },
  cardTitle: { fontSize: 17, fontFamily: font.semibold, color: colors.label, lineHeight: 22, letterSpacing: -0.2 },
  cardBody: { marginTop: 5, fontSize: 14, fontFamily: font.regular, color: colors.label2, lineHeight: 19 },
  cardFooter: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  answers: { fontSize: 13, fontFamily: font.medium, color: colors.label3 },
  skelLine: { borderRadius: 5, backgroundColor: colors.fill },

  fabWrap: { position: "absolute", right: 16, alignItems: "flex-end" },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    // Offset + blur, so it reads as lifted off the feed rather than haloed.
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabLabel: { fontSize: 15, fontFamily: font.semibold, color: colors.white },

  petChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  breedHint: { marginTop: 8, fontSize: 12, fontFamily: font.medium, color: colors.label3 },
  multiline: { minHeight: 90, paddingTop: 12, textAlignVertical: "top" },
});
