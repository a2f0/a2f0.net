import { isResumeData } from "./resume";
import resumeData from "../resume.json";

describe("isResumeData", () => {
  describe("success cases", () => {
    it("should return true for a valid ResumeData object", () => {
      expect(isResumeData(resumeData)).toBe(true);
    });
  });
  describe("failure cases", () => {
    it("should return false for a non-object", () => {
      expect(isResumeData(null)).toBe(false);
    });
    it("should return false for an object with missing properties", () => {
      expect(isResumeData({})).toBe(false);
    });
    it("should return false for an object with extra properties", () => {
      expect(isResumeData({ ...resumeData, extra: "property" })).toBe(false);
    });
  });
});
