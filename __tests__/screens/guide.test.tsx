import { screen } from "@testing-library/react-native";
import GuideScreen from "@/app/(tabs)/guide/index";
import GuideArticleScreen from "@/app/(tabs)/guide/[id]";
import { ALL_TOPICS } from "@/content/guide";
import { prepare, renderScreen } from "./_support/render";

describe("Guide", () => {
  it("index lists categories and a search field", async () => {
    prepare("full");
    await renderScreen(<GuideScreen />);
    expect(screen.getByText("Guide")).toBeTruthy();
    expect(screen.getByPlaceholderText("Search the guide")).toBeTruthy();
    expect(screen.getByText("Other pets")).toBeTruthy();
  });

  it("article renders for a real topic id", async () => {
    const topic = ALL_TOPICS.find((t) => t.id === "feeding-basics")!;
    prepare("full", { id: topic.id });
    await renderScreen(<GuideArticleScreen />);
    expect(screen.getAllByText(topic.title).length).toBeGreaterThan(0);
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
