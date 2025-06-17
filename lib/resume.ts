import resumeData from "../resume.json";

interface PhoneNumber {
  number: string;
  uri: string;
}

interface Email {
  email: string;
  uri: string;
}

interface Experience {
  company: string;
  title: string;
  date_range: string;
  accomplishments: string[];
  location: string;
  technologies?: string[];
}

interface Education {
  institution: string;
  credential: string;
  url: string;
}

export interface ResumeData {
  first_name: string;
  last_name: string;
  phone_number: PhoneNumber;
  email: Email;
  city_state: string;
  url: string;
  internet_presences: string[];
  experience: Experience[];
  education: Education[];
}

export function isResumeData(obj: unknown): obj is ResumeData {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const expectedKeys = [
    "first_name",
    "last_name",
    "phone_number",
    "email",
    "city_state",
    "url",
    "internet_presences",
    "experience",
    "education",
  ];

  const actualKeys = Object.keys(obj);
  if (
    actualKeys.length !== expectedKeys.length ||
    !expectedKeys.every((key) => actualKeys.includes(key))
  ) {
    return false;
  }

  return (
    typeof (obj as ResumeData).first_name === "string" &&
    typeof (obj as ResumeData).last_name === "string" &&
    typeof (obj as ResumeData).phone_number === "object" &&
    typeof (obj as ResumeData).phone_number?.number === "string" &&
    typeof (obj as ResumeData).phone_number?.uri === "string" &&
    typeof (obj as ResumeData).email === "object" &&
    typeof (obj as ResumeData).email?.email === "string" &&
    typeof (obj as ResumeData).email?.uri === "string" &&
    typeof (obj as ResumeData).city_state === "string" &&
    typeof (obj as ResumeData).url === "string" &&
    Array.isArray((obj as ResumeData).internet_presences) &&
    (obj as ResumeData).internet_presences.every(
      (url) => typeof url === "string",
    ) &&
    Array.isArray((obj as ResumeData).experience) &&
    (obj as ResumeData).experience.every(
      (exp): exp is Experience =>
        typeof exp === "object" &&
        exp !== null &&
        Object.keys(exp).length === (exp.technologies ? 6 : 5) &&
        typeof exp.company === "string" &&
        typeof exp.title === "string" &&
        typeof exp.date_range === "string" &&
        Array.isArray(exp.accomplishments) &&
        exp.accomplishments.every((acc) => typeof acc === "string") &&
        typeof exp.location === "string" &&
        (!exp.technologies || Array.isArray(exp.technologies)),
    ) &&
    Array.isArray((obj as ResumeData).education) &&
    (obj as ResumeData).education.every(
      (edu): edu is Education =>
        typeof edu === "object" &&
        edu !== null &&
        Object.keys(edu).length === 3 &&
        typeof edu.institution === "string" &&
        typeof edu.credential === "string" &&
        typeof edu.url === "string",
    )
  );
}

class Resume {
  private data: ResumeData;

  constructor(jsonData: unknown) {
    if (!isResumeData(jsonData)) {
      throw new Error("Invalid resume data");
    }
    this.data = jsonData;
  }

  get firstName(): string {
    return this.data.first_name;
  }

  get lastName(): string {
    return this.data.last_name;
  }

  get phoneNumber(): PhoneNumber {
    return this.data.phone_number;
  }

  get email(): Email {
    return this.data.email;
  }

  get cityState(): string {
    return this.data.city_state;
  }

  get url(): string {
    return this.data.url;
  }

  get internetPresences(): string[] {
    return this.data.internet_presences;
  }

  get experience(): Experience[] {
    return this.data.experience;
  }

  get education(): Education[] {
    return this.data.education;
  }
}

const resume = new Resume(resumeData);

export { Resume, resume };
