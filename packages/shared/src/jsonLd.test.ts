import { serializeJsonLd } from "./jsonLd";

describe("serializeJsonLd", () => {
  it("writes JSON that parses back to the data", () => {
    const data = { "@context": "https://schema.org", "@type": "Thing" };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  it("cannot close the script element early", () => {
    const data = { name: "</script><script>alert(1)</script>" };
    const text = serializeJsonLd(data);
    expect(text).not.toContain("<");
    expect(JSON.parse(text)).toEqual(data);
  });
});
