import { Mascot, MASCOT_MOODS } from "@/components/mascot";
import { prepare, renderScreen } from "./_support/render";

describe("Mascot", () => {
  beforeEach(() => prepare("full"));

  const species = ["dog", "cat", "rabbit", "hamster", "bird", "fish", "reptile", "other"];
  const cases = species.flatMap((s) => MASCOT_MOODS.map((m) => [s, m] as const));

  it.each(cases)("%s / %s renders without throwing", async (s, mood) => {
    const { toJSON } = await renderScreen(<Mascot species={s} mood={mood} size={120} />);
    expect(toJSON()).toBeTruthy();
  });

  it("renders static, tinted and with a reaction", async () => {
    const { toJSON } = await renderScreen(
      <Mascot species="dog" mood="hungry" animated={false} tint="#aa8855" reaction={{ type: "eat", key: 1 }} />,
    );
    expect(toJSON()).toBeTruthy();
  });
});
