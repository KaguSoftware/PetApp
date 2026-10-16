import { fireEvent, screen } from "@testing-library/react-native";
import GuideScreen from "@/app/(tabs)/guide/index";
import GuideArticleScreen from "@/app/(tabs)/guide/[id]";
import { ALL_TOPICS } from "@/content/guide";
import { prepare, renderScreen } from "./_support/render";

describe("Guide", () => {
  it("index has a native Guide title, a native search bar and categories", async () => {
    prepare("full");
    await renderScreen(<GuideScreen />);
    expect(screen.getByRole("header", { name: "Guide" })).toBeTruthy();
    expect(screen.getByPlaceholderText("Search the guide")).toBeTruthy();
    expect(screen.getByText("Other pets")).toBeTruthy();
  });

  it("search filters topics", async () => {
    prepare("full");
    await renderScreen(<GuideScreen />);
    expect(screen.getByText("Start here")).toBeTruthy();
    fireEvent.changeText(screen.getByPlaceholderText("Search the guide"), "zzzz-no-match");
    expect(screen.getByText("Nothing matches that yet. Try a different word.")).toBeTruthy();
    expect(screen.queryByText("Start here")).toBeNull();
  });

  it("species chips are gone: a header menu checks All / Dog / Cat / Other pets", async () => {
    prepare("full");
    await renderScreen(<GuideScreen />);
    expect(screen.queryByRole("button", { name: "Dog" })).toBeNull();
    expect(screen.getByRole("menuitem", { name: "All" }).props.accessibilityState.checked).toBe(true);
    fireEvent.press(screen.getByRole("menuitem", { name: "Cat" }));
    expect(screen.getByRole("menuitem", { name: "Cat" }).props.accessibilityState.checked).toBe(true);
    expect(screen.getByRole("menuitem", { name: "All" }).props.accessibilityState.checked).toBe(false);
  });

  it("topics are plain rows with a read time and the featured one is labelled", async () => {
    prepare("full");
    await renderScreen(<GuideScreen />);
    expect(screen.getByText("Start here")).toBeTruthy();
    expect(screen.getAllByText(/min read/).length).toBeGreaterThan(3);
  });

  it("article renders for a real topic id with the topic as the native title", async () => {
    const topic = ALL_TOPICS.find((t) => t.id === "feeding-basics")!;
    prepare("full", { id: topic.id });
    await renderScreen(<GuideArticleScreen />);
    expect(screen.getByRole("header", { name: topic.title })).toBeTruthy();
    expect(screen.getByText("Keep reading")).toBeTruthy();
  });

  it.each(ALL_TOPICS.map((t) => t.id))("article %s renders without throwing", async (id) => {
    prepare("full", { id });
    await renderScreen(<GuideArticleScreen />);
    expect(screen.getByText("Keep reading")).toBeTruthy();
  });

  it("unknown topic id shows the not-found state", async () => {
    prepare("full", { id: "nope" });
    await renderScreen(<GuideArticleScreen />);
    expect(screen.getByText("We couldn't find that guide")).toBeTruthy();
  });
});
