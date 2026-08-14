#!/usr/bin/env -S npx tsx
import Ajv, { type JSONSchemaType } from "ajv";

import resume from "../../resume.json";
import type { ResumeData } from "../resume";

const ajv = new Ajv();

const resumeDataSchema: JSONSchemaType<ResumeData> = {
  type: "object",
  properties: {
    first_name: { type: "string" },
    last_name: { type: "string" },
    phone_number: {
      type: "object",
      properties: {
        number: { type: "string" },
        uri: { type: "string" },
      },
      required: ["number", "uri"],
    },
    email: {
      type: "object",
      properties: {
        email: { type: "string" },
        uri: { type: "string" },
      },
      required: ["email", "uri"],
    },
    city_state: { type: "string" },
    url: { type: "string" },
    internet_presences: {
      type: "array",
      items: { type: "string" },
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          title: { type: "string" },
          date_range: { type: "string" },
          accomplishments: {
            type: "array",
            items: { type: "string" },
          },
          location: { type: "string" },
          technologies: {
            type: "array",
            items: { type: "string" },
            nullable: true,
          },
        },
        required: [
          "company",
          "title",
          "date_range",
          "accomplishments",
          "location",
        ],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          institution: { type: "string" },
          credential: { type: "string" },
          url: { type: "string" },
        },
        required: ["institution", "credential", "url"],
      },
    },
    general_technologies: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "first_name",
    "last_name",
    "phone_number",
    "email",
    "city_state",
    "url",
    "internet_presences",
    "experience",
    "education",
    "general_technologies",
  ],
  additionalProperties: false,
};

const validateResumeData = ajv.compile(resumeDataSchema);

if (validateResumeData(resume)) {
  console.log("JSON is valid.");
} else {
  console.log(validateResumeData.errors);
  throw new Error("Invalid resume");
}
